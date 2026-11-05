import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { colors, elevation, highlight, radius, spacing } from '@/shared/ui';
import { PressableScale, ThemedText, ThemedView } from '@/shared/ui';
import { abrevDia, colorNota, diaIsoHoy } from '../helpers';
import { colorBarra } from './tonos-barra';
import type { FranjaDTO, MateriaActualDTO } from '../types';

/** Color de una nota dada: aprobada en azul corporativo, falta en rojo. */
export function colorNotaClases(nota: number | null): string {
  switch (colorNota(nota)) {
    case 'success':
      return colors.brand.primary;
    case 'danger':
      return colors.status.danger;
    case 'muted':
      return colors.text.secondary;
  }
}

/**
 * Tarjeta de materia en curso: fila de registro destilada — la firma de
 * estado (barra lateral 3px azul, misma receta que las tarjetas de evento)
 * precede al cuerpo tipográfico: nombre, profesor y horario. Con franjas
 * estructuradas el horario es una mini-tabla (día en columna fija 32 +
 * hora + aula), la misma receta de columnas duras de AgendaDia y el
 * bloque de fecha del evento: las columnas alinean entre franjas y entre
 * cards. El día de HOY se distingue en azul semibold (la cifra "hoy" del
 * grid del calendario); sin franjas (API UNIMAR real), fallback al
 * `horario` plano de la wire. El código y las notas viven en el detalle.
 */
export function MateriaActualCard({ materia }: { materia: MateriaActualDTO }) {
  const diaHoy = diaIsoHoy();
  // Barra semántica: azul sólida solo si la materia tiene clase hoy — las
  // demás van en el tinte del grid. Sin franjas (API real) se queda
  // sólida: "en curso" y sin forma de saber la proximidad.
  const tieneClaseHoy = materia.franjas?.some((f) => f.dia_semana === diaHoy) ?? false;
  return (
    <PressableScale
      onPress={navegar(materia.id)}
      accessibilityRole="button"
      accessibilityLabel={`Detalle de ${materia.nombre}`}>
      <ThemedView variant="card" style={estilos.tarjeta}>
        <View
          style={[
            estilos.barra,
            // Tonos de tonos-barra: la fuente única que comparte con la
            // leyenda del índice — simbología que no diverge.
            { backgroundColor: colorBarra(tieneClaseHoy) },
          ]}
        />
        <View style={estilos.cuerpo}>
          <ThemedText variant="subtitle" weight="semibold" numberOfLines={2}>
            {materia.nombre}
          </ThemedText>
          <ThemedText variant="bodySm" tone="secondary" numberOfLines={1}>
            {materia.profesor}
          </ThemedText>
          <View style={estilos.meta}>
            {materia.franjas?.length
              ? materia.franjas.map((franja) => (
                  <FilaFranja
                    key={franja.dia_semana}
                    franja={franja}
                    esHoy={franja.dia_semana === diaHoy}
                  />
                ))
              : (
                <ThemedText variant="caption" tone="secondary" numberOfLines={2}>
                  {materia.horario}
                </ThemedText>
              )}
          </View>
        </View>
      </ThemedView>
    </PressableScale>
  );
}

function navegar(id: string) {
  return () => {
    router.push(`/academico/materias/${id}` as Parameters<typeof router.push>[0]);
  };
}

/**
 * Fila tabulada de una franja: "MIÉ  10:20-12:35  (A21)" — día semibold
 * (azul si es hoy, la cifra "hoy" del grid del calendario) cada hora y
 * aula en gris metadato. La columna de día ancho fijo (32) alinea las
 * franjas entre sí y con las de las demás materias del listado.
 */
function FilaFranja({ franja, esHoy }: { franja: FranjaDTO; esHoy: boolean }) {
  return (
    <View style={estilos.filaFranja}>
      <ThemedText
        variant="caption"
        weight="semibold"
        numberOfLines={1}
        style={[estilos.diaFranja, { color: esHoy ? colors.brand.primary : colors.text.primary }]}
        accessibilityLabel={esHoy ? `hoy (${abrevDia(franja.dia_semana)})` : undefined}>
        {abrevDia(franja.dia_semana)}
      </ThemedText>
      <ThemedText variant="caption" tone="secondary" style={estilos.horaFranja}>
        {franja.hora_inicio} - {franja.hora_fin}
      </ThemedText>
      <ThemedText variant="caption" tone="secondary">
        ({franja.aula})
      </ThemedText>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation.sm,
    ...highlight.sm,
  },
  barra: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  cuerpo: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    gap: 2,
  },
  filaFranja: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  diaFranja: {
    width: 40,
    textTransform: 'uppercase',
  },
  // Columna de hora con ancho mínimo: los dígitos proporcionales de
  // Montserrat hacen que "11:50" pese menos que "10:20" (unos estrechos)
  // y el aula se desalinee; así todas las horas rellenan al mismo ancho
  // y el aula cae en la misma x. minWidth > width fijo: sin recorte si
  // el usuario agranda la fuente del sistema.
  horaFranja: {
    minWidth: 84,
  },
});
