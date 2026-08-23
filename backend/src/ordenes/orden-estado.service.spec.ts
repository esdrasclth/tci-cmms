import {
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { OrdenEstado, Rol } from '../generated/prisma/enums';
import {
  ACCIONES,
  AccionOrden,
  ContextoAccion,
  OrdenEstadoService,
} from './orden-estado.service';

const ADMIN = 'usr_admin';
const TECNICO = 'usr_tecnico';
const OTRO_TECNICO = 'usr_otro';

describe('OrdenEstadoService', () => {
  let servicio: OrdenEstadoService;

  beforeEach(() => {
    servicio = new OrdenEstadoService();
  });

  const comoAdmin = (
    accion: AccionOrden,
    estadoActual: OrdenEstado,
    extra: Partial<ContextoAccion> = {},
  ): ContextoAccion => ({
    accion,
    estadoActual,
    rol: Rol.ADMIN,
    usuarioId: ADMIN,
    tecnicoId: TECNICO,
    motivo: servicio.requiereMotivo(accion) ? 'motivo de prueba' : undefined,
    ...extra,
  });

  const comoTecnico = (
    accion: AccionOrden,
    estadoActual: OrdenEstado,
    extra: Partial<ContextoAccion> = {},
  ): ContextoAccion =>
    comoAdmin(accion, estadoActual, {
      rol: Rol.TECNICO,
      usuarioId: TECNICO,
      ...extra,
    });

  describe('tabla de transiciones de docs/flujo-ordenes.md §2', () => {
    // [accion, estado origen, estado destino esperado]
    const validas: [AccionOrden, OrdenEstado, OrdenEstado][] = [
      ['asignar', OrdenEstado.PENDIENTE, OrdenEstado.ASIGNADA],
      ['cancelar', OrdenEstado.PENDIENTE, OrdenEstado.CANCELADA],
      ['iniciar', OrdenEstado.ASIGNADA, OrdenEstado.EN_PROCESO],
      ['reasignar', OrdenEstado.ASIGNADA, OrdenEstado.ASIGNADA],
      ['desasignar', OrdenEstado.ASIGNADA, OrdenEstado.PENDIENTE],
      ['cancelar', OrdenEstado.ASIGNADA, OrdenEstado.CANCELADA],
      ['pausar', OrdenEstado.EN_PROCESO, OrdenEstado.EN_ESPERA],
      ['completar', OrdenEstado.EN_PROCESO, OrdenEstado.COMPLETADA],
      ['cancelar', OrdenEstado.EN_PROCESO, OrdenEstado.CANCELADA],
      ['reanudar', OrdenEstado.EN_ESPERA, OrdenEstado.EN_PROCESO],
      ['cancelar', OrdenEstado.EN_ESPERA, OrdenEstado.CANCELADA],
      ['reabrir', OrdenEstado.COMPLETADA, OrdenEstado.EN_PROCESO],
    ];

    it.each(validas)('%s desde %s lleva a %s', (accion, desde, hacia) => {
      expect(servicio.validar(comoAdmin(accion, desde)).nuevoEstado).toBe(
        hacia,
      );
    });

    it('cubre exactamente las 12 transiciones documentadas', () => {
      const total = Object.values(OrdenEstado).flatMap((estado) =>
        ACCIONES.filter((accion) => {
          try {
            servicio.validar(comoAdmin(accion, estado));
            return true;
          } catch {
            return false;
          }
        }),
      );
      expect(total).toHaveLength(validas.length);
    });

    it('CANCELADA no tiene salida: una OT cancelada no se reabre', () => {
      for (const accion of ACCIONES) {
        expect(() =>
          servicio.validar(comoAdmin(accion, OrdenEstado.CANCELADA)),
        ).toThrow(UnprocessableEntityException);
      }
    });

    it('rechaza con 422 una transicion fuera de la tabla', () => {
      expect(() =>
        servicio.validar(comoAdmin('completar', OrdenEstado.PENDIENTE)),
      ).toThrow(UnprocessableEntityException);
      expect(() =>
        servicio.validar(comoAdmin('iniciar', OrdenEstado.EN_ESPERA)),
      ).toThrow(UnprocessableEntityException);
    });
  });

  describe('permisos', () => {
    const soloAdmin: [AccionOrden, OrdenEstado][] = [
      ['asignar', OrdenEstado.PENDIENTE],
      ['reasignar', OrdenEstado.ASIGNADA],
      ['desasignar', OrdenEstado.ASIGNADA],
      ['cancelar', OrdenEstado.EN_PROCESO],
      ['reabrir', OrdenEstado.COMPLETADA],
    ];

    it.each(soloAdmin)(
      '%s desde %s es exclusiva del admin',
      (accion, desde) => {
        expect(() => servicio.validar(comoAdmin(accion, desde))).not.toThrow();
        expect(() => servicio.validar(comoTecnico(accion, desde))).toThrow(
          ForbiddenException,
        );
      },
    );

    const delTecnico: [AccionOrden, OrdenEstado][] = [
      ['iniciar', OrdenEstado.ASIGNADA],
      ['pausar', OrdenEstado.EN_PROCESO],
      ['reanudar', OrdenEstado.EN_ESPERA],
      ['completar', OrdenEstado.EN_PROCESO],
    ];

    it.each(delTecnico)(
      '%s desde %s la puede hacer el tecnico asignado',
      (accion, desde) => {
        expect(() =>
          servicio.validar(comoTecnico(accion, desde)),
        ).not.toThrow();
      },
    );

    it.each(delTecnico)(
      'regla 3: otro tecnico no puede %s desde %s',
      (accion, desde) => {
        expect(() =>
          servicio.validar(
            comoTecnico(accion, desde, { usuarioId: OTRO_TECNICO }),
          ),
        ).toThrow(ForbiddenException);
      },
    );

    it('el admin opera ordenes que no son suyas', () => {
      expect(() =>
        servicio.validar(
          comoAdmin('completar', OrdenEstado.EN_PROCESO, {
            tecnicoId: OTRO_TECNICO,
          }),
        ),
      ).not.toThrow();
    });
  });

  describe('regla 5: motivo obligatorio', () => {
    it.each<[AccionOrden, OrdenEstado]>([
      ['pausar', OrdenEstado.EN_PROCESO],
      ['cancelar', OrdenEstado.ASIGNADA],
      ['reabrir', OrdenEstado.COMPLETADA],
    ])('%s exige motivo', (accion, desde) => {
      expect(servicio.requiereMotivo(accion)).toBe(true);
      expect(() =>
        servicio.validar(comoAdmin(accion, desde, { motivo: undefined })),
      ).toThrow(UnprocessableEntityException);
      expect(() =>
        servicio.validar(comoAdmin(accion, desde, { motivo: '   ' })),
      ).toThrow(UnprocessableEntityException);
    });

    it.each<[AccionOrden, OrdenEstado]>([
      ['iniciar', OrdenEstado.ASIGNADA],
      ['reanudar', OrdenEstado.EN_ESPERA],
      ['completar', OrdenEstado.EN_PROCESO],
      ['asignar', OrdenEstado.PENDIENTE],
    ])('%s no exige motivo', (accion, desde) => {
      expect(servicio.requiereMotivo(accion)).toBe(false);
      expect(() =>
        servicio.validar(comoAdmin(accion, desde, { motivo: undefined })),
      ).not.toThrow();
    });
  });

  describe('accionesDisponibles', () => {
    it('un tecnico con la OT asignada solo ve iniciar', () => {
      expect(
        servicio.accionesDisponibles(
          OrdenEstado.ASIGNADA,
          Rol.TECNICO,
          TECNICO,
          TECNICO,
        ),
      ).toEqual(['iniciar']);
    });

    it('un tecnico ajeno a la OT no ve ninguna accion', () => {
      expect(
        servicio.accionesDisponibles(
          OrdenEstado.EN_PROCESO,
          Rol.TECNICO,
          OTRO_TECNICO,
          TECNICO,
        ),
      ).toEqual([]);
    });

    it('el admin ve todas las salidas del estado', () => {
      expect(
        servicio.accionesDisponibles(
          OrdenEstado.ASIGNADA,
          Rol.ADMIN,
          ADMIN,
          TECNICO,
        ),
      ).toEqual(['reasignar', 'desasignar', 'iniciar', 'cancelar']);
    });

    it('una OT cancelada no ofrece nada a nadie', () => {
      expect(
        servicio.accionesDisponibles(
          OrdenEstado.CANCELADA,
          Rol.ADMIN,
          ADMIN,
          TECNICO,
        ),
      ).toEqual([]);
    });
  });
});
