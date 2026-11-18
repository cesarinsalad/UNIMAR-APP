import type { ConfigPlugin } from 'expo/config-plugins';

/**
 * Sufija el applicationId (y el nombre visible) con UNIMAR_APP_ID_SUFFIX en el prebuild.
 *
 * Uso: canal dev coexiste con preview/production en el mismo teléfono sin
 * conflicto de paquetes (Android exige mismo appId para actualizar una app):
 * el profile `development` declara UNIMAR_APP_ID_SUFFIX=.dev en eas.json, y
 * los rebuilds de dev nacen como edu.unimar.unimarapp.dev ("UNIMARapp Dev").
 *
 * En local, `expo prebuild`/`expo run:android` NO leen eas.json: hay que
 * exportar la env a mano (scripts `prebuild:dev` y `android:dev` de
 * package.json). Sin la env (profiles preview/production en la nube) no hace
 * nada y el id queda limpio; en local avisa, porque ese APK chocaría con el
 * preview instalado.
 *
 * Se registra PRIMERO en `plugins` (app.json) para que cualquier plugin
 * posterior lea el id ya sufijado. TS estricto de mobile valida tipos.
 */
let warnedMissingSuffix = false;

const withAppIdSuffix: ConfigPlugin = (config) => {
  const suffix = process.env.UNIMAR_APP_ID_SUFFIX;

  if (!suffix) {
    // EAS_BUILD solo existe en la nube: ahí la ausencia de env es intencional
    // (preview/production). En local significa que el build saldrá con el id
    // limpio y chocará con el APK preview.
    if (process.env.EAS_BUILD !== 'true' && !warnedMissingSuffix) {
      warnedMissingSuffix = true;
      console.warn(
        `[withAppIdSuffix] prebuild local sin UNIMAR_APP_ID_SUFFIX: el APK usará ` +
          `"${config.android?.package ?? 'el id limpio'}" y chocará con el preview. ` +
          `Usa \`npm run prebuild:dev\` + \`npm run android:dev\`.`,
      );
    }
    return config;
  }

  if (config.android?.package) {
    config.android.package = `${config.android.package}${suffix}`;
  }
  if (config.ios?.bundleIdentifier) {
    config.ios.bundleIdentifier = `${config.ios.bundleIdentifier}${suffix}`;
  }
  // El label del launcher sale de `name`: sin sufijo hay dos "UNIMARapp"
  // indistinguibles en el teléfono.
  config.name = `${config.name} Dev`;

  return config;
};

export default withAppIdSuffix;
