import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { MulterError } from 'multer';

import { AdjuntosService } from './adjuntos.service';

/**
 * Traduce los errores de multer a algo que el tecnico pueda entender.
 *
 * Sin esto, subir una foto demasiado grande devuelve un 500 sin explicacion:
 * multer corta el stream y lanza un `MulterError` que Nest no sabe interpretar.
 * El caso importa porque es el mas probable en campo — una camara de telefono
 * saca fotos de 8 MB sin despeinarse.
 */
@Catch(MulterError)
export class ErrorDeSubidaFilter implements ExceptionFilter {
  catch(error: MulterError, host: ArgumentsHost): void {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const { estado, mensaje } = this.traducir(error);

    // Misma forma que el resto de errores de Nest: el frontend lee `message`.
    respuesta.status(estado).json({ statusCode: estado, message: mensaje });
  }

  private traducir(error: MulterError): { estado: number; mensaje: string } {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          estado: HttpStatus.PAYLOAD_TOO_LARGE,
          mensaje: `El archivo supera el maximo de ${(AdjuntosService.maxBytes / 1024 / 1024).toFixed(0)} MB. Reduzca la foto e intente de nuevo.`,
        };
      case 'LIMIT_FILE_COUNT':
        return {
          estado: HttpStatus.UNPROCESSABLE_ENTITY,
          mensaje: 'Suba los archivos de uno en uno.',
        };
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          estado: HttpStatus.UNPROCESSABLE_ENTITY,
          mensaje: 'El archivo debe venir en el campo `archivo`.',
        };
      default:
        return {
          estado: HttpStatus.UNPROCESSABLE_ENTITY,
          mensaje: `No se pudo procesar la subida (${error.code}).`,
        };
    }
  }
}
