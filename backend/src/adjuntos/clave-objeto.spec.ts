import { TipoAdjunto } from '../generated/prisma/enums';
import { construirClave, sanearNombre } from './clave-objeto';
import { cabeceraDisposicion } from './disposicion';
import { nombreOriginal } from './nombre-original';
import { detectarFormato } from './tipos-permitidos';

describe('construirClave (TCI-43)', () => {
  const base = {
    numeroOrden: 'OT-2026-0007',
    idAdjunto: 'adjx1y2z3',
    nombreArchivo: 'compresor.jpg',
  };

  it('agrupa por anio, orden y tipo', () => {
    expect(construirClave({ ...base, tipo: TipoAdjunto.EVIDENCIA_ANTES })).toBe(
      'ordenes/2026/OT-2026-0007/evidencia-antes/adjx1y2z3-compresor.jpg',
    );
  });

  it('usa una carpeta distinta por tipo de adjunto', () => {
    const carpeta = (tipo: TipoAdjunto) =>
      construirClave({ ...base, tipo }).split('/')[3];

    expect(carpeta(TipoAdjunto.EVIDENCIA_ANTES)).toBe('evidencia-antes');
    expect(carpeta(TipoAdjunto.EVIDENCIA_DESPUES)).toBe('evidencia-despues');
    expect(carpeta(TipoAdjunto.DOCUMENTO)).toBe('documentos');
  });

  it('toma el anio del numero de orden, no de la fecha actual', () => {
    expect(
      construirClave({
        ...base,
        numeroOrden: 'OT-2019-0001',
        tipo: TipoAdjunto.DOCUMENTO,
      }),
    ).toMatch(/^ordenes\/2019\/OT-2019-0001\//);
  });

  it('no rompe si el numero de orden deja de tener el formato esperado', () => {
    expect(
      construirClave({
        ...base,
        numeroOrden: 'LEGADO-42',
        tipo: TipoAdjunto.DOCUMENTO,
      }),
    ).toBe('ordenes/sin-anio/LEGADO-42/documentos/adjx1y2z3-compresor.jpg');
  });

  it('el id va delante del nombre: dos archivos homonimos no se pisan', () => {
    const uno = construirClave({ ...base, tipo: TipoAdjunto.DOCUMENTO });
    const otro = construirClave({
      ...base,
      idAdjunto: 'adjotro99',
      tipo: TipoAdjunto.DOCUMENTO,
    });

    expect(uno).not.toBe(otro);
  });
});

describe('sanearNombre', () => {
  it('quita acentos y espacios y conserva la extension', () => {
    expect(sanearNombre('Compresión final.PNG')).toBe('compresion-final.png');
  });

  it('colapsa los caracteres raros en un solo guion', () => {
    expect(sanearNombre('Evidencia #2 — cámara (después).jpg')).toBe(
      'evidencia-2-camara-despues.jpg',
    );
  });

  it('recorta un nombre largo sin dejar el guion al final', () => {
    const saneado = sanearNombre(`${'a'.repeat(200)}.jpg`);

    expect(saneado.endsWith('.jpg')).toBe(true);
    expect(saneado.length).toBeLessThanOrEqual(65);
  });

  it('sobrevive a un nombre sin nada aprovechable', () => {
    expect(sanearNombre('***.jpg')).toBe('archivo.jpg');
    expect(sanearNombre('...')).toBe('archivo');
  });

  it('deja el nombre sin extension si no la traia', () => {
    expect(sanearNombre('captura')).toBe('captura');
  });
});

describe('detectarFormato', () => {
  const conFirma = (bytes: number[], relleno = 32) =>
    Buffer.concat([Buffer.from(bytes), Buffer.alloc(relleno, 0x00)]);

  it('reconoce los formatos permitidos por sus bytes', () => {
    expect(detectarFormato(conFirma([0xff, 0xd8, 0xff]))?.mimeType).toBe(
      'image/jpeg',
    );
    expect(
      detectarFormato(
        conFirma([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )?.mimeType,
    ).toBe('image/png');
    expect(detectarFormato(Buffer.from('%PDF-1.7\n'))?.mimeType).toBe(
      'application/pdf',
    );
  });

  it('reconoce el WEBP, cuya firma no empieza en el byte 0', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.alloc(4, 0x00),
      Buffer.from('WEBP', 'ascii'),
    ]);

    expect(detectarFormato(webp)?.mimeType).toBe('image/webp');
  });

  it('rechaza un HTML aunque lo llamen .png', () => {
    expect(detectarFormato(Buffer.from('<html><script>'))).toBeNull();
  });

  it('rechaza un archivo mas corto que la propia firma', () => {
    expect(detectarFormato(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectarFormato(Buffer.alloc(0))).toBeNull();
  });

  it('los PDF no se sirven en linea; las imagenes si', () => {
    expect(detectarFormato(Buffer.from('%PDF-1.7'))?.enLinea).toBe(false);
    expect(detectarFormato(conFirma([0xff, 0xd8, 0xff]))?.enLinea).toBe(true);
  });
});

describe('cabeceraDisposicion', () => {
  it('manda el nombre real en filename* y un respaldo ASCII en filename', () => {
    const cabecera = cabeceraDisposicion('Compresión final.png', true);

    expect(cabecera.startsWith('inline; ')).toBe(true);
    expect(cabecera).toContain('filename="Compresion final.png"');
    expect(cabecera).toContain("filename*=UTF-8''Compresi%C3%B3n%20final.png");
  });

  it('la cabecera nunca lleva bytes fuera de ASCII', () => {
    const cabecera = cabeceraDisposicion('中文 informe.pdf', false);

    expect(cabecera.startsWith('attachment; ')).toBe(true);
    // Es lo que hacia fallar la subida a MinIO con un 400.
    expect(/^[\x20-\x7e]*$/.test(cabecera)).toBe(true);
  });

  it('no deja que una comilla corte la cabecera', () => {
    const cabecera = cabeceraDisposicion('foto".png', true);

    expect(cabecera).toContain('filename="foto.png"');
  });
});

describe('nombreOriginal', () => {
  it('recompone un nombre en espanol que multer decodifico como latin1', () => {
    const comoLoEntregaMulter = Buffer.from(
      'Compresión final.png',
      'utf8',
    ).toString('latin1');

    expect(nombreOriginal(comoLoEntregaMulter)).toBe('Compresión final.png');
  });

  it('deja intacto un nombre que ya era ASCII', () => {
    expect(nombreOriginal('compressor-final.png')).toBe('compressor-final.png');
  });

  it('no destroza un nombre cuyos bytes no son UTF-8 valido', () => {
    const raro = Buffer.from([0x66, 0x6f, 0x74, 0x6f, 0xff]).toString('latin1');

    expect(nombreOriginal(raro)).toBe(raro);
  });
});
