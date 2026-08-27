import type { Metadata } from "next";

/**
 * Solo existe para dar titulo de pestana: la pagina es de cliente —maneja un
 * formulario— y una pagina de cliente no puede exportar `metadata`.
 */
export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
