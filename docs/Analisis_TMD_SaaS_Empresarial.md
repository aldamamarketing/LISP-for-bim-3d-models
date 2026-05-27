# 🚀 Análisis y Propuesta: LispCentral como SaaS de Grado Empresarial (Suite 3D & Visual)

Tras analizar el estado actual de los archivos `TMD_` (ej. `TMD_Vigas.lsp`, `TMD_Wires.lsp`, `TMD_BUILD.lsp`), se evidencia una evolución notable hacia la arquitectura V5 (Sólidos 3D independientes + LDATA). Sin embargo, el código actual todavía retiene patrones heredados de un uso "local/escritorio" que deben ser refactorizados para sobrevivir y escalar en un ecosistema SaaS en la nube con miles de usuarios concurrentes.

A continuación, presento una crítica constructiva como Ingeniero de Software y la propuesta para elevar la plataforma a **Grado Empresarial**.

---

## 🛑 1. Crítica del Estado Actual (TMD_ Suite)

### A. Dependencia de Archivos Locales (El Cuello de Botella SaaS)
*   **Problema:** En `TMD_Vigas.lsp`, la función `TMD:viga-load-catalog` busca desesperadamente un archivo físico `catalogo_metal.csv` en múltiples directorios locales (`findfile`, `DWGPREFIX`, etc.).
*   **Por qué es malo para SaaS:** En un modelo de suscripción, los catálogos son tu propiedad intelectual y tu principal valor de actualización. Si los usuarios descargan el `.csv` localmente, pierdes control, se desincronizan las versiones, y permites la piratería de tus bases de datos de materiales.

### B. Lógica de UI vs Lógica de Motor (Acoplamiento)
*   **Problema:** Los scripts LISP mezclan la matemática de generación de geometría 3D con inputs de usuario por consola (`getpoint`, `getkword`) dentro de las mismas funciones.
*   **Por qué es malo para SaaS:** Al migrar a HTML5, la consola de AutoCAD debe quedar obsoleta para inputs. El servidor envía los parámetros; el LISP solo debe ejecutar (es un *Backend/API*). El acoplamiento actual hace difícil que la paleta web controle la creación geométrica de forma limpia.

### C. Manejo de Errores Silencioso (Falta de Telemetría)
*   **Problema:** Si `j2:cyl` o una operación booleana falla al construir una viga, el LISP simplemente aborta o devuelve `nil` con un `princ` en consola.
*   **Por qué es malo para SaaS:** Si LispCentral falla en la máquina de un ingeniero en Chile, tú en el servidor no te enteras. No hay rastreo de bugs.

### D. Seguridad de Memoria en LDATA
*   **Problema:** El LDATA se escribe en formato de listas abiertas y claves de texto plano.
*   **Por qué es malo para SaaS:** Si un usuario abre el inspector de AutoCAD, puede alterar el LDATA manualmente, corrompiendo la sincronización (SYNC) o evadiendo validaciones de suscripción.

---

## 🛠️ 2. Propuesta Arquitectónica Grado Empresarial

Para que LispCentral sea el estándar de la industria (tipo Revit/Tekla pero en CAD web), propongo el siguiente enfoque arquitectónico estricto:

### A. Enriquecimiento del Flujo Natural (Cloud Delivery)
El código AutoLISP (`TMD_`) seguirá interactuando orgánicamente con el usuario a través de la CLI nativa de AutoCAD, porque esa es la fuente principal de interacción del usuario.
*   **Entrega Transparente:** La nube (Firebase) sirve comandos, rutinas completas, bloques dinámicos y paletas. El usuario final usa la consola de AutoCAD normalmente sin preocuparse de instalaciones.
*   **Múltiples Interfaces:** No estamos limitados a una sola paleta web. Podemos generar Ribbons y Paletas especializadas para cada suite, integrándose al ecosistema sin reemplazar la consola.

### B. Catálogos Vivos (Cloud-First)
*   Eliminar `catalogo_metal.csv` de los archivos LISP.
*   Al abrir LispCentral en AutoCAD, la paleta web se conecta a **Firebase Firestore**. Se descarga la caché de perfiles en el frontend (Navegador Chromium de AutoCAD).
*   Cuando el usuario elige un perfil y dibuja, el JS inyecta las dimensiones exactas (`Dim_X`, `Dim_Y`, `Espesor`) directamente en el LISP a través del JSON. El LISP ya no necesita saber de catálogos, solo recibe números para extruir Sólidos 3D. ¡Separación total de responsabilidades!

### C. Telemetría y Crash Analytics
*   Implementar un bloque `vl-catch-all-apply` alrededor de **todas** las funciones de construcción crítica (`TMD:viga-build-geom`, `TMD_FACE_CUT`).
*   Si ocurre un error (ej. intersección booleana fallida), el LISP devuelve un JSON de error al JavaScript: `{"status":"error", "code": 501, "msg": "Boolean Subtraction Failed"}`.
*   El JavaScript atrapa esto y lo envía silenciosamente a **Sentry** o **Google Analytics/Firebase Crashlytics**. Tú como administrador verás: *"15 usuarios fallaron al intentar cortar vigas W12 en ángulo de 45°"*. Podrás arreglar el LISP y empujarlo a la nube al instante.

### D. Protección y Gestión de LDATA
*   El LDATA seguirá en **texto plano** en esta etapa del MVP. Su propósito principal es permitir que nuestras propias funciones reconstruyan, editen e identifiquen las geometrías.
*   En etapas muy avanzadas se evaluará ofuscación o encriptación, pero por ahora se prioriza la facilidad de inspección forense local (`TMD_PROPERTIES` y `TMD_FORENSIC`).

---

## 3. Resumen del Flujo Enterprise
1. **Astrid (Compilador Cloud):** Ofusca los `.lsp`, les inyecta credenciales y los sirve a la RAM.
2. **Interfaces Web (Paletas/Ribbons):** Controlan UI rica, descargan catálogos de Firebase y complementan la CLI de AutoCAD.
3. **LispCentral Core:** Ejecuta comandos nativamente (CLI interactiva), calcula geometría, y guarda LDATA para persistencia BIM.

---

## 🏢 4. El Pivote Estratégico: Arquitectura Multi-Tenant (B2C a B2B)
La plataforma ha evolucionado para no solo servir nuestras propias herramientas (TM Digital), sino convertirse en la infraestructura en la nube para cualquier empresa de ingeniería.

### Qué haremos:
1.  **Fase 1 (Dogfooding B2C):** Lanzaremos usando la infraestructura Multi-Tenant, pero nosotros ("TM Digital") seremos el único Tenant. Las rutinas se descargarán desde nuestro bucket protegido en Firebase y validaremos la suscripción.
2.  **Fase 2 (Apertura B2B):** Abriremos el panel para que CAD Managers creen sus cuentas, suban sus propios LISPs a su bucket privado y generen "Seat Tokens" para sus dibujantes.

### Cómo lo haremos (Directrices Técnicas):
*   **Firebase Firestore como Core:** Reemplazará la lógica estática. Cada petición de LISP valida: *¿El token es válido? ¿Pertenece a un usuario activo? ¿Qué Tenant_ID tiene? ¿Tiene permiso de acceder a este lisp_id?*
*   **Identificadores Semánticos:** Usaremos siempre slugs legibles en Firestore (`tenant_tmdigital`, `lisp_viga_mvp`, `user_carlos`). Nada de strings aleatorios inmanejables.
*   **Cloud Storage Encriptado:** Los LISPs de las empresas se suben a Firebase Storage.

### Por qué lo haremos (Decisiones Críticas):
*   **Seguridad Online-Only (Zero-Offline):** Hemos descartado el acceso Offline mediante JWT locales para la fase inicial. **¿Por qué?** El riesgo de fuga de código (IP) es inaceptable en esta etapa temprana. Todo comando exigirá ping al servidor para asegurar control total de vida/muerte sobre la llave de acceso.
*   **Base de datos Multi-Tenant desde el inicio:** **¿Por qué?** Previene tener que reescribir toda la aplicación (Back y Front) cuando pasemos de vender nuestro LISP a vender la Plataforma. Un dibujante independiente simplemente es un Tenant con un solo asiento.