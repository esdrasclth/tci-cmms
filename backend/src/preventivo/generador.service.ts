import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Prisma } from '../generated/prisma/client';
import { OrdenEstado, Rol } from '../generated/prisma/enums';
import { OrdenesService } from '../ordenes/ordenes.service';
import { PrismaService } from '../prisma/prisma.service';
import { PreventivoService } from './preventivo.service';

/**
 * TCI-50 — generacion automatica de ordenes al vencer el plazo.
 *
 * Corre una vez al dia y, por cada plan activo, crea una orden para cada equipo
 * cuyo preventivo esta vencido. "Vencido" lo decide `PreventivoService`: la
 * fecha del ultimo cierre real mas la frecuencia del plan (TCI-49).
 *
 * Tres cosas sostienen que esto se pueda ejecutar mil veces sin estropear nada:
 *
 *  1. **No duplica.** Si el equipo ya tiene una orden abierta de ese plan, se
 *     omite. Sin esta regla, un plan vencido crearia una orden cada dia hasta
 *     que alguien la cerrara.
 *  2. **Un solo proceso a la vez.** La pasada entera corre dentro de una
 *     transaccion que toma un lock de asesoria, igual que hace el correlativo
 *     de ordenes. Con dos replicas del contenedor —que es a donde va esto en
 *     TCI-69— las dos despertarian a la misma hora y generarian lo mismo dos
 *     veces.
 *
 *     El lock es **de transaccion** y no de sesion a proposito: Prisma reparte
 *     las consultas por un pool, asi que un `pg_advisory_lock` podria tomarse
 *     en una conexion y soltarse en otra, quedando retenido para siempre y
 *     dejando el generador mudo. El de transaccion se suelta solo al terminar.
 *  3. **Todo o nada.** Como consecuencia de correr en una transaccion, si algo
 *     falla a mitad no queda media pasada aplicada. Reintentar es seguro: la
 *     regla 1 hace que lo ya creado se omita.
 */

/** Estados en los que una orden sigue viva y por tanto bloquea otra igual. */
const ABIERTOS = [
  OrdenEstado.PENDIENTE,
  OrdenEstado.ASIGNADA,
  OrdenEstado.EN_PROCESO,
  OrdenEstado.EN_ESPERA,
];

export interface ResultadoGeneracion {
  ejecutado: boolean;
  planes: number;
  creadas: { plan: string; equipo: string; numero: string }[];
  omitidas: { plan: string; equipo: string; motivo: string }[];
}

@Injectable()
export class GeneradorPreventivoService {
  private readonly log = new Logger(GeneradorPreventivoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly preventivo: PreventivoService,
    private readonly ordenes: OrdenesService,
  ) {}

  /**
   * A las 6 de la manana, hora del servidor: antes de que empiece la jornada,
   * de modo que lo que venza hoy ya este en el listado cuando alguien lo abra.
   *
   * `PREVENTIVO_AUTOMATICO=false` lo apaga sin tocar codigo, que es lo que hace
   * falta en un entorno de pruebas o mientras se cargan los datos iniciales.
   */
  @Cron(process.env.PREVENTIVO_CRON ?? '0 6 * * *', {
    name: 'generacion-preventiva',
  })
  async porHorario(): Promise<void> {
    if (process.env.PREVENTIVO_AUTOMATICO === 'false') {
      this.log.log('Generacion preventiva desactivada por configuracion.');
      return;
    }

    const resultado = await this.generar();
    if (!resultado.ejecutado) {
      this.log.log('Otra instancia esta generando: esta pasada se salta.');
      return;
    }
    this.log.log(
      `Generacion preventiva: ${resultado.creadas.length} orden(es) creada(s), ` +
        `${resultado.omitidas.length} omitida(s) sobre ${resultado.planes} plan(es).`,
    );
  }

  /**
   * Ejecuta una pasada. Sin `planId` recorre todos los planes activos.
   *
   * Devuelve el detalle de lo creado y lo omitido en vez de solo un conteo:
   * cuando un administrador la dispara a mano quiere ver que paso, y "0 ordenes
   * creadas" sin explicacion se lee como un fallo.
   */
  async generar(planId?: string): Promise<ResultadoGeneracion> {
    // El usuario de sistema se resuelve fuera: es un alta que no debe
    // deshacerse si la pasada se cae, y solo ocurre la primera vez.
    const sistemaId = await this.usuarioSistema();

    return this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ tomado: boolean }[]>`
        SELECT pg_try_advisory_xact_lock(hashtext('generacion_preventiva')) AS tomado
      `;
      if (filas[0]?.tomado !== true) {
        // Otra instancia esta en ello. Se sale en vez de esperar: dentro de un
        // minuto habria terminado y esta pasada no aportaria nada.
        return { ejecutado: false, planes: 0, creadas: [], omitidas: [] };
      }

      const planes = await tx.planMantenimiento.findMany({
        where: { activo: true, ...(planId ? { id: planId } : {}) },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      });

      const resultado: ResultadoGeneracion = {
        ejecutado: true,
        planes: planes.length,
        creadas: [],
        omitidas: [],
      };

      for (const plan of planes) {
        await this.generarDelPlan(tx, plan.id, sistemaId, resultado);
      }

      return resultado;
    });
  }

  private async generarDelPlan(
    tx: Prisma.TransactionClient,
    planId: string,
    sistemaId: string,
    resultado: ResultadoGeneracion,
  ): Promise<void> {
    const { plan, equipos } = await this.preventivo.equipos(planId, tx);

    for (const equipo of equipos) {
      if (!equipo.vencido) continue;

      const abierta = await tx.ordenTrabajo.findFirst({
        where: {
          planId: plan.id,
          equipoId: equipo.id,
          estado: { in: ABIERTOS },
          deletedAt: null,
        },
        select: { numero: true },
      });

      if (abierta) {
        resultado.omitidas.push({
          plan: plan.nombre,
          equipo: equipo.codigo,
          motivo: `Ya tiene la orden ${abierta.numero} abierta.`,
        });
        continue;
      }

      const creada = await this.ordenes.crearDesdePlan(tx, {
        titulo: `${plan.nombre} — ${equipo.codigo}`,
        descripcionProblema:
          plan.instrucciones?.trim() ||
          `Mantenimiento preventivo programado segun el plan '${plan.nombre}'.`,
        clienteId: equipo.cliente.id,
        sedeId: equipo.sede?.id ?? null,
        equipoId: equipo.id,
        tipoMantenimientoId: plan.tipoMantenimiento.id,
        prioridad: plan.prioridad,
        planId: plan.id,
        // La fecha de vencimiento, no la de hoy: si el plan llevaba tres
        // semanas vencido, la orden nace con la fecha en la que tocaba y el
        // atraso queda a la vista en el listado.
        fechaProgramada: equipo.proximoVencimiento ?? new Date(),
        creadoPorId: sistemaId,
      });

      resultado.creadas.push({
        plan: plan.nombre,
        equipo: equipo.codigo,
        numero: creada.numero,
      });
    }
  }

  /**
   * El usuario al que se atribuyen las ordenes automaticas.
   *
   * Se crea la primera vez que hace falta y **sin fila en `accounts`**, que es
   * lo que hace imposible iniciar sesion con el: no tiene contrasena que
   * verificar. Ademas va con `activo: false`, de modo que el guard de TCI-33 lo
   * rechazaria aunque alguien le fabricara credenciales.
   */
  private async usuarioSistema(): Promise<string> {
    const email = process.env.USUARIO_SISTEMA_EMAIL ?? 'sistema@tci.local';

    const existente = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existente) return existente.id;

    const creado = await this.prisma.user.create({
      data: {
        email,
        name: 'Sistema (generacion automatica)',
        rol: Rol.ADMIN,
        activo: false,
        emailVerified: false,
      },
      select: { id: true },
    });
    this.log.log(`Creado el usuario de sistema ${email}.`);
    return creado.id;
  }
}
