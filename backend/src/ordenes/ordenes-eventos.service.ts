import { Injectable, type MessageEvent } from '@nestjs/common';
import { filter, map, merge, Observable, of, Subject } from 'rxjs';

/**
 * Canal SSE efimero para una orden. No persiste datos ni reemplaza el
 * historial: solo avisa a las vistas abiertas que deben volver a leer la OT.
 *
 * Mantener el mensaje pequeno evita duplicar el contrato de `GET /ordenes/:id`.
 * Asi cada receptor vuelve a pasar por la autorizacion y recibe las acciones
 * disponibles calculadas para su propia sesion.
 */
@Injectable()
export class OrdenesEventosService {
  private readonly cambios = new Subject<{
    ordenId: string;
    emitidoEn: string;
  }>();

  escuchar(ordenId: string): Observable<MessageEvent> {
    return merge(
      // Confirma al navegador que el stream autenticado quedo abierto.
      of({ type: 'conectado', data: { ordenId } }),
      this.cambios.pipe(
        filter((cambio) => cambio.ordenId === ordenId),
        map((cambio): MessageEvent => ({
          type: 'orden-actualizada',
          data: { emitidoEn: cambio.emitidoEn },
        })),
      ),
    );
  }

  publicar(ordenId: string): void {
    this.cambios.next({ ordenId, emitidoEn: new Date().toISOString() });
  }
}
