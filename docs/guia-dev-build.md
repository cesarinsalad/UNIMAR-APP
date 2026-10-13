# Guía: Development build Android (local) — push real + módulos nativos

> [!info] Contexto
> Runbook paso a paso para compilar un **development build Android** **localmente en WSL2** (sin EAS cloud, sin colas), instalarlo en un teléfono Android físico y conectarlo al Metro del BFF local. Cubre lo que Expo Go ya no permite en SDK 57: **push remoto real** (`PUSH_PROVIDER=expo`) y módulos nativos completos.
>
> **Build local = sin login EAS ni credenciales gestionadas**: el `development build` se firma con el **keystore debug** local, que Gradle genera solo. El `projectId` en `app.json` basta para el push token.
>
> Cada paso indica si es **idempotente** (seguro de repetir sin efectos secundarios), siguiendo el estilo de `docs/guia-expo-go.md`.

> [!warning] Requisitos previos
> - WSL2 (Ubuntu) con ~**40 GB libres** (el VHDX de la distro también debe crecer; ver tabla de pesos).
> - Docker corriendo (Supabase local). **El build NO usa Docker ni imágenes: corre directo en el host.**
> - Teléfono Android físico (USB vía `usbipd-win`, o en la misma red Wi-Fi que el PC).
> - Cuenta Expo solo para la variante cloud alternativa y el dashboard de FCM (troubleshooting de push).

---

## 🧱 Parte A — Toolchain nativa local (una sola vez)

### Pesos de la primera configuración

| Componente | Descarga | En disco después |
|---|---|---|
| JDK 17 (apt) | ~250 MB | ~500 MB |
| `cmdline-tools` | ~182 MB | ~300 MB |
| SDK: platform-tools + android-36 + build-tools 36.0.0 | ~600 MB | ~2-3 GB |
| NDK r27b (mismo que la imagen `sdk-58` de EAS) | ~1.2 GB | ~3-4 GB |
| Gradle + artefactos Maven/Kotlin (primer build) | ~1-3 GB | ~2-4 GB en `~/.gradle` |
| `node_modules` | **0 extra** (ya está en el repo) | 0 |
| **Total** | **~10-15 GB** | **~20-30 GB** |

- El compilado hace picos de disco: mantener **≥ 40 GB libres** en el VHDX de WSL2.
- Builds subsecuentes son incrementales (pocos minutos): el cache de Gradle persiste en `~/.gradle`. EAS no cachea por ti en modo local, pero Gradle sí, localmente.
- **Idempotente:** ✅ Sí (cada comando es no-op si ya está).

### Paso A1 — JDK 17
```bash
sudo apt-get update && sudo apt-get install -y openjdk-17-jdk-headless
java -version   # debe decir 17.x
```

### Paso A2 — Android SDK + NDK
```bash
mkdir -p ~/android-sdk/cmdline-tools && cd ~/android-sdk/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip
unzip commandlinetools-linux-15859902_latest.zip && rm commandlinetools-linux-15859902_latest.zip
mv cmdline-tools latest
```
```bash
# Variables de entorno (agregar también a ~/.bashrc para persistir)
export ANDROID_HOME=$HOME/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH
```
```bash
yes | sdkmanager --licenses
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" "ndk;27.1.12297006"
```
- Pins verificados contra el template de **RN 0.86** (`android/build.gradle` generado): `compileSdk/targetSdk 36`, `buildTools 36.0.0`, `ndkVersion 27.1.12297006` (= "r27b", mismo NDK de la imagen de la nube EAS `ubuntu-26.04-jdk-17-ndk-r27b-sdk-58`), JDK 17. Nota: el ref de sdkmanager usa el número completo, **no** el alias `ndk;r27b`.
- Si algún día sube Expo SDK: re-chequear los pins con `grep ndkVersion mobile/android/build.gradle` (y las ext del mismo archivo) después de `prebuild`, e instalar las versiones que aparezcan ahí — no las "latest" del mercado.
- **Idempotente:** ✅ Sí (sdkmanager no reinstala lo ya instalado; las licenses `yes |` son acumulativas).

### Paso A3 — Generar nativo + compilar + instalar
```bash
cd mobile
npx expo prebuild -p android        # genera android/ desde app.json (CNG)
npx expo run:android --device       # compila debug + instala en el teléfono + arranca Metro
```
- `--device` lista dispositivos conectados: USB (tras `usbipd`) o **debug inalámbrico** (`adb pair <IP>:<puerto>` + `adb connect <IP>:<puerto>` con el menú "Depuración por Wi-Fi" de Android 11+, no hace falta cable).
- Alternativa manual sin conexión previa: `cd android && ./gradlew :app:assembleDebug` → copiar `android/app/build/outputs/apk/debug/app-debug.apk` al teléfono (Drive/USB) e instalar aceptando "apps desconocidas".
- **Primer gradlew tarda ~5-15 min** (descarga artefactos); los siguientes <2 min.
- Cambios en config nativa después: regenerar con `npx expo prebuild -p android --clean` (borra desde cero, no "layer" el previo).
- **Idempotente:** `prebuild` ⚠️ sobreescribe `android/` (usarlo es la intención); `run:android` ✅ recompila sin efectos.

---

## ☁️ Alternativa — Build en nube EAS (sin toolchain local)

Útil si no quieres instalar SDK/NDK. Requiere cuenta Expo.

### Paso C1 — Login en EAS
```bash
cd mobile
npx eas-cli login     # o EXPO_TOKEN=<token> para no-interactivo; verificar con npx eas-cli whoami
```
- **Idempotente:** ✅ Sí (la sesión persiste en `~/.expo`).

### Paso C2 — Lanzar el build
```bash
npx eas-cli build -p android --profile development
```
- Usa el perfil `development` de `mobile/eas.json`: `developmentClient: true`, APK directo (`buildType: "apk"`), distribution `internal`.
- **Primer run:** EAS genera el Android keystore automáticamente (link al dashboard; nadie toca contraseñas).
- Tarda ~15-25 min; cada ejecución crea un build nuevo (límites del plan gratis): no re-ejecutar salvo cambio nativo.
- **Idempotente:** ⚠️ Crea build nuevo en cada run.

### Paso C3 — Instalar el APK
1. La consola imprime un **link directo al APK** (también dashboard → Builds; `npx eas-cli build:list` para recuperar viejos).
2. Descargar en el navegador del Android, o al PC y copiar por USB/Drive. Aceptar "instalar apps desconocidas".
- **Idempotente:** ✅ Sí (reinstalar el mismo APK es una "actualización" normal).

### ❓¿Cuándo se re-builda?
Aplica a ambas variantes: solo si cambian **dependencias nativas** (`package.json` con módulos nuevos), **plugins** de `app.json` (re-generar `android/` con `prebuild --clean`), o si el dev client pide **"compatibility mismatch"** con la versión de `expo-dev-client`/SDK. Cambios de JS/TS **no** requieren rebuild: los sirve Metro en caliente.

---

## 📡 Parte B — Rutina de arranque (cada sesión)

> Con el APK ya instalado (Parte A), la sesión diaria solo levanta backend + Metro.

### ⚡ Paso B0 — Todo en un comando (recomendado)
```bash
npm run dev:all
```
- Un solo comando desde la raíz, en dos fases de npm lifecycle:
  1. `predev:all` corre **`npx supabase start`** secuencialmente (idempotente: no-op de ~2 s si el stack ya está arriba; levanta los contenedores si no).
  2. `dev:all` entonces arranca en paralelo **BFF + Metro** con prefijos coloreados `[bff]`, `[metro]`.
- `Ctrl+C` termina el dúo BFF/Metro completo (flag `-k`), sin procesos huérfanos.
- Si algo falla: verificar Docker Desktop abierto (ver troubleshooting: `ECONNREFUSED 127.0.0.1:54322`); los contenedores **no** arrancan solos ni al abrir Docker Desktop.
- Si prefieres compilar/instalar todo en un paso: `npx expo run:android --device` también arranca Metro al final.
- **Idempotente:** ✅ Sí.

### Paso B1 — Backend (Terminal 1, raíz del repo) — ruta granular manual
```bash
npx supabase start
npx supabase migration up
npm run dev
```
- Igual a la guía de Expo Go (`docs/guia-expo-go.md` Paso 2). Mantener la terminal abierta.
- **Para push real:** en `.env` poner `PUSH_PROVIDER=expo` (hoy el default es `mock`, que solo loguea en consola del BFF).
- **Idempotente:** ✅ Sí.

### Paso B2 — Metro con dev client (Terminal 2, `mobile/`) — ruta granular manual
```bash
cd mobile
npx expo start --dev-client
```
- **No** es `npm start` a secas: `--dev-client` hace que Metro enumere el launcher del dev build.
- Espera `Metro waiting on exp://...`.
- **Idempotente:** ✅ Sí.

### Paso B3 — Red (Windows/WSL2, solo si cambió la IP)
Idéntico a la guía de Expo Go:
1. `hostname -I | awk '{print $1}'` en WSL → si NO es `192.168.145.28`, actualizar los portproxy en PowerShell (Admin) según Paso 1 de `docs/guia-expo-go.md`.
2. `extra.apiBaseUrl` en `mobile/app.json` debe apuntar a la **IP de Windows** (DHCP del Wi-Fi), no a la de WSL. `ipconfig` (Adaptador Wi-Fi → IPv4) si cambió.
- **Idempotente:** ⚠️ Condicional (solo si cambió la IP).

### Paso B4 — Abrir en el teléfono
1. Abrir el **dev build UNIMARapp** ya instalado.
2. En la lista de recientes de `expo-dev-client`, o vía URL manual: teclear `exp://<IP-WINDOWS>:8081` en el buscador del launcher.
3. Primera carga: Metro compila el bundle (~1-2 min). Si se cuelga: agitar → **Reload**, o `r` en la terminal de Metro.
- **Idempotente:** ✅ Sí.

### Paso B5 — Probar push real
1. Login con un usuario mock (contraseña `unimar123`, ver `docs/onboarding-frontend.md`).
2. Conceder permiso de notificaciones al abrir la app (primer login).
3. La app registra el Expo Push Token en el BFF (`useRegistrarDispositivo` → `POST /notificaciones/dispositivos`).
4. Disparar una notificación desde otro usuario (ej. comunicador publica un aviso) o declarar un endpoint de sistema.
5. El BFF llama a la Expo Push API → llega notificación nativa al Android.
- **Idempotente:** ✅ Sí. El token se reasigna al nuevo usuario activo (función `reasignar_dispositivo` SECURITY DEFINER).

---

## 🧩 Troubleshooting

| Síntoma | Causa probable | Fix |
|---|---|---|
| El push no llega (token SÍ se registró) | Falta credenciales FCM v1 en el proyecto Expo | Dashboard expo.dev → proyecto → Credentials → Android → subir Service Account JSON de Firebase (requisito para Expo Push API desde 2024) |
| Token push vacío / `proyecto_no_vinculado` | `projectId` de `app.json` no matchea el proyecto EAS | Verificar `extra.eas.projectId` = `99359622-...` |
| "Compatibility mismatch" al abrir | El dev build es viejo vs `expo-dev-client` del repo | Rebuild (Parte A, A3) |
| `SDK location not found` / licencias al compilar | `ANDROID_HOME` unset o licencias sin aceptar | Revisar Paso A2 (vars en `~/.bashrc`; `yes \| sdkmanager --licenses`) |
| `expo run:android --device` no ve el teléfono USB | WSL2 no pasa USB por defecto | Windows: `usbipd list` + `usbipd bind --hwid <X>` + `usbipd attach --wsl --hwid <X>` (admin); teléfono con USB debugging activo |
| `unauthorized`/`offline` en adb inalámbrico | Pairing caducó o restart del adb server | Repetir `adb pair`/`adb connect`; aceptar prompt en el teléfono |
| Gradle `OutOfMemoryError` | Heap de la JVM chico | `GRADLE_OPTS="-Dorg.gradle.jvmargs=-Xmx4g"` en el shell (default EAS medium es 4g) |
| App arranca pero red falla | `apiBaseUrl` apunta a IP vieja de Windows | Actualizar `app.json` + **reiniciar Metro** |
| Metro no ve el teléfono (Wi-Fi) | Wi-Fi distinta / AP isolation del router | Verificar misma red; alternativas: `adb reverse tcp:8081 tcp:8081` (USB/adb inalámbrico) o `--tunnel` como fallback lento |

---

## ☝️ Higiene del repositorio (al terminar)
```bash
git checkout mobile/app.json
```
- La IP local en `extra.apiBaseUrl` **nunca se commitea** (mismo criterio que `docs/guia-expo-go.md`).

---

## 🍎 Apéndice — ¿Y iOS?

Con cuenta Apple **gratuita**, un dev build iOS vía EAS es **imposible**: Apple exige Apple Developer Program pagado ($99/año) para distribución en dispositivos físicos, y compilar iOS requiere macOS + Xcode (este entorno es WSL2). Dos caminos de desbloqueo:

1. **Apple Developer Program pagado**: `eas build -p ios --profile development` queda operativo tal cual (el perfil `development` ya sirve para iOS con `distribution: internal`; registrar el device con `eas device:create`).
2. **Mac físico + cuenta gratis**: `npx expo prebuild -p ios`, abrir `ios/*.xcworkspace` en Xcode, firmar con el Apple ID personal ("Automatically manage signing", free provisioning), instalar en el iPhone vía Xcode. Limitaciones: la instalación **caduca cada 7 días** (reinstalar), y se necesita Mac físicamente. Push en dev sí funciona con el entitlement APS *development*, pero EAS Build cloud no es usable.

Mientras tanto, para iOS sin pagos queda Expo Go **sin** push remoto (`docs/guia-expo-go.md`).
