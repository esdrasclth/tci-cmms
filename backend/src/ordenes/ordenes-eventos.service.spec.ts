import type { MessageEvent } from '@nestjs/common';
import { take, toArray } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { OrdenesEventosService } from './ordenes-eventos.service';

describe('OrdenesEventosService', () => {
  it('confirma la conexion y solo reenvia cambios de la orden suscrita', async () => {
    const eventos = new OrdenesEventosService();

    // La suscripcion queda abierta antes de publicar: el ejecutor de la
    // promesa corre de forma sincrona.
    const espera = new Promise<MessageEvent[]>((resolve) => {
      eventos.escuchar('orden-a').pipe(take(2), toArray()).subscribe(resolve);
    });

    eventos.publicar('orden-b');
    eventos.publicar('orden-a');

    const [conexion, cambio] = await espera;

    expect(conexion).toEqual({
      type: 'conectado',
      data: { ordenId: 'orden-a' },
    });
    // El de 'orden-b' no llega: si se hubiera colado, este seria el segundo.
    expect(cambio.type).toBe('orden-actualizada');
    const { emitidoEn } = cambio.data as { emitidoEn: string };
    expect(Number.isNaN(Date.parse(emitidoEn))).toBe(false);
  });
});
