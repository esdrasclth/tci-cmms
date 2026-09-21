# -*- coding: utf-8 -*-
"""
Figuras generadas del informe academico (docs/generar_documento.py).

Se dibujan con PIL y se guardan como PNG en `docs/assets/figuras/` en lugar de
componerse con las primitivas de reportlab por una razon practica: el informe
se entrega en PDF **y** en Word, y un PNG es lo unico que las dos salidas saben
incrustar igual. Si las figuras se dibujaran con `reportlab.graphics`, el DOCX
se quedaria sin ellas.

Uso:    python docs/figuras_documento.py     (o se invoca desde el generador)
Salida: docs/assets/figuras/*.png
"""
import os

from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(BASE, "assets", "figuras")

# Se dibuja a 3x y se reduce al final con LANCZOS: es el antialiasing del pobre,
# pero PIL no tiene otro y a tamano de impresion la diferencia se nota.
E = 3

ROJO = (198, 29, 26)
ROJO_OSC = (142, 21, 18)
ROJO_TENUE = (251, 237, 236)
NEGRO = (0, 0, 0)
GRAFITO = (51, 51, 51)
GRIS = (107, 114, 128)
HUMO = (248, 249, 250)
BORDE = (224, 224, 224)
BLANCO = (255, 255, 255)
VERDE = (22, 101, 52)
VERDE_TENUE = (220, 240, 228)
AMBAR = (146, 64, 14)
AMBAR_TENUE = (254, 243, 199)

WF = r"C:\Windows\Fonts"


def _fuente(archivo, tam):
    ruta = os.path.join(WF, archivo)
    if os.path.exists(ruta):
        return ImageFont.truetype(ruta, tam * E)
    return ImageFont.load_default()


def F(tam):
    return _fuente("arial.ttf", tam)


def FB(tam):
    return _fuente("arialbd.ttf", tam)


def FI(tam):
    return _fuente("ariali.ttf", tam)


class Lienzo:
    """Envoltorio de PIL que trabaja en puntos y escala al guardar."""

    def __init__(self, ancho, alto, fondo=BLANCO):
        self.w, self.h = ancho, alto
        self.img = Image.new("RGB", (ancho * E, alto * E), fondo)
        self.d = ImageDraw.Draw(self.img)

    def caja(self, x, y, w, h, relleno=None, borde=None, grosor=1, radio=0):
        caja = [x * E, y * E, (x + w) * E, (y + h) * E]
        if radio:
            self.d.rounded_rectangle(caja, radius=radio * E, fill=relleno,
                                     outline=borde, width=grosor * E)
        else:
            self.d.rectangle(caja, fill=relleno, outline=borde,
                             width=grosor * E)

    def linea(self, x1, y1, x2, y2, color=GRAFITO, grosor=1):
        self.d.line([x1 * E, y1 * E, x2 * E, y2 * E], fill=color,
                    width=grosor * E)

    def texto(self, x, y, txt, fuente, color=GRAFITO, ancla="la"):
        self.d.text((x * E, y * E), txt, font=fuente, fill=color, anchor=ancla)

    def ancho_de(self, txt, fuente):
        return self.d.textlength(txt, font=fuente) / E

    def flecha(self, x1, y1, x2, y2, color=GRAFITO, grosor=1, punta=4):
        """Flecha recta. Solo se usa horizontal o vertical, que es lo que hay."""
        self.linea(x1, y1, x2, y2, color, grosor)
        if y1 == y2:
            s = 1 if x2 > x1 else -1
            pts = [(x2, y2), (x2 - s * punta, y2 - punta * 0.6),
                   (x2 - s * punta, y2 + punta * 0.6)]
        else:
            s = 1 if y2 > y1 else -1
            pts = [(x2, y2), (x2 - punta * 0.6, y2 - s * punta),
                   (x2 + punta * 0.6, y2 - s * punta)]
        self.d.polygon([(a * E, b * E) for a, b in pts], fill=color)

    def guardar(self, nombre):
        os.makedirs(SALIDA, exist_ok=True)
        ruta = os.path.join(SALIDA, nombre)
        self.img.resize((self.w * 2, self.h * 2), Image.LANCZOS).save(ruta)
        return ruta


# ---------------------------------------------------------------------------
# Figura: arquitectura general en tres capas
# ---------------------------------------------------------------------------
def arquitectura(ind=None):
    ind = ind or {}
    c = Lienzo(470, 236, BLANCO)

    def capa(x, y, w, h, titulo, tecno, lineas, acento):
        c.caja(x, y, w, h, relleno=BLANCO, borde=BORDE, radio=4)
        c.caja(x, y, w, 3, relleno=acento, radio=0)
        c.texto(x + 11, y + 13, titulo, FB(9), NEGRO)
        c.texto(x + 11, y + 26, tecno, F(8), ROJO)
        for i, t in enumerate(lineas):
            c.texto(x + 11, y + 42 + i * 12, t, F(7.5), GRIS)

    capa(8, 12, 134, 96, "Presentación", "Next.js 16 · React 19",
         ["Panel administrativo", "Panel de campo", "Interfaz responsiva"], ROJO)
    capa(166, 12, 134, 96, "Lógica de negocio", "NestJS 11 · Node.js",
         ["API REST · %d rutas" % ind.get("rutas_http", 85),
          "Guardas por rol", "Tareas programadas"], ROJO)
    capa(324, 12, 138, 96, "Persistencia", "PostgreSQL 18 · Prisma 7",
         ["%d modelos · %d enums" % (ind.get("modelos", 22), ind.get("enums", 10)),
          "%d migraciones" % ind.get("migraciones", 8),
          "Integridad referencial"], ROJO)

    c.flecha(145, 66, 163, 66, GRAFITO, 1, 5)
    c.flecha(303, 66, 321, 66, GRAFITO, 1, 5)
    c.texto(154, 54, "HTTPS", F(6.5), GRIS, "mm")
    c.texto(312, 54, "Prisma", F(6.5), GRIS, "mm")

    # Servicios de apoyo
    c.texto(8, 126, "SERVICIOS DE APOYO", FB(7), GRIS)
    apoyo = [("MinIO / S3", "Evidencia fotográfica y firma de conformidad"),
             ("Resend (SMTP)", "Correo saliente: avisos y restablecimiento"),
             ("Dokploy · Docker", "Contenedores, dominio, TLS y respaldos")]
    for i, (n, t) in enumerate(apoyo):
        y = 142 + i * 28
        c.caja(8, y, 454, 23, relleno=HUMO, borde=BORDE, radio=3)
        c.caja(8, y, 3, 23, relleno=ROJO_OSC, radio=0)
        c.texto(20, y + 7, n, FB(8), NEGRO)
        c.texto(125, y + 7.5, t, F(7.5), GRAFITO)

    return c.guardar("arquitectura.png")


# ---------------------------------------------------------------------------
# Figura: logotipo en su variante para fondo claro
#
# El archivo institucional esta construido en blanco sobre fondo oscuro, asi
# que sobre el papel del informe el texto desapareceria. La variante que pide
# el apartado 7.5.4 conserva el simbolo en rojo y pasa el texto a negro; se
# deriva del original en vez de mantenerse como segundo archivo, para que las
# dos no puedan separarse.
# ---------------------------------------------------------------------------
def logo_claro():
    original = os.path.join(BASE, "..", "branding", "logo.png")
    if not os.path.exists(original):
        return os.path.join(BASE, "assets", "logo-negativo.png")
    im = Image.open(original).convert("RGBA")
    px = im.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, alfa = px[x, y]
            if alfa == 0:
                continue
            # Rojo institucional: mucho mas rojo que verde. Se conserva.
            if r > g + 60:
                continue
            px[x, y] = (0, 0, 0, alfa)
    fondo = Image.new("RGB", im.size, BLANCO)
    fondo.paste(im, mask=im.split()[3])
    caja = fondo.convert("L").point(lambda v: 255 if v < 250 else 0).getbbox()
    if caja:
        fondo = fondo.crop(caja)
    os.makedirs(SALIDA, exist_ok=True)
    ruta = os.path.join(SALIDA, "logo-claro.png")
    fondo.save(ruta)
    return ruta


def logo_variantes():
    """Las dos aplicaciones del logotipo, una al lado de la otra."""
    claro = Image.open(logo_claro())
    original = os.path.join(BASE, "..", "branding", "logo.png")
    if os.path.exists(original):
        oscuro = Image.open(original).convert("RGBA")
        fondo = Image.new("RGB", oscuro.size, NEGRO)
        fondo.paste(oscuro, mask=oscuro.split()[3])
        caja = fondo.convert("L").point(lambda v: 255 if v > 5 else 0).getbbox()
        oscuro = fondo.crop(caja) if caja else fondo
    else:
        oscuro = Image.open(os.path.join(BASE, "assets", "logo-negativo.png"))

    c = Lienzo(470, 150, BLANCO)
    ancho_caja, alto_caja, margen = 226, 96, 16

    def colocar(x, logo, fondo_caja, etiqueta, borde):
        c.caja(x, 10, ancho_caja, alto_caja, relleno=fondo_caja, borde=borde,
               radio=4)
        disponible = (ancho_caja - 2 * margen, alto_caja - 2 * margen)
        escala = min(disponible[0] / logo.width, disponible[1] / logo.height)
        w, h = int(logo.width * escala * E), int(logo.height * escala * E)
        redim = logo.convert("RGB").resize((w, h), Image.LANCZOS)
        cx = int((x + ancho_caja / 2) * E - w / 2)
        cy = int((10 + alto_caja / 2) * E - h / 2)
        c.img.paste(redim, (cx, cy))
        c.texto(x + ancho_caja / 2, 118, etiqueta, FB(7.5), GRAFITO, "mm")

    colocar(4, oscuro, NEGRO, "Original: blanco sobre fondo oscuro", NEGRO)
    colocar(240, claro, BLANCO, "Variante para superficies claras", BORDE)
    c.texto(235, 138, "El símbolo conserva el rojo institucional en ambas "
                      "aplicaciones.", FI(7), GRIS, "mm")
    return c.guardar("logo-variantes.png")


# ---------------------------------------------------------------------------
# Figura: paleta cromatica institucional
# ---------------------------------------------------------------------------
def paleta():
    colores = [("Rojo institucional", "#C61D1A", ROJO, BLANCO),
               ("Rojo oscuro", "#8E1512", ROJO_OSC, BLANCO),
               ("Negro", "#000000", NEGRO, BLANCO),
               ("Gris texto", "#333333", GRAFITO, BLANCO),
               ("Gris fondo", "#F8F9FA", HUMO, GRAFITO),
               ("Blanco", "#FFFFFF", BLANCO, GRAFITO)]
    ancho, alto, sep = 74, 74, 4
    c = Lienzo(len(colores) * (ancho + sep) - sep, alto, BLANCO)
    for i, (nombre, hexa, rgb, tinta) in enumerate(colores):
        x = i * (ancho + sep)
        c.caja(x, 0, ancho, alto, relleno=rgb, borde=BORDE, radio=3)
        c.texto(x + ancho / 2, alto - 26, nombre, FB(7), tinta, "mm")
        c.texto(x + ancho / 2, alto - 14, hexa, F(7), tinta, "mm")
    return c.guardar("paleta.png")


# ---------------------------------------------------------------------------
# Figura: modelo entidad-relacion
# ---------------------------------------------------------------------------
def entidad_relacion():
    c = Lienzo(470, 368, BLANCO)

    def entidad(x, y, w, nombre, campos, acento=ROJO, alto_fila=11):
        h = 19 + len(campos) * alto_fila + 5
        c.caja(x, y, w, h, relleno=BLANCO, borde=BORDE, radio=3)
        c.caja(x, y, w, 16, relleno=acento, radio=3)
        c.caja(x, y + 12, w, 4, relleno=acento, radio=0)
        c.texto(x + 6, y + 4.5, nombre, FB(7.5), BLANCO)
        for i, campo in enumerate(campos):
            c.texto(x + 6, y + 21 + i * alto_fila, campo, F(6.5), GRAFITO)
        return (x, y, w, h)

    cli = entidad(6, 8, 104, "Cliente", ["id · nombre · rtn", "contacto · activo"])
    sed = entidad(6, 66, 104, "Sede", ["id · cliente_id", "nombre · dirección"])
    equ = entidad(6, 124, 104, "Equipo",
                  ["id · código · serie", "cliente_id · sede_id", "tipo_equipo_id"])
    tip = entidad(6, 196, 104, "TipoEquipo", ["id · nombre"], GRIS)
    pla = entidad(6, 246, 104, "PlanMantenimiento",
                  ["id · tipo_equipo_id", "frecuencia · unidad", "días_anticipación"])

    ord_ = entidad(158, 86, 148, "OrdenTrabajo",
                   ["id · número · título", "estado · prioridad · origen",
                    "cliente_id · equipo_id", "tipo_mantenimiento_id",
                    "técnico_id · plan_id", "fechas · costos · moneda"], ROJO_OSC)

    usu = entidad(158, 8, 148, "User", ["id · email · rol", "activo · teléfono"], GRIS)
    tma = entidad(158, 208, 148, "TipoMantenimiento",
                  ["id · código · nombre", "requiere_equipo"], GRIS)
    itc = entidad(158, 268, 148, "ItemChecklist", ["id · tipo_mant_id · texto"], GRIS)

    his = entidad(352, 8, 112, "OrdenHistorial",
                  ["orden_id · usuario_id", "tipo · estado_ant/nuevo", "comentario"])
    adj = entidad(352, 74, 112, "OrdenAdjunto",
                  ["orden_id · clave", "tipo · mime · bytes"])
    chk = entidad(352, 134, 112, "ChecklistOrden",
                  ["orden_id · texto", "hecho · marcado_por"])
    ore = entidad(352, 194, 112, "OrdenRepuesto",
                  ["orden_id · repuesto_id", "cantidad · costo_unit."])
    rep = entidad(352, 254, 112, "Repuesto",
                  ["id · código · unidad", "stock_actual/mínimo"])
    mov = entidad(352, 314, 112, "MovimientoInventario",
                  ["repuesto_id · orden_id", "tipo · cantidad · saldo"])

    def rel(x1, y1, x2, y2, etiqueta="", card=""):
        c.linea(x1, y1, x2, y2, BORDE, 1)
        if etiqueta:
            c.texto((x1 + x2) / 2, (y1 + y2) / 2 - 7, etiqueta, F(6), GRIS, "mm")
        if card:
            c.texto((x1 + x2) / 2, (y1 + y2) / 2 + 3, card, FB(6), ROJO, "mm")

    # Columna izquierda
    c.linea(58, 8 + 41, 58, 66, BORDE, 1)
    c.texto(62, 56, "1:N", FB(6), ROJO)
    c.linea(58, 66 + 41, 58, 124, BORDE, 1)
    c.texto(62, 114, "1:N", FB(6), ROJO)
    c.linea(58, 196, 58, 124 + 52, BORDE, 1)
    c.texto(62, 184, "N:1", FB(6), ROJO)
    c.linea(58, 196 + 30, 58, 246, BORDE, 1)
    c.texto(62, 236, "1:N", FB(6), ROJO)

    # Hacia la orden
    rel(110, 140, 158, 120, "", "1:N")
    rel(110, 270, 158, 150, "", "1:N")
    rel(232, 8 + 34, 232, 86, "asignado / creado por", "1:N")
    rel(232, 208, 232, 86 + 85, "", "N:1")
    rel(232, 208 + 36, 232, 268, "", "1:N")

    # Satelites de la orden
    for y_dest in (40, 100, 160, 220):
        rel(306, 130, 352, y_dest, "", "")
    c.texto(330, 74, "1:N", FB(6), ROJO, "mm")
    rel(408, 194 + 42, 408, 254, "", "N:1")
    rel(408, 254 + 42, 408, 314, "", "1:N")

    return c.guardar("modelo-datos.png")


# ---------------------------------------------------------------------------
# Figura: maquina de estados de la orden de trabajo
# ---------------------------------------------------------------------------
def maquina_estados():
    c = Lienzo(470, 232, BLANCO)

    def estado(x, y, w, etiqueta, final=False):
        relleno = VERDE_TENUE if final else BLANCO
        borde = VERDE if final else ROJO
        c.caja(x, y, w, 26, relleno=relleno, borde=borde, grosor=1, radio=13)
        tinta = VERDE if final else NEGRO
        c.texto(x + w / 2, y + 13, etiqueta, FB(7.5), tinta, "mm")

    # Fila principal: el camino feliz de la orden, de izquierda a derecha.
    estado(8, 48, 78, "PENDIENTE")
    estado(126, 48, 74, "ASIGNADA")
    estado(240, 48, 80, "EN PROCESO")
    estado(360, 48, 86, "COMPLETADA", final=True)
    estado(240, 136, 80, "EN ESPERA")
    estado(360, 184, 86, "CANCELADA", final=True)

    def paso(x1, x2, y, etiqueta):
        c.flecha(x1, y, x2, y, GRAFITO, 1, 4)
        c.texto((x1 + x2) / 2, y - 8, etiqueta, F(6.5), GRIS, "mm")

    paso(86, 124, 61, "asignar")
    paso(200, 238, 61, "iniciar")
    paso(320, 358, 61, "completar")

    # desasignar: por debajo, de ASIGNADA de vuelta a PENDIENTE.
    c.linea(163, 74, 163, 92, BORDE, 1)
    c.linea(163, 92, 47, 92, BORDE, 1)
    c.flecha(47, 92, 47, 76, GRAFITO, 1, 4)
    c.texto(105, 99, "desasignar", F(6.5), GRIS, "mm")

    # pausar / reanudar: el unico ciclo del diagrama.
    c.flecha(268, 76, 268, 134, GRAFITO, 1, 4)
    c.texto(262, 105, "pausar", F(6.5), GRIS, "rm")
    c.flecha(296, 134, 296, 76, GRAFITO, 1, 4)
    c.texto(302, 105, "reanudar", F(6.5), GRIS, "lm")

    # reabrir: por encima, para no cruzar pausar/reanudar.
    c.linea(403, 48, 403, 26, ROJO, 1)
    c.linea(403, 26, 280, 26, ROJO, 1)
    c.flecha(280, 26, 280, 46, ROJO, 1, 4)
    c.texto(345, 19, "reabrir · solo Admin", FB(6.5), ROJO, "mm")

    # cancelar: sale de cualquier estado no final.
    c.caja(8, 182, 300, 30, relleno=HUMO, borde=BORDE, radio=3)
    c.texto(20, 189, "PENDIENTE · ASIGNADA · EN PROCESO · EN ESPERA",
            FB(6.5), GRAFITO)
    c.texto(20, 200, "cualquier estado no final", F(6.5), GRIS)
    c.flecha(312, 197, 356, 197, GRAFITO, 1, 4)
    c.texto(334, 189, "cancelar", F(6.5), GRIS, "mm")

    c.texto(8, 6, "Transiciones del ciclo de vida de la orden", FB(8), NEGRO)
    c.texto(403, 80, "estado final", FI(6.5), VERDE, "ma")
    c.texto(8, 222, "Una orden CANCELADA no se reabre: se crea una nueva.",
            FI(6.5), GRIS)

    return c.guardar("maquina-estados.png")


# ---------------------------------------------------------------------------
# Figura: avance por modulo funcional
# ---------------------------------------------------------------------------
def avance_modulos(modulos):
    """modulos: [(nombre, terminados, total), ...]"""
    fila = 21
    c = Lienzo(470, 14 + len(modulos) * fila + 16, BLANCO)
    x_barra, ancho_barra = 236, 178
    for i, (nombre, hechos, total) in enumerate(modulos):
        y = 10 + i * fila
        c.texto(6, y + 6, nombre, F(7.5), GRAFITO)
        c.caja(x_barra, y + 2, ancho_barra, 11, relleno=HUMO, borde=BORDE,
               radio=2)
        pct = hechos / total if total else 0
        if pct > 0:
            color = VERDE if pct == 1 else ROJO
            c.caja(x_barra, y + 2, max(3, ancho_barra * pct), 11,
                   relleno=color, radio=2)
        c.texto(x_barra + ancho_barra + 8, y + 6, "%d/%d" % (hechos, total),
                FB(7.5), NEGRO if pct == 1 else GRAFITO, "lm")
    c.texto(6, c.h - 12, "Barra completa = módulo cerrado en su totalidad.",
            FI(6.5), GRIS)
    return c.guardar("avance-modulos.png")


# ---------------------------------------------------------------------------
# Figura: work items por Sprint y estado
# ---------------------------------------------------------------------------
def avance_sprints(sprints):
    """sprints: [(nombre, periodo, terminados, curso, pendientes), ...]"""
    c = Lienzo(470, 186, BLANCO)
    ancho_col, sep = 112, 40
    x0 = 30
    base, alto_max = 112, 90
    tope = max(sum(s[2:]) for s in sprints)
    for i, (nombre, periodo, hechos, curso, pend) in enumerate(sprints):
        x = x0 + i * (ancho_col + sep)
        total = hechos + curso + pend
        h_total = alto_max * total / tope
        y = base - h_total
        segmentos = [(hechos, ROJO), (curso, AMBAR_TENUE), (pend, BORDE)]
        cursor = y
        for cantidad, color in segmentos:
            if not cantidad:
                continue
            h = h_total * cantidad / total
            c.caja(x, cursor, ancho_col, h, relleno=color)
            if h >= 12:
                tinta = BLANCO if color == ROJO else GRAFITO
                c.texto(x + ancho_col / 2, cursor + h / 2, str(cantidad),
                        FB(8), tinta, "mm")
            else:
                # Segmento demasiado fino para escribir dentro: la cifra sale
                # al margen con una guia, que es mejor que perderla.
                c.texto(x + ancho_col + 5, cursor + h / 2, str(cantidad),
                        FB(7), GRAFITO, "lm")
            cursor += h
        c.caja(x, y, ancho_col, h_total, borde=BORDE)
        c.texto(x + ancho_col / 2, base + 12, nombre, FB(8), NEGRO, "mm")
        c.texto(x + ancho_col / 2, base + 24, periodo, F(6.5), GRIS, "mm")
        c.texto(x + ancho_col / 2, base + 36, "%d elementos" % total, F(6.5),
                GRAFITO, "mm")
    c.linea(20, base, 456, base, BORDE, 1)

    leyenda = [("Terminado", ROJO), ("En progreso", AMBAR_TENUE),
               ("Pendiente", BORDE)]
    x = 30
    for etiqueta, color in leyenda:
        c.caja(x, 166, 9, 9, relleno=color, borde=BORDE)
        c.texto(x + 14, 170.5, etiqueta, F(7), GRAFITO, "lm")
        x += 14 + c.ancho_de(etiqueta, F(7)) + 24
    return c.guardar("avance-sprints.png")


def todas(modulos, sprints, indicadores=None):
    return {"arquitectura": arquitectura(indicadores),
            "logo": logo_variantes(),
            "logo_claro": logo_claro(),
            "paleta": paleta(),
            "modelo_datos": entidad_relacion(),
            "maquina_estados": maquina_estados(),
            "avance_modulos": avance_modulos(modulos),
            "avance_sprints": avance_sprints(sprints)}


if __name__ == "__main__":
    demo_mod = [("1. Descubrimiento y Definición", 5, 5),
                ("2. Gestión de Órdenes de Trabajo", 13, 13),
                ("3. Autenticación y Permisos", 5, 6),
                ("4. Gestión de Clientes y Equipos", 4, 4),
                ("5. Panel de Técnicos", 8, 8),
                ("6. Gestión de Inventario y Repuestos", 4, 4),
                ("7. Mantenimiento Preventivo", 5, 5),
                ("8. Notificaciones", 6, 6),
                ("9. Reportes e Historial", 4, 4),
                ("10. Implementación y Despliegue", 5, 11)]
    demo_spr = [("Sprint 1", "6–19 ago 2026", 9, 0, 0),
                ("Sprint 2", "20 ago–2 sep 2026", 32, 0, 0),
                ("Sprint 3", "3–20 sep 2026", 18, 4, 3)]
    for k, v in todas(demo_mod, demo_spr).items():
        print(k, "->", v)
