import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MapPinIcon, UserIcon } from 'phosphor-react-native';

import { colors, radius, spacing } from '@/shared/ui';
import { ThemedText, ThemedView } from '@/shared/ui';
import { colorNota, formatoNota2, notaAcumulada } from '../helpers';
import type { CorteDTO, MateriaActualDTO } from '../types';

interface TonosCodigo {
  fondo: string;
  texto: string;
}

/**
 * Tono del badge de código, determinístico por el código mismo: la API no
 * manda color, pero el diseño exige variedad estable por materia. Paleta
 * 100% institucional — el accent naranja queda reservado a notificaciones
 * (Regla Naranja Exclusiva de DESIGN.md).
 */
const PALETA_CODIGO: TonosCodigo[] = [
  { fondo: colors.brand.surfaceBlue, texto: colors.brand.primary },
  { fondo: `${colors.status.success}1A`, texto: colors.status.success },
  { fondo: `${colors.text.secondary}14`, texto: colors.text.secondary },
];

export function tonalidadesCodigo(codigo: string): TonosCodigo {
  let hash = 0;
  for (let i = 0; i < codigo.length; i += 1) {
    hash = (hash * 31 + codigo.charCodeAt(i)) % PALETA_CODIGO.length;
  }
  return PALETA_CODIGO[hash] ?? PALETA_CODIGO[0]!;
}

/** Color de una nota dada: aprobada en azul corporativo, falta en rojo. */
export function colorNotaClases(nota: number | null): string {
  switch (colorNota(nota)) {
    case 'success':
      return colors.brand.primary;
    case 'danger':
      return colors.status.danger;
    case 'muted':
      return colors.text.tertiary;
  }
}

/** Columna de un corte: etiqueta + ponderación arriba, nota debajo. */
function ColumnaCorte({ corte }: { corte: CorteDTO | undefined }) {
  if (!corte) return <View style={estilos.columnaCorte} />;
  return (
    <View style={estilos.columnaCorte}>
      <View style={estilos.etiquetaCorte}>
        <ThemedText variant="caption" tone="secondary" numberOfLines={1}>
          {corte.nombre}
        </ThemedText>
        <ThemedText variant="caption" weight="medium" style={estilos.ponderacion}>
          {' '}
          {corte.ponderacion}%
        </ThemedText>
      </View>
      <ThemedText variant="bodySm" weight="semibold">
        {formatoNota2(corte.nota)}
      </ThemedText>
    </View>
  );
}

/** Tarjeta de materia en curso: badge de código, aula/profesor y cortes evaluativos. */
export function MateriaActualCard({ materia }: { materia: MateriaActualDTO }) {
  const tonos = tonalidadesCodigo(materia.codigo);
  return (
    <Pressable onPress={navegar(materia.id)} accessibilityRole="button">
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View style={estilos.cabecera}>
          <View style={[estilos.badge, { backgroundColor: tonos.fondo }]}>
            <ThemedText
              variant="caption"
              weight="semibold"
              style={{ color: tonos.texto }}>
              {materia.codigo}
            </ThemedText>
          </View>
          <ThemedText variant="body" weight="medium" numberOfLines={2} style={estilos.nombre}>
            {materia.nombre}
          </ThemedText>
        </View>
        <View style={estilos.meta}>
          <View style={estilos.metaItem}>
            <MapPinIcon size={14} color={colors.text.secondary} />
            <ThemedText variant="bodySm" tone="secondary">
              {materia.aula}
            </ThemedText>
          </View>
          <View style={estilos.metaItem}>
            <UserIcon size={14} color={colors.text.secondary} />
            <ThemedText
              variant="bodySm"
              tone="secondary"
              numberOfLines={1}
              style={estilos.profesor}>
              {materia.profesor}
            </ThemedText>
          </View>
        </View>
        <View style={estilos.divisor} />
        <View style={estilos.cortes}>
          <ColumnaCorte corte={materia.cortes[0]} />
          <ColumnaCorte corte={materia.cortes[1]} />
          <View style={estilos.acumulada}>
            <ThemedText variant="caption" tone="secondary">
              Acumulada
            </ThemedText>
            <ThemedText
              variant="title"
              weight="bold"
              style={{ color: colorNotaClases(notaAcumulada(materia.cortes)) }}>
              {formatoNota2(notaAcumulada(materia.cortes))}
            </ThemedText>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

function navegar(id: string) {
  return () => {
    router.push(`/academico/materias/${id}` as Parameters<typeof router.push>[0]);
  };
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: spacing.sm,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  nombre: {
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profesor: {
    flexShrink: 1,
  },
  divisor: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
  },
  cortes: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  columnaCorte: {
    gap: spacing.xs,
  },
  etiquetaCorte: {
    flexDirection: 'row',
  },
  ponderacion: {
    color: colors.brand.primary,
  },
  acumulada: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
});
