import { redirect } from "next/navigation";

/**
 * La raiz no tiene contenido propio todavia. El panel decide si hay sesion y,
 * si no, manda al login.
 */
export default function Home() {
  redirect("/panel");
}
