import type { MetadataRoute } from "next";

/**
 * Manifiesto de aplicacion instalable.
 *
 * Lo que decide esto es como se ve el CMMS cuando un tecnico lo anade a la
 * pantalla de inicio, que es como se va a usar en campo: con `standalone` se
 * abre sin barra de direcciones y se comporta como una aplicacion, no como una
 * pestana.
 *
 * `background_color` es el negro de la marca y no el blanco de la aplicacion:
 * es el color de la pantalla de arranque, y el logotipo de TCI sobre blanco
 * desaparece.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CMMS · Técnicos de Control Industrial",
    short_name: "CMMS TCI",
    description:
      "Órdenes de trabajo, equipos y mantenimiento preventivo de TCI.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "es-HN",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        // `maskable` deja que el sistema lo recorte con su propia forma sin
        // comerse el simbolo: por eso este lleva mas margen.
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
