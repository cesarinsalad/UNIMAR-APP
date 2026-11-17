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
import { eliminarAdjunto, subirAdjunto } from '../api/adjuntos.api';
import { useAdjuntos } from '../hooks/useAdjuntos';
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
import type { Adjunto, Comunicado } from '../types';
import { CLAVES_COMUNICADOS } from '../hooks/queryKeys';

import { CabeceraAsistente, type PasoAsistente } from './CabeceraAsistente';
import { PasoContenidoComunicado } from './PasoContenidoComunicado';
import { PasoDetallesComunicado } from './PasoDetallesComunicado';
import { PasoRevisionComunicado } from './PasoRevisionComunicado';
import type { ArchivoAdjuntoCola } from './SeccionAdjuntosPaso';

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
  const [errorAdjuntos, setErrorAdjuntos] = useState<string | null>(null);
  const [tocadoContenido, setTocadoContenido] = useState(false);
  const [tocadoDetalles, setTocadoDetalles] = useState(false);
  const [descarteVisible, setDescarteVisible] = useState(false);
  // Cubre TODO el pipeline de guardado (entidad + portada + adjuntos). El
  // loader de la mutación se apaga al guardar el comunicado; este estado
  // mantiene el spinner hasta que la pantalla puede salir.
  const [guardandoTodo, setGuardandoTodo] = useState(false);

  const [portadaLocal, setPortadaLocal] = useState<ArchivoAdjunto | null>(null);
  const [quitarPortadaActual, setQuitarPortadaActual] = useState(false);
  // Adjuntos elegidos en esta sesión (aún sin subir) y existentes marcados
  // para borrar: ambos se aplican SOLO al guardar, como la portada.
  const [adjuntosNuevos, setAdjuntosNuevos] = useState<ArchivoAdjuntoCola[]>([]);
  const [adjuntosPorEliminar, setAdjuntosPorEliminar] = useState<Adjunto[]>([]);
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
  // En creación no hay entidad: la query queda deshabilitada.
  const adjuntosGuardados = useAdjuntos(id ?? 'sin-id', Boolean(id));

  const crear = useMutacionComunicado(crearComunicado);
  const editar = useMutacionComunicado(
    (args: { idComunicado: string; patch: Partial<InputComunicado> }) =>
      editarComunicado(args.idComunicado, args.patch),
  );
  const pendiente = crear.isPending || editar.isPending;
  const ocupado = pendiente || guardandoTodo;
  const editable = !ocupado;
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
    quitarPortadaActual ||
    adjuntosNuevos.length > 0 ||
    adjuntosPorEliminar.length > 0;

  const permitirSalidaRef = useRef(false);
  const accionSalidaRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = navegacion.addListener('beforeRemove', (event) => {
      // El guardado exitoso ya autorizó salir, aunque React Query todavía
      // conserve `isPending` durante este tick.
      if (permitirSalidaRef.current) return;
      // Guardado en vuelo: la pantalla no se abandona hasta conocer el
      // resultado; evita un router.back() tardío sobre otra pantalla.
      if (ocupado) {
        event.preventDefault();
        return;
      }
      if (!dirty) return;
      event.preventDefault();
      accionSalidaRef.current = () => navegacion.dispatch(event.data.action);
      setDescarteVisible(true);
    });
    return unsubscribe;
  }, [dirty, navegacion, ocupado]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (ocupado) return true;
      if (paso > 1) {
        Keyboard.dismiss();
        setPaso((pasoActual) => (pasoActual - 1) as PasoAsistente);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [paso, ocupado]);

  function cambiarAudiencia(nueva: number[]) {
    if (usuario?.rol !== 'ADMIN') return;
    setSeleccion(nueva);
  }

  function agregarAdjuntos(archivos: ArchivoAdjunto[]) {
    setErrorAdjuntos(null);
    setAdjuntosNuevos((actual) => [
      ...actual,
      ...archivos.map((archivo, indice) => ({
        ...archivo,
        clave: `${Date.now()}-${indice}-${archivo.nombre}`,
      })),
    ]);
  }

  function quitarAdjuntoNuevo(clave: string) {
    setErrorAdjuntos(null);
    setAdjuntosNuevos((actual) => actual.filter((archivo) => archivo.clave !== clave));
  }

  function marcarAdjuntoExistente(adjunto: Adjunto) {
    setErrorAdjuntos(null);
    setAdjuntosPorEliminar((actual) =>
      actual.some((marcado) => marcado.id === adjunto.id) ? actual : [...actual, adjunto],
    );
  }

  function desmarcarAdjuntoExistente(adjuntoId: string) {
    setErrorAdjuntos(null);
    setAdjuntosPorEliminar((actual) =>
      actual.filter((marcado) => marcado.id !== adjuntoId),
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
    if (ocupado) return;
    Keyboard.dismiss();
    if (paso > 1) {
      setPaso((pasoActual) => (pasoActual - 1) as PasoAsistente);
      return;
    }
    router.back();
  }

  function siguiente() {
    if (ocupado) return;
    Keyboard.dismiss();
    setErrorServidor(null);
    setErrorPortada(null);
    setErrorAdjuntos(null);
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
    if (pendiente || guardandoTodo) return;
    setGuardandoTodo(true);
    setErrorServidor(null);
    setErrorAdjuntos(null);
    setTocadoContenido(true);
    setTocadoDetalles(true);
    if (tieneErrores(errores)) {
      setGuardandoTodo(false);
      setPaso(errores.titulo || errores.cuerpo ? 1 : 2);
      return;
    }
    if (adminSinElegir || comunicadorSinDecanato) {
      setGuardandoTodo(false);
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
    let cerrar = false;
    let fase: 'entidad' | 'portada' | 'adjuntos' = 'entidad';

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

      fase = 'portada';
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

      // Adjuntos diferidos: cada éxito sale de la cola, así un reintento no
      // vuelve a subir lo ya registrado ni repite bajas. Subidas y bajas van
      // en paralelo (allSettled) y se conservan solo los fallidos.
      fase = 'adjuntos';
      if (guardado?.id) {
        if (adjuntosNuevos.length > 0) {
          const resultados = await Promise.allSettled(
            adjuntosNuevos.map((archivo) => subirAdjunto(guardado.id, archivo)),
          );
          const clavesSubidas = new Set(
            adjuntosNuevos
              .filter((_, indice) => resultados[indice]?.status === 'fulfilled')
              .map((archivo) => archivo.clave),
          );
          if (clavesSubidas.size > 0) {
            setAdjuntosNuevos((actual) =>
              actual.filter((archivo) => !clavesSubidas.has(archivo.clave)),
            );
          }
          if (resultados.some((resultado) => resultado.status === 'rejected')) {
            throw new Error('adjuntos');
          }
        }

        if (adjuntosPorEliminar.length > 0) {
          const resultados = await Promise.allSettled(
            adjuntosPorEliminar.map((adjunto) => eliminarAdjunto(adjunto.id)),
          );
          const idsEliminados = new Set(
            adjuntosPorEliminar
              .filter((_, indice) => resultados[indice]?.status === 'fulfilled')
              .map((adjunto) => adjunto.id),
          );
          if (idsEliminados.size > 0) {
            setAdjuntosPorEliminar((actual) =>
              actual.filter((adjunto) => !idsEliminados.has(adjunto.id)),
            );
          }
          if (resultados.some((resultado) => resultado.status === 'rejected')) {
            throw new Error('adjuntos');
          }
        }
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
      cerrar = true;
    } catch (e) {
      if (entidadGuardada) {
        if (fase === 'adjuntos') {
          setErrorAdjuntos(
            'No se pudieron completar todos los cambios de adjuntos. Revisa los pendientes y vuelve a guardar.',
          );
          setErrorServidor(
            'El comunicado se guardó, pero quedaron adjuntos pendientes. Reintenta el guardado.',
          );
        } else {
          setErrorServidor(
            'El comunicado se guardó, pero la portada no se pudo completar. Reintenta o quita la portada.',
          );
        }
      } else if (e instanceof ApiError) {
        setErrorServidor(e.message);
      } else {
        setErrorServidor('Error de red. Verifica tu conexión.');
      }
    }

    if (cerrar) {
      // El spinner sigue encendido hasta que la navegación desmonta la
      // pantalla: no se apaga un frame antes de salir.
      permitirSalidaRef.current = true;
      if (navegacion.isFocused()) {
        router.back();
        return;
      }
    }
    setGuardandoTodo(false);
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

  const adjuntosExistentes = adjuntosGuardados.data ?? [];
  const adjuntosVisibles = adjuntosExistentes.filter(
    (adjunto) =>
      adjunto.storagePath !== datosIniciales?.imagenPath &&
      !adjuntosPorEliminar.some((marcado) => marcado.id === adjunto.id),
  );
  const nombresAdjuntos = [
    ...adjuntosVisibles.map((adjunto) => adjunto.nombre),
    ...adjuntosNuevos.map((archivo) => archivo.nombre),
  ];

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
      errorPortada={errorPortada}
      cargandoPortada={
        Boolean(esEdicion && datosIniciales?.imagenPath) &&
        !portadaLocal &&
        !quitarPortadaActual &&
        portadaApi.cargando
      }
      seleccion={seleccion}
      seleccionEfectiva={seleccionEfectiva}
      rol={usuario.rol}
      decanatoUsuario={usuario.decanato_id}
      decanatos={decanatos.data ?? []}
      onCambiarAudiencia={cambiarAudiencia}
      errorAudiencia={
        tocadoDetalles && adminSinElegir
          ? 'Elige toda la universidad o al menos un decanato.'
          : null
      }
      adjuntosExistentes={adjuntosExistentes}
      adjuntosNuevos={adjuntosNuevos}
      adjuntosPorEliminar={adjuntosPorEliminar}
      cargandoAdjuntos={esEdicion && adjuntosGuardados.isPending}
      portadaPath={datosIniciales?.imagenPath ?? null}
      onAgregarAdjuntos={agregarAdjuntos}
      onQuitarAdjuntoNuevo={quitarAdjuntoNuevo}
      onMarcarAdjuntoExistente={marcarAdjuntoExistente}
      onDesmarcarAdjuntoExistente={desmarcarAdjuntoExistente}
      errorAdjuntos={errorAdjuntos}
      editable={editable}
    />
  );

  const pasoRevision = (
    <PasoRevisionComunicado
      titulo={titulo}
      cuerpo={sesion.valor}
      portadaUri={portadaUri}
      audiencia={audiencia}
      adjuntos={nombresAdjuntos}
      autorNombre={usuario.nombre}
      esEdicion={esEdicion}
      guardando={ocupado}
      guardarDeshabilitado={adminSinElegir || comunicadorSinDecanato}
      motivoDeshabilitado={
        comunicadorSinDecanato
          ? 'Tu cuenta no tiene decanato asignado.'
          : adminSinElegir
            ? 'Elige una audiencia en Detalles.'
            : null
      }
      errorServidor={errorServidor}
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
        titulo={esEdicion ? 'Editar comunicado' : 'Nuevo comunicado'}
        onAtras={atras}
        atrasDeshabilitado={ocupado}
        onSiguiente={paso < 3 ? siguiente : undefined}
        siguienteEtiqueta={paso === 2 ? 'Revisar' : 'Siguiente'}
        siguienteDeshabilitado={ocupado}
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
