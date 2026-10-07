import { TarjetaProximoEvento, colorBarra, type EventoResumen } from './TarjetaProximoEvento';
import type { Evento } from '../types';

/**
 * Tarjeta de evento para Inicio/Noticias — hoy solo delega en LA receta
 * unificada (TarjetaProximoEvento). Mantener como re-export para no
 * romper consumidores existentes; el "bloque de fecha" azul ya vive allí.
 */
export function EventoAgendaCard({ evento }: { evento: Evento }) {
  const resumen: EventoResumen = {
    id: evento.id,
    titulo: evento.titulo,
    tipo: evento.tipo,
    inicioAt: evento.inicioAt,
    finAt: evento.finAt,
    diaCompleto: evento.diaCompleto,
    lugar: evento.lugar,
    decanatoIds: evento.decanatoIds,
  };
  return <TarjetaProximoEvento evento={resumen} />;
}

export { colorBarra };
