import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { OrdenEstado, UnidadFrecuencia } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActualizarPlanDto,
  CrearPlanDto,
  FiltrarPlanesDto,
} from './dto/plan.dto';

/**
 * Modulo 7 — planes de mantenimiento preventivo (TCI-49).
 *
 * Aqui solo se definen los planes y se calcula cuando toca cada equipo. La
 * generacion automatica de las ordenes es TCI-50 y todavia no existe: este
 * servicio es lo que esa tarea consultara para saber que hay que crear.
 */

/**
 * El cliente de Prisma o una transaccion abierta. `equipos()` lo acepta porque
 * la generacion automatica (TCI-50) corre toda la pasada dentro de una sola
 * transaccion y necesita leer con ella.
 */
type ClientePrisma = PrismaService | Prisma.TransactionClient;

const CAMPOS = {
  id: true,
  nombre: true,
  descripcion: true,
  frecuenciaValor: true,
  frecuenciaUnidad: true,
  diasAnticipacion: true,
  prioridad: true,
  instrucciones: true,
  activo: true,
  createdAt: true,
  tipoEquipo: { select: { id: true, nombre: true, activo: true } },
  cliente: { select: { id: true, nombre: true } },
  tipoMantenimiento: { select: { id: true, codigo: true, nombre: true } },
} satisfies Prisma.PlanMantenimientoSelect;

@Injectable()
export class PreventivoService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(filtros: FiltrarPlanesDto) {
    const where: Prisma.PlanMantenimientoWhereInput = {};
    if (filtros.activo !== undefined) where.activo = filtros.activo;
    if (filtros.tipoEquipoId) where.tipoEquipoId = filtros.tipoEquipoId;
    if (filtros.q?.trim()) {
      where.nombre = { contains: filtros.q.trim(), mode: 'insensitive' };
    }

    const planes = await this.prisma.planMantenimiento.findMany({
      where,
      select: CAMPOS,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });

    // A cuantos equipos alcanza cada plan. Es la pregunta que se hace al
    // crearlo —"¿esto a quien le va a caer?"— y sin ella el plan es abstracto.
    //
    // Se cuenta con un solo `groupBy` y no con un `count` por plan: eso ultimo
    // era una consulta mas por cada fila de la tabla.
    const porTipoYCliente = await this.prisma.equipo.groupBy({
      by: ['tipoEquipoId', 'clienteId'],
      where: {
        tipoEquipoId: { in: planes.map((p) => p.tipoEquipo.id) },
        activo: true,
        deletedAt: null,
      },
      _count: true,
    });

    return planes.map((plan) => ({
      ...plan,
      equipos: porTipoYCliente
        .filter(
          (fila) =>
            fila.tipoEquipoId === plan.tipoEquipo.id &&
            // Un plan sin cliente alcanza a los equipos de todos.
            (!plan.cliente || fila.clienteId === plan.cliente.id),
        )
        .reduce((total, fila) => total + fila._count, 0),
    }));
  }

  async obtener(id: string, cliente: ClientePrisma = this.prisma) {
    const plan = await cliente.planMantenimiento.findUnique({
      where: { id },
      select: CAMPOS,
    });
    if (!plan) throw new NotFoundException(`No existe el plan ${id}.`);
    return plan;
  }

  /**
   * Los equipos a los que alcanza el plan, con su ultimo preventivo y cuando le
   * toca el siguiente. Es lo que hace verificable un plan antes de que exista
   * el generador, y lo que TCI-50 leera para decidir que crear.
   */
  async equipos(id: string, cliente: ClientePrisma = this.prisma) {
    const plan = await this.obtener(id, cliente);

    const equipos = await cliente.equipo.findMany({
      where: this.equiposDelPlan(plan.tipoEquipo.id, plan.cliente?.id),
      select: {
        id: true,
        codigo: true,
        nombre: true,
        cliente: { select: { id: true, nombre: true } },
        sede: { select: { id: true, nombre: true } },
        ordenes: {
          // El ultimo preventivo cerrado de ESTE plan sobre ESTE equipo. Se
          // filtra por plan y no solo por tipo de mantenimiento: dos planes
          // distintos sobre el mismo equipo llevan cuentas separadas.
          where: {
            planId: plan.id,
            estado: OrdenEstado.COMPLETADA,
            deletedAt: null,
            fechaFin: { not: null },
          },
          select: { id: true, numero: true, fechaFin: true },
          orderBy: { fechaFin: 'desc' },
          take: 1,
        },
      },
      orderBy: { codigo: 'asc' },
    });

    const hoy = new Date();

    return {
      plan,
      equipos: equipos.map((equipo) => {
        const ultimo = equipo.ordenes[0] ?? null;
        // Sin preventivo previo toca ya: es la primera vez que se aplica el
        // plan a esa maquina.
        const proximo = ultimo?.fechaFin
          ? sumarFrecuencia(
              ultimo.fechaFin,
              plan.frecuenciaValor,
              plan.frecuenciaUnidad,
            )
          : null;

        return {
          id: equipo.id,
          codigo: equipo.codigo,
          nombre: equipo.nombre,
          cliente: equipo.cliente,
          sede: equipo.sede,
          ultimoPreventivo: ultimo
            ? { id: ultimo.id, numero: ultimo.numero, fecha: ultimo.fechaFin }
            : null,
          proximoVencimiento: proximo,
          vencido: proximo === null || proximo <= hoy,
          /** Entra en la ventana de aviso anticipado (TCI-52). */
          porVencer:
            proximo !== null &&
            proximo > hoy &&
            proximo <= sumarDias(hoy, plan.diasAnticipacion),
        };
      }),
    };
  }

  async crear(dto: CrearPlanDto) {
    await this.exigirReferencias(
      dto.tipoEquipoId,
      dto.tipoMantenimientoId,
      dto.clienteId,
    );

    return this.prisma.planMantenimiento.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion?.trim() || null,
        tipoEquipoId: dto.tipoEquipoId,
        clienteId: dto.clienteId || null,
        tipoMantenimientoId: dto.tipoMantenimientoId,
        frecuenciaValor: dto.frecuenciaValor,
        frecuenciaUnidad: dto.frecuenciaUnidad,
        diasAnticipacion: dto.diasAnticipacion ?? 7,
        prioridad: dto.prioridad,
        instrucciones: dto.instrucciones?.trim() || null,
      },
      select: CAMPOS,
    });
  }

  async actualizar(id: string, dto: ActualizarPlanDto) {
    const plan = await this.obtener(id);

    if (dto.tipoMantenimientoId || dto.clienteId !== undefined) {
      await this.exigirReferencias(
        plan.tipoEquipo.id,
        dto.tipoMantenimientoId ?? plan.tipoMantenimiento.id,
        dto.clienteId ?? undefined,
      );
    }

    return this.prisma.planMantenimiento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        descripcion:
          dto.descripcion === undefined
            ? undefined
            : dto.descripcion.trim() || null,
        // `null` explicito quita el acote por cliente; `undefined` lo deja igual.
        clienteId:
          dto.clienteId === undefined ? undefined : dto.clienteId || null,
        tipoMantenimientoId: dto.tipoMantenimientoId,
        frecuenciaValor: dto.frecuenciaValor,
        frecuenciaUnidad: dto.frecuenciaUnidad,
        diasAnticipacion: dto.diasAnticipacion,
        prioridad: dto.prioridad,
        instrucciones:
          dto.instrucciones === undefined
            ? undefined
            : dto.instrucciones.trim() || null,
        activo: dto.activo,
      },
      select: CAMPOS,
    });
  }

  /**
   * Borrado real. Las ordenes que genero no lo impiden —la FK es `SetNull`— pero
   * perderian el rastro de su origen, asi que se avisa y se obliga a desactivar
   * si ya produjo trabajo.
   */
  async eliminar(id: string): Promise<void> {
    const plan = await this.prisma.planMantenimiento.findUnique({
      where: { id },
      select: { nombre: true, _count: { select: { ordenes: true } } },
    });
    if (!plan) throw new NotFoundException(`No existe el plan ${id}.`);

    if (plan._count.ordenes > 0) {
      throw new UnprocessableEntityException(
        `'${plan.nombre}' ya genero ${plan._count.ordenes} orden(es). ` +
          'Desactivelo en su lugar: dejara de generar y las ordenes conservan de donde salieron.',
      );
    }

    await this.prisma.planMantenimiento.delete({ where: { id } });
  }

  // -------------------------------------------------------------------------
  // Reglas compartidas
  // -------------------------------------------------------------------------

  /**
   * A que equipos alcanza un plan: los de su tipo, activos y no borrados, y del
   * cliente indicado si el plan esta acotado.
   */
  private equiposDelPlan(
    tipoEquipoId: string,
    clienteId?: string,
  ): Prisma.EquipoWhereInput {
    return {
      tipoEquipoId,
      activo: true,
      deletedAt: null,
      ...(clienteId ? { clienteId } : {}),
    };
  }

  private async exigirReferencias(
    tipoEquipoId: string,
    tipoMantenimientoId: string,
    clienteId?: string,
  ): Promise<void> {
    const tipoEquipo = await this.prisma.tipoEquipo.findUnique({
      where: { id: tipoEquipoId },
      select: { activo: true },
    });
    if (!tipoEquipo) {
      throw new UnprocessableEntityException('El tipo de equipo no existe.');
    }
    if (!tipoEquipo.activo) {
      throw new UnprocessableEntityException(
        'El tipo de equipo esta desactivado: reactivelo antes de planificarlo.',
      );
    }

    const tipoMantenimiento = await this.prisma.tipoMantenimiento.findUnique({
      where: { id: tipoMantenimientoId },
      select: { activo: true },
    });
    if (!tipoMantenimiento) {
      throw new UnprocessableEntityException(
        'El tipo de mantenimiento no existe.',
      );
    }
    if (!tipoMantenimiento.activo) {
      throw new UnprocessableEntityException(
        'El tipo de mantenimiento esta desactivado.',
      );
    }

    if (clienteId) {
      const cliente = await this.prisma.cliente.findFirst({
        where: { id: clienteId, deletedAt: null },
        select: { id: true },
      });
      if (!cliente) {
        throw new UnprocessableEntityException('El cliente no existe.');
      }
    }
  }
}

/**
 * Suma la frecuencia del plan a una fecha.
 *
 * Los meses se suman como meses y no como 30 dias: "cada 3 meses" desde el 31
 * de enero debe caer en abril, no el 1 de mayo. `setMonth` de JavaScript ya
 * recorta al ultimo dia valido del mes destino, que es el comportamiento que se
 * quiere (31 de enero + 1 mes = 28 de febrero).
 */
export function sumarFrecuencia(
  desde: Date,
  valor: number,
  unidad: UnidadFrecuencia,
): Date {
  const fecha = new Date(desde);
  switch (unidad) {
    case UnidadFrecuencia.DIAS:
      fecha.setDate(fecha.getDate() + valor);
      break;
    case UnidadFrecuencia.SEMANAS:
      fecha.setDate(fecha.getDate() + valor * 7);
      break;
    case UnidadFrecuencia.MESES: {
      const dia = fecha.getDate();
      fecha.setDate(1);
      fecha.setMonth(fecha.getMonth() + valor);
      // Ultimo dia del mes destino si el original no existe ahi.
      const ultimoDia = new Date(
        fecha.getFullYear(),
        fecha.getMonth() + 1,
        0,
      ).getDate();
      fecha.setDate(Math.min(dia, ultimoDia));
      break;
    }
  }
  return fecha;
}

function sumarDias(desde: Date, dias: number): Date {
  const fecha = new Date(desde);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}
