import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * Sufija el applicationId android con la env UNIMAR_APP_ID_SUFFIX en el prebuild.
 *
 * Uso: canal dev coexiste con preview/production en el mismo teléfono sin
 * conflicto de paquetes (Android exige mismo appId para actualizar una app):
 * el profile `development` declara UNIMAR_APP_ID_SUFFIX=.dev en eas.json, y
 * los rebuilds de dev nacen como edu.unimar.unimarapp.dev.
 *
 * Sin la env (profiles preview/production) no hace nada: el id queda limpio.
 *
 * Se registra PRIMERO en `plugins` (app.json) para que cualquier plugin
 * posterior lea el id ya sufijado. TS estricto de mobile valida tipos.
 */
const withAppIdSuffix: ConfigPlugin = (config) => {
  const suffix = process.env.UNIMAR_APP_ID_SUFFIX;
  if (!suffix) return config;

  if (config.android?.package) {
    config.android.package = `${config.android.package}${suffix}`;
  }
  return config;
};

export default withAppIdSuffix;
