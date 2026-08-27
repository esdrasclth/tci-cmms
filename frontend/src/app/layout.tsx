import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";

import "./globals.css";

/**
 * Poppins, la tipografia de la interfaz.
 *
 * `next/font` la descarga en tiempo de compilacion y la sirve desde el propio
 * origen: no hay peticion a Google en tiempo de ejecucion, ni por tanto el
 * parpadeo de texto sin fuente que eso provoca.
 *
 * Solo se piden los cuatro pesos que la interfaz usa de verdad. Poppins es
 * geometrica y ancha, asi que el texto corrido se compensa en `globals.css`
 * con algo mas de interlineado del que pedia la pila del sistema.
 */
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

/**
 * `viewportFit: "cover"` extiende la pagina bajo el notch y la barra de gestos
 * del telefono, que es lo que hace que `env(safe-area-inset-*)` devuelva algo
 * distinto de cero. Sin esto, el relleno inferior de la hoja movil no existe y
 * el ultimo boton queda debajo de la barra de gestos.
 *
 * No se toca `maximumScale` ni `userScalable`: quitarle el pellizco para
 * ampliar a quien lo necesita para leer no es una forma aceptable de evitar el
 * zoom al enfocar. Eso se resuelve con 16px en los campos (ver `form.tsx`).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  /*
   * El titulo por defecto lleva el nombre completo porque es lo que se ve en
   * la pestana y en el marcador, donde "CMMS TCI" a secas no dice de quien es.
   * Las paginas internas usan la plantilla, que antepone su propio nombre y
   * deja la marca detras: "Ordenes de trabajo · CMMS TCI".
   */
  title: {
    default: "CMMS · Técnicos de Control Industrial",
    template: "%s · CMMS TCI",
  },
  description:
    "Sistema de órdenes de trabajo y mantenimiento de TCI — Técnicos de Control Industrial.",
  applicationName: "CMMS TCI",

  /*
   * **Se pide explicitamente que no se indexe.**
   *
   * Esto no es un sitio publico: es una herramienta interna con el registro
   * cerrado, y lo que hay dentro son datos de los clientes de TCI. Que
   * aparezca en un buscador no aporta nada y expone la superficie de acceso.
   * `nocache` e `imageindex` cierran ademas la copia en cache y la busqueda de
   * imagenes, que es por donde se cuelan las capturas.
   */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },

  /*
   * Vista previa al compartir el enlace por mensajeria, que es como circula
   * de verdad dentro del equipo. Sin esto WhatsApp muestra la URL pelada.
   * La imagen la sirve `opengraph-image.png` por convencion de nombre.
   */
  openGraph: {
    type: "website",
    siteName: "CMMS TCI",
    title: "CMMS · Técnicos de Control Industrial",
    description:
      "Órdenes de trabajo, equipos y mantenimiento preventivo de TCI.",
    locale: "es_HN",
  },

  /* Al anadirlo a la pantalla de inicio en iOS. */
  appleWebApp: {
    capable: true,
    title: "CMMS TCI",
    statusBarStyle: "black-translucent",
  },

  /* El navegador no debe convertir los correos y telefonos en enlaces: los
     hay por toda la ficha de cliente y los repinta de azul. */
  formatDetection: { telephone: false, address: false, email: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
