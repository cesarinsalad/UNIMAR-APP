import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HojaInferior } from '@/shared/ui/HojaInferior';
import { TextField } from '@/shared/ui/TextField';
import { ThemedButton } from '@/shared/ui/ThemedButton';
import { ThemedText } from '@/shared/ui/ThemedText';
import { spacing } from '@/shared/ui/theme';

import { normalizarUrlEnlace } from './editorMarkdown.acciones';

interface Props {
  abierto: boolean;
  haySeleccion: boolean;
  puedeQuitar: boolean;
  onCerrar: () => void;
  onAplicar: (url: string, texto: string) => void;
  onQuitar: () => void;
}

/** Hoja de enlace del editor: no altera el layout del documento. */
export function HojaEnlaceComunicado({
  abierto,
  haySeleccion,
  puedeQuitar,
  onCerrar,
  onAplicar,
  onQuitar,
}: Props) {
  const [url, setUrl] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setUrl('');
    setTexto('');
    setError(null);
  }, [abierto]);

  function aplicar() {
    const normalizada = normalizarUrlEnlace(url);
    if (normalizada === null) {
      setError('Escribe una URL http(s) válida.');
      return;
    }
    onAplicar(normalizada, texto.trim() || 'enlace');
  }

  return (
    <HojaInferior abierto={abierto} onCerrar={onCerrar}>
      {({ cerrar }) => (
        <View style={estilos.contenido}>
          <View style={estilos.cabecera}>
            <ThemedText variant="subtitle" weight="semibold">
              Enlace
            </ThemedText>
            <ThemedText variant="caption" tone="secondary">
              {haySeleccion
                ? 'La URL se aplicará al texto seleccionado.'
                : 'Se insertará un enlace nuevo en el cursor.'}
            </ThemedText>
          </View>

          <TextField
            label="URL"
            value={url}
            onChangeText={(valor) => {
              setUrl(valor);
              if (error) setError(null);
            }}
            placeholder="https://unimar.edu.ve/…"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={error ?? undefined}
            autoFocus
          />
          {!haySeleccion ? (
            <TextField
              label="Texto del enlace"
              value={texto}
              onChangeText={setTexto}
              placeholder="Admisiones"
            />
          ) : null}

          <View style={estilos.acciones}>
            {puedeQuitar ? (
              <ThemedButton
                title="Quitar enlace"
                variant="ghost"
                size="sm"
                onPress={() => {
                  onQuitar();
                  cerrar();
                }}
              />
            ) : null}
            <View style={estilos.accionesDerecha}>
              <ThemedButton
                title="Cancelar"
                variant="ghost"
                size="sm"
                onPress={cerrar}
              />
              <ThemedButton title="Aplicar" size="sm" onPress={aplicar} />
            </View>
          </View>
        </View>
      )}
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
  },
  cabecera: {
    gap: spacing.xs,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  accionesDerecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 'auto',
  },
});
