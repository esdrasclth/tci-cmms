# -*- coding: utf-8 -*-
"""
Generador del informe final del proyecto CMMS de TCI.

Produce las dos entregas a partir del mismo contenido:

    docs/TCI_Documento_Proyecto.pdf     (reportlab)
    docs/TCI_Documento_Proyecto.docx    (python-docx)

El contenido vive en `contenido_documento.py` como una lista de bloques; este
archivo solo sabe dibujarlos. Los datos del apartado 10 y los backlogs del 6
salen de `datos_proyecto.py`, que genera `exportar_plane.py` desde el tablero.
Las figuras las dibuja `figuras_documento.py` como PNG, que es el unico formato
que las dos salidas saben incrustar igual.

Formato: normas APA 7.ª edicion —Arial 12, interlineado doble, sangria de
primera linea, tablas sin lineas verticales, numero de tabla en negrita sobre
titulo en cursiva y nota al pie—, con el encabezado de pagina de la asignatura.

Uso:    python docs/generar_documento.py
        python docs/generar_documento.py --solo pdf
"""
import argparse
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)

from reportlab.lib import colors                                    # noqa: E402
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT      # noqa: E402
from reportlab.lib.pagesizes import letter                          # noqa: E402
from reportlab.lib.styles import ParagraphStyle                     # noqa: E402
from reportlab.lib.units import inch                                # noqa: E402
from reportlab.pdfbase import pdfmetrics                            # noqa: E402
from reportlab.pdfbase.ttfonts import TTFont                        # noqa: E402
from reportlab.platypus import (BaseDocTemplate, Frame, Image,      # noqa: E402
                                KeepTogether, NextPageTemplate,
                                PageBreak, PageTemplate, Paragraph,
                                Spacer, Table, TableStyle)
from reportlab.platypus.tableofcontents import TableOfContents      # noqa: E402

import contenido_documento as C                                     # noqa: E402
import datos_proyecto as D                                          # noqa: E402
import figuras_documento as FIG                                     # noqa: E402

PDF = os.path.join(BASE, "TCI_Documento_Proyecto.pdf")
DOCX = os.path.join(BASE, "TCI_Documento_Proyecto.docx")

# ---------------------------------------------------------------------------
# Paleta institucional. La misma del sistema y del manual de usuario:
# verificada en branding/logo.png (#C61D19) y en la hoja de estilos del sitio
# oficial (--rojo-vino, #C61D1A). Ver el apartado 7.5 del informe.
# ---------------------------------------------------------------------------
ROJO = colors.HexColor("#C61D1A")
NEGRO = colors.HexColor("#000000")
GRAFITO = colors.HexColor("#333333")
GRIS = colors.HexColor("#6B7280")
HUMO = colors.HexColor("#F8F9FA")
BORDE = colors.HexColor("#E0E0E0")

RGB = {"rojo": (0xC6, 0x1D, 0x1A), "negro": (0, 0, 0),
       "grafito": (0x33, 0x33, 0x33), "gris": (0x6B, 0x72, 0x80),
       "borde": (0xE0, 0xE0, 0xE0), "humo": (0xF8, 0xF9, 0xFA)}

# ---------------------------------------------------------------------------
# Tipografia: Arial, la del sitio institucional y la de la aplicacion
# ---------------------------------------------------------------------------
WF = r"C:\Windows\Fonts"


def _registrar(nombre, archivo):
    ruta = os.path.join(WF, archivo)
    if os.path.exists(ruta):
        pdfmetrics.registerFont(TTFont(nombre, ruta))
        return True
    return False


if _registrar("Arial", "arial.ttf"):
    _registrar("Arial-B", "arialbd.ttf")
    _registrar("Arial-I", "ariali.ttf")
    _registrar("Arial-BI", "arialbi.ttf")
    pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-B",
                                  italic="Arial-I", boldItalic="Arial-BI")
    F, FB, FI = "Arial", "Arial-B", "Arial-I"
else:
    F, FB, FI = "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

# ---------------------------------------------------------------------------
# Geometria de pagina
# ---------------------------------------------------------------------------
ANCHO, ALTO = letter
MARGEN = 1.0 * inch
UTIL = ANCHO - 2 * MARGEN
SUP = 1.0 * inch
INF = 0.9 * inch

# APA pide interlineado doble. A 11 pt de cuerpo, 19 de interlinea deja el
# documento legible sin llevarlo a las setenta paginas.
CUERPO, INTERLINEA = 11, 19

S = {}
S["cuerpo"] = ParagraphStyle("cuerpo", fontName=F, fontSize=CUERPO,
                             leading=INTERLINEA, alignment=TA_JUSTIFY,
                             textColor=NEGRO, firstLineIndent=0.5 * inch,
                             spaceAfter=0)
S["cuerpo_sin"] = ParagraphStyle("cuerpo_sin", parent=S["cuerpo"],
                                 firstLineIndent=0, spaceAfter=5)
S["h1"] = ParagraphStyle("h1", fontName=FB, fontSize=14, leading=20,
                         alignment=TA_CENTER, textColor=NEGRO, spaceAfter=12)
S["titulo_suelto"] = ParagraphStyle("titulo_suelto", parent=S["h1"])
S["h2"] = ParagraphStyle("h2", fontName=FB, fontSize=12, leading=17,
                         alignment=TA_LEFT, textColor=ROJO, spaceBefore=13,
                         spaceAfter=5)
S["h3"] = ParagraphStyle("h3", fontName=FB, fontSize=11, leading=15,
                         alignment=TA_LEFT, textColor=NEGRO, spaceBefore=9,
                         spaceAfter=3, fontStyle="italic")
S["vineta"] = ParagraphStyle("vineta", parent=S["cuerpo"], firstLineIndent=0,
                             leftIndent=22, bulletIndent=8, spaceAfter=5,
                             alignment=TA_JUSTIFY, bulletFontName=F,
                             bulletFontSize=CUERPO)
S["bib"] = ParagraphStyle("bib", parent=S["cuerpo"], firstLineIndent=-0.5 * inch,
                          leftIndent=0.5 * inch, spaceAfter=7,
                          alignment=TA_LEFT)
S["th"] = ParagraphStyle("th", fontName=FB, fontSize=8.5, leading=11,
                         textColor=NEGRO, alignment=TA_LEFT)
S["td"] = ParagraphStyle("td", fontName=F, fontSize=8.5, leading=11.5,
                         textColor=GRAFITO, alignment=TA_LEFT)
S["td_b"] = ParagraphStyle("td_b", parent=S["td"], fontName=FB, textColor=NEGRO)
S["num_tabla"] = ParagraphStyle("num_tabla", fontName=FB, fontSize=10,
                                leading=14, textColor=NEGRO, spaceBefore=12)
S["tit_tabla"] = ParagraphStyle("tit_tabla", fontName=FI, fontSize=10,
                                leading=14, textColor=NEGRO, spaceAfter=5)
S["nota"] = ParagraphStyle("nota", fontName=F, fontSize=8.5, leading=12,
                           textColor=GRAFITO, alignment=TA_JUSTIFY,
                           spaceBefore=4, spaceAfter=12)
S["portada_tit"] = ParagraphStyle("portada_tit", fontName=FB, fontSize=17,
                                  leading=24, alignment=TA_CENTER,
                                  textColor=NEGRO)
S["portada_sub"] = ParagraphStyle("portada_sub", fontName=F, fontSize=12.5,
                                  leading=18, alignment=TA_CENTER,
                                  textColor=GRAFITO)
S["portada_txt"] = ParagraphStyle("portada_txt", fontName=F, fontSize=12,
                                  leading=19, alignment=TA_CENTER,
                                  textColor=NEGRO)
S["portada_id"] = ParagraphStyle("portada_id", fontName=F, fontSize=10,
                                 leading=14, alignment=TA_CENTER,
                                 textColor=GRIS)
S["toc0"] = ParagraphStyle("toc0", fontName=FB, fontSize=11, leading=20,
                           textColor=NEGRO)
S["toc1"] = ParagraphStyle("toc1", fontName=F, fontSize=10, leading=17,
                           leftIndent=24, textColor=GRAFITO)

LOGO = os.path.join(BASE, "assets", "logo-negativo.png")
CAPTURAS = os.path.join(BASE, "capturas")


# ---------------------------------------------------------------------------
# Figuras: se generan una vez y las comparten las dos salidas
# ---------------------------------------------------------------------------
def preparar_figuras():
    rutas = FIG.todas(D.MODULOS, D.SPRINTS, D.INDICADORES)
    rutas.setdefault("logo_claro", LOGO)
    return rutas


def ruta_figura(rutas, clave):
    if clave.startswith("captura:"):
        return os.path.join(CAPTURAS, clave.split(":", 1)[1] + ".png")
    return rutas.get(clave)


def _escala(ruta, ancho):
    from PIL import Image as PILImage
    with PILImage.open(ruta) as im:
        w, h = im.size
    return ancho, ancho * h / float(w)


# ---------------------------------------------------------------------------
# Salida PDF
# ---------------------------------------------------------------------------
class Documento(BaseDocTemplate):
    """Plantilla con encabezado de pagina y recoleccion del indice."""

    def __init__(self, ruta, **kw):
        BaseDocTemplate.__init__(self, ruta, pagesize=letter,
                                 leftMargin=MARGEN, rightMargin=MARGEN,
                                 topMargin=SUP, bottomMargin=INF, **kw)
        marco = Frame(MARGEN, INF, UTIL, ALTO - SUP - INF, id="normal")
        self.addPageTemplates([
            PageTemplate(id="portada", frames=[marco]),
            PageTemplate(id="cuerpo", frames=[marco], onPage=self.encabezado)])

    def encabezado(self, lienzo, doc):
        lienzo.saveState()
        lienzo.setFont(F, 10)
        lienzo.setFillColor(NEGRO)
        lienzo.drawString(MARGEN, ALTO - 0.62 * inch, str(doc.page))
        lienzo.setFont(F, 8)
        lienzo.setFillColor(GRIS)
        lienzo.drawRightString(ANCHO - MARGEN, ALTO - 0.62 * inch, C.RUNNING)
        lienzo.setStrokeColor(BORDE)
        lienzo.setLineWidth(0.5)
        lienzo.line(MARGEN, ALTO - 0.72 * inch, ANCHO - MARGEN,
                    ALTO - 0.72 * inch)
        lienzo.restoreState()

    def afterFlowable(self, flowable):
        toc = getattr(flowable, "_toc", None)
        if toc:
            self.notify("TOCEntry", (toc[0], toc[1], self.page))


def portada_pdf(historia, rutas):
    historia.append(Spacer(1, 26))
    if os.path.exists(rutas["logo_claro"]):
        ancho, alto = _escala(rutas["logo_claro"], 230)
        img = Image(rutas["logo_claro"], width=ancho, height=alto)
        img.hAlign = "CENTER"
        historia.append(img)
    historia.append(Spacer(1, 30))
    historia.append(Paragraph(C.TITULO, S["portada_tit"]))
    historia.append(Spacer(1, 10))
    historia.append(Paragraph(C.SUBTITULO, S["portada_sub"]))
    historia.append(Spacer(1, 34))
    for cuenta, nombre in C.INTEGRANTES:
        historia.append(Paragraph(cuenta, S["portada_id"]))
        historia.append(Paragraph(nombre, S["portada_txt"]))
        historia.append(Spacer(1, 7))
    historia.append(Spacer(1, 30))
    for linea in (C.UNIVERSIDAD, C.ASIGNATURA, C.DOCENTE, C.FECHA):
        historia.append(Paragraph(linea, S["portada_txt"]))
    historia.append(NextPageTemplate("cuerpo"))
    historia.append(PageBreak())


def tabla_pdf(historia, contador, titulo, cabecera, filas, pesos, nota):
    contador["tabla"] += 1
    anchos = [p * UTIL for p in pesos]
    datos = [[Paragraph(str(x), S["th"]) for x in cabecera]]
    for fila in filas:
        datos.append([Paragraph(str(v), S["td_b"] if i == 0 else S["td"])
                      for i, v in enumerate(fila)])
    t = Table(datos, colWidths=anchos, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        # APA: solo reglas horizontales. Arriba, bajo la cabecera y al cierre.
        ("LINEABOVE", (0, 0), (-1, 0), 1.0, NEGRO),
        ("LINEBELOW", (0, 0), (-1, 0), 0.6, NEGRO),
        ("LINEBELOW", (0, -1), (-1, -1), 1.0, NEGRO),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, HUMO]),
    ]))
    bloque = [Paragraph("Tabla %d" % contador["tabla"], S["num_tabla"]),
              Paragraph(titulo, S["tit_tabla"]), t]
    if nota:
        bloque.append(Paragraph("<i>Nota.</i> " + nota, S["nota"]))
    else:
        bloque.append(Spacer(1, 12))
    if len(filas) <= 5:
        historia.append(KeepTogether(bloque))
    else:
        historia.extend(bloque)


def figura_pdf(historia, contador, titulo, ruta, nota, ancho):
    contador["figura"] += 1
    if not ruta or not os.path.exists(ruta):
        return
    w, h = _escala(ruta, min(ancho, UTIL))
    img = Image(ruta, width=w, height=h)
    img.hAlign = "LEFT"
    # El encabezado de la figura y la imagen no se separan nunca; la nota si
    # puede pasar a la pagina siguiente cuando la figura es alta, porque
    # mantenerlos los tres juntos dejaria media pagina en blanco.
    cabecera = [Paragraph("Figura %d" % contador["figura"], S["num_tabla"]),
                Paragraph(titulo, S["tit_tabla"]), img]
    pie = [Paragraph("<i>Nota.</i> " + nota, S["nota"])] if nota         else [Spacer(1, 12)]
    if h < 300:
        historia.append(KeepTogether(cabecera + pie))
    else:
        historia.append(KeepTogether(cabecera))
        historia.extend(pie)


def _abrir_pagina(historia):
    """Salto de pagina que no duplica el que ya haya puesto el bloque anterior.

    Toda seccion de primer nivel —Resumen, Indice, Introduccion, Objetivos y
    los catorce apartados— empieza en hoja nueva. Como la portada y el indice
    ya cierran con su propio salto, sin esta comprobacion saldria una pagina
    en blanco entre ellos y la seccion siguiente.
    """
    if not historia:
        return
    if isinstance(historia[-1], PageBreak):
        return
    historia.append(PageBreak())


def construir_pdf(bloques, rutas):
    historia = []
    contador = {"tabla": 0, "figura": 0}
    for bloque in bloques:
        tipo = bloque[0]
        if tipo == "portada":
            portada_pdf(historia, rutas)
        elif tipo == "toc":
            toc = TableOfContents()
            toc.levelStyles = [S["toc0"], S["toc1"]]
            toc.dotsMinLevel = 0
            historia.append(toc)
        elif tipo == "titulo":
            _abrir_pagina(historia)
            par = Paragraph(bloque[1], S["titulo_suelto"])
            par._toc = (0, bloque[1])
            historia.append(par)
        elif tipo == "h1":
            _abrir_pagina(historia)
            par = Paragraph(bloque[1], S["h1"])
            par._toc = (0, bloque[1])
            historia.append(par)
        elif tipo == "h2":
            par = Paragraph(bloque[1], S["h2"])
            par._toc = (1, bloque[1])
            historia.append(par)
        elif tipo == "h3":
            historia.append(Paragraph("<i>%s</i>" % bloque[1], S["h3"]))
        elif tipo == "p":
            historia.append(Paragraph(bloque[1], S["cuerpo"]))
        elif tipo == "ps":
            historia.append(Paragraph(bloque[1], S["cuerpo_sin"]))
        elif tipo == "lista":
            for item in bloque[1]:
                historia.append(Paragraph(item, S["vineta"],
                                          bulletText="\u2022"))
            historia.append(Spacer(1, 5))
        elif tipo == "tabla":
            tabla_pdf(historia, contador, bloque[1], bloque[2], bloque[3],
                      bloque[4], bloque[5])
        elif tipo == "figura":
            figura_pdf(historia, contador, bloque[1],
                       ruta_figura(rutas, bloque[2]), bloque[3], bloque[4])
        elif tipo == "bib":
            for ref in bloque[1]:
                historia.append(Paragraph(ref, S["bib"]))
        else:
            raise ValueError("bloque desconocido: %r" % tipo)

    doc = Documento(PDF, title="Informe final — CMMS para TCI",
                    author="Equipo 330 · CEUTEC",
                    subject=C.ASIGNATURA)
    # multiBuild: el indice necesita dos pasadas para conocer las paginas.
    doc.multiBuild(historia)
    return PDF


# ---------------------------------------------------------------------------
# Salida DOCX
# ---------------------------------------------------------------------------
def construir_docx(bloques, rutas):
    from docx import Document
    from docx.enum.section import WD_SECTION
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Cm, Emu, Pt, RGBColor

    doc = Document()
    contador = {"tabla": 0, "figura": 0}

    for seccion in doc.sections:
        # La portada no lleva encabezado, igual que en el PDF.
        seccion.different_first_page_header_footer = True
        seccion.top_margin = Emu(int(0.9 * 914400))
        seccion.bottom_margin = Emu(int(0.9 * 914400))
        seccion.left_margin = Emu(914400)
        seccion.right_margin = Emu(914400)
    ancho_util = doc.sections[0].page_width - (doc.sections[0].left_margin
                                               + doc.sections[0].right_margin)

    normal = doc.styles["Normal"]
    normal.font.name = "Arial"
    normal.font.size = Pt(CUERPO)
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Arial")
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.line_spacing = 1.5

    def _campo(parrafo, instruccion, texto_provisional):
        """Inserta un campo de Word (el indice) con su texto de reserva."""
        r1 = parrafo.add_run()
        fld = OxmlElement("w:fldChar")
        fld.set(qn("w:fldCharType"), "begin")
        r1._r.append(fld)
        r2 = parrafo.add_run()
        instr = OxmlElement("w:instrText")
        instr.set(qn("xml:space"), "preserve")
        instr.text = instruccion
        r2._r.append(instr)
        r3 = parrafo.add_run()
        sep = OxmlElement("w:fldChar")
        sep.set(qn("w:fldCharType"), "separate")
        r3._r.append(sep)
        parrafo.add_run(texto_provisional).italic = True
        r5 = parrafo.add_run()
        fin = OxmlElement("w:fldChar")
        fin.set(qn("w:fldCharType"), "end")
        r5._r.append(fin)

    def _actualizar_al_abrir():
        """Word regenera el indice al abrir el archivo, sin pedirlo."""
        ajustes = doc.settings.element
        campo = OxmlElement("w:updateFields")
        campo.set(qn("w:val"), "true")
        ajustes.append(campo)

    def _estilos_indice():
        """Word crea los estilos TOC al actualizar el campo; si ya existen en
        la plantilla, se ajustan a Arial para que el indice no salga en la
        fuente por defecto."""
        for nombre, tam, negrita in (("TOC 1", 11, True), ("TOC 2", 10, False)):
            try:
                estilo = doc.styles[nombre]
            except KeyError:
                continue
            estilo.font.name = "Arial"
            estilo.font.size = Pt(tam)
            estilo.font.bold = negrita

    def _encabezado():
        """Numero de pagina a la izquierda y titulillo a la derecha."""
        cab = doc.sections[0].header
        par = cab.paragraphs[0]
        par.alignment = WD_ALIGN_PARAGRAPH.LEFT
        tabs = par.paragraph_format.tab_stops
        tabs.add_tab_stop(ancho_util)
        _campo(par, " PAGE ", "1")
        corredor = par.add_run("\t" + C.RUNNING)
        corredor.font.size = Pt(8)
        corredor.font.color.rgb = RGBColor(*RGB["gris"])
        par.runs[0].font.size = Pt(10)
        # El campo PAGE deja varios runs; el titulillo tiene que ir a la
        # derecha del tabulador, por eso el tab va dentro del mismo run.
        par.paragraph_format.tab_stops[0]

    def _texto(parrafo, texto, tam=CUERPO, color=None, negrita=False,
               cursiva=False):
        """Interpreta las marcas <b>, <i> y &amp; del contenido."""
        import re
        texto = (texto.replace("&amp;", "&").replace("&nbsp;", " ")
                 .replace("&rarr;", "→"))
        for trozo in re.split(r"(<b>.*?</b>|<i>.*?</i>)", texto):
            if not trozo:
                continue
            if trozo.startswith("<b>"):
                r = parrafo.add_run(trozo[3:-4])
                r.bold = True
            elif trozo.startswith("<i>"):
                r = parrafo.add_run(trozo[3:-4])
                r.italic = True
            else:
                r = parrafo.add_run(trozo)
            r.bold = r.bold or negrita
            r.italic = r.italic or cursiva
            r.font.size = Pt(tam)
            r.font.name = "Arial"
            if color:
                r.font.color.rgb = RGBColor(*color)
        return parrafo

    def _borde(celda, lados, grosor, color="000000"):
        tcPr = celda._tc.get_or_add_tcPr()
        bordes = tcPr.find(qn("w:tcBorders"))
        if bordes is None:
            bordes = OxmlElement("w:tcBorders")
            tcPr.append(bordes)
        for lado in lados:
            el = OxmlElement("w:%s" % lado)
            el.set(qn("w:val"), "single")
            el.set(qn("w:sz"), str(grosor))
            el.set(qn("w:color"), color)
            bordes.append(el)

    def _sombrear(celda, hexa):
        tcPr = celda._tc.get_or_add_tcPr()
        sombra = OxmlElement("w:shd")
        sombra.set(qn("w:val"), "clear")
        sombra.set(qn("w:fill"), hexa)
        tcPr.append(sombra)

    def parrafo(texto, alineacion=WD_ALIGN_PARAGRAPH.JUSTIFY, sangria=True,
                tam=CUERPO, negrita=False, espacio_antes=0, espacio_despues=0,
                color=None, interlineado=1.5):
        p = doc.add_paragraph()
        p.alignment = alineacion
        pf = p.paragraph_format
        pf.line_spacing = interlineado
        pf.space_before = Pt(espacio_antes)
        pf.space_after = Pt(espacio_despues)
        if sangria:
            pf.first_line_indent = Emu(int(0.5 * 914400))
        _texto(p, texto, tam=tam, negrita=negrita, color=color)
        return p

    def titulo(texto, nivel, salto=False):
        p = doc.add_paragraph(style="Heading %d" % nivel)
        # El salto se marca en el propio titulo y no como parrafo aparte: asi
        # no quedan parrafos vacios sueltos ni paginas en blanco cuando el
        # bloque anterior (portada, indice) ya cerraba la pagina.
        if salto:
            p.paragraph_format.page_break_before = True
        p.alignment = (WD_ALIGN_PARAGRAPH.CENTER if nivel == 1
                       else WD_ALIGN_PARAGRAPH.LEFT)
        p.paragraph_format.space_before = Pt(0 if salto else 12)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.15
        color = RGB["negro"] if nivel == 1 else RGB["rojo"]
        _texto(p, texto, tam=14 if nivel == 1 else 12, negrita=True,
               color=color)
        return p

    def tabla(titulo_tabla, cabecera, filas, pesos, nota):
        contador["tabla"] += 1
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.line_spacing = 1.0
        _texto(p, "Tabla %d" % contador["tabla"], tam=10, negrita=True)
        p2 = doc.add_paragraph()
        p2.paragraph_format.space_after = Pt(4)
        p2.paragraph_format.line_spacing = 1.0
        _texto(p2, titulo_tabla, tam=10, cursiva=True)

        t = doc.add_table(rows=1, cols=len(cabecera))
        t.alignment = WD_TABLE_ALIGNMENT.LEFT
        t.autofit = False
        anchos = [Emu(int(ancho_util * peso)) for peso in pesos]
        for i, celda in enumerate(t.rows[0].cells):
            celda.width = anchos[i]
            celda.paragraphs[0].paragraph_format.line_spacing = 1.0
            celda.paragraphs[0].paragraph_format.space_after = Pt(2)
            _texto(celda.paragraphs[0], str(cabecera[i]), tam=8.5,
                   negrita=True)
            _borde(celda, ["top"], 12)
            _borde(celda, ["bottom"], 6)
        for n, fila in enumerate(filas):
            celdas = t.add_row().cells
            for i, valor in enumerate(fila):
                celdas[i].width = anchos[i]
                par = celdas[i].paragraphs[0]
                par.paragraph_format.line_spacing = 1.0
                par.paragraph_format.space_after = Pt(2)
                _texto(par, str(valor), tam=8.5,
                       negrita=(i == 0),
                       color=RGB["negro"] if i == 0 else RGB["grafito"])
                if n % 2 == 1:
                    _sombrear(celdas[i], "F8F9FA")
                if n == len(filas) - 1:
                    _borde(celdas[i], ["bottom"], 12)
        if nota:
            p3 = doc.add_paragraph()
            p3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p3.paragraph_format.space_before = Pt(4)
            p3.paragraph_format.space_after = Pt(12)
            p3.paragraph_format.line_spacing = 1.0
            _texto(p3, "Nota.", tam=8.5, cursiva=True)
            _texto(p3, " " + nota, tam=8.5, color=RGB["grafito"])

    def figura(titulo_figura, ruta, nota, ancho_pt):
        contador["figura"] += 1
        if not ruta or not os.path.exists(ruta):
            return
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(12)
        p.paragraph_format.line_spacing = 1.0
        _texto(p, "Figura %d" % contador["figura"], tam=10, negrita=True)
        p2 = doc.add_paragraph()
        p2.paragraph_format.space_after = Pt(4)
        p2.paragraph_format.line_spacing = 1.0
        _texto(p2, titulo_figura, tam=10, cursiva=True)
        p3 = doc.add_paragraph()
        p3.paragraph_format.line_spacing = 1.0
        # Los puntos del PDF son 1/72 de pulgada; Cm evita redondeos raros.
        p3.add_run().add_picture(ruta, width=Cm(min(ancho_pt, 468) / 72 * 2.54))
        if nota:
            p4 = doc.add_paragraph()
            p4.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            p4.paragraph_format.space_before = Pt(4)
            p4.paragraph_format.space_after = Pt(12)
            p4.paragraph_format.line_spacing = 1.0
            _texto(p4, "Nota.", tam=8.5, cursiva=True)
            _texto(p4, " " + nota, tam=8.5, color=RGB["grafito"])

    def portada():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(36)
        if os.path.exists(rutas["logo_claro"]):
            p.add_run().add_picture(rutas["logo_claro"], width=Cm(8.1))
        p = parrafo(C.TITULO, WD_ALIGN_PARAGRAPH.CENTER, sangria=False,
                    tam=17, negrita=True, espacio_antes=26, interlineado=1.2)
        parrafo(C.SUBTITULO, WD_ALIGN_PARAGRAPH.CENTER, sangria=False,
                tam=12.5, espacio_antes=8, espacio_despues=28,
                color=RGB["grafito"], interlineado=1.2)
        for cuenta, nombre in C.INTEGRANTES:
            parrafo(cuenta, WD_ALIGN_PARAGRAPH.CENTER, sangria=False, tam=10,
                    color=RGB["gris"], interlineado=1.0)
            parrafo(nombre, WD_ALIGN_PARAGRAPH.CENTER, sangria=False, tam=12,
                    espacio_despues=7, interlineado=1.0)
        for i, linea in enumerate((C.UNIVERSIDAD, C.ASIGNATURA, C.DOCENTE,
                                   C.FECHA)):
            parrafo(linea, WD_ALIGN_PARAGRAPH.CENTER, sangria=False, tam=12,
                    espacio_antes=24 if i == 0 else 0, interlineado=1.2)

    _encabezado()
    _estilos_indice()

    for bloque in bloques:
        tipo = bloque[0]
        if tipo == "portada":
            portada()
        elif tipo == "toc":
            p = doc.add_paragraph()
            p.paragraph_format.line_spacing = 1.0
            _campo(p, r' TOC \o "1-2" \h \z \u ',
                   "El índice se genera al abrir el documento en Word. "
                   "Si no aparece, sitúe el cursor aquí y pulse F9.")
            _actualizar_al_abrir()
        elif tipo == "titulo":
            titulo(bloque[1], 1, salto=True)
        elif tipo == "h1":
            titulo(bloque[1], 1, salto=True)
        elif tipo == "h2":
            titulo(bloque[1], 2)
        elif tipo == "h3":
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(9)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.line_spacing = 1.15
            _texto(p, bloque[1], tam=11, negrita=True, cursiva=True)
        elif tipo == "p":
            parrafo(bloque[1])
        elif tipo == "ps":
            parrafo(bloque[1], sangria=False, espacio_despues=5)
        elif tipo == "lista":
            for item in bloque[1]:
                p = doc.add_paragraph(style="List Bullet")
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p.paragraph_format.line_spacing = 1.5
                p.paragraph_format.space_after = Pt(4)
                _texto(p, item)
        elif tipo == "tabla":
            tabla(bloque[1], bloque[2], bloque[3], bloque[4], bloque[5])
        elif tipo == "figura":
            figura(bloque[1], ruta_figura(rutas, bloque[2]), bloque[3],
                   bloque[4])
        elif tipo == "bib":
            for ref in bloque[1]:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                pf = p.paragraph_format
                pf.line_spacing = 1.5
                pf.space_after = Pt(6)
                pf.left_indent = Emu(int(0.5 * 914400))
                pf.first_line_indent = Emu(int(-0.5 * 914400))
                _texto(p, ref)
        else:
            raise ValueError("bloque desconocido: %r" % tipo)

    doc.save(DOCX)
    return DOCX


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--solo", choices=("pdf", "docx"), default=None,
                    help="genera solo una de las dos salidas")
    args = ap.parse_args()

    rutas = preparar_figuras()
    bloques = C.bloques()

    if args.solo != "docx":
        print("PDF  ->", construir_pdf(bloques, rutas))
    if args.solo != "pdf":
        print("DOCX ->", construir_docx(bloques, rutas))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
