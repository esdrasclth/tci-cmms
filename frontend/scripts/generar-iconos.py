# -*- coding: utf-8 -*-
"""
Genera los iconos de la aplicacion a partir del logotipo de TCI.

    python frontend/scripts/generar-iconos.py

El logotipo es blanco y rojo sobre transparente, asi que **no sirve tal cual
como favicon**: sobre una pestana clara la mitad blanca desaparece y queda un
codo rojo suelto. Por eso todo se compone sobre el negro de la marca, que es
como el logotipo se usa en el resto de la aplicacion —barra lateral, panel de
acceso— y precisamente por el mismo motivo.

Tambien se recorta solo el **simbolo**: a 16 px el texto "TCI" y el eslogan no
se leen, y un favicon ilegible es peor que uno simple. El simbolo termina en un
hueco vertical limpio del propio archivo (x=1554), que es de donde sale el
recorte.
"""
import pathlib

from PIL import Image, ImageDraw

RAIZ = pathlib.Path(__file__).resolve().parent.parent
LOGO = RAIZ / "public" / "logo-tci.png"
APP = RAIZ / "src" / "app"
PUBLICO = RAIZ / "public"

NEGRO = (0, 0, 0, 255)
ROJO = (198, 29, 26, 255)

# Recorte del simbolo, medido sobre el archivo original (4586x1335).
SIMBOLO = (36, 22, 1554, 1298)


def simbolo() -> Image.Image:
    return Image.open(LOGO).convert("RGBA").crop(SIMBOLO)


def cuadrado(lado: int, ocupacion: float, radio: float) -> Image.Image:
    """
    Compone el simbolo centrado sobre un cuadrado negro.

    `ocupacion` es la fraccion del lado que ocupa el simbolo. En los iconos
    `maskable` va mas baja: el sistema recorta el icono con la forma que quiera
    —circulo, cuadrado redondeado, gota— y solo garantiza el 80% central, asi
    que lo que no quepa ahi se pierde.

    `radio` en fraccion del lado. Los maskable van a 0: redondearlos seria
    redondear dos veces y quedaria un borde negro raro.
    """
    lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))

    fondo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
    pincel = ImageDraw.Draw(fondo)
    if radio > 0:
        pincel.rounded_rectangle(
            [(0, 0), (lado - 1, lado - 1)], radius=int(lado * radio), fill=NEGRO
        )
    else:
        pincel.rectangle([(0, 0), (lado - 1, lado - 1)], fill=NEGRO)
    lienzo.alpha_composite(fondo)

    marca = simbolo()
    ancho = int(lado * ocupacion)
    alto = int(marca.height * (ancho / marca.width))
    marca = marca.resize((ancho, alto), Image.LANCZOS)
    lienzo.alpha_composite(marca, ((lado - ancho) // 2, (lado - alto) // 2))
    return lienzo


def apertura() -> Image.Image:
    """
    Imagen de vista previa, la que sale al compartir el enlace por mensajeria.

    Lleva el logotipo completo —aqui si hay sitio para leerlo— sobre el negro
    de la marca, con la franja roja institucional abajo.
    """
    ancho, alto = 1200, 630
    lienzo = Image.new("RGBA", (ancho, alto), NEGRO)

    logo = Image.open(LOGO).convert("RGBA")
    destino = int(ancho * 0.62)
    logo = logo.resize(
        (destino, int(logo.height * (destino / logo.width))), Image.LANCZOS
    )
    lienzo.alpha_composite(logo, ((ancho - logo.width) // 2, (alto - logo.height) // 2 - 20))

    pincel = ImageDraw.Draw(lienzo)
    pincel.rectangle([(0, alto - 12), (ancho, alto)], fill=ROJO)
    return lienzo


def fondos() -> None:
    """
    Versiones del fondo del acceso al ancho que cada pantalla necesita.

    El JPG original son 3195px y 649 KB, y se cargaba igual en un telefono
    —por CSS, asi que Next no lo optimiza— para acabar bajo un velo negro al
    55%. La calidad puede bajar mucho justamente por ese velo.
    """
    origen = PUBLICO / "background.jpg"
    if not origen.exists():
        print("  (sin background.jpg: se omiten los fondos)")
        return
    base = Image.open(origen).convert("RGB")
    for ancho, nombre, calidad in [
        (760, "fondo-movil.webp", 62),
        (1600, "fondo.webp", 68),
    ]:
        im = base.resize(
            (ancho, round(base.height * ancho / base.width)), Image.LANCZOS
        )
        im.save(PUBLICO / nombre, "WEBP", quality=calidad, method=6)
        print(f"  {nombre}")


def main() -> None:
    APP.mkdir(parents=True, exist_ok=True)

    # Favicon: varios tamanos en un solo .ico. El de 16 es el que se ve en la
    # pestana, y a ese tamano el simbolo ya va justo.
    base = cuadrado(512, 0.62, 0.22)
    base.save(
        APP / "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("  favicon.ico")

    # Next sirve estos dos por convencion de nombre.
    base.resize((512, 512), Image.LANCZOS).save(APP / "icon.png")
    print("  icon.png")

    # iOS no respeta la transparencia y pone su propia mascara redondeada, asi
    # que el fondo va macizo y sin redondear por nuestra parte.
    cuadrado(180, 0.60, 0.0).convert("RGB").save(APP / "apple-icon.png")
    print("  apple-icon.png")

    # Manifiesto: uno normal y uno recortable.
    cuadrado(192, 0.62, 0.22).save(PUBLICO / "icon-192.png")
    cuadrado(512, 0.62, 0.22).save(PUBLICO / "icon-512.png")
    cuadrado(512, 0.50, 0.0).save(PUBLICO / "icon-maskable-512.png")
    print("  icon-192.png · icon-512.png · icon-maskable-512.png")

    apertura().convert("RGB").save(APP / "opengraph-image.png", quality=92)
    print("  opengraph-image.png")

    fondos()


if __name__ == "__main__":
    main()
