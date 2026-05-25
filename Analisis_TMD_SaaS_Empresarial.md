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

### A. Paradigma "Headless LISP" (Backend Puro)
El código AutoLISP (`TMD_`) debe convertirse en una API RESTful local dentro de la RAM de AutoCAD.
*   **Nada de Consola:** Remover todos los `getstring`, `getreal`.
*   **Entrada JSON:** Las funciones maestras recibirán un string JSON desde el JavaScript de la paleta.
    *   *Ejemplo de flujo:* `Acad.Editor.executeCommand("LC_API_BUILD '{\"cmd\": \"viga\", \"perfil\": \"W12x26\", \"p1\": [0,0,0], \"p2\": [1000,0,0]}' ")`
*   El LISP parsea el JSON (existe código LISP para leer JSON), dibuja el sólido 3D y devuelve un JSON de éxito o error.

### B. Catálogos Vivos (Cloud-First)
*   Eliminar `catalogo_metal.csv` de los archivos LISP.
*   Al abrir LispCentral en AutoCAD, la paleta web se conecta a **Firebase Firestore**. Se descarga la caché de perfiles en el frontend (Navegador Chromium de AutoCAD).
*   Cuando el usuario elige un perfil y dibuja, el JS inyecta las dimensiones exactas (`Dim_X`, `Dim_Y`, `Espesor`) directamente en el LISP a través del JSON. El LISP ya no necesita saber de catálogos, solo recibe números para extruir Sólidos 3D. ¡Separación total de responsabilidades!

### C. Telemetría y Crash Analytics
*   Implementar un bloque `vl-catch-all-apply` alrededor de **todas** las funciones de construcción crítica (`TMD:viga-build-geom`, `TMD_FACE_CUT`).
*   Si ocurre un error (ej. intersección booleana fallida), el LISP devuelve un JSON de error al JavaScript: `{"status":"error", "code": 501, "msg": "Boolean Subtraction Failed"}`.
*   El JavaScript atrapa esto y lo envía silenciosamente a **Sentry** o **Google Analytics/Firebase Crashlytics**. Tú como administrador verás: *"15 usuarios fallaron al intentar cortar vigas W12 en ángulo de 45°"*. Podrás arreglar el LISP y empujarlo a la nube al instante.

### D. Firmas Criptográficas en LDATA (Anti-Piratería y Anti-Corrupción)
*   Cuando `TMD_Vigas` inyecte el LDATA al 3DSOLID, el JS de la paleta web generará un *Hash MD5/SHA* de los parámetros usando el *User Token* temporal del usuario.
*   Ese *Hash* se guarda en el LDATA.
*   Cuando se ejecuta `TMD_SYNC` o `TMD_BOM`, el LISP verifica el *Hash*. Si el usuario copió el sólido de otro dibujo o manipuló el LDATA a mano, el *Hash* no coincidirá y el sólido se marca como "No Verificado" o en color rojo. Esto protege el modelo BIM.

---

## 3. Resumen del Flujo Enterprise
1. **Astrid (Compilador Cloud):** Ofusca los `.lsp`, les inyecta un *Token de Sesión* dinámico y los sirve a la RAM.
2. **Paleta Web (Frontend):** Controla UI, descarga catálogos de Firebase, emite métricas y manda JSON estructurado.
3. **LispCentral Core (Backend LISP):** Recibe JSON, calcula geometría matemática O(N), dibuja sólidos 3D con API nativa, y asegura LDATA con firmas hash.