"use client";

import { useEffect } from "react";

import "./globals.css";

/**
 * Ultimo recurso: falla el propio layout raiz.
 *
 * Cuando esto entra, el layout no llego a montarse, asi que este archivo tiene
 * que traer su propio `<html>` y su propio `<body>` —es el unico de la
 * aplicacion que lo hace—. Tampoco hay tipografia cargada ni proveedor de
 * sesion, de modo que aqui no se usa nada del resto de la aplicacion: solo
 * clases de utilidad y la pila de reserva de la marca.
 *
 * Se separa de `error.tsx` porque cubren fallos distintos: aquel captura lo que
 * revienta dentro del panel, este lo que revienta antes de que exista panel.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[raiz] error de render:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2.5rem 1rem",
          background: "#f8f9fa",
          color: "#333333",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6b7280",
            }}
          >
            Error grave
          </p>
          <h1
            style={{
              margin: "0.5rem 0 0",
              fontSize: "1.5rem",
              color: "#000000",
            }}
          >
            La aplicacion no pudo iniciar
          </h1>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem" }}>
            Sus datos estan a salvo: este fallo ocurre antes de que la
            aplicacion cargue nada.
          </p>

          {error.digest && (
            <p
              style={{
                margin: "1rem 0 0",
                fontSize: "0.75rem",
                color: "#6b7280",
              }}
            >
              Referencia: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.75rem",
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              border: "none",
              borderRadius: "0.5rem",
              background: "#c61d1a",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
