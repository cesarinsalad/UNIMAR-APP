import { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeOut,
  useReducedMotion,
} from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

import {
  asignarPortada,
  crearComunicado,
  editarComunicado,
  quitarPortada,
  type InputComunicado,
} from '../api/comunicados.api';
import { seleccionarPortada } from '../api/portada.api';
import type { ArchivoAdjunto } from '../api/adjuntos.api';
import { subirAdjunto } from '../api/adjuntos.api';
import { usePortada } from '../hooks/usePortada';
import {
  clampAudiencia,
  tieneErrores,
  validarFormularioComunicado,
} from '../hooks/formulario';
import { useMutacionComunicado } from '../hooks/useMutacionComunicado';
import { useHistorialEditor } from '../hooks/useHistorialEditor';
import { useDecanatos } from '@/features/identidad/hooks/useDecanatos';
import { useSesionStore } from '@/features/identidad/store/sesion.store';
import { ApiError } from '@/shared/api/axios';
import { ModalConfirmacion } from '@/shared/ui/ModalConfirmacion';
import { colors, spacing } from '@/shared/ui/theme';
import type { Comunicado } from '../types';
import { CLAVES_COMUNICADOS } from '../hooks/queryKeys';

import { CabeceraAsistente, type PasoAsistente } from './CabeceraAsistente';
import { PasoContenidoComunicado } from './PasoContenidoComunicado';
import { PasoDetallesComunicado } from './PasoDetallesComunicado';
import { PasoRevisionComunicado } from './PasoRevisionComunicado';

interface Props {
  id?: string;
  datosIniciales: Comunicado | null;
}

function serializarSeleccion(seleccion: number[] | null): string {
  return seleccion === null ? 'null' : [...seleccion].sort((a, b) => a - b).join(',');
}

/**
 * Orquestador del asistente de comunicados. Mantiene el borrador vivo entre
 * pasos, hace explícito el guardado y conserva el contrato de mutaciones,
 * roles, portada y estados existente.
 */
export function AsistenteComunicado({ id, datosIniciales }: Props) {
  const esEdicion = Boolean(id);
  const insets = useSafeAreaInsets();
  const navegacion = useNavigation();
  const queryClient = useQueryClient();
  const usuario = useSesionStore((s) => s.usuario);
  const decanatos = useDecanatos();

  const [paso, setPaso] = useState<PasoAsistente>(1);
  const [titulo, setTitulo] = useState(datosIniciales?.titulo ?? '');
  const sesion = useHistorialEditor(datosIniciales?.cuerpo ?? '');
  const [seleccion, setSeleccion] = useState<number[] | null>(
    datosIniciales?.decanatoIds ?? null,
  );
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [errorPortada, setErrorPortada] = useState<string | null>(null);
  const [tocadoContenido, setTocadoContenido] = useState(false);
  const [tocadoDetalles, setTocadoDetalles] = useState(false);
  const [descarteVisible, setDescarteVisible] = useState(false);

  const [portadaLocal, setPortadaLocal] = useState<ArchivoAdjunto | null>(null);
  const [quitarPortadaActual, setQuitarPortadaActual] = useState(false);
  // Si el POST creó el borrador pero falló la portada, reintentar debe
  // actualizar ese mismo registro, nunca crear un duplicado.
  const [idGuardado, setIdGuardado] = useState<string | null>(null);
  // Adjunto ya registrado: si falla solo la asignación, el reintento no
  // vuelve a subir el archivo ni crea un adjunto huérfano.
  const [adjuntoPortadaId, setAdjuntoPortadaId] = useState<string | null>(null);
  const portadaApi = usePortada(
    id ?? 'nuevo',
    Boolean(esEdicion && datosIniciales?.imagenPath && !quitarPortadaActual && !portadaLocal),
  );

  const crear = useMutacionComunicado(crearComunicado);
  const editar = useMutacionComunicado(
    (args: { idComunicado: string; patch: Partial<InputComunicado> }) =>
      editarComunicado(args.idComunicado, args.patch),
  );
  const pendiente = crear.isPending || editar.isPending;
  const editable = !pendiente;
  const reducido = useReducedMotion();

  const seleccionEfectiva = useMemo(() => {
    if (seleccion !== null) return seleccion;
    if (usuario?.rol === 'COMUNICADOR') {
      return usuario.decanato_id !== null ? [usuario.decanato_id] : [];
    }
    return null;
  }, [seleccion, usuario]);

  const errores = validarFormularioComunicado({ titulo, cuerpo: sesion.valor });
  const adminSinElegir =
    usuario?.rol === 'ADMIN' && seleccionEfectiva === null && !esEdicion;
  const comunicadorSinDecanato =
    usuario?.rol === 'COMUNICADOR' && usuario.decanato_id === null;

  const inicialRef = useRef({
    titulo: datosIniciales?.titulo ?? '',
    cuerpo: datosIniciales?.cuerpo ?? '',
    seleccion: serializarSeleccion(datosIniciales?.decanatoIds ?? null),
  });
  const dirty =
    titulo !== inicialRef.current.titulo ||
    sesion.valor !== inicialRef.current.cuerpo ||
    serializarSeleccion(seleccion) !== inicialRef.current.seleccion ||
    portadaLocal !== null ||
    quitarPortadaActual;

  const permitirSalidaRef = useRef(false);
  const accionSalidaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = navegacion.addListener('beforeRemove', (event) => {
      // El guardado exitoso ya autorizó salir, aunque React Query todavía
      // conserve `isPending` durante este tick.
      if (permitirSalidaRef.current) return;
      // Guardado en vuelo: la pantalla no se abandona hasta conocer el
      // resultado; evita un router.back() tardío sobre otra pantalla.
      if (pendiente) {
        event.preventDefault();
        return;
      }
      if (!dirty) return;
      event.preventDefault();
      accionSalidaRef.current = () => navegacion.dispatch(event.data.action);
      setDescarteVisible(true);
    });
    return unsubscribe;
  }, [dirty, navegacion, pendiente]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pendiente) return true;
      if (paso > 1) {
        Keyboard.dismiss();
        setPaso((pasoActual) => (pasoActual - 1) as PasoAsistente);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [paso, pendiente]);

  function toggleDecanato(idDecanato: number) {
    if (usuario?.rol !== 'ADMIN') return;
    setSeleccion((actual) => {
      const base = actual ?? [];
      return base.includes(idDecanato)
        ? base.filter((d) => d !== idDecanato)
        : [...base, idDecanato];
    });
  }

  function toggleGlobal() {
    if (usuario?.rol !== 'ADMIN') return;
    setSeleccion((actual) =>
      actual === null || actual.length > 0 ? [] : null,
    );
  }

  async function elegirPortada(desdeCamara: boolean) {
    setErrorPortada(null);
    try {
      const archivo = await seleccionarPortada(desdeCamara);
      if (archivo) {
        setPortadaLocal(archivo);
        setQuitarPortadaActual(false);
        setAdjuntoPortadaId(null);
      }
    } catch (e) {
      setErrorPortada(
        e instanceof Error ? e.message : 'No se pudo abrir el selector.',
      );
    }
  }

  function quitarPortadaElegida() {
    setErrorPortada(null);
    if (portadaLocal) {
      setPortadaLocal(null);
      setAdjuntoPortadaId(null);
      return;
    }
    if (esEdicion && datosIniciales?.imagenPath) {
      setQuitarPortadaActual(true);
    }
  }

  function atras() {
    if (pendiente) return;
    Keyboard.dismiss();
    if (paso > 1) {
      setPaso((pasoActual) => (pasoActual - 1) as PasoAsistente);
      return;
    }
    router.back();
  }

  function siguiente() {
    if (pendiente) return;
    Keyboard.dismiss();
    setErrorServidor(null);
    setErrorPortada(null);
    if (paso === 1) {
      setTocadoContenido(true);
      if (tieneErrores(errores)) return;
      setPaso(2);
      return;
    }
    if (paso === 2) {
      setTocadoDetalles(true);
      if (tieneErrores(errores)) {
        setPaso(1);
        return;
      }
      if (adminSinElegir || comunicadorSinDecanato) return;
      setPaso(3);
    }
  }

  function confirmarDescarte() {
    const accion = accionSalidaRef.current;
    setDescarteVisible(false);
    accionSalidaRef.current = null;
    permitirSalidaRef.current = true;
    accion?.();
  }

  function cancelarDescarte() {
    accionSalidaRef.current = null;
    setDescarteVisible(false);
  }

  async function guardar() {
    if (pendiente) return;
    setErrorServidor(null);
    setTocadoContenido(true);
    setTocadoDetalles(true);
    if (tieneErrores(errores)) {
      setPaso(errores.titulo || errores.cuerpo ? 1 : 2);
      return;
    }
    if (adminSinElegir || comunicadorSinDecanato) {
      setPaso(2);
      return;
    }

    const audiencia = clampAudiencia(
      usuario!.rol,
      usuario!.decanato_id,
      seleccionEfectiva ?? [],
    );

    const idExistente = id ?? idGuardado;
    let entidadGuardada = false;

    try {
      const guardado = idExistente
        ? await editar.mutateAsync({
            idComunicado: idExistente,
            patch: {
              titulo: titulo.trim(),
              cuerpo: sesion.valor,
              decanatoIds: audiencia,
            },
          })
        : await crear.mutateAsync({
            titulo: titulo.trim(),
            cuerpo: sesion.valor,
            decanatoIds: audiencia,
          });

      entidadGuardada = true;
      if (!idExistente && guardado?.id) {
        setIdGuardado(guardado.id);
      }

      // Entidad final con la portada ya aplicada: se usa para sembrar el
      // detalle cacheado y que el gate `imagenPath != null` de usePortada
      // quede abierto sin esperar a un refetch.
      let entidadFinal = guardado;

      if (portadaLocal && guardado?.id) {
        let idAdjunto = adjuntoPortadaId;
        if (!idAdjunto) {
          const adjunto = await subirAdjunto(guardado.id, portadaLocal);
          idAdjunto = adjunto.id;
          setAdjuntoPortadaId(idAdjunto);
        }
        entidadFinal = await asignarPortada(guardado.id, idAdjunto);
        setAdjuntoPortadaId(null);
        setPortadaLocal(null);
      }
      if (quitarPortadaActual && guardado?.id) {
        entidadFinal = await quitarPortada(guardado.id);
        setQuitarPortadaActual(false);
      }

      if (entidadFinal?.id) {
        queryClient.setQueryData(CLAVES_COMUNICADOS.detalle(entidadFinal.id), entidadFinal);
      }
      // Invalidar TODO el módulo (no solo la portada): el refetch de creación
      // puede resolver antes de que termine la subida y dejar `imagenPath`
      // viejo en el feed/detalle.
      void queryClient.invalidateQueries({ queryKey: CLAVES_COMUNICADOS.prefijo });
      void queryClient.invalidateQueries({
        queryKey: CLAVES_COMUNICADOS.portada(entidadFinal?.id ?? ''),
      });
      permitirSalidaRef.current = true;
      if (navegacion.isFocused()) router.back();
    } catch (e) {
      if (entidadGuardada) {
        setErrorServidor(
          'El comunicado se guardó, pero la portada no se pudo completar. Reintenta o quita la portada.',
        );
      } else if (e instanceof ApiError) {
        setErrorServidor(e.message);
      } else {
        setErrorServidor('Error de red. Verifica tu conexión.');
      }
    }
  }

  if (!usuario) return null;

  const portadaUri =
    quitarPortadaActual && !portadaLocal
      ? null
      : portadaLocal?.uri ?? portadaApi.url ?? null;
  const audiencia =
    seleccionEfectiva === null
      ? 'Sin audiencia aún'
      : seleccionEfectiva.length === 0
        ? 'Toda la universidad'
        : seleccionEfectiva
            .map(
              (idDecanato) =>
                decanatos.data?.find((d) => d.id === idDecanato)?.nombre ??
                `Decanato ${idDecanato}`,
            )
            .join(', ');

  const pasoContenido = (
    <PasoContenidoComunicado
      titulo={titulo}
      errorTitulo={tocadoContenido ? errores.titulo ?? undefined : undefined}
      errorCuerpo={tocadoContenido ? errores.cuerpo ?? undefined : undefined}
      sesion={sesion}
      onCambiarTitulo={setTitulo}
      editable={editable}
    />
  );

  const pasoDetalles = (
    <PasoDetallesComunicado
      portadaUri={portadaUri}
      onElegirPortada={(desdeCamara) => void elegirPortada(desdeCamara)}
      onQuitarPortada={quitarPortadaElegida}
      seleccion={seleccion}
      seleccionEfectiva={seleccionEfectiva}
      rol={usuario.rol}
      decanatoUsuario={usuario.decanato_id}
      decanatos={decanatos.data ?? []}
      onToggleGlobal={toggleGlobal}
      onToggleDecanato={toggleDecanato}
      errorAudiencia={
        tocadoDetalles && adminSinElegir
          ? 'Elige toda la universidad o al menos un decanato.'
          : null
      }
      errorPortada={errorPortada}
      titulo={titulo}
      cuerpoLength={sesion.valor.length}
      editable={editable}
    />
  );

  const pasoRevision = (
    <PasoRevisionComunicado
      titulo={titulo}
      cuerpo={sesion.valor}
      portadaUri={portadaUri}
      audiencia={audiencia}
      autorNombre={usuario.nombre}
      esEdicion={esEdicion}
      guardando={pendiente}
      guardarDeshabilitado={adminSinElegir || comunicadorSinDecanato}
      motivoDeshabilitado={
        comunicadorSinDecanato
          ? 'Tu cuenta no tiene decanato asignado.'
          : adminSinElegir
            ? 'Elige una audiencia en Detalles.'
            : null
      }
      errorServidor={errorServidor}
      onEditarContenido={() => setPaso(1)}
      onEditarDetalles={() => setPaso(2)}
      onGuardar={() => void guardar()}
    />
  );

  return (
    <View
      style={[
        estilos.raiz,
        { paddingTop: insets.top },
        paso === 1 ? null : { paddingBottom: insets.bottom },
      ]}>
      <CabeceraAsistente
        paso={paso}
        onAtras={atras}
        atrasDeshabilitado={pendiente}
        onSiguiente={paso < 3 ? siguiente : undefined}
        siguienteEtiqueta={paso === 2 ? 'Revisar' : 'Siguiente'}
        siguienteDeshabilitado={pendiente}
      />

      <Animated.View
        key={paso}
        style={estilos.paso}
        entering={reducido ? undefined : FadeIn.duration(180)}
        exiting={reducido ? undefined : FadeOut.duration(120)}>
        {paso === 1 ? pasoContenido : paso === 2 ? pasoDetalles : pasoRevision}
      </Animated.View>

      <ModalConfirmacion
        visible={descarteVisible}
        titulo="¿Descartar cambios?"
        mensaje="El contenido que no hayas guardado se perderá."
        textoConfirmar="Descartar"
        textoCancelar="Seguir editando"
        destructive
        onConfirmar={confirmarDescarte}
        onCancelar={cancelarDescarte}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: colors.bg.surface,
  },
  paso: {
    flex: 1,
    minHeight: 0,
    marginTop: spacing.xs,
  },
});
