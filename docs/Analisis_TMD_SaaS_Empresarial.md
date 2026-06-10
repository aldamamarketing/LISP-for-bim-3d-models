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
2.  **Fase 2 (Apertura B2B - Uso Propio):** Abriremos el panel para que CAD Managers creen sus cuentas, suban sus propios LISPs a su bucket privado y gestionen a sus dibujantes mediante un Pool Centralizado de Dispositivos (HWIDs).
3.  **Fase 3 (El Marketplace y Entitlements):** Expandiremos a un ecosistema donde los Tenants pueden vender sus Suites a otros Tenants. Se elimina la limitación global de `maxSeats` a favor de **Licencias Granulares por Suite** (Entitlements). Cada compra dictará cuántos asientos se poseen de ese producto específico, y el CAD Manager asignará qué PC específica tiene acceso a cada Suite comprada. (Ver `docs/Reglas_Negocio_Marketplace_B2B.md` para reglas completas).

### Cómo lo haremos (Directrices Técnicas):
*   **Firebase Firestore como Core de Licencias:** Reemplazará la lógica estática. Cada petición de LISP valida contra una colección global de `licenses` (Entitlements): *¿El token es válido? ¿El hardware de este empleado está asignado a la licencia de esta Suite específica?*
*   **Ejecución Cruzada (Cross-Tenant):** El backend ya no restringe la lectura al propio `tenantId`. Si un cliente compró una Suite, el backend irá al Storage del creador para descargar y servir el LISP de forma segura al comprador.
*   **Identificadores Semánticos:** Usaremos siempre slugs legibles en Firestore (`tenant_tmdigital`, `lisp_viga_mvp`, `user_carlos`). Nada de strings aleatorios inmanejables.
*   **Cloud Storage Encriptado:** Los LISPs de las empresas se suben a Firebase Storage.

### Por qué lo haremos (Decisiones Críticas):
*   **Seguridad Online-Only (Zero-Offline):** Hemos descartado el acceso Offline mediante JWT locales para la fase inicial. **¿Por qué?** El riesgo de fuga de código (IP) es inaceptable en esta etapa temprana. Todo comando exigirá ping al servidor para asegurar control total de vida/muerte sobre la llave de acceso.
*   **Base de datos basada en Entitlements (Licencias):** **¿Por qué?** Previene tener que reescribir la aplicación. El modelo de "pagar por toda tu empresa" no escala. El modelo donde "cada Suite se licencia y asigna individualmente a las máquinas de tu empresa" es el estándar moderno en plugins BIM.

### E. Arquitectura Zero-Disk JIT (Dynamic Handshake y Ghost Commands)
El núcleo del SaaS se basa en una inicialización invisible y de latencia cero, evitando cualquier escritura en el disco del usuario (Zero-Disk) y protegiendo el código fuente.
1. **Handshake Silencioso:** Al iniciar AutoCAD, el Loader nativo hace un HTTP Request ligero (`?routine=INDEX`) que retorna el índice de comandos a los que el usuario tiene acceso según su suscripción.
2. **Inyección de "Ghost Commands":** El Loader parsea el índice y registra instantáneamente en la RAM "Fantasmas" de cada rutina. Esto le enseña a AutoCAD la existencia del comando, permitiendo el **Autocompletado Nativo** en la consola, pero sin descargar el código fuente.
3. **Lazy Execution (JIT):** Cuando el usuario ejecuta un comando fantasma (ya sea tecleándolo o haciendo clic en la Paleta Web), el Fantasma intercepta la acción, descarga el archivo real `.lsp` minificado, lo inyecta en RAM sobrescribiéndose a sí mismo, y finalmente lo evalúa.
4. **Sincronización en Caliente:** Un comando nativo (`LC_SYNC`) permite rehacer el Handshake, inyectando nuevos Ghost Commands en tiempo real si el administrador web asignó nuevas rutinas a la cuenta, todo sin necesidad de reiniciar AutoCAD ni bajar actualizaciones de software.

---

## 5. Mejores Prácticas y Manejo de Dependencias LISP

Para alinear el código heredado o de terceros a la nueva arquitectura SaaS y aprovechar la carga JIT (Just-In-Time) sin romper el entorno, los desarrolladores (y usuarios del Portal) deben seguir estas reglas:

### 1. Centralización de Archivos Lógicos
La arquitectura asume que si AutoCAD descarga un comando (por ejemplo, `c:TMD_VIGA`), dicho archivo contiene todo lo necesario para ejecutar la viga. Puedes tener 50 comandos en el mismo archivo `TMD_Estructuras.lsp`; al llamar a uno, todo el paquete de 50 comandos quedará cargado y disponible localmente de forma instantánea.

### 2. Librerías y Dependencias (LC:Require)
En la programación modular, es común que un LISP principal dependa de un LISP auxiliar (por ejemplo, `TMD_Math.lsp`). Como AutoCAD no dispara un "Unknown Command" si falla una función auxiliar interna, el desarrollador **DEBE** declarar explícitamente la dependencia en la parte superior del archivo usando nuestra directiva nativa `LC:Require`:

```lisp
;; TMD_Align.lsp
(LC:Require "TMD_Math") ; Descarga y carga en RAM la librería silenciosamente si no existe

(defun c:TMD_AL_C ()
  (tmd:calcular_brecha 10 5) ; Función interna de TMD_Math
  (princ "\\nComando ejecutado con éxito")
)
```

### 3. Asignación de Permisos de Suite (Regla de Oro B2B)
Para que `LC:Require "TMD_Math"` funcione, tanto el archivo principal (`TMD_Align.lsp`) como el archivo de la librería (`TMD_Math.lsp`) **DEBEN** pertenecer a la misma Suite en LispCentral. Esto asegura que la validación DRM en el servidor apruebe ambas descargas bajo el mismo *Entitlement* (suscripción) del usuario final, sin generar errores de "Acceso Denegado" a mitad de la ejecución de AutoCAD.