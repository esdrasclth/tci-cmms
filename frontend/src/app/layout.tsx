import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: {
    default: "CMMS TCI",
    template: "%s · CMMS TCI",
  },
  description:
    "Sistema de órdenes de trabajo y mantenimiento de TCI — Técnicos de Control Industrial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
