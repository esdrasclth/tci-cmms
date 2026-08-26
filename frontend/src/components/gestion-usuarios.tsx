"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Alerta, Campo, CampoContrasena } from "@/components/form";
import { BotonFila, BotonesDialogo, Modal } from "@/components/modal";
import { ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import {
  ETIQUETA_ROL,
  actualizarUsuario,
  crearUsuario,
  listarUsuarios,
  reiniciarContrasena,
  type Usuario,
} from "@/lib/usuarios";

const LARGO_MINIMO = 8;

type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar"; usuario: Usuario }
  | { tipo: "contrasena"; usuario: Usuario }
  | null;

/**
 * TCI-35 — gestion de usuarios.
 *
 * Sustituye al registro publico, que esta cerrado en el backend
 * (`disableSignUp`): esta pantalla es la unica via de alta de la aplicacion.
 *
 * Las guardas contra dejar el sistema sin administradores viven en el backend
 * (no puede uno quitarse su propio rol, ni desactivar al ultimo admin activo).
 * Aqui solo se muestran los mensajes que devuelve.
 */
export function GestionUsuarios() {
  const { data: sesion } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [dialogo, setDialogo] = useState<Dialogo>(null);

  useEffect(() => {
    let cancelado = false;
    listarUsuarios()
      .then((u) => {
        if (!cancelado) {
          setUsuarios(u);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(
            e instanceof ApiError ? e.message : "No se pudo cargar la lista.",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  async function alternarActivo(usuario: Usuario) {
    try {
      const actualizado = await actualizarUsuario(usuario.id, {
        activo: !usuario.activo,
      });
      setUsuarios((lista) =>
        lista.map((u) => (u.id === actualizado.id ? actualizado : u)),
      );
      setError(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo cambiar el estado.",
      );
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-tci-negro">Usuarios</h1>
          <p className="mt-1 text-sm text-tci-gris">
            Las cuentas solo se crean desde aqui: el registro publico esta
            cerrado.
          </p>
        </div>
        <button
          onClick={() => setDialogo({ tipo: "nuevo" })}
          className="rounded-lg bg-tci-rojo px-4 py-2.5 text-sm font-bold text-white hover:bg-tci-rojo-hover"
        >
          Nuevo usuario
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <Alerta>{error}</Alerta>
        </div>
      )}

      <div className="mt-5">
        {cargando ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl border border-tci-borde bg-white"
              />
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          <p className="rounded-xl border border-dashed border-tci-borde bg-white p-8 text-center text-sm text-tci-grafito">
            No hay usuarios.
          </p>
        ) : (
          <>
            {/* Tabla en escritorio, tarjetas en movil (TCI-44): la tabla con
                scroll horizontal obligaba a arrastrar la fila con el dedo para
                llegar a los botones. */}
            <div className="hidden overflow-x-auto rounded-xl border border-tci-borde bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-tci-borde bg-tci-humo text-xs text-tci-gris uppercase">
                  <tr>
                    <th className="px-4 py-3 font-bold">Nombre</th>
                    <th className="px-4 py-3 font-bold">Rol</th>
                    <th className="px-4 py-3 font-bold">Estado</th>
                    <th className="px-4 py-3 font-bold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="border-b border-tci-borde last:border-0"
                    >
                      <td className="px-4 py-3">
                        <Identidad
                          usuario={usuario}
                          esUsted={usuario.id === sesion?.user.id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <EtiquetaRol usuario={usuario} />
                      </td>
                      <td className="px-4 py-3">
                        <EtiquetaEstado usuario={usuario} />
                      </td>
                      <td className="px-4 py-3">
                        <Acciones
                          usuario={usuario}
                          esUsted={usuario.id === sesion?.user.id}
                          setDialogo={setDialogo}
                          onAlternar={() => void alternarActivo(usuario)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {usuarios.map((usuario) => (
                <li
                  key={usuario.id}
                  className="rounded-xl border border-tci-borde bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Identidad
                      usuario={usuario}
                      esUsted={usuario.id === sesion?.user.id}
                    />
                    <EtiquetaRol usuario={usuario} />
                  </div>
                  <div className="mt-2">
                    <EtiquetaEstado usuario={usuario} />
                  </div>
                  <div className="mt-3">
                    <Acciones
                      usuario={usuario}
                      esUsted={usuario.id === sesion?.user.id}
                      setDialogo={setDialogo}
                      onAlternar={() => void alternarActivo(usuario)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {dialogo?.tipo === "nuevo" && (
        <DialogoUsuario
          titulo="Nuevo usuario"
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "editar" && (
        <DialogoUsuario
          titulo="Editar usuario"
          usuario={dialogo.usuario}
          onCerrar={() => setDialogo(null)}
          onGuardado={() => {
            setDialogo(null);
            recargar();
          }}
        />
      )}
      {dialogo?.tipo === "contrasena" && (
        <DialogoContrasena
          usuario={dialogo.usuario}
          onCerrar={() => setDialogo(null)}
        />
      )}
    </section>
  );
}



/**
 * Piezas de una fila de usuario, compartidas por la tabla de escritorio y las
 * tarjetas de movil (TCI-44). Se extraen para que las dos vistas no se
 * desincronicen al tocar una.
 */
function Identidad({
  usuario,
  esUsted,
}: {
  usuario: Usuario;
  esUsted: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="font-bold text-tci-negro">
        {usuario.name}
        {esUsted && (
          <span className="ml-2 text-xs font-normal text-tci-gris">
            (usted)
          </span>
        )}
      </p>
      <p className="truncate text-xs text-tci-gris">{usuario.email}</p>
    </div>
  );
}

function EtiquetaRol({ usuario }: { usuario: Usuario }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
        usuario.rol === "ADMIN"
          ? "bg-tci-rojo text-white"
          : "bg-tci-borde text-tci-grafito"
      }`}
    >
      {ETIQUETA_ROL[usuario.rol]}
    </span>
  );
}

function EtiquetaEstado({ usuario }: { usuario: Usuario }) {
  return (
    <span
      className={`text-xs font-bold ${
        usuario.activo ? "text-emerald-700" : "text-tci-gris"
      }`}
    >
      {usuario.activo ? "Activo" : "Desactivado"}
    </span>
  );
}

function Acciones({
  usuario,
  esUsted,
  setDialogo,
  onAlternar,
}: {
  usuario: Usuario;
  esUsted: boolean;
  setDialogo: (dialogo: Dialogo) => void;
  onAlternar: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <BotonFila onClick={() => setDialogo({ tipo: "editar", usuario })}>
        Editar
      </BotonFila>
      <BotonFila onClick={() => setDialogo({ tipo: "contrasena", usuario })}>
        Contrasena
      </BotonFila>
      <BotonFila
        onClick={onAlternar}
        // El backend lo rechazaria igual; deshabilitarlo evita ofrecer algo
        // que no se puede hacer.
        disabled={esUsted && usuario.activo}
        titulo={
          esUsted && usuario.activo
            ? "No puede desactivarse a si mismo"
            : undefined
        }
      >
        {usuario.activo ? "Desactivar" : "Activar"}
      </BotonFila>
    </div>
  );
}

function DialogoUsuario({
  titulo,
  usuario,
  onCerrar,
  onGuardado,
}: {
  titulo: string;
  usuario?: Usuario;
  onCerrar: () => void;
  onGuardado: () => void;
}) {
  const editando = usuario !== undefined;
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const telefono = String(datos.get("telefono") ?? "").trim();

    setGuardando(true);
    setError(null);
    try {
      if (editando) {
        await actualizarUsuario(usuario.id, {
          name: String(datos.get("name")).trim(),
          rol: datos.get("rol") as "ADMIN" | "TECNICO",
          ...(telefono ? { telefono } : {}),
        });
      } else {
        await crearUsuario({
          name: String(datos.get("name")).trim(),
          email: String(datos.get("email")).trim(),
          password: String(datos.get("password")),
          rol: datos.get("rol") as "ADMIN" | "TECNICO",
          ...(telefono ? { telefono } : {}),
        });
      }
      onGuardado();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar el usuario.",
      );
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
        {error && <Alerta>{error}</Alerta>}

        <Campo
          etiqueta="Nombre completo"
          name="name"
          defaultValue={usuario?.name}
          placeholder="Juan Perez"
          required
        />

        {editando ? (
          // El correo identifica la cuenta en Better Auth: cambiarlo dejaria la
          // fila de `accounts` desalineada.
          <div>
            <span className="mb-1.5 block text-sm font-bold text-tci-negro">
              Correo
            </span>
            <p className="rounded-lg bg-tci-humo px-4 py-3 text-sm text-tci-gris">
              {usuario.email}{" "}
              <span className="text-xs">(no se puede cambiar)</span>
            </p>
          </div>
        ) : (
          <Campo
            etiqueta="Correo"
            name="email"
            type="email"
            placeholder="usuario@tcihn.com"
            required
          />
        )}

        <div>
          <label
            htmlFor="rol"
            className="mb-1.5 block text-sm font-bold text-tci-negro"
          >
            Rol
          </label>
          <select
            id="rol"
            name="rol"
            defaultValue={usuario?.rol ?? "TECNICO"}
            className="w-full rounded-lg border border-tci-borde bg-white px-4 py-3 text-sm text-tci-negro"
          >
            <option value="TECNICO">Tecnico</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </div>

        <Campo
          etiqueta="Telefono (opcional)"
          name="telefono"
          type="tel"
          defaultValue={usuario?.telefono ?? ""}
          placeholder="+504 9999-9999"
        />

        {!editando && (
          <CampoContrasena
            etiqueta="Contrasena inicial"
            name="password"
            autoComplete="new-password"
            placeholder={`Minimo ${LARGO_MINIMO} caracteres`}
            required
          />
        )}

        <BotonesDialogo
          onCerrar={onCerrar}
          guardando={guardando}
          texto={editando ? "Guardar cambios" : "Crear usuario"}
        />
      </form>
    </Modal>
  );
}

function DialogoContrasena({
  usuario,
  onCerrar,
}: {
  usuario: Usuario;
  onCerrar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const password = String(datos.get("password"));
    if (password.length < LARGO_MINIMO) {
      setError(`La contrasena debe tener al menos ${LARGO_MINIMO} caracteres.`);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await reiniciarContrasena(usuario.id, password);
      setListo(true);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudo reiniciar la contrasena.",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Reiniciar contrasena" onCerrar={onCerrar}>
      {listo ? (
        <div className="mt-5 space-y-4">
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Contrasena actualizada. Las sesiones abiertas de{" "}
            <strong>{usuario.name}</strong> se cierran en un plazo de hasta un
            minuto y tendra que volver a entrar.
          </p>
          <button
            onClick={onCerrar}
            className="w-full rounded-lg border border-tci-borde px-4 py-3 text-sm font-bold text-tci-negro hover:bg-tci-humo"
          >
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={alEnviar} className="mt-5 space-y-4" noValidate>
          {error && <Alerta>{error}</Alerta>}

          <p className="text-sm text-tci-grafito">
            Se asignara una contrasena nueva a{" "}
            <strong>{usuario.name}</strong> ({usuario.email}). Comuniquesela por
            un medio seguro y pidale que la cambie.
          </p>
          <p className="rounded-lg bg-tci-humo px-4 py-3 text-xs text-tci-gris">
            Esta es la via provisional mientras no exista la recuperacion por
            correo (TCI-34).
          </p>

          <CampoContrasena
            etiqueta="Contrasena nueva"
            name="password"
            autoComplete="new-password"
            placeholder={`Minimo ${LARGO_MINIMO} caracteres`}
            required
          />

          <BotonesDialogo
            onCerrar={onCerrar}
            guardando={guardando}
            texto="Reiniciar"
          />
        </form>
      )}
    </Modal>
  );
}

