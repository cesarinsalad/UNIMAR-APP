import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CalendarBlankIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNotaClases } from './MateriaActualCard';
import { formatoNota2, nombreDia, notaAcumulada } from '../helpers';
import type { CorteDTO, MateriaActualDTO } from '../types';

const FORMATO_FECHA = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' });

/**
 * Variante en curso (`es_actual: true`): el documento de notas con la
 * firma visual de las tarjetas de Clases (fileRule azul, semáforo real de
 * notas: azul aprobada / rojo baja / gris pendiente) — cabecera con
 * Acumulada y progreso de cortes, una fila por corte con divisor, y el
 * contexto del aula en filas-ícono (profesor, horario/franjas, aula).
 */
export function DetalleMateriaActual({ materia }: { materia: MateriaActualDTO }) {
  const calificados = materia.cortes.filter(
    (corte) => corte.nota !== null,
  ).length;

  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjetaNotas}>
        <View style={estilos.fileRule} />

        <View style={estilos.cabeceraNotas}>
          <View style={estilos.bloqueAcumulada}>
            <ThemedText variant="caption" tone="secondary">
              Nota acumulada
            </ThemedText>
            <ThemedText
              variant="headline"
              weight="bold"
              style={{ color: colorNotaClases(notaAcumulada(materia.cortes)) }}>
              {formatoNota2(notaAcumulada(materia.cortes))}
            </ThemedText>
          </View>
          <ThemedText variant="caption" tone="secondary" style={estilos.progreso}>
            {calificados} de {materia.cortes.length} cortes evaluados
          </ThemedText>
        </View>

        {materia.cortes.length > 0 ? (
          <View>
            <View style={estilos.divisor} />
            {materia.cortes.map((corte, indice) => (
              <Fragment key={corte.nombre}>
                {indice > 0 ? <View style={estilos.divisor} /> : null}
                <FilaCorte corte={corte} />
              </Fragment>
            ))}
          </View>
        ) : (
          <ThemedText variant="caption" tone="secondary">
            Aún no hay cortes evaluativos publicados.
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView variant="card" style={estilos.tarjetaInfo}>
        <ThemedText variant="subtitle" weight="semibold">
          Información de la clase
        </ThemedText>
        <FilaInfo icono={UserIcon} etiqueta="Profesor" valor={materia.profesor} />
        {materia.franjas && materia.franjas.length > 0 ? (
          materia.franjas.map((franja) => (
            <FilaInfo
              key={`${franja.dia_semana}-${franja.hora_inicio}`}
              icono={CalendarBlankIcon}
              etiqueta={nombreDia(franja.dia_semana)}
              valor={`${franja.aula} · ${franja.hora_inicio}–${franja.hora_fin}`}
            />
          ))
        ) : (
          <>
            <FilaInfo
              icono={ClockIcon}
              etiqueta="Horario"
              valor={materia.horario}
            />
            <FilaInfo icono={MapPinIcon} etiqueta="Aula" valor={materia.aula} />
          </>
        )}
      </ThemedView>
    </View>
  );
}

/** Fila de corte: nombre + fecha + ponderación a la izquierda, nota derecha. */
function FilaCorte({ corte }: { corte: CorteDTO }) {
  return (
    <View style={estilos.filaCorte}>
      <View style={estilos.titulosCorte}>
        <ThemedText variant="body" weight="semibold">
          {corte.nombre}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
          {FORMATO_FECHA.format(new Date(corte.fecha))} · {corte.ponderacion}%
          de la nota
        </ThemedText>
      </View>
      <View style={estilos.notaCorte}>
        <ThemedText
          variant="title"
          weight="bold"
          style={{ color: colorNotaClases(corte.nota) }}>
          {formatoNota2(corte.nota)}
        </ThemedText>
        {corte.nota === null ? (
          <ThemedText variant="caption" tone="tertiary">
            Pendiente
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

/** Fila de contexto: ícono gris + etiqueta caption + valor medium. */
function FilaInfo({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ size: number; color: string }>;
  etiqueta: string;
  valor: string;
}) {
  return (
    <View style={estilos.filaInfo}>
      <Icono size={20} color={colors.text.secondary} />
      <View style={estilos.titulosInfo}>
        <ThemedText variant="caption" tone="secondary">
          {etiqueta}
        </ThemedText>
        <ThemedText variant="body" weight="medium">
          {valor}
        </ThemedText>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.lg,
  },
  tarjetaNotas: {
    gap: spacing.md,
    overflow: 'hidden',
  },
  fileRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.brand.primary,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  cabeceraNotas: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  bloqueAcumulada: {
    gap: spacing.xs,
  },
  progreso: {
    flexShrink: 1,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  filaCorte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  titulosCorte: {
    flex: 1,
    gap: spacing.xs,
  },
  notaCorte: {
    alignItems: 'flex-end',
    gap: spacing.half,
  },
  tarjetaInfo: {
    gap: spacing.md,
  },
  filaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titulosInfo: {
    flex: 1,
    gap: spacing.one,
  },
});
