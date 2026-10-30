import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  CalendarBlankIcon,
  CertificateIcon,
  ClockIcon,
  HashIcon,
  MapPinIcon,
  SquaresFourIcon,
  UserIcon,
} from 'phosphor-react-native';

import { colors, elevation, highlight, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNotaClases } from './MateriaActualCard';
import { SelloUsoPersonal } from './SelloUsoPersonal';
import {
  esNotaCerrada,
  etiquetaAccesibleNota,
  nombreDia,
  notaAcumulada,
} from '../helpers';
import type { CorteDTO, MateriaActualDTO } from '../types';

/**
 * Variante en curso (`es_actual: true`): el acta de notas como LIBRO DE
 * REGISTRO — tabla del documento, no métrica héroe. Filas por corte con
 * columnas duras (receta de AgendaDia: CORTE · NOTA), hairline simple
 * entre filas y cierre contable: doble hairline antes de la fila
 * total ("Nota acumulada" mientras el acta está abierta —con el caption
 * del % evaluado—, "Nota final" al cerrar los dos cortes; el acta cierra
 * solo con Σ = 100). Sin fileRule ni pills: la tabla ES el documento, la
 * sombra es la estándar de tarjeta al reposo. "Información de la clase"
 * abre el detalle: subtítulo, hairline y el documento como filas
 * uniformes (código, créditos, sección —condicional—, profesor y aula) —
 * ningún dato flota. "Notas" cierra el documento con su disclaimer y el
 * sello de referencia. Voces iguales en ambas tarjetas.
 */
export function DetalleMateriaActual({ materia }: { materia: MateriaActualDTO }) {
  const cortes = materia.cortes;
  const acumulada = notaAcumulada(cortes);
  const cerrada = esNotaCerrada(cortes);

  return (
    <View style={estilos.bloque}>
      <ThemedView variant="card" style={estilos.tarjetaInfo}>
        <ThemedText variant="subtitle" weight="semibold">
          Información de la clase
        </ThemedText>
        <View style={estilos.divisor} />
        <FilaInfo icono={HashIcon} etiqueta="Código" valor={materia.codigo} />
        <FilaInfo
          icono={CertificateIcon}
          etiqueta="Créditos"
          valor={materia.creditos.toString()}
        />
        {materia.seccion ? (
          <FilaInfo
            icono={SquaresFourIcon}
            etiqueta="Sección"
            valor={materia.seccion}
          />
        ) : null}
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

      <ThemedView variant="card" style={estilos.tarjeta}>
        <ThemedText
          variant="subtitle"
          weight="semibold"
          accessibilityLabel="Notas, referencia de uso personal">
          Notas
        </ThemedText>
        <View style={estilos.zonaTabla}>
          <View style={estilos.filaEncabezado}>
            <ThemedText
              variant="caption"
              weight="semibold"
              tone="secondary"
              style={[estilos.colCorte, estilos.mayusculas]}>
              Corte
            </ThemedText>
            <ThemedText
              variant="caption"
              weight="semibold"
              tone="secondary"
              style={[estilos.colNota, estilos.mayusculas]}>
              Nota
            </ThemedText>
          </View>
          <View style={estilos.divisor} />

          {cortes.length > 0 ? (
            cortes.map((corte, indice) => (
              <Fragment key={corte.nombre}>
                {indice > 0 ? <View style={estilos.divisor} /> : null}
                <FilaCorte corte={corte} />
              </Fragment>
            ))
          ) : (
            <ThemedText variant="caption" tone="secondary">
              Aún no hay cortes evaluativos publicados.
            </ThemedText>
          )}

          {cortes.length > 0 ? (
            <>
              <View style={estilos.dobleDivisor} />
              <View style={estilos.filaTotal}>
                <View style={estilos.titulosTotal}>
                  <ThemedText variant="body" weight="semibold">
                    {cerrada ? 'Nota final' : 'Nota acumulada'}
                  </ThemedText>
                </View>
                <ThemedText
                  variant="title"
                  weight="bold"
                  accessibilityLabel={etiquetaAccesibleNota(acumulada)}
                  style={{ color: colorNotaClases(acumulada) }}>
                  {acumulada === null ? '—' : Math.trunc(acumulada).toString()}
                </ThemedText>
              </View>
            </>
          ) : null}
          <SelloUsoPersonal />
        </View>
      </ThemedView>
    </View>
  );
}

/**
 * Fila de corte del libro: nombre en la columna flexible —el peso vive
 * aparte, separado por margen en tono metadato, sin punto medio— y cifra
 * con semáforo real a la derecha — "—" en tinte gris para el corte sin
 * publicar. La cifra anuncia estado y número para quien escucha
 * (VoiceOver/TalkBack).
 */
function FilaCorte({ corte }: { corte: CorteDTO }) {
  return (
    <View style={estilos.filaCorte}>
      <View style={estilos.colCorte}>
        <ThemedText variant="bodySm" weight="medium" numberOfLines={2} style={estilos.nombreCorte}>
          {corte.nombre}
        </ThemedText>
        <ThemedText variant="bodySm" weight="medium" tone="secondary" style={estilos.pesoCorte}>
          {corte.ponderacion}%
        </ThemedText>
      </View>
      <ThemedText
        variant="subtitle"
        weight="bold"
        accessibilityLabel={etiquetaAccesibleNota(corte.nota)}
        style={[estilos.colNota, { color: colorNotaClases(corte.nota) }]}>
        {corte.nota === null ? '—' : Math.trunc(corte.nota).toString()}
      </ThemedText>
    </View>
  );
}

/** Fila de contexto a una línea: ícono azul sello + etiqueta en columna dura + valor. */
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
      <Icono size={20} color={colors.brand.primary} />
      <ThemedText variant="caption" tone="secondary" style={estilos.etiquetaInfo}>
        {etiqueta}
      </ThemedText>
      <ThemedText variant="bodySm" weight="medium" numberOfLines={1} style={estilos.valorInfo}>
        {valor}
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: spacing.md,
  },
  // Sombra de tarjeta al reposo (vocabulario de Card.tsx): elevation.sm +
  // resplandor superior. Sin fileRule: la tabla es la voz del documento.
  tarjeta: {
    ...elevation.sm,
    ...highlight.sm,
    gap: spacing.sm,
  },
  mayusculas: {
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  // El sello de referencia se recorta aquí (nunca en la tarjeta con
  // sombra). Sin radios: el wrapper está 16px adentro de la tarjeta —
  // sus esquinas son interiores y un radio curvo recortaba la cifra del
  // total pegada al borde inferior.
  zonaTabla: {
    overflow: 'hidden',
    paddingBottom: spacing.xs,
  },
  // Cierre contable del libro: dos hairlines con 3px de aire.
  dobleDivisor: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 3,
    borderColor: colors.border.subtle,
  },
  filaCorte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // Compacto para el detalle (que debe caber sin scroll): el acordeón
    // del tab Clases conserva su 12 — superficie distinta.
    paddingVertical: spacing.sm,
  },
  colCorte: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  nombreCorte: {
    flexShrink: 1,
  },
  pesoCorte: {
    marginLeft: spacing.sm,
  },
  colNota: {
    width: 48,
    textAlign: 'right',
  },
  filaTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  titulosTotal: {
    flex: 1,
    gap: spacing.xs,
  },
  // La voz del info card es la misma que la del acta: tarjeta al reposo
  // (elevation.sm + resplandor) — ninguna tarjeta del documento queda
  // plana al lado de otra levantada.
  tarjetaInfo: {
    ...elevation.sm,
    ...highlight.sm,
    gap: spacing.sm,
  },
  filaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  etiquetaInfo: {
    width: 72,
  },
  valorInfo: {
    flex: 1,
  },
});
