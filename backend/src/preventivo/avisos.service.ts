import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { CorreoService } from '../correo/correo.service';
import { OrdenEstado, Rol } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { sumarFrecuencia } from './preventivo.service';

/**
 * TCI-52 — aviso anticipado antes de que venza un mantenimiento.
 *
 * Cada plan define con cuantos dias de antelacion quiere el aviso
 * (`diasAnticipacion`, TCI-49). Este servicio busca los equipos que entran en
 * esa ventana y avisa por dos canales:
 *
 *  - **Dentro de la aplicacion**, siempre. `proximos()` lo consulta la pantalla
 *    de preventivo, igual que las alertas de minimos de TCI-47.
 *  - **Por correo**, si hay con que enviarlo. Mientras TCI no tenga el dominio
 *    (TCI-70) el correo queda desactivado y `CorreoService` lo dice sin fallar:
 *    el aviso sigue estando en la aplicacion, que es lo que importa.
 *
 * `proximos()` resuelve todo en **tres consultas**, sean cuantos sean los
 * planes: los planes, sus equipos y las ordenes que importan. La version
 * anterior consultaba plan a plan y, dentro, orden a orden por equipo — con 20
 * planes y 100 equipos, ~2000 consultas en cada carga de la pantalla.
 *
 * Es un **resumen diario** y no un aviso por evento, a proposito. Un aviso por
 * evento tendria que recordar cuales ya mando para no repetirlos, y esa tabla
 * es diseno del modulo 8 (TCI-53/55): construirla aqui seria adelantar una
 * decision que no toca. Un resumen del dia es idempotente por naturaleza.
 */

export interface AvisoPreventivo {
  plan: { id: string; nombre: string; diasAnticipacion: number };
  equipo: { id: string; codigo: string; nombre: string };
  cliente: { id: string; nombre: string };
  /** Cuando toca. `null` si nunca se le ha hecho, en cuyo caso ya esta vencido. */
  proximoVencimiento: Date | null;
  vencido: boolean;
  /** Dias que faltan. Negativo si ya paso. */
  diasRestantes: number | null;
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

/** Estados en los que la orden sigue viva y por tanto tapa el aviso. */
const ABIERTOS: OrdenEstado[] = [
  OrdenEstado.PENDIENTE,
  OrdenEstado.ASIGNADA,
  OrdenEstado.EN_PROCESO,
  OrdenEstado.EN_ESPERA,
];

function sumarDias(desde: Date, dias: number): Date {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

@Injectable()
export class AvisosPreventivosService {
  private readonly log = new Logger(AvisosPreventivosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  /**
   * A las 7:00, una hora despues del generador (TCI-50): asi el resumen del dia
   * ya incluye las ordenes que la generacion acaba de crear, en vez de avisar
   * de algo que en ese mismo momento deja de estar pendiente.
   */
  @Cron(process.env.AVISOS_CRON ?? '0 7 * * *', { name: 'avisos-preventivos' })
  async porHorario(): Promise<void> {
    if (process.env.AVISOS_PREVENTIVOS === 'false') {
      this.log.log('Avisos preventivos desactivados por configuracion.');
      return;
    }

    const avisos = await this.proximos();
    if (avisos.length === 0) {
      this.log.log('Sin mantenimientos por vencer: no se envia resumen.');
      return;
    }

    const resultado = await this.enviarResumen(avisos);
    this.log.log(
      resultado.enviado
        ? `Resumen de ${avisos.length} mantenimiento(s) por vencer enviado.`
        : `Resumen no enviado (${resultado.motivo}). Los avisos siguen en la aplicacion.`,
    );
  }

  /**
   * Los mantenimientos que entran en la ventana de aviso de su plan, o que ya
   * vencieron y siguen sin orden abierta.
   *
   * Se omite lo que ya tiene orden abierta: avisar de algo que ya esta en el
   * listado de trabajo es ruido, y a la tercera vez nadie lee los avisos.
   */
  async proximos(): Promise<AvisoPreventivo[]> {
    const planes = await this.prisma.planMantenimiento.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        diasAnticipacion: true,
        clienteId: true,
        tipoEquipoId: true,
        frecuenciaValor: true,
        frecuenciaUnidad: true,
      },
    });
    if (planes.length === 0) return [];

    // Los equipos de todos los planes de una vez. Antes se consultaban plan a
    // plan y, dentro, orden a orden por equipo: con 20 planes y 100 equipos
    // eso eran ~2000 consultas en cada carga de la pantalla.
    const equipos = await this.prisma.equipo.findMany({
      where: {
        tipoEquipoId: { in: planes.map((p) => p.tipoEquipoId) },
        activo: true,
        deletedAt: null,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        clienteId: true,
        tipoEquipoId: true,
        cliente: { select: { id: true, nombre: true } },
      },
    });
    if (equipos.length === 0) return [];

    // Y todas las ordenes que importan, tambien de una vez: la ultima cerrada
    // de cada par plan/equipo y las que siguen abiertas.
    const ordenes = await this.prisma.ordenTrabajo.findMany({
      where: {
        planId: { in: planes.map((p) => p.id) },
        equipoId: { in: equipos.map((e) => e.id) },
        deletedAt: null,
      },
      select: {
        planId: true,
        equipoId: true,
        estado: true,
        fechaFin: true,
      },
      orderBy: { fechaFin: 'desc' },
    });

    const clave = (planId: string, equipoId: string) => `${planId}|${equipoId}`;

    const ultimoCierre = new Map<string, Date>();
    const conOrdenAbierta = new Set<string>();
    for (const orden of ordenes) {
      if (!orden.planId || !orden.equipoId) continue;
      const k = clave(orden.planId, orden.equipoId);

      if (ABIERTOS.includes(orden.estado)) {
        conOrdenAbierta.add(k);
        continue;
      }
      // Vienen ordenadas por `fechaFin` descendente: la primera completada que
      // aparece para un par es la mas reciente.
      if (
        orden.estado === OrdenEstado.COMPLETADA &&
        orden.fechaFin &&
        !ultimoCierre.has(k)
      ) {
        ultimoCierre.set(k, orden.fechaFin);
      }
    }

    const hoy = new Date();
    const avisos: AvisoPreventivo[] = [];

    for (const plan of planes) {
      const suyos = equipos.filter(
        (e) =>
          e.tipoEquipoId === plan.tipoEquipoId &&
          (!plan.clienteId || e.clienteId === plan.clienteId),
      );

      for (const equipo of suyos) {
        const k = clave(plan.id, equipo.id);

        // Avisar de algo que ya esta en el listado de trabajo es ruido, y a la
        // tercera vez nadie lee los avisos.
        if (conOrdenAbierta.has(k)) continue;

        const cierre = ultimoCierre.get(k);
        const proximo = cierre
          ? sumarFrecuencia(cierre, plan.frecuenciaValor, plan.frecuenciaUnidad)
          : null;

        // Sin preventivo previo cuenta como vencido: es la primera vez que toca.
        const vencido = proximo === null || proximo <= hoy;
        const porVencer =
          proximo !== null &&
          proximo > hoy &&
          proximo <= sumarDias(hoy, plan.diasAnticipacion);

        if (!vencido && !porVencer) continue;

        avisos.push({
          plan: {
            id: plan.id,
            nombre: plan.nombre,
            diasAnticipacion: plan.diasAnticipacion,
          },
          equipo: {
            id: equipo.id,
            codigo: equipo.codigo,
            nombre: equipo.nombre,
          },
          cliente: equipo.cliente,
          proximoVencimiento: proximo,
          vencido,
          diasRestantes: proximo
            ? Math.ceil((proximo.getTime() - hoy.getTime()) / MS_POR_DIA)
            : null,
        });
      }
    }

    // Lo mas urgente primero: lo vencido, y dentro de eso lo que lleva mas
    // tiempo esperando.
    return avisos.sort((a, b) => {
      if (a.vencido !== b.vencido) return a.vencido ? -1 : 1;
      return (a.diasRestantes ?? -Infinity) - (b.diasRestantes ?? -Infinity);
    });
  }

  /** Manda el resumen a los administradores activos. */
  async enviarResumen(avisos: AvisoPreventivo[]) {
    const admins = await this.prisma.user.findMany({
      where: { rol: Rol.ADMIN, activo: true },
      select: { email: true },
    });

    return this.correo.enviar({
      para: admins.map((a) => a.email),
      asunto: `Mantenimiento preventivo: ${avisos.length} equipo(s) por atender`,
      html: this.cuerpo(avisos),
    });
  }

  /**
   * Cuerpo del correo, en HTML plano y con estilos en linea.
   *
   * Sin hoja de estilos ni imagenes: los clientes de correo descartan el
   * `<style>` del `<head>` y bloquean las imagenes remotas, asi que un correo
   * "bonito" llegaria roto. El rojo institucional es lo unico de marca que
   * sobrevive a esa criba.
   */
  private cuerpo(avisos: AvisoPreventivo[]): string {
    const filas = avisos
      .map((aviso) => {
        const cuando = aviso.vencido
          ? '<strong style="color:#C61D1A">Vencido</strong>'
          : `En ${aviso.diasRestantes} dia(s)`;
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #E0E0E0">${escapar(aviso.equipo.codigo)} — ${escapar(aviso.equipo.nombre)}</td>
          <td style="padding:8px;border-bottom:1px solid #E0E0E0">${escapar(aviso.cliente.nombre)}</td>
          <td style="padding:8px;border-bottom:1px solid #E0E0E0">${escapar(aviso.plan.nombre)}</td>
          <td style="padding:8px;border-bottom:1px solid #E0E0E0;white-space:nowrap">${cuando}</td>
        </tr>`;
      })
      .join('');

    return `<div style="font-family:Arial,sans-serif;color:#333;max-width:720px">
      <p style="font-size:18px;font-weight:bold;color:#C61D1A;margin:0">TCI</p>
      <p style="margin:4px 0 16px;font-size:14px">Mantenimiento preventivo por atender</p>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>
          <tr style="text-align:left;color:#6B7280;font-size:11px;text-transform:uppercase">
            <th style="padding:8px">Equipo</th>
            <th style="padding:8px">Cliente</th>
            <th style="padding:8px">Plan</th>
            <th style="padding:8px">Cuando</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#6B7280">
        Este resumen se envia una vez al dia. Los equipos que ya tienen orden
        abierta no aparecen.
      </p>
    </div>`;
  }
}

/** Los nombres los escribe un usuario: no pueden entrar crudos en el HTML. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
