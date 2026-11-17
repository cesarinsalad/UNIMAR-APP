import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  FileImageIcon,
  FilePdfIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from 'phosphor-react-native';

import { Card } from '@/shared/ui/Card';
import { ThemedText } from '@/shared/ui/ThemedText';
import { colors, radius, spacing } from '@/shared/ui/theme';
import {
  formatearTamano,
  tieneErroresAdjunto,
  validarAdjunto,
} from '../hooks/formulario';
import type { ArchivoAdjunto } from '../api/adjuntos.api';
import type { Adjunto } from '../types';

const PICKER_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

/** Archivo elegido que todavía no existe en el servidor (clave de lista). */
export interface ArchivoAdjuntoCola extends ArchivoAdjunto {
  clave: string;
}

interface Props {
  /** Adjuntos ya guardados (solo edición). */
  existentes: readonly Adjunto[];
  cargandoExistentes?: boolean;
  /** storage_path de la portada vigente: no es un adjunto editable. */
  portadaPath?: string | null;
  /** Archivos elegidos en esta sesión, pendientes de subir al guardar. */
  nuevos: readonly ArchivoAdjuntoCola[];
  /** Existentes marcados para eliminar al guardar. */
  porEliminar: readonly Adjunto[];
  editable: boolean;
  error?: string | null;
  onAgregar: (archivos: ArchivoAdjunto[]) => void;
  onQuitarNuevo: (clave: string) => void;
  onMarcarExistente: (adjunto: Adjunto) => void;
  onDesmarcarExistente: (id: string) => void;
}

/**
 * Sección de adjuntos del paso Detalles. Los archivos NO se suben al
 * elegirlos: quedan en una cola local y el orquestador los sube al guardar,
 * igual que la portada. En edición, quitar un adjunto existente solo lo
 * marca; la baja se aplica al guardar para respetar el descarte del
 * asistente.
 */
export function SeccionAdjuntosPaso({
  existentes,
  cargandoExistentes = false,
  portadaPath,
  nuevos,
  porEliminar,
  editable,
  error,
  onAgregar,
  onQuitarNuevo,
  onMarcarExistente,
  onDesmarcarExistente,
}: Props) {
  const [errorSeleccion, setErrorSeleccion] = useState<string | null>(null);

  const visibles = existentes.filter(
    (adjunto) => !portadaPath || adjunto.storagePath !== portadaPath,
  );
  const marcados = new Set(porEliminar.map((adjunto) => adjunto.id));
  const total = visibles.length + nuevos.length;

  async function medirTamano(uri: string, declarado: number | undefined): Promise<number> {
    if (declarado && declarado > 0) return declarado;
    try {
      if (Platform.OS === 'web') {
        const blob = await fetch(uri).then((r) => r.blob());
        return blob.size;
      }
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists && info.size > 0 ? info.size : 0;
    } catch {
      return 0;
    }
  }

  async function agregar() {
    setErrorSeleccion(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: PICKER_TYPES,
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const validos: ArchivoAdjunto[] = [];
    const errores: string[] = [];
    for (const asset of picked.assets) {
      const archivo: ArchivoAdjunto = {
        uri: asset.uri,
        nombre: asset.name,
        mimeType: asset.mimeType ?? 'application/pdf',
        tamano: await medirTamano(asset.uri, asset.size),
      };
      const problemas = validarAdjunto(archivo);
      if (tieneErroresAdjunto(problemas)) {
        const detalle = problemas.mimeType ?? problemas.tamano ?? problemas.nombre;
        errores.push(`${archivo.nombre}: ${detalle}`);
        continue;
      }
      validos.push(archivo);
    }

    if (validos.length > 0) onAgregar(validos);
    if (errores.length > 0) setErrorSeleccion(errores.join('\n'));
  }

  function glifo(mimeType: string): React.ComponentType<{
    size?: number;
    color?: string;
    weight?: 'regular' | 'fill' | 'duotone';
  }> {
    return mimeType === 'application/pdf' ? FilePdfIcon : FileImageIcon;
  }

  return (
    <Card padding="md" style={estilos.tarjeta}>
      <View style={estilos.cabecera}>
        <View style={estilos.titulos}>
          <ThemedText variant="subtitle" weight="semibold">
            Adjuntos
          </ThemedText>
          <ThemedText variant="caption" tone="secondary">
            Opcional · PDF o imágenes · máximo 5 MB por archivo
          </ThemedText>
        </View>
        {total > 0 ? (
          <View style={estilos.contador}>
            <ThemedText variant="caption" weight="semibold" style={estilos.contadorTexto}>
              {total}
            </ThemedText>
          </View>
        ) : null}
      </View>

      {cargandoExistentes ? (
        <ThemedText variant="caption" tone="secondary">
          Cargando adjuntos…
        </ThemedText>
      ) : null}

      {visibles.map((adjunto) => {
        const marcado = marcados.has(adjunto.id);
        const Icono = glifo(adjunto.mimeType);
        return (
          <View
            key={adjunto.id}
            style={[estilos.fila, marcado && estilos.filaMarcada]}>
            <View style={estilos.tile}>
              <Icono size={20} color={colors.brand.primary} weight="duotone" />
            </View>
            <View style={estilos.textos}>
              <ThemedText
                variant="bodySm"
                weight="medium"
                numberOfLines={1}
                style={marcado ? estilos.textoMarcado : undefined}>
                {adjunto.nombre}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {marcado ? 'Se eliminará al guardar' : 'Ya guardado'}
              </ThemedText>
            </View>
            {editable ? (
              marcado ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Deshacer eliminación de ${adjunto.nombre}`}
                  hitSlop={spacing.sm}
                  onPress={() => onDesmarcarExistente(adjunto.id)}>
                  <ThemedText variant="caption" weight="semibold" style={estilos.deshacer}>
                    Deshacer
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar ${adjunto.nombre}`}
                  hitSlop={spacing.sm}
                  onPress={() => onMarcarExistente(adjunto)}>
                  <TrashIcon size={18} color={colors.status.danger} />
                </Pressable>
              )
            ) : null}
          </View>
        );
      })}

      {nuevos.map((archivo) => {
        const Icono = glifo(archivo.mimeType);
        return (
          <View key={archivo.clave} style={estilos.fila}>
            <View style={estilos.tile}>
              <Icono size={20} color={colors.brand.primary} weight="duotone" />
            </View>
            <View style={estilos.textos}>
              <ThemedText variant="bodySm" weight="medium" numberOfLines={1}>
                {archivo.nombre}
              </ThemedText>
              <ThemedText variant="caption" tone="secondary">
                {`${formatearTamano(archivo.tamano)} · Se subirá al guardar`}
              </ThemedText>
            </View>
            {editable ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${archivo.nombre}`}
                hitSlop={spacing.sm}
                onPress={() => onQuitarNuevo(archivo.clave)}>
                <XIcon size={18} color={colors.text.secondary} />
              </Pressable>
            ) : null}
          </View>
        );
      })}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Añadir archivo"
        accessibilityState={{ disabled: !editable }}
        disabled={!editable}
        onPress={() => void agregar()}
        style={({ pressed }) => [
          estilos.agregar,
          !editable && estilos.deshabilitado,
          pressed && editable && estilos.agregarPresionado,
        ]}>
        <PlusIcon size={18} color={colors.brand.primary} weight="bold" />
        <ThemedText variant="bodySm" weight="semibold" style={estilos.agregarTexto}>
          Añadir archivo
        </ThemedText>
      </Pressable>

      {error ? (
        <ThemedText variant="caption" style={estilos.error}>
          {error}
        </ThemedText>
      ) : null}
      {errorSeleccion ? (
        <ThemedText variant="caption" style={estilos.error}>
          {errorSeleccion}
        </ThemedText>
      ) : null}
    </Card>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    gap: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titulos: {
    flex: 1,
    gap: 2,
  },
  contador: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.surfaceBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    color: colors.brand.primary,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  filaMarcada: {
    opacity: 0.55,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.surfaceBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  textoMarcado: {
    textDecorationLine: 'line-through',
  },
  deshacer: {
    color: colors.brand.primary,
  },
  agregar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.input,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border.strong,
    backgroundColor: colors.bg.canvas,
  },
  agregarPresionado: {
    opacity: 0.8,
  },
  agregarTexto: {
    color: colors.brand.primary,
  },
  deshabilitado: {
    opacity: 0.5,
  },
  error: {
    color: colors.status.danger,
  },
});
