import type { MetadataRoute } from "next";

/**
 * Nada de esto se indexa.
 *
 * Es una herramienta interna con el registro cerrado; lo que contiene son
 * datos de los clientes de TCI. Se declara aqui ademas de en los metadatos
 * porque son dos mecanismos distintos: `robots.txt` frena al rastreador antes
 * de pedir la pagina, y la etiqueta `noindex` solo actua si ya la pidio.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
