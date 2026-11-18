import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Features de `src/features/` (espejan los módulos del backend). */
const FEATURES = ['academico', 'calendario', 'comunicaciones', 'identidad', 'notificaciones'];
/** Feature transversal que todas pueden importar (sesión, tipos). */
const TRANSVERSAL = 'identidad';

export default defineConfig([
  { ignores: ['node_modules/**', '.expo/**', 'dist/**', 'web-build/**', 'assets/**', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        __DEV__: 'readonly',
        ErrorUtils: 'readonly',
        FormData: 'readonly',
        XMLHttpRequest: 'readonly',
        alert: 'readonly',
        cancelAnimationFrame: 'readonly',
        cancelIdleCallback: 'readonly',
        clearImmediate: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        requestAnimationFrame: 'readonly',
        requestIdleCallback: 'readonly',
        setImmediate: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  // Frontera de la arquitectura móvil: `app → pantallas → features → shared`.
  // Cada feature puede usar sus propias rutas y las de `identidad` (transversal: sesión y tipos);
  // nunca las de otra feature ni las de `pantallas` (que están por encima).
  ...FEATURES.map((feature) => ({
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                ...FEATURES.filter((otra) => otra !== feature && otra !== TRANSVERSAL).flatMap(
                  (otra) => [`@/features/${otra}`, `@/features/${otra}/*`],
                ),
                '@/pantallas',
                '@/pantallas/*',
              ],
              message:
                'Una feature no importa otra feature ni pantallas: compón desde src/pantallas/ o app/. Solo identidad es transversal.',
            },
          ],
        },
      ],
    },
  })),
]);