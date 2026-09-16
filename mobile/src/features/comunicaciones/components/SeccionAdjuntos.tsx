import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { urlDescargaAdjunto, type ArchivoAdjunto } from '../api/adjuntos.api';
import { tieneErroresAdjunto, validarAdjunto } from '../hooks/formulario';
import { useAdjuntos, useEliminarAdjunto, useSubirAdjunto } from '../hooks/useAdjuntos';
import { ApiError } from '@/shared/api/axios';
import { colors, radius, spacing } from '@/shared/ui';
import { ThemedButton, ThemedText, ThemedView } from '@/shared/ui';
import type { Adjunto } from '../types';

const PICKER_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

interface Props {
  comunicadoId: string;
  /** Recibe accionesPermitidas().puedeEditar del comunicado actual. */
  puedeEditar: boolean;
}

/** Sección de adjuntos del detalle: listar, abrir, subir y eliminar. */
export function SeccionAdjuntos({ comunicadoId, puedeEditar }: Props) {
  const adjuntos = useAdjuntos(comunicadoId);
  const subir = useSubirAdjunto(comunicadoId);
  const eliminar = useEliminarAdjunto(comunicadoId);
  const [error, setError] = useState<string | null>(null);

  const lista = adjuntos.data ?? [];

  async function abrir(adjuntoId: string) {
    setError(null);
    try {
      const url = await urlDescargaAdjunto(adjuntoId);
      await Linking.openURL(url);
    } catch {
      setError('No se pudo abrir el archivo (URL expirada o sin conexión).');
    }
  }

  async function agregar() {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: PICKER_TYPES,
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;

    const asset = picked.assets[0]!;
    const archivo: ArchivoAdjunto = {
      uri: asset.uri,
      nombre: asset.name,
      mimeType: asset.mimeType ?? 'application/pdf',
      tamano: asset.size ?? 0,
    };

    const errores = validarAdjunto(archivo);
    if (tieneErroresAdjunto(errores)) {
      setError(errores.mimeType ?? errores.tamano ?? errores.nombre);
      return;
    }

    // Subida en dos fases via el hook: fase 1/3 con ApiError; fase 2 error crudo.
    try {
      await subir.mutateAsync(archivo);
      adjuntos.refetch();
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('El archivo no pudo subirse al servidor de adjuntos.');
      }
    }
  }

  function borrar(adjunto: Adjunto) {
    Alert.alert('Eliminar adjunto', `¿Eliminar "${adjunto.nombre}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void ejecutarBorrado(adjunto);
        },
      },
    ]);
  }

  async function ejecutarBorrado(adjunto: Adjunto) {
    setError(null);
    try {
      await eliminar.mutateAsync(adjunto);
    } catch {
      setError('No se pudo eliminar el adjunto.');
    }
  }

  function glifo(mime: string): string {
    return mime === 'application/pdf' ? 'PDF' : 'IMG';
  }

  return (
    <View style={estilos.seccion}>
      <View style={estilos.cabecera}>
        <ThemedText variant="subtitle" weight="semibold">
          Adjuntos
        </ThemedText>
        {puedeEditar ? (
          <ThemedButton
            title="Adjuntar archivo"
            variant="ghost"
            size="sm"
            loading={subir.isPending}
            onPress={() => void agregar()}
          />
        ) : null}
      </View>

      {adjuntos.isPending ? (
        <ThemedText variant="caption" tone="tertiary">
          Cargando adjuntos...
        </ThemedText>
      ) : lista.length === 0 ? (
        <ThemedText variant="caption" tone="tertiary">
          {puedeEditar
            ? 'Sin adjuntos. Agrega PDF o imágenes (máx. 5 MB).'
            : 'Este comunicado no tiene adjuntos.'}
        </ThemedText>
      ) : (
        lista.map((adjunto) => (
          <View key={adjunto.id} style={estilos.fila}>
            <Pressable style={estilos.contenidoFila} onPress={() => void abrir(adjunto.id)}>
              <ThemedView variant="sunken" style={estilos.glifo}>
                <ThemedText variant="caption" weight="bold">
                  {glifo(adjunto.mimeType)}
                </ThemedText>
              </ThemedView>
              <View style={estilos.textos}>
                <ThemedText variant="body" weight="medium" numberOfLines={1}>
                  {adjunto.nombre}
                </ThemedText>
                <ThemedText variant="caption" tone="tertiary">
                  {glifo(adjunto.mimeType)}
                </ThemedText>
              </View>
            </Pressable>
            {puedeEditar ? (
              <Pressable onPress={() => borrar(adjunto)}>
                <ThemedText variant="caption" weight="semibold" style={estilos.eliminar}>
                  Eliminar
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ))
      )}

      {error ? (
        <ThemedText variant="caption" style={estilos.errorTexto}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    gap: spacing.two,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  contenidoFila: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  glifo: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTexto: {
    color: colors.status.danger,
  },
  eliminar: {
    color: colors.status.danger,
  },
});