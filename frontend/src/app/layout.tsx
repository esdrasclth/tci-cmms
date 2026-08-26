import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CMMS TCI",
    template: "%s · CMMS TCI",
  },
  description:
    "Sistema de ordenes de trabajo y mantenimiento de TCI — Tecnicos de Control Industrial.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Se utiliza una pila tipografica del sistema para conservar una carga
    // rapida y una apariencia nativa y profesional en cada plataforma.
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
