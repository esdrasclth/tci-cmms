/**
 * Seed minimo para poder trabajar con Ordenes de Trabajo (TCI-23).
 *
 * Una OT tiene FK no nulas a Cliente y TipoMantenimiento, cuyos CRUD reales son
 * TCI-36 y TCI-30. Hasta que existan, este seed deja datos suficientes para
 * crear y mover ordenes de punta a punta.
 *
 * Es idempotente: se puede correr las veces que haga falta.
 *
 * Los usuarios NO se siembran aqui. Better Auth es ESM-only y este script corre
 * en CommonJS (la misma razon por la que el proyecto usa Vitest y no Jest), asi
 * que importarlo reventaria. El admin se crea con:
 *
 *   curl -X POST http://localhost:3001/api/auth/sign-up/email \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"Admin","email":"admin@tci.hn","password":"cambiame123"}'
 *
 * y luego se promueve corriendo este seed con SEED_ADMIN_EMAIL=admin@tci.hn.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no esta definida');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const TIPOS = [
  { codigo: 'PREV', nombre: 'Mantenimiento preventivo', color: '#2E7D32', requiereEquipo: true },
  { codigo: 'CORR', nombre: 'Mantenimiento correctivo', color: '#C61D1A', requiereEquipo: true },
  { codigo: 'INST', nombre: 'Instalacion de equipo', color: '#1565C0', requiereEquipo: false },
  { codigo: 'INSP', nombre: 'Inspeccion tecnica', color: '#EF6C00', requiereEquipo: false },
];

const CLIENTES = [
  {
    nombre: 'Lacteos del Norte S.A.',
    rtn: '05019012345678',
    contacto: 'Maria Portillo',
    telefono: '+504 2550-1122',
    email: 'mantenimiento@lacteosdelnorte.hn',
    sedes: [
      {
        nombre: 'Planta San Pedro Sula',
        direccion: 'Zona Industrial, Bulevar del Norte',
        ciudad: 'San Pedro Sula',
        equipos: [
          { codigo: 'EQ-0001', nombre: 'Compresor de tornillo 50HP', tipo: 'Compresor', marca: 'Atlas Copco', modelo: 'GA-37', numeroSerie: 'AC37-99120' },
          { codigo: 'EQ-0002', nombre: 'Chiller de proceso 30TR', tipo: 'Refrigeracion', marca: 'Trane', modelo: 'CGAM-030', numeroSerie: 'TR30-44201' },
        ],
      },
      {
        nombre: 'Centro de distribucion Tegucigalpa',
        direccion: 'Anillo Periferico, Col. El Sitio',
        ciudad: 'Tegucigalpa',
        equipos: [
          { codigo: 'EQ-0003', nombre: 'Cuarto frio 120m3', tipo: 'Refrigeracion', marca: 'Bitzer', modelo: 'CF-120', numeroSerie: 'BZ120-7781' },
        ],
      },
    ],
  },
  {
    nombre: 'Embotelladora Central',
    rtn: '08019087654321',
    contacto: 'Jorge Andino',
    telefono: '+504 2233-4455',
    email: 'operaciones@embocentral.hn',
    sedes: [
      {
        nombre: 'Planta Comayagua',
        direccion: 'Km 82 Carretera del Norte',
        ciudad: 'Comayagua',
        equipos: [
          { codigo: 'EQ-0004', nombre: 'Linea de llenado 1', tipo: 'Linea de produccion', marca: 'Krones', modelo: 'Contiflow', numeroSerie: 'KR-CF-3312' },
          { codigo: 'EQ-0005', nombre: 'Caldera de vapor 200BHP', tipo: 'Caldera', marca: 'Cleaver-Brooks', modelo: 'CB-200', numeroSerie: 'CB200-5590' },
        ],
      },
    ],
  },
];

async function main(): Promise<void> {
  for (const tipo of TIPOS) {
    await prisma.tipoMantenimiento.upsert({
      where: { codigo: tipo.codigo },
      update: tipo,
      create: tipo,
    });
  }
  console.log(`Tipos de mantenimiento: ${TIPOS.length}`);

  for (const { sedes, ...datos } of CLIENTES) {
    const cliente = await prisma.cliente.upsert({
      where: { rtn: datos.rtn },
      update: datos,
      create: datos,
    });

    for (const { equipos, ...datosSede } of sedes) {
      // Sede no tiene clave natural unica: se busca por (cliente, nombre).
      const existente = await prisma.sede.findFirst({
        where: { clienteId: cliente.id, nombre: datosSede.nombre },
      });
      const sede = existente
        ? await prisma.sede.update({ where: { id: existente.id }, data: datosSede })
        : await prisma.sede.create({ data: { ...datosSede, clienteId: cliente.id } });

      for (const equipo of equipos) {
        await prisma.equipo.upsert({
          where: { codigo: equipo.codigo },
          update: { ...equipo, clienteId: cliente.id, sedeId: sede.id },
          create: { ...equipo, clienteId: cliente.id, sedeId: sede.id },
        });
      }
    }
  }
  console.log(`Clientes: ${CLIENTES.length}`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    const usuario = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (usuario) {
      await prisma.user.update({ where: { id: usuario.id }, data: { rol: 'ADMIN' } });
      console.log(`Promovido a ADMIN: ${adminEmail}`);
    } else {
      console.warn(
        `SEED_ADMIN_EMAIL=${adminEmail} no existe todavia. Registralo con ` +
          `POST /api/auth/sign-up/email y vuelve a correr el seed.`,
      );
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((error: unknown) => {
    console.error(error);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
