import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, User } from 'phosphor-react-native';

import { colors, elevation, radius, spacing } from '@/shared/ui';
import { PressableScale, ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import type { ProximaClase } from '../proxima-clase';

const FORMATO_HORA = new Intl.DateTimeFormat('es-VE', { timeStyle: 'short' });

/** Chips decorativos opcionales cuando no hay clase (según rol). */
export function ProximaClaseCard({
  clase,
  mensajeVacio = 'Sin clases próximas',
  accionVacio,
}: {
  clase: ProximaClase | null;
  /** Texto de la variante informativa (roles sin horario o agenda vacía). */
  mensajeVacio?: string;
  /** Acción opcional del estado vacío (ej. ir a la Agenda). */
  accionVacio?: { etiqueta: string; onPress: () => void };
}) {
  if (!clase) {
    return (
      <ThemedView variant="card" style={estilos.vacia}>
        <ThemedText variant="subtitle" weight="semibold" tone="secondary">
          {mensajeVacio}
        </ThemedText>
        <ThemedText variant="body" tone="tertiary">
          Tu horario no registra clases en los próximos días.
        </ThemedText>
        {accionVacio ? (
          <ThemedButton
            title={accionVacio.etiqueta}
            variant="secondary"
            size="sm"
            onPress={accionVacio.onPress}
          />
        ) : null}
      </ThemedView>
    );
  }

  const { materia, minutosRestantes, enCurso } = clase;
  const pill = enCurso ? 'Clase en curso' : `Próxima clase · en ${minutosRestantes} min`;

  function abrirMateria() {
    router.push(`/academico/materias/${materia.id}` as Parameters<typeof router.push>[0]);
  }

  return (
    <PressableScale onPress={abrirMateria} accessibilityRole="button">
      <ThemedView style={estilos.card}>
        <View style={estilos.filaPill}>
          <View style={estilos.pill}>
            <ThemedText variant="caption" weight="semibold" style={estilos.textoPill}>
              {pill}
            </ThemedText>
          </View>
          <ThemedText variant="bodySm" tone="onPrimary" style={estilos.hora}>
            {FORMATO_HORA.format(clase.inicio)}
          </ThemedText>
        </View>

        <ThemedText variant="title" weight="bold" tone="onPrimary" numberOfLines={2}>
          {materia.nombre}
        </ThemedText>
        <ThemedText variant="caption" tone="onPrimary" style={estilos.datoInsensible}>
          {materia.codigo} · {materia.creditos} créditos
        </ThemedText>

        <View style={estilos.filaMeta}>
          <MapPin size={16} color={colors.text.onPrimary} weight="duotone" />
          <ThemedText variant="bodySm" tone="onPrimary" style={estilos.texto}>
            {clase.aula ?? materia.aula}
          </ThemedText>
          <User size={16} color={colors.text.onPrimary} weight="duotone" style={estilos.iconoMeta} />
          <ThemedText variant="bodySm" tone="onPrimary" numberOfLines={1} style={estilos.texto}>
            {materia.profesor}
          </ThemedText>
        </View>
      </ThemedView>
    </PressableScale>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.card,
    ...elevation.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  filaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pill: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textoPill: { color: colors.brand.primary, letterSpacing: 0.4 },
  hora: { opacity: 0.85 },
  datoInsensible: { opacity: 0.75 },
  filaMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  iconoMeta: { marginLeft: spacing.md },
  texto: { opacity: 0.92 },
  vacia: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
});
