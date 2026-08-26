import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `standalone` deja en `.next/standalone` un servidor con solo las
   * dependencias que la aplicacion usa de verdad. Sin esto, la imagen de
   * produccion tendria que llevarse `node_modules` entero: cientos de megas de
   * los que la mayoria son herramientas de compilacion.
   */
  output: "standalone",

  /*
   * El logo y la fotografia del login se sirven desde `public/` y los optimiza
   * el propio servidor de Next. No hay imagenes remotas, asi que no hace falta
   * declarar dominios.
   */
};

export default nextConfig;
