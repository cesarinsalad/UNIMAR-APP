# Dev universal — flujo remoto (runbook)

> Reemplaza los flujos LAN de `guia-expo-go.md` (y vale para `guia-dev-build.md` cuando
> generes APKs). Con este flujo la app se desarrolla y se muestra **desde cualquier
> red**: WiFi universitaria, datos móviles, red de un tutor — sin tocar IPs, portproxy,
> firewall o `app.json`.

## Arquitectura del flujo

```
┌─ laptop (WSL2) ────────────────────────────────────────┐
│  npm run dev:remoto  →  [bff]   BFF Express :3000      │
│                         [tunnel] ngrok http 3000       │
│                         [metro]  expo start --tunnel   │──► exp://<random>-<user>-8081.exp.direct (público)
│  supabase start        (Postgres/RLS local :54322)     │
└────────────────────────────────────────────────────────┘
         │                                    │
         │  https://moonbeam-frosted-condition.ngrok-free.dev  (dev domain ngrok, fijo)
         ▼                                    ▼
   cualquier teléfono (datos móviles/WiFi)   navegador → https://unimarapp.pages.dev
   Expo Go / dev build / APK preview          (web estática en Cloudflare Pages)
```

- El bundle que cualquier cliente carga trae `extra.apiBaseUrl` apuntando al **dev
  domain de ngrok** (fijo, en `mobile/app.json`) — por eso funciona desde cualquier red.
- `--tunnel` de Metro usa la propia infra ngrok de Expo (`*.exp.direct`, token embedded
  del CLI), independiente de tu cuenta ngrok.

## Setup one-time (por máquina)

| Paso | Comando / acción | Idempotente |
|---|---|---|
| Cuenta ngrok + CLI | signup `dashboard.ngrok.com` → `sudo snap install ngrok` → `ngrok config add-authtoken <token>` | ✅ |
| Dev domain ngrok | asignado automático al crear la cuenta (Dashboard → Gateway → Domains). **Fijo/permanente**; en plan free **no se elige el nombre** | ✅ |
| Poner el dominio en la app | `mobile/app.json → extra.apiBaseUrl` = `https://<dev-domain>.ngrok-free.dev/api/v1` (ya committable: no es IP LAN) | ✅ |
| EAS | `eas login` (cuenta dueña del `extra.eas.projectId`) | ✅ |
| Cloudflare | `npx wrangler login` → `npx wrangler pages project create unimarapp --production-branch main` | ✅ |
| Supabase Docker | Docker Desktop corriendo + `npx supabase start` (lo hace `predev:remoto`) | ✅ |

## Rutina diaria (dev + mostrado)

```bash
npm run dev:remoto   # una sola terminal: [bff] + [tunnel] + [metro]; predev arranca Supabase
```

1. Copia el link `exp+unimarapp://...oqvw3f0-cesarinsalad-8081.exp.direct` de `[metro]`.
2. Ábrelo en el teléfono (Expo Go o dev build) — datos móviles o cualquier WiFi.
3. Hot reload: edita código → guarda → se refleja (en el apk release de `eas update` NO hay hot reload: kill/reabrir la app).
4. Ctrl+C apaga los tres procesos.

**El link del túnel Metro es estable**: la aleatoriedad del subdominio persiste en
`mobile/.expo/settings.json` (`urlRandomness`) — solo cambia por conflicto (ngrok
  error 103, que la CLI resuelve regenerando) o si borras `.expo/`. Si un día
  cambia: `cd mobile && npx expo start --tunnel --dev-client` en una terminal
  interactiva (el QR solo en TTY; el link texto sí se imprime).

## Rutina de revisión nativa (APK preview por EAS Update)

Para mostrar cambios en el APK (preview/distribución interna) **sin laptop en la demo**:

```bash
cd mobile
npx eas update --branch demo -m "revision: <descripción>"   # publica JS+assets, ~2-3 min
```

- Canal `demo` ↔ branch `demo` (mapeo 1:1 default) — el APK lo pide al lanzar.
- En el teléfono: kill app → reabrir → el update baja y aplica (sin reinstalar).
- **Límite**: `eas update` distribuye SOLO JS/assets. Cambios nativos (plugins, app.json de
  iconos/splash, módulos nativos) exigen `npx eas build -p android --profile preview`
  (cloud; el `--local` quedó en desuso tras el incidente de Metaspace, ver gotchas).
- Free tier EAS: cola ~15-40 min por build; updates ~1-3 min.

## Web (segunda clase, a propósito)

- Publish/republicar: `npm --prefix mobile run web:deploy` (export + `wrangler pages deploy`) → https://unimarapp.pages.dev
- Dev web con hot reload: `npm --prefix mobile run web` (localhost, ya en `CORS_ORIGIN`).
- En web la sesión NO persiste (SecureStore build web es objeto vacío) ni hay push —
  *por diseño* (`AGENTS.md`); el login tras recargar es la consecuencia a comunicar
  al revisor.

## API pública (BFF por túnel) — smoke test

```bash
curl -s https://moonbeam-frosted-condition.ngrok-free.dev/health
# → {"status":"ok"}
```

---

## Resumen de idempotencia

| Acción | ¿Repetible sin daño? | Notas |
|---|---|---|
| `npm run dev:remoto` (y `predev:remoto`) | ✅ | Detecta Supabase/Docker arriba |
| `eas update --branch demo` | ✅ | Cada publish es inmutable; `update:list` lista |
| `npm run web:deploy` | ✅ | Pages deduplica assets por hash |
| Reconstruir dev build (`eas build development`) | ✅ | applicationId `.dev` — coexiste con preview |
| Borrar `~/.gradle/caches/journal-1` | ✅ | Metadato puro; solo si `CorruptedCacheException` |

## Gotchas (historia de esta implementación)

- **`ERR_NGROK_4018`/3200**: `--config ngrok.yml` reemplaza la config default
  (`~/.config/ngrok/ngrok.yml` del snap) → el authtoken se ignora. Por eso el script
  `tunnel` es un `ngrok http 3000` sin config file (en free, el dev domain se usa
  automático).
- **Intersticial de ngrok**: mitigado para TODA la app con el header
  `ngrok-skip-browser-warning: true` en el interceptor global de axios.
- **Web en Pages atrapando assets**: la regla `/* /index.html 200` de `_redirects`
  tiene prioridad sobre los archivos estáticos → las fuentes (TTF) volvían HTML →
  `useFonts` nunca resolvía (`fuenteCargada=false`) → splash eterna. El fallback
  SPA **automático** de Pages (sin `_redirects`) sirve index para paths sin archivo
  sin tocar los assets.
- **Fuentes locales**: los TTF viven en `mobile/assets/fonts/` (no
  `node_modules/@expo-google-fonts`) porque el export web colocaba los assets
  bajo `assets/node_modules/...` y **wrangler pages deploy descarta rutas
  `node_modules`** → inexistente en el deployment. Ver `mobile/plugins/` y la nota
  en `_layout.tsx`.
- **Locks y EAS cloud**: el builder corre `npm ci` con npm ~10/11; regenerar el lock
  con npm 12 puede dejar subtrees ausentes (`Missing: typescript@5.9.3`) → siempre
  regenerar/validar con `npx -y npm@10 install|ci --dry-run`. Blindado con
  `engines.npm` en `mobile/package.json`.
- **`OutOfMemoryError: Metaspace` en build local**: el cap es un flag de JVM
  (`gradle.properties` del prebuild), no RAM del host. Si resucitas el build local,
  inyecta `-Dorg.gradle.jvmargs=... -XX:MaxMetaspaceSize=2048m` vía `gradleCommand`
  del profile (referencia: docs.expo.dev/build-reference/local — fases KSP/lint
  release son las víctimas típicas; el incidente ocurrió con ~11 Gi de RAM host,
  heap del daemon por defecto del template).
- **Supabase apagado en remoto**: `[bff] ... ECONNREFUSED 127.0.0.1:54322` en logs =
  Docker Desktop o `npx supabase start` no corrieron (paso que `predev:remoto` ya
  automatiza).
