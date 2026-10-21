> [!info] Contexto inicial
> Guía paso a paso asumiendo **PC recién reiniciada**, **iPhone en la misma red Wi-Fi** y **Expo Go instalado**. Cada paso especifica si es **idempotente** (seguro de repetir sin efectos secundarios).

> [!tip] Configuración inicial (Solo una vez)
> Las reglas de *Portproxy* y *Firewall* en PowerShell (Admin) persisten entre reinicios de Windows. No hace falta repetirlas a menos que cambie la IP asignada a WSL (ver Paso 1).

---
## 🚀 Rutina de Arranque

### Paso 0 — Docker Desktop (Windows)
1. Abre **Docker Desktop**.
2. Espera a que el indicador de estado cambie a **running**. Sin esto, los contenedores de Supabase no iniciarán.
* **Idempotente:** ✅ Sí.

---
### Paso 1 — Verificar IP de WSL (WSL, 10 segundos)
Ejecuta en la terminal de WSL:

```bash
hostname -I | awk '{print $1}'
````

- **Si la salida es `192.168.145.28`:** Todo sigue igual, continúa directo al **Paso 2**.
   
- **Si sale una IP distinta:** Actualiza el reenvío de puertos en **PowerShell (como Administrador)**:

```powershell

netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0
netsh interface portproxy delete v4tov4 listenport=8081 listenaddress=0.0.0.0
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=<NUEVA-IP>
netsh interface portproxy add v4tov4 listenport=8081 listenaddress=0.0.0.0 connectport=8081 connectaddress=<NUEVA-IP>
```

- **Idempotente:** El chequeo sí; reconfigurar el proxy solo si la IP cambió.
### Paso 2 — Backend (Terminal 1, raíz del repo)

Ejecuta la secuencia de arranque del backend:

```bash
npx supabase start
npx supabase migration up
npm run dev
```

- `start` con servicios arriba no genera errores.

- `migration up` sin migraciones pendientes actúa como un _no-op_.

- Espera el log de confirmación en el puerto `:3000` y **mantén esta terminal abierta**.

- **Idempotente:** ✅ Sí.
### Paso 3 — Verificar `app.json` (Solo si se revirtió)

Abre `mobile/app.json` y valida el endpoint:

```json
"apiBaseUrl": "[http://192.168.101.6:3000/api/v1](http://192.168.101.6:3000/api/v1)"
```

- **Si la IP de Windows cambió (nuevo lease DHCP):** Actualízala aquí. Obtén tu IP en Windows ejecutando `ipconfig` (Adaptador Wi-Fi → IPv4).

- _Nota:_ Si modificas el archivo mientras Metro Bundler ya está en ejecución, reinicia Metro.

- **Idempotente:** ✅ Sí (operación de solo lectura hasta que guardas cambios).
### Paso 4 — Frontend (Terminal 2, `mobile/`)

Inicia el empaquetador de Expo:

```bash
npm start
```

- Ignora posibles avisos cosméticos sobre DevTools.

- Espera hasta ver: `Metro waiting on exp://...`
### Paso 5 — Abrir en el iPhone

1. Abre la app **Notas** en el iPhone y escribe:
    
    `exp://192.168.101.6:8081` _(o la IP de Windows configurada en el Paso 3)_.
    
2. Toca el enlace para abrirlo directamente en **Expo Go**.
    
3. **Primera carga:** Tarda entre 1 y 2 minutos mientras compila el bundle.
    
    - _Si se cuelga:_ Agita el dispositivo ➔ **Reload**, o presiona `r` en la terminal de Metro.
    
4. **Credenciales de prueba:**
    
    - **Usuario:** `cgarcia.5516@unimar.edu.ve` (estudiante ingeniería y afines), `bruno.otra@unimar.edu.ve` (estudiante ciencias económicas y sociales), `flavio.rosales@unimar.edu.ve` (comunicador - ingeniería y afines) o `ana.admin@unimar.edu.ve` (admin)
    
    - **Contraseña:** `unimar123`
## 🔄 Resumen de Idempotencia

|**Acción / Paso**|**¿Repetible sin daño?**|**Notas**|
|---|---|---|
|**Docker Desktop, Supabase, `npm run dev`, `npm start`**|✅ Sí|Seguro de ejecutar en cada sesión.|
|**Chequeo de IP en WSL (`hostname -I`)**|✅ Sí|Solo lectura.|
|**Re-add de `portproxy`**|⚠️ Condicional|Solo necesario si la IP de WSL cambió.|
|**Edición de `app.json`**|⚠️ Condicional|Solo si cambió la IP de Windows asignada por Wi-Fi.|
|**Abrir enlace desde Notas en iPhone**|✅ Sí|Abre y recarga la sesión en Expo Go.|
## 🧹 Higiene del Repositorio (Al Terminar)

> [!warning] Cambio local de trabajo
> 
> La IP local en `mobile/app.json` no debe incluirse en commits de Git. Al finalizar las pruebas, descarta las modificaciones ejecutando:

```bash
git checkout mobile/app.json
```