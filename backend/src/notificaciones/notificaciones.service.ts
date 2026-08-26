import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { CorreoService } from '../correo/correo.service';
import { Prisma } from '../generated/prisma/client';
import {
  CanalNotificacion,
  EventoNotificable,
  Rol,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Modulo 8 — notificaciones (TCI-53 a TCI-56).
 *
 * `emitir()` es el unico camino: quien quiera avisar de algo dice que paso y a
 * quien concierne, y aqui se decide si eso se notifica, por donde y con que
 * texto. Nadie fuera de este servicio compone un mensaje ni escribe en la
 * bandeja.
 *
 * Tres reglas que sostienen el modulo:
 *
 *  1. **Emitir nunca rompe la accion que lo provoco.** Notificar es un efecto
 *     secundario: si falla, se registra y la orden se asigna igual. Una
 *     asignacion que se cae porque el correo esta caido seria absurda.
 *  2. **A quien actua no se le notifica lo que acaba de hacer.** El tecnico que
 *     comenta no necesita que le avisen de su propio comentario.
 *  3. **El texto se guarda ya compuesto.** Si manana alguien reescribe la
 *     plantilla, lo que ya se notifico sigue diciendo lo que dijo.
 */

export interface Emision {
  evento: EventoNotificable;
  /** Ids de usuario a los que concierne el evento. */
  destinatarios: string[];
  /** Valores para los marcadores `{{campo}}` de la plantilla. */
  datos: Record<string, string>;
  /** Ruta de la aplicacion a la que lleva la notificacion. */
  enlace?: string;
  /** Quien provoco el evento. No se le notifica a si mismo. */
  autorId?: string;
}

@Injectable()
export class NotificacionesService {
  private readonly log = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  /**
   * Notifica un evento. **No lanza nunca**: ver regla 1.
   *
   * Devuelve lo que hizo para que los tests y los endpoints manuales puedan
   * comprobarlo; los emisores normales lo ignoran.
   */
  async emitir(emision: Emision): Promise<{
    enApp: number;
    porCorreo: number;
    motivoCorreo?: string;
  }> {
    try {
      return await this.emitirOFallar(emision);
    } catch (error) {
      this.log.error(
        `No se pudo notificar el evento ${emision.evento}.`,
        error,
      );
      return { enApp: 0, porCorreo: 0 };
    }
  }

  private async emitirOFallar(emision: Emision) {
    const destinatarios = await this.prisma.user.findMany({
      where: {
        id: {
          in: emision.destinatarios.filter((id) => id !== emision.autorId),
        },
        activo: true,
      },
      select: { id: true, email: true, rol: true },
    });

    if (destinatarios.length === 0) {
      return { enApp: 0, porCorreo: 0 };
    }

    const preferencias = await this.prisma.preferenciaNotificacion.findMany({
      where: {
        evento: emision.evento,
        activo: true,
        rol: { in: [...new Set(destinatarios.map((d) => d.rol))] },
      },
      select: { rol: true, canal: true },
    });

    if (preferencias.length === 0) {
      return { enApp: 0, porCorreo: 0 };
    }

    const plantilla = await this.prisma.plantillaNotificacion.findUnique({
      where: { evento: emision.evento },
      select: { asunto: true, cuerpo: true },
    });
    if (!plantilla) {
      throw new Error(`No hay plantilla para el evento ${emision.evento}.`);
    }

    const asunto = rellenar(plantilla.asunto, emision.datos);
    const cuerpo = rellenar(plantilla.cuerpo, emision.datos);

    const quiere = (rol: Rol, canal: CanalNotificacion) =>
      preferencias.some((p) => p.rol === rol && p.canal === canal);

    const enApp = destinatarios.filter((d) =>
      quiere(d.rol, CanalNotificacion.EN_APP),
    );
    const porCorreo = destinatarios.filter((d) =>
      quiere(d.rol, CanalNotificacion.CORREO),
    );

    if (enApp.length > 0) {
      await this.prisma.notificacion.createMany({
        data: enApp.map((d) => ({
          usuarioId: d.id,
          evento: emision.evento,
          titulo: asunto,
          cuerpo,
          enlace: emision.enlace,
        })),
      });
    }

    let motivoCorreo: string | undefined;
    if (porCorreo.length > 0) {
      const resultado = await this.correo.enviar({
        para: porCorreo.map((d) => d.email),
        asunto,
        html: this.html(asunto, cuerpo),
      });
      if (!resultado.enviado) motivoCorreo = resultado.motivo;
    }

    return {
      enApp: enApp.length,
      porCorreo: porCorreo.length,
      motivoCorreo,
    };
  }

  // -------------------------------------------------------------------------
  // Bandeja del usuario
  // -------------------------------------------------------------------------

  /**
   * La bandeja de un usuario, paginada.
   *
   * `noLeidas` cuenta sobre TODA la bandeja y no sobre la pagina: el numero del
   * badge tiene que ser el real, no "cuantas no leidas hay entre las veinte que
   * se trajeron".
   */
  async bandeja(
    usuarioId: string,
    opciones: { soloNoLeidas?: boolean; page?: number; perPage?: number } = {},
  ) {
    const page = opciones.page ?? 1;
    const perPage = opciones.perPage ?? 20;

    const where: Prisma.NotificacionWhereInput = { usuarioId };
    if (opciones.soloNoLeidas) where.leidaEn = null;

    const [total, data, noLeidas] = await this.prisma.$transaction([
      this.prisma.notificacion.count({ where }),
      this.prisma.notificacion.findMany({
        where,
        select: {
          id: true,
          evento: true,
          titulo: true,
          cuerpo: true,
          enlace: true,
          leidaEn: true,
          createdAt: true,
        },
        // Por fecha y, a igualdad, por id: varias notificaciones del mismo
        // evento se escriben con `createdAt` identico y saldrian barajadas.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.notificacion.count({ where: { usuarioId, leidaEn: null } }),
    ]);

    return {
      data,
      noLeidas,
      meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
    };
  }

  /**
   * Marca una notificacion como leida.
   *
   * Filtra por `usuarioId` ademas del id: sin eso, cualquiera con sesion podria
   * marcar como leidas las notificaciones de otro pasando su id.
   */
  async marcarLeida(id: string, usuarioId: string) {
    const notificacion = await this.prisma.notificacion.findFirst({
      where: { id, usuarioId },
      select: { id: true, leidaEn: true },
    });
    if (!notificacion) {
      throw new NotFoundException(`No existe la notificacion ${id}.`);
    }

    // Idempotente: volver a marcarla no mueve la fecha original.
    if (notificacion.leidaEn) return notificacion;

    return this.prisma.notificacion.update({
      where: { id },
      data: { leidaEn: new Date() },
      select: { id: true, leidaEn: true },
    });
  }

  async marcarTodasLeidas(usuarioId: string) {
    const { count } = await this.prisma.notificacion.updateMany({
      where: { usuarioId, leidaEn: null },
      data: { leidaEn: new Date() },
    });
    return { marcadas: count };
  }

  // -------------------------------------------------------------------------
  // TCI-54 y TCI-55 — configuracion
  // -------------------------------------------------------------------------

  preferencias() {
    return this.prisma.preferenciaNotificacion.findMany({
      select: { id: true, evento: true, rol: true, canal: true, activo: true },
      orderBy: [{ evento: 'asc' }, { rol: 'asc' }, { canal: 'asc' }],
    });
  }

  async cambiarPreferencia(id: string, activo: boolean) {
    const existe = await this.prisma.preferenciaNotificacion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException(`No existe la preferencia ${id}.`);
    }

    return this.prisma.preferenciaNotificacion.update({
      where: { id },
      data: { activo },
      select: { id: true, evento: true, rol: true, canal: true, activo: true },
    });
  }

  // -------------------------------------------------------------------------
  // TCI-56 — plantillas
  // -------------------------------------------------------------------------

  plantillas() {
    return this.prisma.plantillaNotificacion.findMany({
      select: {
        id: true,
        evento: true,
        asunto: true,
        cuerpo: true,
        updatedAt: true,
      },
      orderBy: { evento: 'asc' },
    });
  }

  async cambiarPlantilla(
    id: string,
    datos: { asunto?: string; cuerpo?: string },
  ) {
    const existe = await this.prisma.plantillaNotificacion.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existe) {
      throw new NotFoundException(`No existe la plantilla ${id}.`);
    }

    return this.prisma.plantillaNotificacion.update({
      where: { id },
      data: { asunto: datos.asunto?.trim(), cuerpo: datos.cuerpo?.trim() },
      select: {
        id: true,
        evento: true,
        asunto: true,
        cuerpo: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Cuerpo del correo. HTML plano con estilos en linea, por lo mismo que el
   * resumen preventivo: los clientes de correo descartan el `<style>` del
   * `<head>` y bloquean las imagenes remotas.
   */
  private html(asunto: string, cuerpo: string): string {
    return `<div style="font-family:Arial,sans-serif;color:#333;max-width:560px">
      <p style="font-size:18px;font-weight:bold;color:#C61D1A;margin:0">TCI</p>
      <p style="margin:12px 0;font-weight:bold">${escapar(asunto)}</p>
      <p style="margin:12px 0">${escapar(cuerpo)}</p>
      <p style="margin-top:16px;font-size:12px;color:#6B7280">
        Este aviso lo genera el CMMS de TCI. Puede cambiar que se notifica desde
        el panel de administracion.
      </p>
    </div>`;
  }
}

/**
 * Sustituye los marcadores `{{campo}}`.
 *
 * Un marcador sin valor se deja como esta en vez de borrarse: un hueco vacio en
 * mitad de una frase se lee como un error del sistema, y `{{tecnico}}` a la
 * vista al menos dice que falta.
 */
export function rellenar(texto: string, datos: Record<string, string>): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (original, campo: string) =>
    campo in datos ? datos[campo] : original,
  );
}

/** El texto sale de una plantilla que edita un usuario: no entra crudo. */
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
