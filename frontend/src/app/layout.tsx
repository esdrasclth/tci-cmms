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
    // Arial es la tipografia institucional (TCI-17): no se carga ninguna
    // webfont, se usa la del sistema.
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
