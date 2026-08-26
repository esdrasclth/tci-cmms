import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';

import { usuarioActual } from '../auth/usuario-actual';
import { AdjuntosService } from './adjuntos.service';
import { cabeceraDisposicion } from './disposicion';
import { SubirAdjuntoDto } from './dto/subir-adjunto.dto';
import { ErrorDeSubidaFilter } from './error-de-subida.filter';

/**
 * TCI-43 — evidencia adjunta a una orden de trabajo.
 *
 * Las rutas cuelgan de la orden porque el permiso es el de la orden: no hay
 * forma de pedir un adjunto sin decir a que orden pertenece, y eso obliga a
 * pasar por la comprobacion de acceso en todos los casos.
 *
 * El bucket de MinIO es privado. El archivo entra y sale siempre por aqui, que
 * es donde se sabe si quien pregunta es el admin o el tecnico asignado.
 */
@Controller('ordenes/:ordenId/adjuntos')
export class AdjuntosController {
  constructor(private readonly adjuntos: AdjuntosService) {}

  @Post()
  @UseFilters(ErrorDeSubidaFilter)
  @UseInterceptors(
    FileInterceptor('archivo', {
      // El tope tambien se comprueba en el servicio. Aqui esta para que multer
      // corte el stream y no llegue a bufferear en memoria un archivo enorme.
      limits: { fileSize: AdjuntosService.maxBytes, files: 1 },
    }),
  )
  subir(
    @Param('ordenId') ordenId: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() dto: SubirAdjuntoDto,
    @Session() session: UserSession,
  ) {
    return this.adjuntos.subir(
      ordenId,
      archivo,
      dto.tipo,
      usuarioActual(session),
    );
  }

  @Get(':adjuntoId')
  // Sin esto, un navegador puede decidir por su cuenta que un archivo es HTML
  // y ejecutarlo, que es exactamente lo que la lista de formatos evita.
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, max-age=300')
  async descargar(
    @Param('ordenId') ordenId: string,
    @Param('adjuntoId') adjuntoId: string,
    @Session() session: UserSession,
  ): Promise<StreamableFile> {
    const archivo = await this.adjuntos.descargar(
      ordenId,
      adjuntoId,
      usuarioActual(session),
    );

    return new StreamableFile(archivo.stream, {
      type: archivo.mimeType,
      length: archivo.tamanoBytes,
      disposition: cabeceraDisposicion(archivo.nombreArchivo, archivo.enLinea),
    });
  }

  @Delete(':adjuntoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminar(
    @Param('ordenId') ordenId: string,
    @Param('adjuntoId') adjuntoId: string,
    @Session() session: UserSession,
  ) {
    return this.adjuntos.eliminar(ordenId, adjuntoId, usuarioActual(session));
  }
}
