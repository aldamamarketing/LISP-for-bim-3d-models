# LispCentral — Arquitectura del Sistema

> Documento vivo. Última actualización: 2026-07-02

---

## Visión General

LispCentral es una plataforma SaaS que distribuye herramientas LISP para AutoCAD (y otros motores CAD) vía cloud. El usuario instala un **Loader** (`.lsp`) que autentica con el servidor y descarga el **Core Engine** dinámicamente a la RAM del CAD, sin dejar código en disco.

```
[Usuario CAD] → instala loader.lsp → [Servidor Firebase] → Core Engine → RAM de AutoCAD
                                                ↓
                                         Firestore (auth, devices, subscriptions, commands)
```

---

## Componentes del Sistema

| Componente | Ubicación | Responsabilidad |
|------------|-----------|-----------------|
| Loader Template | `functions/loader_template.lsp` | Bootstrap: autentica + descarga engine |
| Core Engine | `functions/core_engine.lsp` | Lógica en RAM: JIT, paletas, assets |
| Cloud Function | `functions/index.js` | API: auth, serving de código, INDEX de comandos |
| Frontend Palettes | `web/src/` | UI web embebida en paletas de AutoCAD |
| Firestore | Firebase | users, devices, subscriptions, lispFiles, commands |

---

## Flujo de Bootstrap

```
1. AutoCAD arranca → ejecuta loader.lsp (desde acaddoc.lsp o APPLOAD)
2. Loader: calcula HWID = COMPUTERNAME@USERNAME
3. Loader: GET /getRoutine?token=SEAT_TOKEN&hwId=HWID&routine=BOOT[&platformId=ACAD]
4. Servidor:
   a. Valida token en Firestore
   b. Registra/actualiza device en Pool
   c. Verifica suscripciones (global + granulares)
   d. Si sobrepasa seats → retorna LISP con alert() de bloqueo
   e. Si OK → lee core_engine.lsp + inyecta vars → retorna como LISP string
5. Loader: eval() del response en RAM de AutoCAD
6. Core Engine se inicializa:
   a. Define funciones (HTTP layer, JIT engine, palette engine, asset engine)
   b. Llama (LC:register-ghosts) → GET /INDEX → crea stubs c:CMD para comandos del usuario
   c. Imprime mensaje "Ready. Type LC to open palette."
```

---

## Core Engine — Estructura Interna

### Secciones (ordenadas)

```
SECCIÓN 0: VARIABLES GLOBALES (inyectadas por servidor en BOOT)
  *LC-SEAT-TOKEN*        string
  *LC-HWID*              string
  *LC-API-ENDPOINT*      string
  *LC-PLATFORM-ID*       string   "ACAD" | "ZCAD" | "BRICSCAD"   [Fase 3]
  *LC-PLATFORM-MAP*      alist    '(("palette" . URL) ...)         [Fase 3]

SECCIÓN 1: HTTP LAYER
  LC:http-get (url) → string | nil
  LC:url-encode (str) → string

SECCIÓN 2: JIT ENGINE
  *LC-LOADED-ROUTINES*   list de lispIds en RAM
  *LC-GHOST-ROUTINES*    list de nombres de stubs
  LC:load-remote-routine (lisp_id) → t | nil
  LC:run-or-load (lisp_id) → ejecuta cmd
  LC:Require (lisp_id) → carga dep si falta

SECCIÓN 3: INDEX & GHOST REGISTRATION
  LC:parse-json-names (jsonStr) → list
  LC:register-ghosts () → registra stubs c:CMD

SECCIÓN 4: ASSET ENGINE
  *LC-ASSET-CACHE*       alist (cache de sesión RAM)
  c:LC_APPLY_ASSET ()
  LC_ApplyHatch (name code)     ← alias legacy
  LC_ApplyLinetype (name code)  ← alias legacy

SECCIÓN 5: PALETTE ENGINE
  LC:get-palette-url (key) → string     [Fase 3: usa *LC-PLATFORM-MAP*]
  LC:open-palette (id name) → abre paleta genérica
  c:LC_PALETTE ()
  c:LC_RESOURCES ()
  c:LC_STANDARDS ()   [Fase 4]

SECCIÓN 6: EVENT HUB & REACTOR
  LC:DocChanged-Callback (reactorObj eventList)
  LC:Init-EventHub ()

SECCIÓN 7: COMANDOS DE SISTEMA
  c:LC_SYNC ()
  c:LC_RESET ()
  c:LC_HELP ()
  aliases: c:LC, c:PALETA, c:HATCHES, c:LINHAS...

SECCIÓN 8: INICIALIZACIÓN
  (LC:register-ghosts)
  (princ "Ready...")
```

---

## API Contracts

### BOOT Request
```
GET /getRoutine?token={SEAT_TOKEN}&hwId={HWID}&routine=BOOT
```
Parámetro futuro: `&platformId=ACAD`

### BOOT Response (LISP string)
```lisp
(progn
  (setq *LC-SEAT-TOKEN*   "...")
  (setq *LC-HWID*         "...")
  (setq *LC-API-ENDPOINT* "...")
  ; Fase 3 — inyectado por servidor:
  ; (setq *LC-PLATFORM-ID*  "ACAD")
  ; (setq *LC-PLATFORM-MAP* '(("palette" . "https://...") ...))
  ; [core_engine.lsp code here]
)
```

### INDEX Request
```
GET /getRoutine?token={TOKEN}&hwId={HWID}&routine=INDEX
```

### INDEX Response (JSON)
```json
[
  {
    "name": "TMD_AUDIT",
    "friendly": "Auditoría de Dibujo",
    "desc": "Descripción del comando",
    "group": "Suite Name - Tools",
    "svgIcon": "<svg>...</svg>",
    "disabled": false
  }
]
```

### JIT Command Request
```
GET /getRoutine?token={TOKEN}&hwId={HWID}&lispId={COMMAND_NAME}
```
**Response:** LISP code string listo para `eval()`

---

## Modelo de Datos (Firestore)

```
users/{userId}
  apiKey: string
  email: string
  maxSeats: number
  ├── devices/{hwId}
  │     globalLinked: boolean
  │     lastActive: timestamp

subscriptions/{subId}
  tenantId: string  (userId)
  suiteId: string | null
  isGlobal: boolean
  isAutoAssignable: boolean
  purchasedSeats: number
  assignedDevices: string[]

lispFiles/{fileId}
  tenantId: string
  lispId: string
  suiteIds: string[]
  group: string

commands/{cmdId}
  lispFileId: string
  commandName: string
  friendlyName: string
  description: string
  svgIcon: string
```

---

## Notas Técnicas Importantes

| Tema | Nota |
|------|------|
| `vl-catch-all-apply` con 0 args | Siempre pasar `'()` como segundo arg aunque no haya parámetros |
| `USERS1` setvar | Canal de comunicación de estado JIT entre LISP y el entorno — mantener compatibilidad |
| `vl-bb-set/ref` | Blackboard de AutoCAD: comparte estado entre documentos de la sesión |
| `vla-sendcommand` | Lanza comandos de forma async — cuidado con orden de operaciones en asset engine |
| `_.WEBLOAD` | Comando ACAD-específico para ejecutar JS en paletas — necesita wrapper en Fase 3 |
| `MSXML2.XMLHTTP.6.0` | COM object para HTTP — siempre intentar 6.0 primero, fallback a MSXML2.XMLHTTP |

---

## Roadmap

| Fase | Descripción | Estado |
|------|-------------|--------|
| Fase 1 | Documentación arquitectónica | ✅ Completa |
| Fase 2 | Refactor Core Engine (modularización, HTTP layer, Palette Engine genérico) | ✅ Completa (Local) |
| Fase 3 | Multi-plataforma (loader detecta platform ID, servidor inyecta *LC-PLATFORM-MAP*) | 🔲 Futura |
| Fase 4 | Standards Palette (frontend + LISP handler + Firestore standards collection) | 🔲 Futura |

---

## Problemas Conocidos (Core Engine actual)

| # | Descripción | Solución en Fase 2 |
|---|-------------|-------------------|
| 1 | XMLHTTP instanciado 3 veces en 3 funciones distintas | ✅ `LC:http-get` unificado |
| 2 | URLs de paleta hardcodeadas | ✅ `LC:get-palette-url` preparado |
| 3 | `c:LC_PALETTE` se abre automáticamente al cargar (no es JIT real) | ✅ Eliminado del init |
| 4 | `c:LC_PALETTE` y `c:LC_RESOURCES` tienen 80% código duplicado | ✅ `LC:open-palette` genérico implementado |
| 5 | `c:LC_PROPERTIES` tiene HTML dummy hardcodeado | ✅ Integrado con URL dummy como fallback |
| 6 | Aliases hardcodeados por idioma | Configurables server-side en Fase 3 |
| 7 | `LC:b64-decode` definido pero sin uso activo | ✅ Eliminado de la base de código |
| 8 | Sin soporte multi-plataforma CAD | Fase 3 |

---

## 🔮 Sugerencias Arquitectónicas Futuras (Fase 5+)

Para simplificar el mantenimiento y hacer que la base de código sea escalable a largo plazo, se recomienda evaluar las siguientes estandarizaciones:

### 1. Estandarización de llamadas al API (Backend)
**Contexto actual:** Tenemos 3 lógicas de llamadas: `GET /getRoutine?routine=INDEX`, `GET /getRoutine?lispId=...`, y `POST /uploadDraft` dispersas en diferentes URLs de Cloud Functions.
**Recomendación:** Migrar a un enrutador único RESTful estilo Express.js dentro de la función Cloud, manejando todo como endpoints ordenados:
- `POST /api/v1/commands/index`
- `POST /api/v1/commands/load`
- `POST /api/v1/standards/draft`
**Por qué:** Mejora inmensamente la seguridad, facilita agregar nuevos servicios (ej. estadísticas) y permite compartir lógica de autenticación (middlewares de tokens) en el backend de forma elegante.

### 2. Estandarización de Endpoints de Paletas (Frontend)
**Contexto actual:** Cada paleta apunta a una ruta separada en la app de Firebase Hosting (`/palette`, `/resource-palette`, `/standards-palette`).
**Recomendación:** Consolidar la interfaz web (Astro/React/Vite) en una **Single Page Application (SPA)** usando parámetros de ruta (query params o hash):
- `https://lispcentral.web.app/ui?view=commands`
- `https://lispcentral.web.app/ui?view=resources`
- `https://lispcentral.web.app/ui?view=standards`
**Por qué:** Reduce drásticamente el tamaño del build de Astro/React, promueve la reutilización completa de componentes UI (como el framework de paletas base) y permite al frontend precargar módulos antes de que el usuario haga clic. La función `LC:get-palette-url` ya está lista para adoptar este cambio con modificar una sola línea de código en LISP.
