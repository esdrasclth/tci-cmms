import { IsEnum, IsOptional } from 'class-validator';

import { TipoAdjunto } from '../../generated/prisma/enums';

/**
 * TCI-43. El archivo viaja como multipart en el campo `archivo`; esto valida el
 * resto del formulario.
 *
 * Los campos que describen el archivo (nombre, mimeType, tamano) NO se aceptan
 * del cliente: se leen del archivo recibido. Si se tomaran del cuerpo, cualquiera
 * podria declarar un `image/png` y subir otra cosa.
 */
export class SubirAdjuntoDto {
  @IsOptional()
  @IsEnum(TipoAdjunto)
  tipo?: TipoAdjunto;
}
