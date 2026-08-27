# -*- coding: utf-8 -*-
"""
Generador del Manual de Usuario del sistema CMMS de TCI.

A diferencia de `generar_documento.py` --que es el informe academico y sigue
normas APA-- este documento es material de producto: va dirigido a las personas
que van a operar el sistema (administradores y tecnicos de TCI), y por eso usa
la identidad visual de la empresa en lugar del formato de la asignatura:
Arial, rojo institucional #C61D1A, cabecera y pie corporativos.

Uso:    python docs/generar_manual.py
Salida: docs/TCI_Manual_Usuario.pdf
"""
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether,
                                NextPageTemplate, PageBreak, PageTemplate,
                                Paragraph, Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(BASE)
OUT = os.path.join(BASE, "TCI_Manual_Usuario.pdf")
LOGO = os.path.join(BASE, "assets", "logo-negativo.png")

VERSION = "Versión 1.0"
FECHA = "Agosto de 2026"

# ---------------------------------------------------------------------------
# Paleta institucional de TCI
# Verificada en el logotipo (branding/logo.png -> #C61D19) y en las variables
# CSS del sitio oficial (--rojo-vino #C61D1A). La misma que usa la aplicacion.
# ---------------------------------------------------------------------------
ROJO = colors.HexColor("#C61D1A")
ROJO_OSC = colors.HexColor("#8E1512")
ROJO_TENUE = colors.HexColor("#FBEDEC")
NEGRO = colors.HexColor("#000000")
GRAFITO = colors.HexColor("#333333")
GRIS = colors.HexColor("#6B7280")
HUMO = colors.HexColor("#F8F9FA")
BORDE = colors.HexColor("#E0E0E0")
BLANCO = colors.white

# ---------------------------------------------------------------------------
# Tipografia: Arial, la del sitio y la de la aplicacion
# ---------------------------------------------------------------------------
WF = r"C:\Windows\Fonts"


def _reg(nombre, archivo):
    ruta_fuente = os.path.join(WF, archivo)
    if os.path.exists(ruta_fuente):
        pdfmetrics.registerFont(TTFont(nombre, ruta_fuente))
        return True
    return False


if _reg("Arial", "arial.ttf"):
    _reg("Arial-B", "arialbd.ttf")
    _reg("Arial-I", "ariali.ttf")
    _reg("Arial-BI", "arialbi.ttf")
    pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-B",
                                  italic="Arial-I", boldItalic="Arial-BI")
    F, FB, FI = "Arial", "Arial-B", "Arial-I"
else:
    F, FB, FI = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

# ---------------------------------------------------------------------------
# Geometria
# ---------------------------------------------------------------------------
ANCHO, ALTO = letter
MARGEN = 0.95 * inch
UTIL = ANCHO - 2 * MARGEN          # 6.6 pulgadas de columna de texto
SUP = 1.05 * inch
INF = 0.85 * inch

# ---------------------------------------------------------------------------
# Estilos
# ---------------------------------------------------------------------------
S = {}
S["cuerpo"] = ParagraphStyle("cuerpo", fontName=F, fontSize=10, leading=15,
                             alignment=TA_JUSTIFY, textColor=GRAFITO,
                             spaceAfter=7)
S["intro"] = ParagraphStyle("intro", parent=S["cuerpo"], fontSize=10.5,
                            leading=16, textColor=NEGRO)
S["h1"] = ParagraphStyle("h1", fontName=FB, fontSize=19, leading=23,
                         alignment=TA_LEFT, textColor=NEGRO, spaceAfter=2)
S["h1num"] = ParagraphStyle("h1num", fontName=FB, fontSize=11, leading=13,
                            textColor=ROJO, spaceAfter=3)
S["h2"] = ParagraphStyle("h2", fontName=FB, fontSize=12, leading=16,
                         textColor=ROJO, spaceBefore=14, spaceAfter=4)
S["h3"] = ParagraphStyle("h3", fontName=FB, fontSize=10.5, leading=14,
                         textColor=NEGRO, spaceBefore=9, spaceAfter=2)
S["vineta"] = ParagraphStyle("vineta", parent=S["cuerpo"], alignment=TA_LEFT,
                             leftIndent=16, bulletIndent=4, spaceAfter=3,
                             bulletFontName=F, bulletFontSize=10)
S["paso"] = ParagraphStyle("paso", parent=S["cuerpo"], alignment=TA_LEFT,
                           leftIndent=20, bulletIndent=0, spaceAfter=5,
                           bulletFontName=FB, bulletFontSize=10)
S["th"] = ParagraphStyle("th", fontName=FB, fontSize=8.5, leading=11,
                         textColor=BLANCO, alignment=TA_LEFT)
S["td"] = ParagraphStyle("td", fontName=F, fontSize=8.5, leading=11.5,
                         textColor=GRAFITO, alignment=TA_LEFT)
S["td_b"] = ParagraphStyle("td_b", parent=S["td"], fontName=FB,
                           textColor=NEGRO)
S["td_c"] = ParagraphStyle("td_c", parent=S["td"], alignment=TA_CENTER)
S["tab_tit"] = ParagraphStyle("tab_tit", fontName=FB, fontSize=9, leading=12,
                              textColor=GRIS, spaceBefore=10, spaceAfter=4)
S["nota_tit"] = ParagraphStyle("nota_tit", fontName=FB, fontSize=8.5,
                               leading=11, textColor=ROJO_OSC, spaceAfter=2)
S["nota_txt"] = ParagraphStyle("nota_txt", fontName=F, fontSize=9,
                               leading=13, textColor=GRAFITO,
                               alignment=TA_JUSTIFY)
S["toc0"] = ParagraphStyle("toc0", fontName=FB, fontSize=10, leading=19,
                           textColor=NEGRO)
S["toc1"] = ParagraphStyle("toc1", fontName=F, fontSize=9.5, leading=15,
                           leftIndent=20, textColor=GRAFITO)
S["pie_tab"] = ParagraphStyle("pie_tab", fontName=FI, fontSize=8, leading=11,
                              textColor=GRIS, spaceBefore=3, spaceAfter=10)

story = []
_sec = [0]
_sub = [0]
_tabla = [0]
_figura = [0]


# ---------------------------------------------------------------------------
# Utilidades de composicion
# ---------------------------------------------------------------------------
def p(texto, estilo="cuerpo"):
    story.append(Paragraph(texto, S[estilo]))


def sp(alto=6):
    story.append(Spacer(1, alto))


def salto():
    story.append(PageBreak())


def _regla(ancho, color=BORDE, grosor=0.8):
    t = Table([[""]], colWidths=[ancho], rowHeights=[grosor])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color)]))
    t.hAlign = "LEFT"
    return t


def h1(titulo):
    """Capitulo. Siempre abre pagina y entra en el indice."""
    _sec[0] += 1
    _sub[0] = 0
    if len(story) > 3:
        story.append(PageBreak())
    story.append(Paragraph("CAPÍTULO %d" % _sec[0], S["h1num"]))
    par = Paragraph(titulo, S["h1"])
    par._toc = (0, "%d. %s" % (_sec[0], titulo))
    story.append(par)
    story.append(_regla(1.8 * inch, ROJO, 2.2))
    story.append(Spacer(1, 12))


def h2(titulo):
    _sub[0] += 1
    numero = "%d.%d" % (_sec[0], _sub[0])
    par = Paragraph("%s&nbsp;&nbsp;%s" % (numero, titulo), S["h2"])
    par._toc = (1, "%s %s" % (numero, titulo))
    story.append(par)


def h3(titulo):
    story.append(Paragraph(titulo, S["h3"]))


def lista(items):
    for it in items:
        story.append(Paragraph(it, S["vineta"], bulletText="\u2022"))


def pasos(items):
    """Secuencia numerada. El numero va en rojo: es la marca de 'haga esto'."""
    for i, it in enumerate(items, start=1):
        estilo = ParagraphStyle("paso%d" % i, parent=S["paso"],
                                bulletColor=ROJO)
        story.append(Paragraph(it, estilo, bulletText="%d." % i))


def _celda(valor, estilo="td"):
    return Paragraph(valor, S[estilo]) if isinstance(valor, str) else valor


def tabla(titulo, cabecera, filas, anchos, nota=None, centro=(), fuerte=(0,)):
    """Tabla con cabecera roja, filas alternas y sin lineas verticales."""
    _tabla[0] += 1
    bloque = []
    if titulo:
        bloque.append(Paragraph("Tabla %d. %s" % (_tabla[0], titulo),
                                S["tab_tit"]))
    datos = [[_celda(x, "th") for x in cabecera]]
    for fila in filas:
        linea = []
        for i, valor in enumerate(fila):
            if i in centro:
                estilo = "td_c"
            elif i in fuerte:
                estilo = "td_b"
            else:
                estilo = "td"
            linea.append(_celda(valor, estilo))
        datos.append(linea)

    t = Table(datos, colWidths=anchos, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ROJO),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [BLANCO, HUMO]),
        ("LINEBELOW", (0, 1), (-1, -2), 0.25, BORDE),
        ("LINEBELOW", (0, -1), (-1, -1), 0.9, BORDE),
    ]))
    bloque.append(t)
    if nota:
        bloque.append(Paragraph(nota, S["pie_tab"]))
    else:
        bloque.append(Spacer(1, 11))

    if len(filas) <= 6:
        story.append(KeepTogether(bloque))
    else:
        story.extend(bloque)


def aviso(titulo, texto, color=ROJO, fondo=ROJO_TENUE):
    """Recuadro destacado: nota, advertencia o atajo."""
    interior = Table([[Paragraph(titulo.upper(), S["nota_tit"])],
                      [Paragraph(texto, S["nota_txt"])]],
                     colWidths=[UTIL - 26])
    interior.setStyle(TableStyle([
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 0),
    ]))

    t = Table([[interior]], colWidths=[UTIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fondo),
        ("LINEBEFORE", (0, 0), (0, -1), 3, color),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
    ]))
    t.hAlign = "LEFT"
    story.append(Spacer(1, 4))
    story.append(KeepTogether(t))
    story.append(Spacer(1, 10))


def consejo(texto):
    aviso("Atajo", texto, color=GRIS, fondo=HUMO)


def figura(titulo, dibujo, pie=None):
    _figura[0] += 1
    bloque = [Paragraph("Figura %d. %s" % (_figura[0], titulo), S["tab_tit"]),
              dibujo]
    bloque.append(Paragraph(pie, S["pie_tab"]) if pie else Spacer(1, 11))
    story.append(KeepTogether(bloque))


def ruta(*partes):
    """Camino de navegacion: Panel > Repuestos > Nuevo repuesto."""
    texto = "  &rarr;  ".join("<b>%s</b>" % x for x in partes)
    t = Table([[Paragraph(texto, S["nota_txt"])]], colWidths=[UTIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), HUMO),
        ("BOX", (0, 0), (-1, -1), 0.4, BORDE),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    t.hAlign = "LEFT"
    story.append(t)
    story.append(Spacer(1, 9))


# ===========================================================================
# PORTADA (se dibuja con el canvas: lleva una banda a sangre)
# ===========================================================================
def _portada(canvas, doc):
    canvas.saveState()

    alto_banda = 3.05 * inch
    canvas.setFillColor(NEGRO)
    canvas.rect(0, ALTO - alto_banda, ANCHO, alto_banda, stroke=0, fill=1)

    if os.path.exists(LOGO):
        ancho_logo = 5.0 * inch
        alto_logo = ancho_logo * 1991.0 / 5228.0
        canvas.drawImage(LOGO, (ANCHO - ancho_logo) / 2.0,
                         ALTO - alto_banda + (alto_banda - alto_logo) / 2.0,
                         width=ancho_logo, height=alto_logo, mask=None)

    y = ALTO - alto_banda - 0.55 * inch
    canvas.setFillColor(ROJO)
    canvas.rect(MARGEN, y, 2.3 * inch, 3.4, stroke=0, fill=1)

    y -= 0.62 * inch
    canvas.setFillColor(NEGRO)
    canvas.setFont(FB, 30)
    canvas.drawString(MARGEN, y, "Manual de Usuario")

    y -= 0.38 * inch
    canvas.setFillColor(GRAFITO)
    canvas.setFont(F, 13.5)
    canvas.drawString(MARGEN, y, "Sistema de Gestión de Órdenes de Trabajo")
    y -= 0.24 * inch
    canvas.drawString(MARGEN, y, "y Mantenimiento (CMMS)")

    y -= 0.42 * inch
    canvas.setFillColor(GRIS)
    canvas.setFont(F, 10.5)
    canvas.drawString(MARGEN, y, "TCI Técnicos de Control Industrial   |   "
                                 "%s   |   %s" % (VERSION, FECHA))

    # Sumario breve, para que la portada diga de que trata el documento.
    y -= 0.75 * inch
    canvas.setFillColor(GRAFITO)
    for linea in [
        "Guía completa de operación del sistema con el que TCI registra y",
        "da seguimiento a su trabajo de mantenimiento: órdenes de trabajo,",
        "clientes y equipos, evidencia de campo, almacén de repuestos,",
        "mantenimiento preventivo, notificaciones y reportes.",
    ]:
        canvas.setFont(F, 11)
        canvas.drawString(MARGEN, y, linea)
        y -= 0.235 * inch

    # Ficha del documento, abajo del todo.
    caja_y = INF + 0.15 * inch
    caja_alto = 1.42 * inch
    canvas.setFillColor(HUMO)
    canvas.rect(MARGEN, caja_y, UTIL, caja_alto, stroke=0, fill=1)
    canvas.setFillColor(ROJO)
    canvas.rect(MARGEN, caja_y, 3.2, caja_alto, stroke=0, fill=1)

    lineas = [
        ("Dirigido a", "Administradores y técnicos de TCI"),
        ("Alcance", "Todas las pantallas del sistema en su versión 1"),
        ("Requisito previo", "Cuenta activa creada por un administrador"),
        ("Soporte", "cotizaciones@tcihn.com   |   +504 9565-9697"),
    ]
    ty = caja_y + caja_alto - 0.33 * inch
    for etiqueta, valor in lineas:
        canvas.setFont(FB, 8.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(MARGEN + 0.28 * inch, ty, etiqueta.upper())
        canvas.setFont(F, 9.5)
        canvas.setFillColor(GRAFITO)
        canvas.drawString(MARGEN + 1.75 * inch, ty, valor)
        ty -= 0.30 * inch

    canvas.setFont(FI, 9)
    canvas.setFillColor(GRIS)
    canvas.drawCentredString(ANCHO / 2.0, INF - 0.22 * inch,
                             "Soluciones a tu Industria")
    canvas.restoreState()


# ===========================================================================
# CABECERA Y PIE DE LAS PAGINAS INTERIORES
# ===========================================================================
def _marco(canvas, doc):
    canvas.saveState()

    # Cabecera: filete rojo corto, marca a la izquierda y capitulo a la derecha.
    y = ALTO - 0.68 * inch
    canvas.setFillColor(ROJO)
    canvas.rect(MARGEN, y + 11, 0.42 * inch, 2.2, stroke=0, fill=1)
    canvas.setFont(FB, 8)
    canvas.setFillColor(GRAFITO)
    canvas.drawString(MARGEN + 0.55 * inch, y + 9, "TCI   |   MANUAL DE USUARIO")
    seccion = getattr(doc, "seccion", "")
    if seccion:
        canvas.setFont(F, 8)
        canvas.setFillColor(GRIS)
        canvas.drawRightString(ANCHO - MARGEN, y + 9, seccion)
    canvas.setStrokeColor(BORDE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGEN, y + 2, ANCHO - MARGEN, y + 2)

    # Pie: linea fina, referencia del sistema y numero de pagina en rojo.
    canvas.setStrokeColor(BORDE)
    canvas.line(MARGEN, INF - 0.22 * inch, ANCHO - MARGEN, INF - 0.22 * inch)
    canvas.setFont(F, 7.5)
    canvas.setFillColor(GRIS)
    canvas.drawString(MARGEN, INF - 0.42 * inch,
                      "Sistema de Gestión de Órdenes de Trabajo y "
                      "Mantenimiento (CMMS)   |   %s" % VERSION)
    canvas.setFont(FB, 9)
    canvas.setFillColor(ROJO)
    canvas.drawRightString(ANCHO - MARGEN, INF - 0.44 * inch, str(doc.page))
    canvas.restoreState()


# ===========================================================================
# DIAGRAMA DE ESTADOS (figura del capitulo de ordenes)
# ===========================================================================
def _caja(dib, x, y, ancho, alto, texto, relleno, borde, color_texto):
    dib.add(Rect(x, y, ancho, alto, fillColor=relleno, strokeColor=borde,
                 strokeWidth=0.9, rx=4, ry=4))
    dib.add(String(x + ancho / 2.0, y + alto / 2.0 - 3.2, texto,
                   fontName=FB, fontSize=7.6, fillColor=color_texto,
                   textAnchor="middle"))


def _flecha(dib, x1, y1, x2, y2, etiqueta=None, desplazar=0):
    dib.add(Line(x1, y1, x2, y2, strokeColor=GRIS, strokeWidth=0.9))
    if y1 == y2:
        signo = 1 if x2 > x1 else -1
        dib.add(Polygon([x2, y2, x2 - 5 * signo, y2 + 2.6,
                         x2 - 5 * signo, y2 - 2.6],
                        fillColor=GRIS, strokeColor=GRIS))
        if etiqueta:
            dib.add(String((x1 + x2) / 2.0, y1 + 4 + desplazar, etiqueta,
                           fontName=F, fontSize=6.6, fillColor=GRAFITO,
                           textAnchor="middle"))
    else:
        signo = 1 if y2 > y1 else -1
        dib.add(Polygon([x2, y2, x2 + 2.6, y2 - 5 * signo,
                         x2 - 2.6, y2 - 5 * signo],
                        fillColor=GRIS, strokeColor=GRIS))
        if etiqueta:
            dib.add(String(x1 + 4 + desplazar, (y1 + y2) / 2.0 - 2, etiqueta,
                           fontName=F, fontSize=6.6, fillColor=GRAFITO,
                           textAnchor="start"))


def diagrama_estados():
    dib = Drawing(460, 236)

    ancho_caja, alto_caja = 88, 26
    fila_alta, fila_media, fila_baja = 178, 104, 26
    x_pend, x_asig, x_proc, x_comp = 8, 128, 248, 368

    _caja(dib, x_pend, fila_alta, ancho_caja, alto_caja, "PENDIENTE",
          HUMO, BORDE, GRAFITO)
    _caja(dib, x_asig, fila_alta, ancho_caja, alto_caja, "ASIGNADA",
          colors.HexColor("#DBEAFE"), colors.HexColor("#93C5FD"),
          colors.HexColor("#1E3A8A"))
    _caja(dib, x_proc, fila_alta, ancho_caja, alto_caja, "EN PROCESO",
          colors.HexColor("#FEF3C7"), colors.HexColor("#FCD34D"),
          colors.HexColor("#78350F"))
    _caja(dib, x_comp, fila_alta, ancho_caja, alto_caja, "COMPLETADA",
          colors.HexColor("#D1FAE5"), colors.HexColor("#6EE7B7"),
          colors.HexColor("#064E3B"))
    _caja(dib, x_proc, fila_media, ancho_caja, alto_caja, "EN ESPERA",
          colors.HexColor("#FFEDD5"), colors.HexColor("#FDBA74"),
          colors.HexColor("#7C2D12"))
    _caja(dib, x_asig, fila_baja, ancho_caja, alto_caja, "CANCELADA",
          HUMO, GRIS, GRIS)

    medio = fila_alta + alto_caja / 2.0
    _flecha(dib, x_pend + ancho_caja, medio, x_asig, medio, "asignar")
    _flecha(dib, x_asig + ancho_caja, medio, x_proc, medio, "iniciar")
    _flecha(dib, x_proc + ancho_caja, medio, x_comp, medio, "completar")

    # Pausa y reanudacion, en columnas separadas para que no se pisen.
    _flecha(dib, x_proc + 24, fila_alta, x_proc + 24, fila_media + alto_caja,
            "pausar", -40)
    # La etiqueta de reanudar va a la izquierda de su flecha: a la derecha
    # chocaria con el trazo de reabrir, que sube por ese mismo costado.
    _flecha(dib, x_proc + 64, fila_media + alto_caja, x_proc + 64, fila_alta)
    dib.add(String(x_proc + 56, (fila_media + alto_caja + fila_alta) / 2.0 - 2,
                   "reanudar", fontName=F, fontSize=6.6, fillColor=GRAFITO,
                   textAnchor="end"))

    # Reabrir: baja desde COMPLETADA, rodea EN ESPERA por la derecha y vuelve
    # a entrar en EN PROCESO, que es su destino real.
    y_reabrir = fila_media - 22
    y_paso = (fila_media + alto_caja + fila_alta) / 2.0
    x_rodeo = x_proc + ancho_caja + 14
    x_entrada = x_proc + ancho_caja - 12
    for x1, y1, x2, y2 in [
        (x_comp + ancho_caja / 2.0, fila_alta, x_comp + ancho_caja / 2.0,
         y_reabrir),
        (x_comp + ancho_caja / 2.0, y_reabrir, x_rodeo, y_reabrir),
        (x_rodeo, y_reabrir, x_rodeo, y_paso),
        (x_rodeo, y_paso, x_entrada, y_paso),
    ]:
        dib.add(Line(x1, y1, x2, y2, strokeColor=GRIS, strokeWidth=0.9))
    _flecha(dib, x_entrada, y_paso, x_entrada, fila_alta)
    dib.add(String(x_comp + ancho_caja / 2.0 - 10, y_reabrir - 11,
                   "reabrir (solo administrador)", fontName=F, fontSize=6.6,
                   fillColor=GRAFITO, textAnchor="end"))

    # Cancelar: desde cualquiera de los estados abiertos.
    y_cancel = fila_baja + alto_caja / 2.0
    dib.add(Line(x_pend + ancho_caja / 2.0, fila_alta,
                 x_pend + ancho_caja / 2.0, y_cancel,
                 strokeColor=GRIS, strokeWidth=0.9))
    _flecha(dib, x_pend + ancho_caja / 2.0, y_cancel, x_asig, y_cancel)
    dib.add(Line(x_proc + ancho_caja / 2.0, fila_media,
                 x_proc + ancho_caja / 2.0, y_cancel,
                 strokeColor=GRIS, strokeWidth=0.9))
    _flecha(dib, x_proc + ancho_caja / 2.0, y_cancel,
            x_asig + ancho_caja, y_cancel)
    dib.add(String(x_proc + 8, y_cancel + 6, "cancelar",
                   fontName=F, fontSize=6.6, fillColor=GRAFITO,
                   textAnchor="middle"))

    # Desasignar y reasignar, por encima de la fila principal.
    y_alto = fila_alta + alto_caja + 16
    dib.add(Line(x_asig + ancho_caja / 2.0, fila_alta + alto_caja,
                 x_asig + ancho_caja / 2.0, y_alto,
                 strokeColor=GRIS, strokeWidth=0.9))
    dib.add(Line(x_asig + ancho_caja / 2.0, y_alto,
                 x_pend + ancho_caja / 2.0, y_alto,
                 strokeColor=GRIS, strokeWidth=0.9))
    _flecha(dib, x_pend + ancho_caja / 2.0, y_alto,
            x_pend + ancho_caja / 2.0, fila_alta + alto_caja)
    dib.add(String((x_pend + x_asig) / 2.0 + 44, y_alto + 6,
                   "desasignar", fontName=F, fontSize=6.6,
                   fillColor=GRAFITO, textAnchor="middle"))

    return dib


# ===========================================================================
# CONTENIDO
# ===========================================================================
story.append(Spacer(1, 1))
story.append(NextPageTemplate("std"))
story.append(PageBreak())

# --- Indice ---------------------------------------------------------------
story.append(Paragraph("Contenido", S["h1"]))
story.append(_regla(1.8 * inch, ROJO, 2.2))
story.append(Spacer(1, 14))
toc = TableOfContents()
toc.levelStyles = [S["toc0"], S["toc1"]]
story.append(toc)

# ===========================================================================
h1("Introducción")

h2("Qué es este sistema")
p("El Sistema de Gestión de Órdenes de Trabajo y Mantenimiento de TCI "
  "&mdash;un <b>CMMS</b>, por las siglas en inglés de <i>Computerized "
  "Maintenance Management System</i>&mdash; es la aplicación web donde TCI "
  "registra y da seguimiento a todo el trabajo de mantenimiento que ejecuta "
  "para sus clientes: desde que se reporta una falla o se programa un "
  "preventivo, hasta que el técnico cierra la intervención con su evidencia y "
  "los repuestos que gastó.", "intro")
p("Todo gira alrededor de un único objeto: la <b>orden de trabajo</b>. Una "
  "orden dice quién es el cliente, sobre qué equipo se va a intervenir, qué "
  "se reportó, quién la atiende, en qué estado está, qué se hizo, cuánto "
  "tiempo tomó y cuánto costó. Las demás pantallas del sistema existen para "
  "alimentar esa orden &mdash;clientes, equipos, tipos de mantenimiento, "
  "repuestos, planes preventivos&mdash; o para leer lo que las órdenes ya "
  "produjeron: reportes, historial y calendario.")

h2("Qué resuelve")
lista([
    "<b>Nada se pierde.</b> Cada orden lleva número propio "
    "(OT-2026-0001, OT-2026-0002...) y un historial que no se edita ni se "
    "borra: quién hizo cada cambio, cuándo y por qué.",
    "<b>El técnico trabaja desde el teléfono.</b> Ve solo sus órdenes, las "
    "inicia, las pausa, adjunta fotos y las cierra en el sitio.",
    "<b>El preventivo no se olvida.</b> Un plan define cada cuánto le toca "
    "mantenimiento a cada tipo de equipo, avisa antes de que venza y genera "
    "las órdenes por sí solo.",
    "<b>El almacén cuadra.</b> Los repuestos que el técnico imputa a una "
    "orden salen del inventario y quedan asentados en el libro de "
    "movimientos, con fecha, motivo y responsable.",
    "<b>La gerencia tiene números.</b> Órdenes del periodo, tiempo promedio "
    "de resolución, costos y carga por técnico, exportables a CSV o PDF.",
])

h2("A quién está dirigido este manual")
p("A las dos clases de usuario que tiene el sistema:")
tabla(
    "Los dos perfiles de usuario",
    ["Perfil", "Quién es", "Qué hace en el sistema"],
    [
        ["Administrador",
         "Coordinación y gerencia de mantenimiento de TCI.",
         "Levanta y asigna órdenes, mantiene los catálogos (clientes, "
         "equipos, tipos, repuestos), define los planes preventivos, "
         "administra las cuentas y consulta los reportes."],
        ["Técnico",
         "Personal de campo que ejecuta las intervenciones.",
         "Ve las órdenes que tiene asignadas, las inicia, las pausa, "
         "registra la evidencia y los repuestos usados, y las cierra."],
    ],
    [1.15 * inch, 1.85 * inch, UTIL - 3.0 * inch],
)
p("Si usted es técnico, le bastan los capítulos 1 a 7 y la guía rápida de la "
  "sección 16.1: las demás pantallas no aparecen en su menú. Si usted es "
  "administrador, el manual completo es su territorio.")

h2("Cómo leer este manual")
p("Cada capítulo cubre una pantalla o un grupo de pantallas, y todos siguen "
  "la misma estructura: para qué sirve, cómo se llega, qué significa cada "
  "campo y cómo se hacen las tareas más comunes, paso a paso. Se usan estas "
  "convenciones:")
sp(2)
ruta("Panel", "Repuestos", "Nuevo repuesto")
p("Un camino así indica por dónde se navega: entre en <b>Repuestos</b> desde "
  "la barra lateral y pulse el botón <b>Nuevo repuesto</b>.")
sp(3)
aviso("Nota",
      "Los recuadros rojos señalan reglas del sistema que conviene conocer "
      "antes de intentar algo: lo que no se puede deshacer, lo que el sistema "
      "va a rechazar y por qué.")
consejo("Los recuadros grises señalan atajos y buenas prácticas: formas más "
        "rápidas de llegar al mismo resultado.")
p("Los nombres de botones, campos y secciones aparecen <b>en negrita</b>, tal "
  "como se leen en pantalla.")

# ===========================================================================
h1("Antes de empezar")

h2("Qué necesita")
lista([
    "<b>Un navegador web actualizado</b>: Google Chrome, Microsoft Edge, "
    "Firefox o Safari, en computadora, tableta o teléfono. No hay que "
    "instalar nada.",
    "<b>Conexión a internet.</b> El sistema no funciona sin conexión: los "
    "datos viven en el servidor de TCI, no en el dispositivo.",
    "<b>Una cuenta activa</b>, con su correo y su contraseña.",
    "<b>La dirección del sistema</b>, que le indicará su supervisor. "
    "Guárdela en los favoritos del navegador; en el teléfono puede añadirla a "
    "la pantalla de inicio para abrirla como si fuera una aplicación.",
])

h2("Cómo se obtiene una cuenta")
p("<b>El sistema no tiene registro público.</b> Nadie puede darse de alta por "
  "su cuenta: las cuentas las crea un administrador de TCI desde la pantalla "
  "de <b>Usuarios</b> (capítulo 15). Es una decisión deliberada &mdash;el "
  "sistema contiene información de clientes&mdash; y por eso la pantalla de "
  "inicio de sesión no ofrece ningún enlace de registro.")
p("Si necesita acceso, solicítelo a su supervisor indicando su nombre "
  "completo, su correo y el rol que le corresponde. El administrador le "
  "entregará una contraseña inicial que usted debería cambiar en cuanto "
  "entre.")

h2("Qué puede hacer cada rol")
p("El rol se fija al crear la cuenta y decide qué aparece en el menú. Además "
  "de ocultar pantallas, el servidor vuelve a comprobar el permiso en cada "
  "operación: aunque alguien llegara a una dirección que no le corresponde, "
  "la respuesta sería un rechazo.")
tabla(
    "Permisos por rol",
    ["Tarea", "Administrador", "Técnico"],
    [
        ["Ver el listado de órdenes", "Todas las del sistema",
         "Solo las asignadas a él"],
        ["Crear una orden", "Sí",
         "Sí, pero no la verá hasta que se le asigne"],
        ["Editar los datos de una orden", "Sí", "No"],
        ["Asignar, reasignar o quitar el técnico", "Sí", "No"],
        ["Iniciar, pausar, reanudar y completar", "Sí",
         "Sí, en sus propias órdenes"],
        ["Cancelar o reabrir una orden", "Sí", "No"],
        ["Comentar, adjuntar evidencia e imputar repuestos", "Sí",
         "Sí, en sus propias órdenes"],
        ["Clientes, equipos y tipos de mantenimiento", "Sí", "No"],
        ["Repuestos, almacén y libro de movimientos", "Sí", "No"],
        ["Mantenimiento preventivo y calendario", "Sí", "No"],
        ["Reportes y exportaciones", "Sí", "No"],
        ["Usuarios y configuración de notificaciones", "Sí", "No"],
    ],
    [UTIL - 3.1 * inch, 1.75 * inch, 1.35 * inch],
    nota="Las pantallas que no corresponden al rol no aparecen en la barra "
         "lateral. Si un técnico llega a una de ellas por un enlace, ve el "
         "aviso &laquo;Esta sección es solo para administradores&raquo;.",
)

# ===========================================================================
h1("Acceso al sistema")

h2("Iniciar sesión")
pasos([
    "Abra la dirección del sistema en su navegador. Si no tiene sesión "
    "abierta, se le mostrará la pantalla <b>Bienvenido de nuevo</b>.",
    "Escriba su <b>correo electrónico</b> y su <b>contraseña</b>. El icono "
    "del ojo, al final del campo, permite ver lo que escribió: útil cuando se "
    "teclea con guantes o a plena luz.",
    "Deje marcada la casilla <b>Mantener la sesión abierta</b> si el "
    "dispositivo es suyo; desmárquela en un equipo compartido.",
    "Pulse <b>Iniciar sesión</b>. Entrará directamente al listado de órdenes.",
])
aviso("Nota",
      "No comparta su cuenta. Cada acción queda firmada con el nombre de "
      "quien la hizo, y el historial de una orden es el respaldo de TCI ante "
      "el cliente: si dos personas usan la misma cuenta, ese respaldo deja de "
      "valer.")

h2("Si no puede entrar")
p("El sistema responde con un mensaje concreto según lo que ocurra:")
tabla(
    "Mensajes del inicio de sesión",
    ["Mensaje en pantalla", "Qué significa", "Qué hacer"],
    [
        ["Correo o contraseña incorrectos",
         "Alguno de los dos no coincide. Por seguridad el sistema no dice "
         "cuál: eso permitiría averiguar qué correos tienen cuenta.",
         "Revise mayúsculas y espacios. Si insiste, use "
         "&laquo;¿Olvidó su contraseña?&raquo;."],
        ["Su cuenta está desactivada",
         "La contraseña era correcta, pero un administrador dio de baja la "
         "cuenta.",
         "Contacte a su supervisor para que la reactive."],
        ["Demasiados intentos seguidos",
         "El sistema frena los intentos repetidos para protegerlo de ataques "
         "de fuerza bruta.",
         "Espere un minuto y vuelva a intentarlo."],
        ["No se pudo conectar con el servidor",
         "El navegador no alcanzó al servidor; normalmente es la conexión.",
         "Revise su internet y reintente. Si persiste, avise a TCI."],
    ],
    [1.5 * inch, UTIL - 3.4 * inch, 1.9 * inch],
)

h2("Si olvidó su contraseña")
pasos([
    "En la pantalla de inicio de sesión pulse <b>¿Olvidó su contraseña?</b>",
    "Escriba su correo y envíe el formulario. El sistema responde siempre lo "
    "mismo, exista o no la cuenta: es a propósito, para que nadie pueda "
    "averiguar qué direcciones están registradas.",
    "Abra el enlace que recibe por correo &mdash;caduca en una hora&mdash; y "
    "escriba dos veces su contraseña nueva, de <b>al menos 8 caracteres</b>.",
    "Vuelva a <b>Iniciar sesión</b> con la contraseña nueva.",
])
aviso("Importante",
      "Mientras TCI no termine de habilitar su dominio de correo, el envío "
      "está apagado y el enlace no llega. La vía válida hoy es pedirle a un "
      "administrador que le asigne una contraseña nueva desde <b>Usuarios "
      "&rarr; Reiniciar contraseña</b> (sección 15.4). El propio sistema se "
      "lo advierte en esa pantalla.")

h2("Cerrar sesión")
p("Al final de la barra lateral, debajo de su nombre, está <b>Cerrar "
  "sesión</b>. Úselo siempre que trabaje en un equipo compartido. Si mantuvo "
  "la sesión abierta, el sistema lo recordará en su próximo regreso; si no, "
  "le pedirá la contraseña de nuevo.")

# ===========================================================================
h1("Recorrido por la pantalla")

p("Todas las pantallas del sistema comparten la misma estructura, de modo que "
  "aprender una es aprenderlas todas.", "intro")

h2("La barra lateral")
p("Es la columna negra de la izquierda. Arriba está el logotipo de TCI "
  "&mdash;al pulsarlo se vuelve siempre al listado de órdenes&mdash;, en "
  "medio los destinos, y abajo la campana de notificaciones, su nombre, su "
  "rol y el botón de salir. El destino en el que se encuentra queda marcado "
  "con un filete rojo y un fondo más claro.")
tabla(
    "Destinos de la barra lateral",
    ["Destino", "Para qué sirve", "Capítulo"],
    [
        ["Órdenes", "Listado de órdenes de trabajo. El técnico lo ve como "
                    "<b>Mis órdenes</b>.", "5"],
        ["Clientes", "Empresas atendidas y sus sedes.", "8"],
        ["Equipos", "Activos de cada cliente sobre los que se abren "
                    "órdenes.", "9"],
        ["Repuestos", "Catálogo y existencias de almacén.", "11"],
        ["Tipos de mantenimiento",
         "Clasificación que se elige al levantar una orden.", "10"],
        ["Preventivo", "Planes, avisos y calendario de mantenimientos.", "12"],
        ["Reportes", "Indicadores del periodo y desempeño del equipo.", "14"],
        ["Usuarios", "Cuentas de acceso al sistema.", "15"],
        ["Notificaciones", "Qué avisa el sistema, a quién y por dónde.", "13"],
    ],
    [1.65 * inch, UTIL - 2.55 * inch, 0.9 * inch],
    centro=(2,),
    nota="Un técnico solo ve el primer destino, <b>Mis órdenes</b>.",
)

h2("El área de trabajo")
p("Es todo lo que queda a la derecha de la barra. Casi todas las pantallas de "
  "gestión repiten el mismo esquema, de arriba hacia abajo:")
lista([
    "<b>Encabezado</b>: el título de la pantalla, una línea que explica qué "
    "contiene y, a la derecha, los botones de acción (por ejemplo "
    "<b>Nueva orden</b> o <b>Exportar PDF</b>).",
    "<b>Filtros</b>: un buscador y uno o varios desplegables. Lo que escriba "
    "en el buscador se aplica solo, sin pulsar ningún botón, un instante "
    "después de dejar de teclear.",
    "<b>Listado</b>: una tabla en pantalla grande; en el teléfono, la misma "
    "información en tarjetas.",
    "<b>Acciones de fila</b>: los enlaces pequeños al final de cada fila "
    "(<b>Editar</b>, <b>Desactivar</b>, <b>Borrar</b>...). Los que dan de "
    "baja o eliminan aparecen en rojo.",
    "<b>Paginación</b>: los botones <b>Anterior</b> y <b>Siguiente</b> con el "
    "indicador &laquo;Página 1 de 4&raquo;, cuando hay más de una.",
])

h2("En el teléfono")
p("La barra lateral se convierte en un cajón que se abre con el botón de menú "
  "de la esquina superior derecha; se cierra con la tecla <b>Esc</b>, tocando "
  "fuera o con la equis. Las tablas se convierten en tarjetas, una por "
  "registro, y los botones tienen el tamaño suficiente para pulsarlos con "
  "guantes puestos.")
consejo("Añada la dirección del sistema a la pantalla de inicio de su "
        "teléfono (<b>Compartir &rarr; Añadir a pantalla de inicio</b> en "
        "iPhone; <b>Menú &rarr; Añadir a pantalla principal</b> en Android). "
        "Se abre a pantalla completa, como una aplicación.")

h2("Diálogos, avisos y errores")
p("Las altas y las ediciones ocurren en una ventana emergente sobre la "
  "pantalla. Se cierra con <b>Cancelar</b>, con la equis, pulsando fuera o "
  "con la tecla <b>Esc</b>; mientras se está guardando queda bloqueada, para "
  "que no se envíe dos veces lo mismo. Cuando algo falla, el motivo aparece "
  "dentro del propio diálogo, en un recuadro rojo, sin perder lo que usted ya "
  "había escrito.")

# ===========================================================================
h1("Órdenes de trabajo")

p("La orden de trabajo es el corazón del sistema: representa una "
  "intervención concreta sobre un equipo de un cliente. Este capítulo cubre "
  "todo su ciclo, desde que se levanta hasta que se cierra.", "intro")
ruta("Panel", "Órdenes")

h2("El listado de órdenes")
p("Es la primera pantalla al entrar. El administrador la ve como <b>Órdenes "
  "de trabajo</b> y contiene todas las del sistema; el técnico la ve como "
  "<b>Mis órdenes</b> y contiene únicamente las que tiene asignadas. No hay "
  "forma de que un técnico vea las órdenes de otro: el filtro lo aplica el "
  "servidor, no la pantalla.")
p("Cada fila muestra el número de la orden, su título, el tipo de "
  "mantenimiento y el código del equipo, el cliente y su sede, el estado, la "
  "prioridad, el técnico asignado (solo para el administrador) y la fecha "
  "programada. Al pulsar el título se abre el detalle.")

h3("Filtrar por estado")
p("Sobre el listado hay una fila de botones redondeados, uno por estado. Al "
  "pulsar uno, el listado se reduce a ese estado y el botón se pinta de rojo; "
  "se pueden combinar varios &mdash;por ejemplo <b>Asignada</b> y <b>En "
  "proceso</b> para ver todo el trabajo vivo&mdash;. El enlace <b>Limpiar</b> "
  "quita todos los filtros de golpe. El recuento de la derecha "
  "(&laquo;24 órdenes&raquo;) siempre corresponde a lo filtrado.")
consejo("El listado muestra diez órdenes por página. Si busca una en "
        "concreto, filtre primero por estado: es más rápido que recorrer las "
        "páginas con <b>Anterior</b> y <b>Siguiente</b>.")

h2("Crear una orden")
ruta("Panel", "Nueva orden")
p("El botón <b>Nueva orden</b> está en la esquina superior derecha del "
  "listado. El formulario pide lo siguiente:")
tabla(
    "Campos del formulario de una orden",
    ["Campo", "¿Obligatorio?", "Qué escribir"],
    [
        ["Título", "Sí",
         "Una frase corta que identifique el trabajo, hasta 120 caracteres. "
         "Ejemplo: <i>Compresor no arranca</i>."],
        ["Problema reportado", "Sí",
         "Lo que reporta el cliente, con el detalle que haga falta. Es lo "
         "primero que leerá el técnico al llegar al sitio."],
        ["Cliente", "Sí",
         "Empresa que solicita el trabajo. Solo aparecen los clientes "
         "activos. <b>No se puede cambiar después de crear la orden.</b>"],
        ["Sede", "No",
         "Planta o local del cliente. Se habilita al elegir el cliente y "
         "acota la lista de equipos."],
        ["Tipo de mantenimiento", "Sí",
         "Preventivo, correctivo, instalación... Algunos tipos aparecen "
         "marcados como <i>(exige equipo)</i>."],
        ["Equipo", "Depende",
         "Obligatorio si el tipo lo exige; opcional en los demás casos. Solo "
         "se ofrecen equipos activos del cliente elegido."],
        ["Prioridad", "Sí",
         "Baja, Media (valor por omisión), Alta o Urgente. Las dos últimas se "
         "resaltan en color en el listado."],
        ["Fecha programada", "No",
         "Cuándo se planea atenderla. Aparece como columna del listado."],
        ["Fecha límite (SLA)", "No",
         "Fecha máxima comprometida con el cliente."],
    ],
    [1.35 * inch, 0.95 * inch, UTIL - 2.30 * inch],
    nota="Al guardar, el sistema asigna el número correlativo del año "
         "(OT-2026-0001) y abre la orden en estado <b>Pendiente</b>, sin "
         "técnico. La asignación es un paso aparte.",
)
aviso("Nota",
      "El cliente queda fijado para siempre. Mover una orden de un cliente a "
      "otro invalidaría su historial y su correlativo, así que el sistema no "
      "lo permite: si se equivocó de cliente, cancele la orden y cree otra.")

h2("El detalle de una orden")
p("Se abre pulsando el título de la orden en el listado. Reúne todo lo que se "
  "sabe de esa intervención, organizado así:")
lista([
    "<b>Encabezado</b>: número, título, cliente y sede; a la derecha, el "
    "estado, la prioridad y el indicador <b>Cambios en vivo</b>.",
    "<b>Botones de acción</b>: solo las transiciones que usted puede hacer "
    "ahora mismo (sección 5.5). Si no hay ninguna, se lee &laquo;No hay "
    "acciones disponibles para usted en este estado&raquo;.",
    "<b>Problema reportado</b> y, cuando la orden se cierra, <b>Trabajo "
    "realizado</b>.",
    "<b>Evidencia</b>: fotos y documentos adjuntos (capítulo 6).",
    "<b>Repuestos usados</b>: lo consumido y su importe (capítulo 7).",
    "<b>Historial</b>: la línea de tiempo completa, con la caja para "
    "comentar.",
    "<b>Datos</b> (columna derecha): tipo, equipo &mdash;con enlace a su "
    "ficha&mdash;, técnico, quién la creó, fecha programada y fecha límite.",
    "<b>Ejecución</b> (columna derecha, cuando ya empezó): inicio, fin, horas "
    "trabajadas y costo total, este último solo para el administrador.",
])

h2("Estados y ciclo de vida")
p("Una orden está siempre en uno de seis estados. El paso de un estado a otro "
  "no es libre: solo existen las transiciones de la figura, y cada una tiene "
  "su botón.")
figura("Ciclo de vida de una orden de trabajo", diagrama_estados(),
       "Toda orden nace en <b>Pendiente</b>. <b>Completada</b> y "
       "<b>Cancelada</b> son estados finales; solo <b>Completada</b> admite "
       "vuelta atrás, mediante <i>reabrir</i>, y únicamente para un "
       "administrador.")
tabla(
    "Qué significa cada estado",
    ["Estado", "Qué significa", "¿Es final?"],
    [
        ["Pendiente", "La orden existe pero todavía no tiene técnico "
                      "responsable. Es el punto de entrada, tanto de las "
                      "órdenes manuales como de las que genera el plan "
                      "preventivo.", "No"],
        ["Asignada", "Ya tiene técnico responsable, pero el trabajo aún no "
                     "empieza.", "No"],
        ["En proceso", "El técnico inició el trabajo en el sitio. Queda "
                       "registrada la hora de inicio.", "No"],
        ["En espera", "Trabajo pausado por una causa externa: falta un "
                      "repuesto, no hay acceso al sitio, falta la aprobación "
                      "del cliente. Exige indicar el motivo.", "No"],
        ["Completada", "Trabajo terminado, con la descripción de lo "
                       "realizado. Queda registrada la hora de cierre.", "Sí"],
        ["Cancelada", "No se ejecutará. Exige motivo y no tiene vuelta "
                      "atrás.", "Sí"],
    ],
    [1.0 * inch, UTIL - 1.9 * inch, 0.9 * inch],
    centro=(2,),
    nota="El tiempo que una orden pasa <b>En espera</b> se descuenta del "
         "tiempo de resolución que informan los reportes: una espera por "
         "falta de repuesto no es tiempo de trabajo del técnico.",
)

h2("Las acciones, una a una")
p("Los botones que ve en el detalle no son siempre los mismos: el sistema "
  "calcula qué transiciones son válidas para el estado actual y para su rol, "
  "y solo pinta esas. Si un botón no aparece, es que esa acción no procede "
  "ahora.")
tabla(
    "Transiciones disponibles",
    ["Botón", "Desde", "Deja la orden en", "Quién puede", "Qué le pide"],
    [
        ["Asignar técnico", "Pendiente", "Asignada", "Administrador",
         "El técnico, de una lista de los activos"],
        ["Reasignar", "Asignada", "Asignada (otro técnico)", "Administrador",
         "El técnico nuevo"],
        ["Quitar asignación", "Asignada", "Pendiente", "Administrador",
         "Comentario opcional"],
        ["Iniciar trabajo", "Asignada", "En proceso",
         "Técnico asignado o administrador", "Comentario opcional"],
        ["Pausar", "En proceso", "En espera",
         "Técnico asignado o administrador", "Motivo (obligatorio)"],
        ["Reanudar", "En espera", "En proceso",
         "Técnico asignado o administrador", "Comentario opcional"],
        ["Completar", "En proceso", "Completada",
         "Técnico asignado o administrador",
         "Trabajo realizado (mínimo 10 caracteres); horas y costo de mano de "
         "obra, opcionales"],
        ["Cancelar orden", "Pendiente, Asignada, En proceso o En espera",
         "Cancelada", "Administrador", "Motivo (obligatorio)"],
        ["Reabrir", "Completada", "En proceso", "Administrador",
         "Motivo (obligatorio)"],
    ],
    [1.05 * inch, 1.25 * inch, 1.05 * inch, 1.15 * inch, UTIL - 4.5 * inch],
)
p("Todas las acciones se confirman en una ventana emergente. Lo que escriba "
  "como motivo o comentario queda guardado en el historial de la orden y es "
  "visible para todos los que la puedan ver, así que redáctelo pensando en "
  "que puede acabar citado ante el cliente.")
aviso("Nota",
      "Una orden <b>Cancelada</b> no se reabre nunca: si el trabajo vuelve a "
      "hacer falta, se crea una orden nueva. Una orden <b>Completada</b> sí "
      "puede reabrirla un administrador, y la reapertura queda registrada en "
      "el historial con su motivo.")

h3("Cómo cerrar una orden correctamente")
pasos([
    "Termine el trabajo en el sitio y, antes de cerrar, suba la evidencia "
    "fotográfica (capítulo 6) e impute los repuestos que gastó (capítulo 7): "
    "una vez cerrada la orden ya no se pueden tocar.",
    "Pulse <b>Completar</b>.",
    "En <b>Trabajo realizado</b> describa lo que hizo, no lo que encontró. "
    "Ese texto es el acta de cierre que respalda a TCI ante el cliente; el "
    "sistema exige al menos 10 caracteres, pero una línea de dos palabras no "
    "sirve a nadie.",
    "Indique las <b>horas trabajadas</b> y el <b>costo de mano de obra</b> si "
    "los conoce. Son opcionales, pero sin ellos los reportes de costos y "
    "tiempos quedan incompletos.",
    "Pulse <b>Confirmar</b>. La orden pasa a <b>Completada</b> y se avisa a "
    "los administradores.",
])

h2("Comentarios e historial")
p("El bloque <b>Historial</b> es la línea de tiempo de la orden: registra "
  "cada cambio de estado, cada asignación, cada edición, cada evidencia "
  "subida o retirada y cada comentario, siempre con el nombre de quien lo "
  "hizo y la fecha con hora. <b>El historial no se puede editar ni borrar</b> "
  "&mdash;ni siquiera por un administrador&mdash;: es lo que le da valor.")
p("Debajo del historial hay una caja de texto para dejar un comentario sin "
  "cambiar el estado. Sirve para coordinar: &laquo;el cliente pide "
  "reprogramar al viernes&raquo;, &laquo;falta la llave de 32, la traigo "
  "mañana&raquo;. Al publicarlo, el sistema notifica a la otra parte: si "
  "comenta el técnico se avisa a los administradores, y si comenta un "
  "administrador se avisa al técnico asignado.")

h2("Editar una orden")
p("Solo un administrador puede editar los datos de una orden, y solo mientras "
  "no esté <b>Completada</b> ni <b>Cancelada</b>. El botón <b>Editar "
  "datos</b> aparece arriba del detalle y abre el mismo formulario del alta, "
  "con el cliente bloqueado. Los cambios quedan anotados en el historial.")

h2("Cambios en vivo")
p("En la esquina superior derecha del detalle hay un indicador que alterna "
  "entre <b>Cambios en vivo</b> y <b>Reconectando cambios en vivo...</b>. "
  "Mientras esté en el primero, la pantalla se actualiza sola cuando otra "
  "persona toca la orden: no hace falta recargar para ver que el técnico ya "
  "la inició o que el administrador la reasignó. Si el indicador queda en "
  "&laquo;Reconectando&raquo;, es que se perdió la conexión con el servidor; "
  "recargue la página cuando vuelva la señal.")

# ===========================================================================
h1("Evidencia de la orden")

p("La evidencia es la prueba gráfica del trabajo: cómo se encontró el equipo, "
  "cómo quedó y qué documentos lo respaldan. Se administra desde el bloque "
  "<b>Evidencia</b> del detalle de la orden.", "intro")

h2("Qué se puede adjuntar")
tabla(
    "Requisitos de los archivos",
    ["Concepto", "Valor"],
    [
        ["Formatos aceptados", "Fotografías JPG, PNG o WEBP, y documentos PDF"],
        ["Tamaño máximo", "10 MB por archivo"],
        ["Cantidad", "Sin límite: se pueden subir varios a la vez"],
        ["Clasificación", "<b>Antes</b>, <b>Después</b> o <b>Documento</b>"],
    ],
    [1.6 * inch, UTIL - 1.6 * inch],
    nota="Las fotografías se reducen automáticamente en el teléfono antes de "
         "enviarse, para gastar menos datos móviles y subir más rápido desde "
         "el campo.",
)

h2("Subir evidencia")
pasos([
    "Abra la orden y baje hasta el bloque <b>Evidencia</b>.",
    "En <b>Clasificar como</b>, elija <b>Antes</b>, <b>Después</b> o "
    "<b>Documento</b>. La clasificación se aplica a lo que suba a "
    "continuación, así que elíjala primero.",
    "Pulse el botón de selección de archivos y escoja las fotos. En el "
    "teléfono puede tomar la foto en ese momento con la cámara.",
    "Espere a que el texto <b>Subiendo...</b> desaparezca. Cada archivo "
    "aparece como una miniatura con su nombre, su clasificación, su tamaño y "
    "quién lo subió.",
])
consejo("Tome siempre una foto <b>Antes</b> al llegar y una <b>Después</b> al "
        "terminar. Es lo que evita discusiones con el cliente sobre el estado "
        "en que se recibió el equipo.")

h2("Ver y retirar evidencia")
p("Al pulsar una miniatura, el archivo se abre en una pestaña nueva a tamaño "
  "completo. Para retirar un archivo, pase el puntero por encima de la "
  "miniatura &mdash;o tóquela, en el teléfono&mdash; y pulse <b>Retirar</b>.")
aviso("Nota",
      "Un técnico solo puede retirar los archivos que él mismo subió; un "
      "administrador puede retirar cualquiera. Y en una orden "
      "<b>Completada</b> o <b>Cancelada</b> no se puede añadir ni retirar "
      "nada, tampoco siendo administrador: la evidencia forma parte del acta "
      "de cierre. Para corregirla hay que reabrir la orden, y eso queda "
      "registrado en el historial.")

# ===========================================================================
h1("Repuestos usados en una orden")

p("Lo que el técnico gasta en una intervención se registra en el bloque "
  "<b>Repuestos usados</b> del detalle de la orden. Cada línea que se imputa "
  "descuenta la existencia del almacén y deja su asiento en el libro de "
  "movimientos, de modo que el inventario refleja siempre lo que hay de "
  "verdad.", "intro")

h2("Imputar un repuesto")
pasos([
    "Abra la orden y baje al bloque <b>Repuestos usados</b>.",
    "En el desplegable <b>Elija un repuesto...</b> seleccione la pieza. Solo "
    "se ofrecen repuestos activos y con existencia disponible.",
    "Escriba la <b>cantidad</b> &mdash;admite decimales, para metros de cable "
    "o litros de aceite&mdash; y pulse el botón de añadir.",
])
p("Cada línea muestra el nombre y el código del repuesto, su costo unitario "
  "por unidad de medida, la cantidad y el importe. Debajo de todas ellas, el "
  "sistema suma el <b>total en repuestos</b>, que se acumula al costo total "
  "de la orden junto con la mano de obra.")

h2("Corregir o retirar una línea")
p("Mientras la orden siga abierta, cada línea ofrece dos acciones:")
lista([
    "<b>Corregir cantidad</b>: para cuando se gastó menos o más de lo "
    "previsto. El sistema ajusta la existencia por la diferencia, no vuelve a "
    "descontar el total.",
    "<b>Retirar</b>: devuelve la cantidad completa al almacén y elimina la "
    "línea. Úselo cuando se imputó el repuesto equivocado.",
])
aviso("Nota",
      "Igual que la evidencia, los repuestos no se pueden tocar en una orden "
      "<b>Completada</b> o <b>Cancelada</b>. Revise el consumo antes de "
      "cerrar.")

h2("El aviso de existencias mínimas")
p("Si al imputar una pieza la existencia queda en el mínimo definido para ese "
  "repuesto o por debajo, aparece un aviso ámbar en la misma línea: "
  "&laquo;Quedan 3 unidades en almacén: está en el mínimo&raquo;. El aviso "
  "sale ahí, donde se acaba de gastar, y no solo en la pantalla de almacén, "
  "que el técnico no ve. Comuníquelo a la coordinación para que se reponga.")

# ===========================================================================
h1("Clientes y sedes")

p("Un cliente es una empresa a la que TCI presta servicio. Sus <b>sedes</b> "
  "son las plantas o locales donde están los equipos. Toda orden pertenece a "
  "un cliente, así que esta pantalla es el primer catálogo que hay que "
  "llenar.", "intro")
ruta("Panel", "Clientes")
aviso("Nota", "Este capítulo y los siguientes son exclusivos del "
              "administrador. Un técnico no ve estas pantallas.")

h2("Buscar y filtrar")
p("El buscador acepta el <b>nombre</b>, el <b>RTN</b> o la <b>persona de "
  "contacto</b>, y filtra mientras usted escribe. El desplegable de la "
  "derecha permite ver <b>Solo activos</b>, <b>Solo desactivados</b> o "
  "ambos. La tabla muestra el cliente, su contacto, cuántas sedes tiene, "
  "cuántas órdenes acumula y las acciones disponibles.")

h2("Registrar un cliente")
pasos([
    "Pulse <b>Nuevo cliente</b>.",
    "Llene los datos: <b>Nombre o razón social</b> es el único obligatorio; "
    "<b>RTN</b>, <b>persona de contacto</b>, <b>teléfono</b> y <b>correo</b> "
    "son opcionales, pero conviene registrarlos: son los datos que se buscan "
    "cuando hay que llamar por una orden.",
    "Pulse <b>Guardar</b>. El cliente queda activo y ya puede recibir "
    "órdenes.",
])

h2("Administrar las sedes de un cliente")
p("La acción <b>Sedes</b> de cada fila abre la lista de sedes de ese cliente. "
  "Desde ahí se añaden, se editan y se borran. Una sede pide <b>nombre</b> "
  "&mdash;obligatorio, por ejemplo <i>Planta San Pedro Sula</i>&mdash;, "
  "<b>dirección</b> y <b>ciudad</b>.")
p("Las sedes cumplen dos funciones: aparecen en la orden para que el técnico "
  "sepa a dónde ir, y agrupan los equipos, de modo que al elegir una sede en "
  "el formulario de la orden la lista de equipos se reduce a los de esa sede.")

h2("Desactivar frente a borrar")
p("Son dos cosas distintas que se confunden a menudo:")
tabla(
    "Dar de baja un cliente",
    ["Acción", "Qué hace", "Cuándo usarla"],
    [
        ["Desactivar",
         "Saca al cliente de los formularios de alta de órdenes, pero "
         "conserva todo su historial y sus órdenes anteriores. Se puede "
         "revertir con <b>Activar</b>.",
         "Es lo normal cuando se deja de trabajar con esa empresa."],
        ["Borrar",
         "Elimina el registro. Solo se permite si el cliente <b>nunca</b> "
         "tuvo órdenes; en caso contrario el botón aparece deshabilitado y "
         "explica el motivo.",
         "Solo para corregir un alta equivocada, recién hecha."],
    ],
    [1.05 * inch, UTIL - 3.1 * inch, 2.05 * inch],
)

# ===========================================================================
h1("Equipos")

p("Un equipo es el activo del cliente sobre el que se interviene: un "
  "compresor, un tablero, una bomba. Registrar los equipos es lo que permite "
  "acumular el historial de cada máquina y programar su mantenimiento "
  "preventivo.", "intro")
ruta("Panel", "Equipos")

h2("Buscar y filtrar")
p("Hay tres filtros combinables &mdash;por <b>cliente</b>, por <b>sede</b> y "
  "por estado de alta&mdash; y un buscador que acepta <b>código, nombre, "
  "marca, modelo o número de serie</b>. La tabla muestra el código, el "
  "equipo, el cliente y cuántas órdenes lleva acumuladas.")

h2("Registrar un equipo")
pasos([
    "Pulse <b>Nuevo equipo</b>.",
    "Escriba el <b>código</b>: es el identificador con el que TCI y el "
    "cliente se refieren a la máquina (por ejemplo <i>EQ-0001</i>). Es "
    "obligatorio y no se repite.",
    "Elija el <b>tipo de equipo</b> del catálogo &mdash;compresor, bomba, "
    "tablero...&mdash;. Es opcional, pero <b>sin tipo el equipo no entra en "
    "ningún plan de mantenimiento preventivo</b> (capítulo 12).",
    "Escriba el <b>nombre</b> descriptivo (<i>Compresor de tornillo 50HP</i>) "
    "y elija el <b>cliente</b> y, si aplica, la <b>sede</b>.",
    "Complete lo que sepa de <b>marca</b>, <b>modelo</b>, <b>número de "
    "serie</b> y <b>ubicación física</b> (<i>Cuarto de máquinas</i>). Todo "
    "esto es opcional, pero es lo que el técnico necesita para encontrar la "
    "máquina y pedir el repuesto correcto.",
    "Pulse <b>Guardar</b>.",
])
aviso("Nota",
      "El cliente de un equipo no se puede cambiar después: el equipo "
      "pertenece a quien lo tiene. Si un activo cambia de dueño, dé de baja "
      "el registro anterior y cree uno nuevo.")

h2("La ficha del equipo y su historial")
p("Al pulsar el código de un equipo &mdash;en esta pantalla o en el bloque "
  "<b>Datos</b> del detalle de una orden&mdash; se abre su ficha, que reúne "
  "toda la vida de esa máquina:")
lista([
    "<b>Último mantenimiento</b> y <b>órdenes abiertas</b> en este momento.",
    "<b>Total histórico</b> de intervenciones, <b>horas acumuladas</b> y "
    "<b>tiempo promedio de cierre</b>.",
    "Sus datos técnicos: tipo, marca, modelo, serie y ubicación.",
    "El listado de todas las órdenes del equipo, con su estado y el trabajo "
    "realizado en cada una.",
])
consejo("Antes de cotizar el reemplazo de una máquina, abra su ficha: el "
        "número de intervenciones y las horas acumuladas son el argumento "
        "más sólido frente al cliente.")

h2("Dar de baja un equipo")
p("Igual que con los clientes: <b>Desactivar</b> lo saca de los formularios "
  "de alta de órdenes pero conserva su historial &mdash;es lo que se hace "
  "cuando la máquina sale de servicio&mdash;, y <b>Borrar</b> solo se permite "
  "si el equipo nunca tuvo órdenes.")

# ===========================================================================
h1("Tipos de mantenimiento")

p("El tipo de mantenimiento clasifica el trabajo: preventivo, correctivo, "
  "instalación, calibración... Es un campo obligatorio de toda orden y es la "
  "base de uno de los gráficos de reportes, así que conviene mantener la "
  "lista corta y clara.", "intro")
ruta("Panel", "Tipos de mantenimiento")

h2("Crear o editar un tipo")
tabla(
    "Campos de un tipo de mantenimiento",
    ["Campo", "Qué es"],
    [
        ["Código", "Abreviatura corta y única, en mayúsculas: <i>PREV</i>, "
                   "<i>CORR</i>. Es lo que aparece en las exportaciones."],
        ["Nombre", "El nombre completo que se ve en los desplegables: "
                   "<i>Mantenimiento preventivo</i>."],
        ["Color", "Distintivo del tipo. Se elige de una paleta sugerida que "
                  "incluye el rojo institucional. Se usa como marca junto a "
                  "la etiqueta en los reportes."],
        ["Exige equipo", "Si se activa, ninguna orden de este tipo podrá "
                         "guardarse sin indicar el equipo. Actívelo en los "
                         "tipos que siempre recaen sobre una máquina "
                         "concreta; déjelo apagado en trabajos generales, "
                         "como una inspección de planta."],
    ],
    [1.25 * inch, UTIL - 1.25 * inch],
)

h2("Desactivar o borrar un tipo")
p("Un tipo desactivado deja de ofrecerse al crear órdenes, pero las órdenes "
  "que ya lo usaban lo conservan. <b>Borrar solo es posible si ninguna orden "
  "lo usa</b>; si alguna lo usa, el sistema lo rechaza y la salida correcta "
  "es desactivarlo.")

# ===========================================================================
h1("Repuestos y almacén")

p("Esta pantalla es el inventario de TCI: qué piezas hay, cuántas quedan, "
  "cuánto cuestan y cuáles están por agotarse. Las salidas por consumo las "
  "produce el propio trabajo de campo, cuando un técnico imputa un repuesto a "
  "su orden (capítulo 7).", "intro")
ruta("Panel", "Repuestos")

h2("El catálogo")
p("La tabla muestra, por repuesto, su código y nombre, la <b>existencia</b> "
  "con su unidad de medida, el <b>costo unitario</b> y en cuántas órdenes se "
  "ha consumido. Se puede buscar por código o nombre y filtrar por estado de "
  "alta. Cuando hay piezas en el mínimo, sobre la tabla aparece una franja "
  "ámbar &mdash;&laquo;3 repuestos llegaron al mínimo&raquo;&mdash; con el "
  "enlace <b>Ver solo esos</b>.")

h2("Dar de alta un repuesto")
tabla(
    "Campos de un repuesto",
    ["Campo", "¿Obligatorio?", "Qué escribir"],
    [
        ["Código", "Sí", "Identificador corto y único: <i>ROD-6205</i>."],
        ["Nombre", "Sí", "<i>Rodamiento 6205 2RS</i>."],
        ["Descripción", "No", "Detalles, equivalencias o proveedor."],
        ["Unidad de medida", "Sí",
         "<i>unidad</i>, <i>metro</i>, <i>litro</i>, <i>galón</i>... Define "
         "cómo se cuentan las cantidades imputadas."],
        ["Costo unitario", "No",
         "Precio de la pieza. Es lo que multiplica la cantidad para calcular "
         "el costo en repuestos de cada orden."],
        ["Existencia inicial", "No",
         "Lo que hay en almacén hoy. Solo se pide al crear el repuesto."],
        ["Mínimo", "No",
         "Existencia a partir de la cual el sistema avisa. Déjelo en cero si "
         "no quiere aviso para esa pieza."],
    ],
    [1.35 * inch, 0.95 * inch, UTIL - 2.3 * inch],
)
aviso("Nota",
      "Después del alta, la existencia <b>no se edita a mano</b>: solo se "
      "mueve con entradas y salidas, que dejan su asiento en el libro. Es lo "
      "que hace que el inventario sea auditable, y por eso el campo "
      "desaparece del formulario al editar un repuesto ya creado.")

h2("Entradas y salidas de almacén")
p("Cada fila del catálogo ofrece dos acciones:")
lista([
    "<b>Entrada</b>: suma existencia. Se usa al recibir una compra o al "
    "devolver una pieza no utilizada.",
    "<b>Salida</b>: resta existencia por una causa que no es una orden "
    "&mdash;una merma, un traslado, un ajuste de conteo&mdash;.",
])
p("Las dos piden la <b>cantidad</b> y el <b>motivo</b>. El motivo es "
  "obligatorio y es lo que hace útil el libro seis meses después: escriba "
  "&laquo;Compra factura 4471&raquo;, no &laquo;ajuste&raquo;.")

h2("Existencias mínimas")
p("Cuando la existencia de una pieza llega a su mínimo o baja de él, el "
  "sistema lo señala en tres sitios: en la franja ámbar del catálogo, en la "
  "propia fila del repuesto y en la línea de consumo dentro de la orden donde "
  "se acabó de gastar. Es deliberado: el aviso aparece donde alguien puede "
  "hacer algo al respecto.")

h2("El libro de movimientos")
ruta("Panel", "Repuestos", "Ver movimientos")
p("Reúne <b>todas</b> las entradas y salidas del almacén, no las de un solo "
  "repuesto, y responde a la pregunta que se hace de verdad: qué se movió "
  "esta semana. Cada asiento indica la fecha, el repuesto, si fue entrada o "
  "salida, la cantidad, el <b>saldo resultante</b>, el motivo y quién lo "
  "hizo; si la salida vino de una orden, muestra su número.")
p("Se puede acotar por <b>fechas</b>, por tipo de movimiento (solo entradas o "
  "solo salidas) y por repuesto. La acción <b>Movimientos</b> de cada fila "
  "del catálogo abre el mismo libro, ya filtrado por esa pieza.")

# ===========================================================================
h1("Mantenimiento preventivo")

p("Un <b>plan de mantenimiento</b> dice: &laquo;todo equipo de este tipo "
  "lleva este mantenimiento cada tantos días, semanas o meses&raquo;. Con eso "
  "el sistema sabe a qué equipos alcanza, cuándo le toca a cada uno, avisa "
  "antes de que venza y genera las órdenes por sí solo.", "intro")
ruta("Panel", "Preventivo")

h2("Antes: los tipos de equipo")
p("El plan cuelga de un <b>tipo de equipo</b>, no de un equipo concreto. Si "
  "todavía no hay ninguno, la pantalla lo advierte y ofrece el enlace "
  "<b>Crear un tipo de equipo</b>; un tipo es solo un nombre "
  "(<i>Compresor</i>, <i>Bomba</i>, <i>Tablero eléctrico</i>). Después, cada "
  "equipo debe tener asignado su tipo desde la pantalla de <b>Equipos</b>: "
  "los equipos sin tipo no entran en ningún plan.")

h2("Crear un plan")
tabla(
    "Campos de un plan de mantenimiento",
    ["Campo", "Qué define"],
    [
        ["Nombre del plan", "Cómo se identifica: <i>Preventivo trimestral de "
                            "compresores</i>."],
        ["Tipo de equipo", "A qué familia de equipos alcanza. <b>No se puede "
                           "cambiar después</b>: sería otro plan distinto."],
        ["Cada / unidad", "La frecuencia: cada 3 meses, cada 15 días, cada 2 "
                          "semanas."],
        ["Tipo de mantenimiento", "El que llevarán las órdenes que genere el "
                                  "plan."],
        ["Cliente", "Deje <b>Todos los clientes</b> para que alcance a todo "
                    "el parque, o elija uno para acotar el plan a esa "
                    "empresa."],
        ["Días de anticipación", "Con cuántos días de antelación quiere que "
                                 "el sistema avise de un vencimiento."],
        ["Prioridad", "La que llevarán las órdenes generadas."],
        ["Instrucciones", "La rutina que debe seguir el técnico: <i>cambio de "
                          "filtros, revisión de correas, purga de "
                          "condensados</i>. Es opcional pero es lo que "
                          "estandariza el trabajo."],
    ],
    [1.5 * inch, UTIL - 1.5 * inch],
)

h2("Ver a qué equipos alcanza un plan")
p("Cada plan muestra a la derecha un botón con el número de equipos que cubre "
  "hoy (&laquo;12 equipos&raquo;). Al pulsarlo se despliega la lista, y para "
  "cada equipo se ve su cliente, su último preventivo, cuándo vence el "
  "siguiente y si está <b>vencido</b> o <b>por vencer</b>.")
p("El vencimiento se cuenta desde el <b>último preventivo cerrado</b>, no "
  "desde una fecha fija de calendario: si un mantenimiento se adelanta o se "
  "atrasa, el siguiente se recalcula solo.")

h2("Los avisos anticipados")
p("En la parte alta de la pantalla aparece el bloque de avisos: los equipos "
  "que han entrado en la ventana de anticipación de su plan o que ya "
  "vencieron y siguen sin orden abierta. Cada aviso indica el equipo, el "
  "cliente, el plan y cuándo vence (<i>Vencido</i>, <i>Vence hoy</i>, "
  "<i>En 5 días</i>).")
aviso("Nota",
      "Los equipos que ya tienen una orden abierta no aparecen en los avisos. "
      "Avisar de algo que ya está en el listado de trabajo es ruido, y a la "
      "tercera vez nadie lee los avisos.")

h2("Generar las órdenes")
p("El sistema recorre los planes una vez al día y crea las órdenes de lo que "
  "haya vencido. El botón <b>Generar órdenes ahora</b> dispara esa misma "
  "pasada en el momento, sin esperar al horario: es lo que se usa después de "
  "crear un plan, para no perder un día.")
p("Al terminar, el sistema informa de lo que hizo: cuántas órdenes creó "
  "&mdash;con su número, su equipo y su plan&mdash; y cuántas omitió, con el "
  "motivo de cada omisión. Si no había nada vencido, lo dice con todas las "
  "letras: <b>No hizo falta crear ninguna orden</b>.")
p("Las órdenes generadas nacen <b>Pendientes</b>, igual que las manuales, y "
  "hay que asignarles técnico desde el listado de órdenes.")

h2("El calendario")
ruta("Panel", "Preventivo", "Ver calendario")
p("Muestra el mes completo con lo que toca según los planes. Los botones de "
  "flecha cambian de mes. En el teléfono, la misma información se presenta "
  "como una lista cronológica.")
p("Hay dos clases de evento, y no significan lo mismo:")
lista([
    "<b>Orden</b>: ya existe, tiene número y se puede abrir desde el "
    "calendario.",
    "<b>Proyección</b>: cuándo le tocará según el plan, todavía sin orden. Es "
    "una previsión y puede moverse, porque el vencimiento se cuenta desde el "
    "último cierre real.",
])

# ===========================================================================
h1("Notificaciones")

p("El sistema avisa solo cuando pasa algo que le concierne a usted. Los "
  "avisos llegan a la campana de la barra lateral y, cuando el correo esté "
  "habilitado, también al buzón.", "intro")

h2("La campana y la bandeja")
p("La campana está al final de la barra lateral, encima de su nombre. Si "
  "tiene avisos sin leer, muestra un contador rojo con su número (o "
  "<b>99+</b>, si son muchos). Al pulsarla se despliega la bandeja con los "
  "últimos avisos; cada uno indica su título, un resumen y hace cuánto llegó "
  "(<i>hace 5 min</i>, <i>ayer</i>).")
lista([
    "Un punto rojo marca los avisos <b>no leídos</b>.",
    "Al pulsar un aviso, este se marca como leído y le lleva directamente a "
    "lo que lo originó, normalmente el detalle de una orden.",
    "El enlace <b>Marcar todas</b> vacía el contador de golpe.",
])

h2("Qué avisa el sistema")
tabla(
    "Eventos que generan aviso",
    ["Evento", "Cuándo se dispara", "A quién le llega"],
    [
        ["Orden asignada", "Un administrador asigna o reasigna la orden.",
         "Al técnico que la recibe"],
        ["Orden completada", "El técnico cierra la orden.",
         "A los administradores activos"],
        ["Orden cancelada", "Un administrador cancela la orden.",
         "Al técnico asignado"],
        ["Orden reabierta", "Un administrador reabre una orden cerrada.",
         "Al técnico asignado"],
        ["Comentario nuevo", "Alguien comenta en el historial de la orden.",
         "A la otra parte: al técnico si comentó un administrador, y a los "
         "administradores si comentó el técnico"],
        ["Preventivo por vencer",
         "Un equipo entra en la ventana de anticipación de su plan.",
         "A los administradores"],
        ["Repuesto bajo mínimo",
         "La existencia de una pieza llega a su mínimo.",
         "A los administradores"],
    ],
    [1.25 * inch, 2.0 * inch, UTIL - 3.25 * inch],
    nota="Nadie recibe aviso de sus propias acciones: el sistema descarta "
         "siempre al autor.",
)

h2("Configurar qué se avisa y por dónde")
ruta("Panel", "Notificaciones")
p("Esta pantalla es solo del administrador y controla el comportamiento para "
  "<b>todo el sistema</b>, no para una cuenta en particular. La tabla cruza "
  "cada evento con cada rol y ofrece una casilla por canal: <b>En la "
  "aplicación</b> y <b>Correo</b>. Al desmarcar una casilla, ese aviso deja "
  "de emitirse por ese canal para ese rol.")
aviso("Importante",
      "El envío por correo está apagado mientras el cliente no confirme el "
      "dominio de TCI, que es con el que hay que firmar los envíos. Puede "
      "dejar encendidas las casillas de correo desde ya: no saldrá nada hasta "
      "que se configure, y entonces empezarán a salir sin tocar nada más.")

h2("Editar el texto de un aviso")
p("La acción <b>Editar texto</b> de cada fila abre la plantilla del evento, "
  "con su <b>asunto</b> y su <b>mensaje</b>. Dentro del texto se pueden usar "
  "marcadores entre llaves dobles, que el sistema sustituye por los datos "
  "reales al enviar el aviso: <b>{{numero}}</b>, <b>{{titulo}}</b>, "
  "<b>{{cliente}}</b>, <b>{{tecnico}}</b>, <b>{{motivo}}</b>... El propio "
  "diálogo lista los marcadores que admite ese evento en concreto.")
p("Un marcador mal escrito no rompe nada: sale tal cual en el aviso. Revise "
  "el texto después de guardarlo.")

# ===========================================================================
h1("Reportes")

p("Es la pantalla de la gerencia: cuánto se trabajó en un periodo, cuánto "
  "costó, cuánto se tarda en resolver y cómo se reparte la carga entre los "
  "técnicos.", "intro")
ruta("Panel", "Reportes")

h2("Elegir el periodo")
p("Arriba hay dos campos de fecha, <b>Desde</b> y <b>Hasta</b>, y dos atajos: "
  "<b>Este mes</b>, que abarca del día 1 a hoy, y <b>Todo el historial</b>, "
  "que quita las fechas. Todo lo que se muestra debajo &mdash;indicadores, "
  "gráficos, tabla de técnicos y exportaciones&mdash; obedece a ese periodo.")

h2("Los cuatro indicadores")
tabla(
    "Indicadores del periodo",
    ["Indicador", "Qué mide"],
    [
        ["Órdenes en el periodo",
         "Cuántas órdenes se registraron entre las dos fechas."],
        ["Abiertas",
         "Cuántas siguen sin cerrar, con su porcentaje sobre el total."],
        ["Tiempo promedio de resolución",
         "Media desde que se levanta la orden hasta que se cierra. Se muestra "
         "en la unidad que corresponda: minutos, horas o días."],
        ["Costo total",
         "Mano de obra más repuestos, en lempiras, con el desglose de "
         "repuestos debajo."],
    ],
    [1.9 * inch, UTIL - 1.9 * inch],
)

h2("Los gráficos")
p("Debajo de los indicadores hay tres gráficos de barras: <b>órdenes por "
  "estado</b>, <b>por prioridad</b> y <b>por tipo de mantenimiento</b>. Los "
  "estados o prioridades sin ninguna orden no aparecen, para no llenar el "
  "gráfico de ceros. En el gráfico por tipo, el color que se ve junto a cada "
  "etiqueta es el que el administrador eligió para ese tipo (capítulo 10).")

h2("Desempeño por técnico")
p("La tabla del final lista a cada técnico con sus órdenes totales, las "
  "abiertas, las completadas, las horas registradas, su tiempo promedio de "
  "resolución y el costo asociado. Es la respuesta a &laquo;cómo está "
  "repartida la carga&raquo; y a &laquo;quién está cerrando&raquo;.")
aviso("Nota",
      "Las horas y los costos salen de lo que el técnico escribió al "
      "completar la orden. Si el equipo no registra horas al cerrar, esas "
      "columnas aparecerán vacías: la calidad del reporte depende de la "
      "disciplina en el cierre.")

h2("Exportar")
p("Los dos botones del encabezado descargan el detalle de las órdenes del "
  "periodo elegido:")
lista([
    "<b>Exportar CSV</b>: archivo para abrir en Excel y seguir trabajando "
    "con los datos &mdash;tablas dinámicas, filtros, cálculos propios&mdash;.",
    "<b>Exportar PDF</b>: documento listo para imprimir o adjuntar en un "
    "correo al cliente.",
])
p("Mientras el archivo se prepara, el botón muestra <b>Generando...</b>. La "
  "descarga arranca sola cuando está listo.")

# ===========================================================================
h1("Usuarios")

p("Aquí se crean y se administran las cuentas de acceso. Es la pantalla más "
  "sensible del sistema: quien tiene cuenta ve información de los clientes de "
  "TCI.", "intro")
ruta("Panel", "Usuarios")

h2("Crear una cuenta")
pasos([
    "Pulse <b>Nuevo usuario</b>.",
    "Escriba el <b>nombre completo</b> y el <b>correo</b>. El correo es el "
    "identificador con el que esa persona entrará, y no se repite.",
    "Elija el <b>rol</b>: <b>Técnico</b> o <b>Administrador</b>. Repase la "
    "tabla de permisos de la sección 2.3 antes de decidir.",
    "Anote el <b>teléfono</b> si lo tiene: es opcional, pero es el dato que "
    "se busca cuando hay que localizar al técnico en campo.",
    "Escriba una <b>contraseña inicial</b> de al menos 8 caracteres y "
    "entréguesela a la persona por un canal seguro. Ella debería cambiarla en "
    "cuanto entre.",
])
aviso("Nota",
      "Conceda el rol de <b>Administrador</b> solo a quien realmente "
      "coordina: un administrador puede cancelar órdenes, reabrir cierres, "
      "ver todos los costos y crear más cuentas.")

h2("Editar una cuenta")
p("La acción <b>Editar</b> permite corregir el nombre, el teléfono y el rol. "
  "<b>El correo no se puede cambiar</b>: es la identidad de la cuenta y está "
  "referido en todo el historial.")

h2("Desactivar una cuenta")
p("<b>Desactivar</b> es lo que se hace cuando alguien deja la empresa o "
  "cambia de puesto. La persona deja de poder entrar &mdash;al intentarlo lee "
  "&laquo;Su cuenta está desactivada&raquo;&mdash; pero todo lo que hizo "
  "sigue en el historial de las órdenes, con su nombre. Las cuentas no se "
  "borran, precisamente por eso. Un técnico desactivado tampoco aparece ya en "
  "la lista de asignación.")

h2("Reiniciar una contraseña")
p("La acción <b>Reiniciar contraseña</b> permite asignar una contraseña nueva "
  "a un usuario que perdió la suya. Escriba una de al menos 8 caracteres y "
  "entréguesela por un canal seguro; la persona debería cambiarla al entrar. "
  "Mientras el envío de correo siga apagado, esta es la única vía de "
  "recuperación (sección 3.3).")

# ===========================================================================
h1("Guías rápidas")

p("Este capítulo resume, en secuencia, el trabajo típico de cada perfil. "
  "Sirve como recordatorio después de la capacitación.", "intro")

h2("El día a día del técnico")
pasos([
    "<b>Entre al sistema.</b> Verá <b>Mis órdenes</b>: solo las suyas.",
    "<b>Revise la campana.</b> Un contador rojo significa que le asignaron "
    "algo o que hay un comentario nuevo.",
    "<b>Abra la orden del día</b> y lea el <b>problema reportado</b>, el "
    "equipo y su ubicación física.",
    "<b>Al llegar al sitio, tome la foto de <i>Antes</i></b> y pulse "
    "<b>Iniciar trabajo</b>. Desde ese momento el sistema cuenta el tiempo.",
    "<b>Si se atasca</b> &mdash;falta un repuesto, no hay acceso, el cliente "
    "no autoriza&mdash; pulse <b>Pausar</b> y escriba el motivo. Ese tiempo "
    "no se le contará como tiempo de trabajo.",
    "<b>Al retomar</b>, pulse <b>Reanudar</b>.",
    "<b>Antes de cerrar</b>: suba la foto de <i>Después</i> e impute los "
    "repuestos que gastó. Después del cierre ya no se puede.",
    "<b>Pulse Completar</b>, describa el trabajo realizado y anote las "
    "horas. La orden queda cerrada y la coordinación recibe el aviso.",
])

h2("El día a día del administrador")
pasos([
    "<b>Revise la campana y el listado.</b> Filtre por <b>Pendiente</b> para "
    "ver lo que está sin asignar.",
    "<b>Levante las órdenes nuevas</b> que hayan entrado por teléfono o "
    "correo del cliente, con <b>Nueva orden</b>.",
    "<b>Asigne técnico</b> a cada orden pendiente desde su detalle. El "
    "técnico recibe el aviso en el acto.",
    "<b>Filtre por En espera</b> para ver qué está trabado y "
    "desatascarlo: casi siempre es un repuesto o una autorización.",
    "<b>Repase el bloque de avisos de Preventivo</b>: lo que está por "
    "vencer y lo vencido. Pulse <b>Generar órdenes ahora</b> si acaba de "
    "crear un plan.",
    "<b>Atienda la franja ámbar de Repuestos</b> y registre las "
    "entradas de las compras que llegaron.",
    "<b>Cierre el mes en Reportes</b>: elija el periodo, revise los "
    "indicadores y exporte el CSV o el PDF que necesite la gerencia.",
])

h2("Puesta en marcha: en qué orden cargar los datos")
p("Al arrancar con el sistema, cada catálogo depende del anterior. Este es el "
  "orden que evita tener que volver atrás:")
tabla(
    "Secuencia de carga inicial",
    ["Paso", "Qué cargar", "Por qué antes que lo siguiente"],
    [
        ["1", "Usuarios",
         "Sin cuentas nadie puede trabajar, y las órdenes necesitan técnicos "
         "a quién asignarse."],
        ["2", "Tipos de mantenimiento",
         "Es un campo obligatorio de toda orden."],
        ["3", "Tipos de equipo",
         "Los planes preventivos cuelgan de ellos."],
        ["4", "Clientes y sus sedes",
         "Toda orden pertenece a un cliente."],
        ["5", "Equipos",
         "Necesitan su cliente, su sede y su tipo de equipo."],
        ["6", "Repuestos con su existencia inicial",
         "Para que el técnico pueda imputar desde la primera orden."],
        ["7", "Planes de mantenimiento preventivo",
         "Necesitan tipos de equipo, tipos de mantenimiento y equipos ya "
         "cargados."],
        ["8", "Órdenes de trabajo",
         "Ya sea a mano o generadas por los planes."],
    ],
    [0.5 * inch, 2.1 * inch, UTIL - 2.6 * inch],
    centro=(0,),
)

# ===========================================================================
h1("Preguntas frecuentes")

tabla(
    "Dudas y situaciones habituales",
    ["Situación", "Qué ocurre y qué hacer"],
    [
        ["No veo una orden que sé que existe",
         "Si es técnico, solo ve las asignadas a usted: pida al administrador "
         "que se la asigne. Si es administrador, revise que no tenga un "
         "filtro de estado puesto; el enlace <b>Limpiar</b> los quita todos."],
        ["El botón que necesito no aparece en la orden",
         "Los botones dependen del estado y de su rol. Por ejemplo, "
         "<b>Completar</b> solo aparece si la orden está <b>En proceso</b>, y "
         "<b>Cancelar</b> es exclusivo del administrador. Consulte la tabla "
         "de la sección 5.5."],
        ["Me equivoqué de cliente al crear la orden",
         "El cliente no se puede cambiar. Cancele la orden indicando el "
         "motivo y cree una nueva con los datos correctos."],
        ["Cerré la orden y olvidé subir una foto",
         "Una orden cerrada no admite cambios en su evidencia. Pida a un "
         "administrador que la <b>reabra</b>; la reapertura queda registrada "
         "en el historial."],
        ["No puedo borrar un cliente, un equipo o un tipo",
         "El borrado solo se permite si el registro nunca se usó en una "
         "orden. Lo correcto en ese caso es <b>desactivarlo</b>: desaparece "
         "de los formularios pero conserva su historial."],
        ["El repuesto que necesito no aparece en la orden",
         "Solo se ofrecen repuestos activos y con existencia. Si está "
         "agotado, un administrador debe registrar la <b>entrada</b> "
         "correspondiente en el almacén."],
        ["Un equipo no aparece en ningún plan preventivo",
         "Casi siempre le falta el <b>tipo de equipo</b>. Asígneselo desde "
         "<b>Equipos &rarr; Editar</b>; los planes alcanzan a los equipos por "
         "su tipo."],
        ["No me llega el correo de recuperación",
         "El envío por correo está apagado hasta que TCI habilite su dominio. "
         "Pida a un administrador que le reinicie la contraseña "
         "(sección 15.4)."],
        ["La pantalla dice «Reconectando cambios en vivo»",
         "Se perdió la conexión con el servidor. Lo que usted ya guardó está "
         "a salvo; recargue la página cuando vuelva la señal."],
        ["Aparece «Esta sección es solo para administradores»",
         "Llegó a una pantalla que su rol no alcanza. Vuelva con el enlace "
         "que ofrece la misma pantalla."],
    ],
    [2.0 * inch, UTIL - 2.0 * inch],
)

# ===========================================================================
h1("Glosario")

tabla(
    "Términos que usa el sistema",
    ["Término", "Significado"],
    [
        ["CMMS", "<i>Computerized Maintenance Management System</i>: sistema "
                 "informático de gestión del mantenimiento. La categoría a la "
                 "que pertenece esta aplicación."],
        ["Orden de trabajo (OT)",
         "El registro de una intervención: qué se hace, sobre qué equipo, "
         "para qué cliente y quién la ejecuta."],
        ["Estado", "La situación de la orden dentro de su ciclo de vida: "
                   "Pendiente, Asignada, En proceso, En espera, Completada o "
                   "Cancelada."],
        ["Transición", "El paso de un estado a otro. Cada una tiene su botón "
                       "y sus reglas."],
        ["Historial", "La línea de tiempo de la orden. No se edita ni se "
                      "borra."],
        ["Evidencia", "Fotografías y documentos adjuntos a la orden, "
                      "clasificados como Antes, Después o Documento."],
        ["Imputar", "Registrar en una orden el consumo de un repuesto, lo que "
                    "descuenta la existencia del almacén."],
        ["Existencia mínima",
         "Cantidad a partir de la cual el sistema avisa de que una pieza está "
         "por agotarse."],
        ["Libro de movimientos",
         "El registro de todas las entradas y salidas del almacén, con su "
         "saldo resultante."],
        ["Plan de mantenimiento",
         "La regla que dice cada cuánto le toca mantenimiento a un tipo de "
         "equipo."],
        ["Proyección", "En el calendario, la fecha en que le tocará "
                       "mantenimiento a un equipo, todavía sin orden creada."],
        ["SLA", "<i>Service Level Agreement</i>: el compromiso de plazo con "
                "el cliente. En el sistema es la <b>fecha límite</b> de la "
                "orden."],
        ["Sede", "Planta o local de un cliente donde están sus equipos."],
        ["Rol", "El perfil de la cuenta: Administrador o Técnico. Decide qué "
                "pantallas y qué acciones tiene disponibles."],
    ],
    [1.5 * inch, UTIL - 1.5 * inch],
)

sp(10)
p("<b>¿Necesita ayuda?</b> Escriba a cotizaciones@tcihn.com o llame al "
  "+504 9565-9697. TCI Técnicos de Control Industrial, 27 Calle, San Pedro "
  "Sula, Honduras.", "intro")

# @@CONTENIDO@@

# ===========================================================================
# ARMADO DEL DOCUMENTO
# ===========================================================================
class Doc(BaseDocTemplate):
    """Lleva el indice y el nombre del capitulo que se dibuja en la cabecera."""

    seccion = ""

    def beforeDocument(self):
        # multiBuild recorre el documento dos veces para resolver el indice.
        # Sin reiniciar esto, la segunda pasada empezaria arrastrando el
        # ultimo capitulo de la primera y la portadilla del indice saldria
        # rotulada "18. Glosario".
        self.seccion = ""

    def afterFlowable(self, flowable):
        if hasattr(flowable, "_toc"):
            nivel, texto = flowable._toc
            self.notify("TOCEntry", (nivel, texto, self.page))
            if nivel == 0:
                self.seccion = texto


doc = Doc(OUT, pagesize=letter, leftMargin=MARGEN, rightMargin=MARGEN,
          topMargin=SUP, bottomMargin=INF,
          title="Manual de Usuario - Sistema de Gestión de Órdenes de "
                "Trabajo y Mantenimiento (CMMS) de TCI",
          author="TCI Técnicos de Control Industrial",
          subject="Manual de usuario del sistema CMMS")

marco_portada = Frame(0, 0, ANCHO, ALTO, id="portada",
                      leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
marco_texto = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height,
                    id="cuerpo")

doc.addPageTemplates([
    PageTemplate(id="portada", frames=[marco_portada], onPage=_portada),
    PageTemplate(id="std", frames=[marco_texto], onPageEnd=_marco),
])

doc.multiBuild(story)
print("PDF generado: %s" % OUT)
