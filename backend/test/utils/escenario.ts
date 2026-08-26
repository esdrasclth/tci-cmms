import { INestApplication } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { Auth } from '../../src/auth/auth.config';
import { Rol } from '../../src/generated/prisma/enums';
import { PrismaService } from '../../src/prisma/prisma.service';
import { crearUsuarioConCredenciales } from '../../src/usuarios/crear-usuario-credenciales';

/**
 * Datos de apoyo para los e2e de ordenes (TCI-23).
 *
 * Los e2e corren contra la MISMA base que el desarrollo, asi que no se puede
 * vaciar nada: cada escenario crea sus propias filas con un sufijo unico y al
 * terminar borra exactamente los ids que creo. De ahi que `limpiar()` lleve
 * registro de las ordenes en `ordenesCreadas` en vez de borrar por rango.
 */

const CONTRASENA = 'e2e-Passw0rd!';

export interface UsuarioE2E {
  id: string;
  email: string;
  /** Cabecera Cookie ya formada, lista para `.set('Cookie', ...)`. */
  cookie: string;
}

export interface Escenario {
  admin: UsuarioE2E;
  tecnico: UsuarioE2E;
  /** Segundo tecnico: sirve para probar el aislamiento entre tecnicos. */
  otroTecnico: UsuarioE2E;
  /** Tecnico dado de baja, para las validaciones de asignacion. */
  tecnicoInactivo: { id: string };
  clienteId: string;
  sedeId: string;
  equipoId: string;
  /** Cliente distinto, para probar que no se cruzan sede/equipo. */
  otroClienteId: string;
  otroEquipoId: string;
  /** Tipo con `requiereEquipo: true`. */
  tipoConEquipoId: string;
  /** Tipo con `requiereEquipo: false`. */
  tipoSinEquipoId: string;
  tipoInactivoId: string;
  /** Registra una orden recien creada para que `limpiar()` la borre. */
  registrarOrden(id: string): void;
  limpiar(): Promise<void>;
}

/** Inicia sesion contra Better Auth y devuelve la cabecera Cookie. */
export async function iniciarSesion(
  app: INestApplication<App>,
  email: string,
  password: string = CONTRASENA,
): Promise<string> {
  const respuesta = await request(app.getHttpServer())
    .post('/api/auth/sign-in/email')
    .send({ email, password });

  if (respuesta.status !== 200) {
    throw new Error(
      `No se pudo iniciar sesion como ${email}: ${respuesta.status} ${JSON.stringify(respuesta.body)}`,
    );
  }

  const cookies = respuesta.headers['set-cookie'];
  const lista = Array.isArray(cookies) ? cookies : [cookies];
  // Solo interesa el par nombre=valor de cada cookie, no sus atributos.
  return lista
    .filter(Boolean)
    .map((cookie: string) => cookie.split(';')[0])
    .join('; ');
}

export async function sembrarEscenario(
  app: INestApplication<App>,
): Promise<Escenario> {
  const prisma = app.get(PrismaService);
  const auth = app.get<AuthService<Auth>>(AuthService).instance;

  // Sufijo unico por escenario: los e2e comparten base con el desarrollo y con
  // el seed, que ya ocupa codigos como EQ-0001 y correos fijos.
  const sufijo = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  const usuariosCreados: string[] = [];
  const ordenesCreadas: string[] = [];

  const crearUsuario = async (nombre: string, rol: Rol) => {
    const email = `e2e-${nombre}-${sufijo}@tci.test`;
    const usuario = await crearUsuarioConCredenciales(auth, {
      name: `E2E ${nombre}`,
      email,
      password: CONTRASENA,
      rol,
    });
    usuariosCreados.push(usuario.id);
    return { id: usuario.id, email };
  };

  const admin = await crearUsuario('admin', Rol.ADMIN);
  const tecnico = await crearUsuario('tecnico', Rol.TECNICO);
  const otroTecnico = await crearUsuario('otro', Rol.TECNICO);
  const tecnicoInactivo = await crearUsuario('inactivo', Rol.TECNICO);
  await prisma.user.update({
    where: { id: tecnicoInactivo.id },
    data: { activo: false },
  });

  const cliente = await prisma.cliente.create({
    data: { nombre: `E2E Cliente ${sufijo}` },
    select: { id: true },
  });
  const sede = await prisma.sede.create({
    data: {
      clienteId: cliente.id,
      nombre: `E2E Sede ${sufijo}`,
      ciudad: 'San Pedro Sula',
    },
    select: { id: true },
  });
  const equipo = await prisma.equipo.create({
    data: {
      codigo: `E2E-EQ-${sufijo}`,
      nombre: 'Compresor de pruebas',
      clienteId: cliente.id,
      sedeId: sede.id,
    },
    select: { id: true },
  });

  const otroCliente = await prisma.cliente.create({
    data: { nombre: `E2E Cliente ajeno ${sufijo}` },
    select: { id: true },
  });
  const otroEquipo = await prisma.equipo.create({
    data: {
      codigo: `E2E-EQX-${sufijo}`,
      nombre: 'Equipo de otro cliente',
      clienteId: otroCliente.id,
    },
    select: { id: true },
  });

  const tipoConEquipo = await prisma.tipoMantenimiento.create({
    data: {
      codigo: `E2E-CORR-${sufijo}`,
      nombre: 'Correctivo de pruebas',
      requiereEquipo: true,
    },
    select: { id: true },
  });
  const tipoSinEquipo = await prisma.tipoMantenimiento.create({
    data: {
      codigo: `E2E-INSP-${sufijo}`,
      nombre: 'Inspeccion de pruebas',
      requiereEquipo: false,
    },
    select: { id: true },
  });
  const tipoInactivo = await prisma.tipoMantenimiento.create({
    data: {
      codigo: `E2E-OLD-${sufijo}`,
      nombre: 'Tipo retirado',
      activo: false,
    },
    select: { id: true },
  });

  return {
    admin: { ...admin, cookie: await iniciarSesion(app, admin.email) },
    tecnico: { ...tecnico, cookie: await iniciarSesion(app, tecnico.email) },
    otroTecnico: {
      ...otroTecnico,
      cookie: await iniciarSesion(app, otroTecnico.email),
    },
    tecnicoInactivo: { id: tecnicoInactivo.id },
    clienteId: cliente.id,
    sedeId: sede.id,
    equipoId: equipo.id,
    otroClienteId: otroCliente.id,
    otroEquipoId: otroEquipo.id,
    tipoConEquipoId: tipoConEquipo.id,
    tipoSinEquipoId: tipoSinEquipo.id,
    tipoInactivoId: tipoInactivo.id,

    registrarOrden(id: string) {
      ordenesCreadas.push(id);
    },

    /**
     * El orden importa y lo imponen las FK: las ordenes son `Restrict` contra
     * cliente, equipo, tipo y usuario, asi que van primero. El historial y los
     * adjuntos caen solos por `onDelete: Cascade` desde la orden.
     */
    async limpiar() {
      await prisma.ordenTrabajo.deleteMany({
        where: { id: { in: ordenesCreadas } },
      });
      await prisma.equipo.deleteMany({
        where: { id: { in: [equipo.id, otroEquipo.id] } },
      });
      await prisma.sede.deleteMany({ where: { id: sede.id } });
      await prisma.cliente.deleteMany({
        where: { id: { in: [cliente.id, otroCliente.id] } },
      });
      await prisma.tipoMantenimiento.deleteMany({
        where: {
          id: {
            in: [tipoConEquipo.id, tipoSinEquipo.id, tipoInactivo.id],
          },
        },
      });
      await prisma.session.deleteMany({
        where: { userId: { in: usuariosCreados } },
      });
      await prisma.account.deleteMany({
        where: { userId: { in: usuariosCreados } },
      });
      await prisma.user.deleteMany({ where: { id: { in: usuariosCreados } } });
    },
  };
}
