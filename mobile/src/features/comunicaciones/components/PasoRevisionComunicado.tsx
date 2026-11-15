import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { PencilSimpleIcon } from 'phosphor-react-native';

import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { colors, radius, spacing } from '@/shared/ui/theme';

import { CuerpoMarkdown } from './CuerpoMarkdown';

interface Props {
  titulo: string;
  cuerpo: string;
  portadaUri: string | null;
  audiencia: string;
  autorNombre: string;
  esEdicion: boolean;
  guardando: boolean;
  guardarDeshabilitado: boolean;
  motivoDeshabilitado?: string | null;
  errorServidor: string | null;
  onEditarContenido: () => void;
  onEditarDetalles: () => void;
  onGuardar: () => void;
}

/** Último paso: preview real + guardado manual explícito. */
export function PasoRevisionComunicado({
  titulo,
  cuerpo,
  portadaUri,
  audiencia,
  autorNombre,
  esEdicion,
  guardando,
  guardarDeshabilitado,
  motivoDeshabilitado,
  errorServidor,
  onEditarContenido,
  onEditarDetalles,
  onGuardar,
}: Props) {
  const tituloVisible = titulo.trim().length > 0 ? titulo.trim() : 'Comunicado sin título';

  return (
    <ScrollView
      style={estilos.scroll}
      contentContainerStyle={estilos.contenido}
      showsVerticalScrollIndicator={false}>
      <View style={estilos.atajos}>
        <ThemedButton
          title="Editar contenido"
          variant="ghost"
          size="sm"
          disabled={guardando}
          icon={<PencilSimpleIcon size={16} color={colors.brand.primary} />}
          onPress={onEditarContenido}
        />
        <ThemedButton
          title="Detalles"
          variant="ghost"
          size="sm"
          disabled={guardando}
          onPress={onEditarDetalles}
        />
      </View>

      <View style={estilos.documento}>
        <ThemedText variant="caption" tone="secondary">
          Vista previa
        </ThemedText>
        {portadaUri ? (
          <Image source={{ uri: portadaUri }} style={estilos.portada} resizeMode="cover" />
        ) : null}
        <ThemedText variant="title" weight="bold">
          {tituloVisible}
        </ThemedText>
        <ThemedText variant="caption" tone="secondary">
          {autorNombre.length > 0 ? `${autorNombre} · ${audiencia}` : audiencia}
        </ThemedText>
        {cuerpo.trim().length > 0 ? (
          <CuerpoMarkdown cuerpo={cuerpo} />
        ) : (
          <ThemedText variant="body" tone="tertiary">
            El cuerpo aparecerá aquí cuando lo escribas.
          </ThemedText>
        )}
      </View>

      {errorServidor ? (
        <ThemedText variant="caption" style={estilos.error}>
          {errorServidor}
        </ThemedText>
      ) : null}
      {motivoDeshabilitado ? (
        <ThemedText variant="caption" style={estilos.error}>
          {motivoDeshabilitado}
        </ThemedText>
      ) : null}

      <ThemedButton
        title={esEdicion ? 'Guardar cambios' : 'Crear borrador'}
        onPress={onGuardar}
        loading={guardando}
        disabled={guardando || guardarDeshabilitado}
      />
      <ThemedText variant="caption" tone="secondary" style={estilos.nota}>
        {esEdicion
          ? 'Los cambios se aplican al comunicado actual.'
          : 'Se guardará como borrador. Podrás solicitar revisión desde Gestión.'}
      </ThemedText>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg.surface },
  contenido: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  atajos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  documento: {
    gap: spacing.md,
  },
  portada: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: radius.lg,
    backgroundColor: colors.brand.surfaceBlue,
  },
  error: {
    color: colors.status.danger,
  },
  nota: {
    textAlign: 'center',
    marginTop: -spacing.sm,
  },
});
