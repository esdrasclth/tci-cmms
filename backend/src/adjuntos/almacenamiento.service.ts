import { Readable } from 'node:stream';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';

import { cabeceraDisposicion } from './disposicion';

/**
 * Acceso al MinIO donde viven los adjuntos — TCI-43.
 *
 * MinIO habla el protocolo de S3, asi que se usa el SDK de AWS. Dos ajustes que
 * no son opcionales contra MinIO:
 *
 *  - `forcePathStyle`: MinIO espera `https://host/bucket/clave`. Sin esto el SDK
 *    arma `https://bucket.host/clave`, que no resuelve.
 *  - `region`: MinIO la ignora, pero el SDK se niega a firmar sin una.
 *
 * **El bucket es privado y se queda privado.** El backend es el unico que habla
 * con MinIO; el navegador nunca recibe una URL del bucket. Es lo que permite
 * comprobar el permiso sobre la orden antes de entregar cada archivo.
 */
@Injectable()
export class AlmacenamientoService {
  private readonly log = new Logger(AlmacenamientoService.name);
  private readonly cliente: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = exigir('S3_ENDPOINT');
    this.bucket = exigir('S3_BUCKET');

    this.cliente = new S3Client({
      endpoint,
      region: process.env.S3_REGION ?? 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      credentials: {
        accessKeyId: exigir('S3_ACCESS_KEY'),
        secretAccessKey: exigir('S3_SECRET_KEY'),
      },
    });

    this.log.log(`Adjuntos en ${endpoint}/${this.bucket}`);
  }

  async guardar(
    clave: string,
    contenido: Buffer,
    mimeType: string,
    nombreArchivo: string,
  ): Promise<void> {
    await this.cliente.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: clave,
        Body: contenido,
        ContentType: mimeType,
        // Para que al descargarlo desde la consola de MinIO conserve su nombre
        // original y no la clave completa. Va por cabecera HTTP, asi que el
        // nombre tiene que pasar por la codificacion de RFC 5987.
        ContentDisposition: cabeceraDisposicion(nombreArchivo, true),
      }),
    );
  }

  /** Devuelve el objeto como stream, para no cargarlo entero en memoria. */
  async leer(clave: string): Promise<Readable> {
    const respuesta = await this.cliente.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: clave }),
    );

    const cuerpo = respuesta.Body;
    if (!(cuerpo instanceof Readable)) {
      throw new Error(`MinIO devolvio un cuerpo inesperado para ${clave}.`);
    }
    return cuerpo;
  }

  /**
   * Borra el objeto. No falla si ya no existe: S3 trata el DELETE como
   * idempotente, y eso es justo lo que conviene aqui — si el objeto se perdio,
   * la fila de la base igual tiene que poder limpiarse.
   */
  async eliminar(clave: string): Promise<void> {
    await this.cliente.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }),
    );
  }
}

function exigir(variable: string): string {
  const valor = process.env[variable];
  if (!valor) {
    throw new Error(
      `${variable} no esta definida. Los adjuntos (TCI-43) necesitan la configuracion de MinIO; ver .env.example.`,
    );
  }
  return valor;
}
