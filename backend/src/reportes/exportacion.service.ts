import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

import { Prisma } from '../generated/prisma/client';
import type { OrdenExportada } from './reportes.service';

/**
 * TCI-59 — exportacion de reportes.
 *
 * Dos formatos con dos publicos distintos: el CSV es para seguir trabajando los
 * datos en Excel, y el PDF es para imprimir o mandarle al cliente, por eso lleva
 * membrete.
 *
 * El membrete es tipografico y no el logotipo: el de TCI es blanco y rojo sobre
 * transparente, asi que sobre el papel blanco del PDF desapareceria. Se compone
 * con el rojo institucional, que si funciona sobre claro.
 */

const ROJO_TCI = '#C61D1A';
const GRIS = '#6B7280';
const NEGRO = '#111111';

const COLUMNAS = [
  'Numero',
  'Titulo',
  'Estado',
  'Prioridad',
  'Cliente',
  'Sede',
  'Equipo',
  'Tipo',
  'Tecnico',
  'Creada',
  'Programada',
  'Inicio',
  'Fin',
  'Horas',
  'Mano de obra',
  'Repuestos',
  'Total',
  'Moneda',
] as const;

@Injectable()
export class ExportacionService {
  /**
   * CSV separado por punto y coma, con BOM.
   *
   * Las dos cosas son por Excel, que es donde esto se va a abrir: en un Windows
   * en espanol el separador de lista es `;`, y con `,` todas las columnas caen
   * en una sola celda. El BOM es lo que hace que lea las tildes como UTF-8 en
   * vez de mojibake.
   */
  csv(ordenes: OrdenExportada[]): Buffer {
    const lineas = [
      COLUMNAS.join(';'),
      ...ordenes.map((orden) =>
        [
          orden.numero,
          orden.titulo,
          orden.estado,
          orden.prioridad,
          orden.cliente.nombre,
          orden.sede?.nombre ?? '',
          orden.equipo ? `${orden.equipo.codigo} ${orden.equipo.nombre}` : '',
          orden.tipoMantenimiento.nombre,
          orden.tecnico?.name ?? '',
          fecha(orden.createdAt),
          fecha(orden.fechaProgramada),
          fecha(orden.fechaInicio),
          fecha(orden.fechaFin),
          decimal(orden.horasTrabajadas),
          decimal(orden.costoManoObra),
          decimal(orden.costoRepuestos),
          decimal(orden.costoTotal),
          orden.moneda,
        ]
          .map(campoCsv)
          .join(';'),
      ),
    ];

    return Buffer.from('﻿' + lineas.join('\r\n'), 'utf8');
  }

  /**
   * PDF apaisado con las ordenes del periodo.
   *
   * Apaisado porque son dieciocho columnas: en vertical no caben sin encoger la
   * letra hasta lo ilegible. Se recortan a las que importan al imprimir y el
   * resto queda en el CSV.
   */
  pdf(
    ordenes: OrdenExportada[],
    contexto: { desde?: string; hasta?: string; titulo: string },
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      size: 'LETTER',
      layout: 'landscape',
      margin: 36,
    });
    const trozos: Buffer[] = [];
    doc.on('data', (trozo: Buffer) => trozos.push(trozo));

    const terminado = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(trozos)));
    });

    this.membrete(doc, contexto);
    this.tabla(doc, ordenes);
    this.pie(doc, ordenes.length);

    doc.end();
    return terminado;
  }

  private membrete(
    doc: PDFKit.PDFDocument,
    contexto: { desde?: string; hasta?: string; titulo: string },
  ): void {
    doc
      .fillColor(ROJO_TCI)
      .fontSize(18)
      .font('Helvetica-Bold')
      .text('TCI', doc.page.margins.left, doc.page.margins.top, {
        continued: true,
      })
      .fillColor(NEGRO)
      .fontSize(10)
      .font('Helvetica')
      .text('  Tecnicos de Control Industrial');

    doc
      .moveTo(doc.page.margins.left, doc.y + 4)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
      .lineWidth(2)
      .strokeColor(ROJO_TCI)
      .stroke();

    doc.moveDown(0.8);
    doc
      .fillColor(NEGRO)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(contexto.titulo);

    const periodo =
      contexto.desde || contexto.hasta
        ? `Periodo: ${contexto.desde ?? 'inicio'} a ${contexto.hasta ?? 'hoy'}`
        : 'Periodo: todo el historial';
    doc
      .fillColor(GRIS)
      .fontSize(9)
      .font('Helvetica')
      .text(`${periodo}   ·   Generado el ${fecha(new Date())}`);
    doc.moveDown(0.6);
  }

  private tabla(doc: PDFKit.PDFDocument, ordenes: OrdenExportada[]): void {
    // Anchos fijos: el contenido es variable y una tabla que se recoloca sola
    // por fila deja de leerse como tabla.
    const columnas: {
      titulo: string;
      ancho: number;
      valor: (o: OrdenExportada) => string;
    }[] = [
      { titulo: 'Numero', ancho: 62, valor: (o) => o.numero },
      { titulo: 'Titulo', ancho: 150, valor: (o) => o.titulo },
      { titulo: 'Estado', ancho: 62, valor: (o) => o.estado },
      { titulo: 'Cliente', ancho: 105, valor: (o) => o.cliente.nombre },
      { titulo: 'Equipo', ancho: 80, valor: (o) => o.equipo?.codigo ?? '—' },
      { titulo: 'Tipo', ancho: 95, valor: (o) => o.tipoMantenimiento.nombre },
      {
        titulo: 'Tecnico',
        ancho: 95,
        valor: (o) => o.tecnico?.name ?? 'Sin asignar',
      },
      { titulo: 'Creada', ancho: 62, valor: (o) => fecha(o.createdAt) },
      { titulo: 'Cierre', ancho: 62, valor: (o) => fecha(o.fechaFin) },
      { titulo: 'Horas', ancho: 40, valor: (o) => decimal(o.horasTrabajadas) },
      { titulo: 'Total', ancho: 65, valor: (o) => decimal(o.costoTotal) },
    ];

    const izquierda = doc.page.margins.left;
    const alturaFila = 16;
    const limiteInferior = doc.page.height - doc.page.margins.bottom - 24;

    const cabecera = () => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(GRIS);
      let x = izquierda;
      for (const columna of columnas) {
        doc.text(columna.titulo.toUpperCase(), x, doc.y, {
          width: columna.ancho - 4,
          lineBreak: false,
        });
        x += columna.ancho;
      }
      doc.moveDown(0.3);
      doc
        .moveTo(izquierda, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .lineWidth(0.5)
        .strokeColor('#E0E0E0')
        .stroke();
      doc.moveDown(0.3);
    };

    cabecera();

    doc.font('Helvetica').fontSize(8).fillColor(NEGRO);
    for (const orden of ordenes) {
      if (doc.y + alturaFila > limiteInferior) {
        doc.addPage();
        cabecera();
        doc.font('Helvetica').fontSize(8).fillColor(NEGRO);
      }

      const y = doc.y;
      let x = izquierda;
      for (const columna of columnas) {
        doc.text(columna.valor(orden), x, y, {
          width: columna.ancho - 4,
          lineBreak: false,
          ellipsis: true,
        });
        x += columna.ancho;
      }
      doc.y = y + alturaFila;
    }
  }

  private pie(doc: PDFKit.PDFDocument, filas: number): void {
    doc.moveDown(0.5);
    doc
      .fillColor(GRIS)
      .fontSize(8)
      .text(`${filas} orden(es) en el reporte.`, doc.page.margins.left, doc.y);
  }
}

/**
 * Escapa un campo de CSV. Solo se entrecomilla cuando hace falta —separador,
 * comillas o salto de linea— para que el archivo siga siendo legible a ojo.
 */
function campoCsv(valor: string): string {
  if (!/[;"\r\n]/.test(valor)) return valor;
  return `"${valor.replace(/"/g, '""')}"`;
}

function fecha(valor: Date | null): string {
  if (!valor) return '';
  const dia = String(valor.getDate()).padStart(2, '0');
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getFullYear()}`;
}

function decimal(valor: Prisma.Decimal | null): string {
  return valor ? valor.toFixed(2) : '';
}
