import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

/**
 * Envio de correo, con Resend detras.
 *
 * **Puede no estar configurado, y eso es un estado valido.** TCI todavia no
 * tiene el dominio con el que firmar los envios (va con TCI-70), asi que sin
 * `RESEND_API_KEY` este servicio no falla ni finge: registra lo que habria
 * enviado y devuelve `enviado: false` con el motivo. Quien lo llama decide si
 * eso le importa.
 *
 * Ese comportamiento no es una comodidad de desarrollo, es la unica forma
 * honesta de tenerlo a medio conectar: un servicio que lanzara excepcion
 * tumbaria las tareas de fondo que lo usan, y uno que devolviera `true` sin
 * enviar haria creer que los avisos salen.
 *
 * El dia que exista el dominio, esto se enciende con dos variables y sin tocar
 * el codigo que lo consume.
 */

export interface Mensaje {
  para: string[];
  asunto: string;
  /** Cuerpo en HTML. Resend exige `html` o `text`; aqui siempre se manda HTML. */
  html: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  /** Por que no se envio, cuando `enviado` es `false`. */
  motivo?: string;
  id?: string;
}

@Injectable()
export class CorreoService {
  private readonly log = new Logger(CorreoService.name);
  private readonly cliente: Resend | null;
  private readonly remitente: string;

  constructor() {
    const clave = process.env.RESEND_API_KEY?.trim();
    this.remitente =
      process.env.CORREO_REMITENTE?.trim() ??
      'CMMS TCI <onboarding@resend.dev>';
    this.cliente = clave ? new Resend(clave) : null;

    if (!this.cliente) {
      this.log.warn(
        'RESEND_API_KEY no esta definida: el correo queda desactivado. ' +
          'Los avisos se registran en el log y siguen disponibles dentro de la aplicacion.',
      );
    }
  }

  /** Si hay con que enviar. Lo consultan las pantallas para no prometer envios. */
  get configurado(): boolean {
    return this.cliente !== null;
  }

  async enviar(mensaje: Mensaje): Promise<ResultadoEnvio> {
    if (mensaje.para.length === 0) {
      return { enviado: false, motivo: 'No hay destinatarios.' };
    }

    if (!this.cliente) {
      // Se registra el asunto y a cuantos habria ido, no el cuerpo: en el log
      // de un servidor no tiene por que quedar el contenido de un correo.
      this.log.log(
        `[correo desactivado] "${mensaje.asunto}" para ${mensaje.para.length} destinatario(s).`,
      );
      return {
        enviado: false,
        motivo:
          'El correo saliente no esta configurado (falta RESEND_API_KEY).',
      };
    }

    try {
      const { data, error } = await this.cliente.emails.send({
        from: this.remitente,
        to: mensaje.para,
        subject: mensaje.asunto,
        html: mensaje.html,
      });

      if (error) {
        this.log.error(`Resend rechazo el envio: ${error.message}`);
        return { enviado: false, motivo: error.message };
      }

      return { enviado: true, id: data?.id };
    } catch (fallo) {
      // Una tarea de fondo no puede caerse porque el proveedor de correo este
      // caido: se registra y se sigue.
      this.log.error('Fallo el envio de correo.', fallo);
      return {
        enviado: false,
        motivo: 'No se pudo contactar con el proveedor de correo.',
      };
    }
  }
}
