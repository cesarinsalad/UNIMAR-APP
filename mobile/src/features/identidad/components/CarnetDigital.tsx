import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon } from 'phosphor-react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, layout, radius, spacing } from '@/shared/ui';
import { BotonCircular, ThemedText, ThemedView } from '@/shared/ui';
import { aRomano, etiquetaEstatus, formatoCedula, matrizCarnet } from '../carnet-helpers';

export interface DatosCarnet {
  nombre: string;
  carrera: string | null;
  cedula: string | null;
  semestre: number | null;
  estatus: string | null;
}

/** Iniciales (hasta 2 letras) para el avatar — igual cálculo que Perfil. */
export function inicialesDe(nombre: string): string {
  const partes = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '');
  return partes.join('') || '?';
}

const LADO_MATRIZ = 12;
const LADO_CODIGO = 96;

/**
 * Carnet digital — SOLO ESTÉTICO. La universidad no emite carnets vía la
 * app: el "código" es un SVG determinístico a partir de la cédula (no
 * escaneable) y el modal cierra con un disclaimer explícito.
 */
export function CarnetDigital({
  visible,
  onClose,
  datos,
}: {
  visible: boolean;
  onClose: () => void;
  datos: DatosCarnet | null;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}>
      <SafeAreaView style={estilos.flex}>
        <View style={estilos.cabecera}>
          <BotonCircular label="Volver al perfil" onPress={onClose}>
            <ArrowLeftIcon size={20} color={colors.brand.primary} weight="bold" />
          </BotonCircular>
          <ThemedText variant="subtitle" weight="semibold" style={estilos.tituloCabecera}>
            Carnet Digital
          </ThemedText>
          <View style={estilos.espacioSimetrico} />
        </View>

        {datos ? (
          <ContenidoCarnet datos={datos} />
        ) : (
          <ThemedView variant="base" style={estilos.centro}>
            <ThemedText tone="secondary">
              No se pudieron cargar los datos del carnet.
            </ThemedText>
          </ThemedView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ContenidoCarnet({ datos }: { datos: DatosCarnet }) {
  const cedula = datos.cedula ?? '';
  return (
    <View style={estilos.contenido}>
      <ThemedView variant="card" style={estilos.carnet}>
        <ThemedView style={estilos.franja}>
          <ThemedText variant="title" weight="bold" style={estilos.franjaTitulo}>
            UNIMAR
          </ThemedText>
          <ThemedText variant="caption" style={estilos.franjaSubtitulo}>
            Universidad de Margarita
          </ThemedText>
        </ThemedView>

        <View style={estilos.cuerpo}>
          <View style={estilos.filaIdentidad}>
            <View style={estilos.avatar}>
              <ThemedText variant="subtitle" weight="semibold" style={estilos.avatarTexto}>
                {inicialesDe(datos.nombre)}
              </ThemedText>
            </View>
            <View style={estilos.identidad}>
              <ThemedText variant="body" weight="semibold" numberOfLines={2}>
                {datos.nombre}
              </ThemedText>
              {datos.carrera ? (
                <ThemedText variant="caption" tone="secondary" numberOfLines={2}>
                  {datos.carrera}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={estilos.filaDatos}>
            <View style={estilos.dato}>
              <ThemedText variant="caption" tone="secondary">
                Cédula
              </ThemedText>
              <ThemedText variant="bodySm" weight="medium">
                {formatoCedula(cedula)}
              </ThemedText>
            </View>
            <View style={estilos.dato}>
              <ThemedText variant="caption" tone="secondary">
                {datos.semestre !== null ? 'Trimestre' : datos.estatus ? 'Estatus' : '—'}
              </ThemedText>
              <ThemedText variant="bodySm" weight="medium">
                {datos.semestre !== null
                  ? `Trimestre ${aRomano(datos.semestre)}`
                  : datos.estatus
                    ? etiquetaEstatus(datos.estatus)
                    : '—'}
              </ThemedText>
            </View>
            <CodigoCarnet semilla={cedula || datos.nombre} />
          </View>
        </View>
      </ThemedView>

      <ThemedText variant="caption" tone="tertiary" style={estilos.disclaimer}>
        Solo demostrativo — la universidad no emite carnets mediante la aplicación.
      </ThemedText>
    </View>
  );
}

/** Matriz sintética determinística (no escaneable) como gráfico. */
function CodigoCarnet({ semilla }: { semilla: string }) {
  const matriz = matrizCarnet(semilla, LADO_MATRIZ);
  const celda = LADO_CODIGO / LADO_MATRIZ;
  return (
    <View style={estilos.codigo}>
      <Svg width={LADO_CODIGO} height={LADO_CODIGO}>
        {matriz.flatMap((fila, f) =>
          fila.map((lleno, c) =>
            lleno ? (
              <Rect
                key={`${f}-${c}`}
                x={c * celda}
                y={f * celda}
                width={celda}
                height={celda}
                fill={colors.text.primary}
              />
            ) : null,
          ),
        )}
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  tituloCabecera: {
    flex: 1,
    textAlign: 'center',
  },
  espacioSimetrico: { width: 40 },
  contenido: {
    flex: 1,
    padding: layout.screenPadding,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  carnet: {
    padding: 0,
    overflow: 'hidden',
  },
  franja: {
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 2,
  },
  franjaTitulo: { color: colors.text.onPrimary },
  franjaSubtitulo: { color: colors.text.onPrimary },
  cuerpo: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  filaIdentidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { color: colors.text.onPrimary },
  identidad: {
    flex: 1,
    gap: 2,
  },
  filaDatos: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
  },
  dato: {
    gap: 2,
  },
  codigo: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
