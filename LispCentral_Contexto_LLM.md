# LispCentral — Contexto Técnico para LLM

**Propósito:** consolidar los puntos críticos, hallazgos, decisiones, riesgos, hipótesis y líneas de evolución discutidas durante la auditoría del modelo SaaS/marketplace de LispCentral.

**Uso recomendado:** servir como contexto base para futuras conversaciones con un LLM, desarrolladores, arquitectos de software o auditores de seguridad.

**Fecha de consolidación:** 25/08/2026.

---

## 1. Resumen ejecutivo

LispCentral es concebido como un **repositorio/marketplace de AutoLISP en la nube**, donde un autor/desarrollador sube un LISP, LispCentral administra licencias y asientos, otros usuarios alquilan o suscriben el uso de ese LISP y el código se ejecuta dentro de AutoCAD para actuar sobre el DWG abierto.

El objetivo comercial es permitir distribución controlada sin entregar de forma trivial el código fuente al arrendatario.

La arquitectura actual utiliza un **loader AutoLISP** que se conecta a una Cloud Function, descarga código LISP en texto y lo ejecuta mediante `read` + `eval`.

Durante la auditoría se demostró que un usuario autorizado puede **interceptar y guardar el código recibido por el servidor sin ejecutarlo**, incluso sin modificar AutoCAD, reproduciendo la misma solicitud HTTPS mediante PowerShell.

Conclusión principal:

> Si LispCentral entrega AutoLISP en texto al equipo del usuario para que AutoCAD lo ejecute localmente, el usuario puede, con suficiente control sobre su PC, capturar ese texto. Ejecutar “solo en memoria” no protege el código fuente frente a un usuario que controla la máquina cliente.

El modelo de negocio no queda invalidado. Existen estrategias para elevar significativamente la protección: compilación/paquetización local, sesiones efímeras, firma e integridad de payloads, watermarking, rate limiting, auditoría, separación entre rutinas cloud/híbridas/locales, ejecución headless para rutinas compatibles y análisis/sandbox de LISP subidos por terceros.

---

## 2. Modelo de negocio de LispCentral

### 2.1. Concepto principal

LispCentral funciona como un **marketplace/repo SaaS de automatizaciones AutoCAD**.

### Autor / desarrollador

- crea un `.lsp`;
- lo sube a LispCentral;
- define disponibilidad, versión y esquema de renta/licencia;
- espera que LispCentral proteja razonablemente su propiedad intelectual.

### Arrendatario / usuario final

- paga o recibe permiso de uso;
- ejecuta los comandos dentro de AutoCAD;
- no debería recibir de forma trivial el código fuente original.

### LispCentral

- almacena los LISP;
- gestiona cuentas, licencias, asientos y HWID;
- entrega o ejecuta las rutinas autorizadas;
- mantiene catálogo, INDEX, módulos y actualizaciones;
- debe proteger tanto al autor como al usuario final.

---

## 3. Arquitectura actual observada

```text
AutoCAD del cliente
    |
    | APPLOAD
    v
LC_Loader.lsp
    |
    | GET HTTPS
    v
Cloud Function / getRoutine
    |
    | devuelve AutoLISP en texto
    v
responseText
    |
    | read
    v
expresión LISP
    |
    | eval
    v
AutoCAD ejecuta el código
```

El loader obtiene `COMPUTERNAME` y `USERNAME`, los combina en un HWID lógico del tipo `COMPUTERNAME@USERNAME`, utiliza una key/token de licencia y solicita la rutina `BOOT`.

Patrón crítico observado:

```lisp
(eval (read response))
```

Esto convierte la respuesta del servidor en código AutoLISP ejecutable.

---

## 4. Hallazgo crítico: exposición del código remoto

Se detectó que el cliente controla el loader y puede sustituir:

```lisp
(eval (read response))
```

por lógica que guarde `responseText` en disco.

Eso permite capturar el código antes de su ejecución.

Luego se demostró algo aún más importante: no hace falta modificar el loader. Un usuario autorizado puede reproducir la petición HTTPS desde PowerShell, pasando una key válida, HWID autorizado y `routine=BOOT`, y recibir el contenido AutoLISP completo.

Resultado observado:

- HTTP `200 OK`;
- respuesta `text/plain`;
- contenido aproximado: 31 KB;
- el body comenzaba con una expresión AutoLISP `(progn ...)`;
- incluía variables de sesión, endpoint y motor JIT.

Por seguridad, este documento **no reproduce ninguna key real**.

---

## 5. Significado de “ejecutar en memoria”

La arquitectura afirmaba que el código se ejecutaba en memoria y no necesariamente se guardaba en disco.

Eso puede ser operacionalmente cierto, pero **no es una protección fuerte de propiedad intelectual**.

```text
Servidor
  ↓
texto LISP
  ↓
RAM del cliente
  ↓
read/eval
```

Antes de `eval`, el código ya existe como texto en la memoria controlada por el cliente.

Un usuario con control de su PC puede interceptar la respuesta HTTP, modificar el loader, usar PowerShell/cURL, inspeccionar variables, instrumentar el proceso, analizar tráfico o guardar el contenido.

> “No escribir en disco” reduce rastros operativos, pero no impide la extracción del source.

---

## 6. Análisis del BOOT capturado

Se analizó el archivo `LispCentral_BOOT_capture.lsp` recibido del servidor.

### 6.1. Datos incrustados

El BOOT define variables globales con token/licencia de sesión o asiento, HWID y endpoint principal de API.

La credencial queda disponible en el proceso AutoCAD y puede aparecer también en URLs o componentes auxiliares.

### 6.2. Motor JIT

El BOOT implementa carga remota bajo demanda:

```text
usuario ejecuta comando
    ↓
ghost command / registro dinámico
    ↓
LC:run-or-load
    ↓
GET de rutina remota
    ↓
responseText
    ↓
read + eval
```

La arquitectura incluye INDEX remoto, registro dinámico de comandos, descarga de paquetes/rutinas por identificador y ejecución bajo demanda.

Esto implica que el BOOT no solo expone su propio código, sino también **el mecanismo para descubrir y solicitar otras rutinas autorizadas**.

### 6.3. Componentes identificados

El BOOT incluía conceptos/módulos equivalentes a:

- JIT Engine;
- INDEX & Ghost Registration;
- Asset Engine;
- Palette Engine;
- Standards Engine;
- Event Hub / Reactors;
- HTTP GET/POST;
- carga de assets temporales.

### 6.4. Archivos temporales

Se observaron usos legítimos de `%TEMP%`, incluyendo PAT, LIN, HTML de paleta, JavaScript auxiliar y assets de interfaz.

No se observó en el BOOT analizado comportamiento explícitamente malicioso como borrado arbitrario de archivos, PowerShell, CMD, modificación del Registro de Windows, persistencia maliciosa, ransomware o robo directo de documentos.

---

## 7. Errores técnicos detectados

### 7.1. Manejo incorrecto de errores de red

Se utilizaban llamadas con `vl-catch-all-apply`, pero el resultado de `open`/`send` no era inspeccionado correctamente.

Consecuencia: errores de COM/WinHTTP podían terminar interpretándose como si fueran HTTP status. Se observó `12029`, que no es un HTTP status sino un error de conectividad/Windows.

**Solución recomendada:** separar claramente error de transporte, status HTTP, body, excepción COM y timeout. Diseñar una respuesta interna estructurada con campos equivalentes a `network_error`, `http_status`, `response_body` y `success`.

### 7.2. Inconsistencia entre XMLHTTP y WinHTTP

El loader/GET utilizaba `MSXML2.XMLHTTP.6.0`, mientras otras partes usaban `WinHttp.WinHttpRequest.5.1`.

Durante la prueba:

- `XMLHTTP` falló en una PC;
- `ServerXMLHTTP` también falló;
- PowerShell funcionó;
- DNS y TCP 443 funcionaron;
- el backend respondió correctamente.

Esto sugiere incompatibilidad o comportamiento específico de la pila COM/MSXML del entorno AutoCAD/Windows de esa PC.

**Solución recomendada:** evaluar la unificación de la capa HTTP usando WinHTTP u otra estrategia más robusta y con diagnóstico consistente.

### 7.3. URL encoding incompleto

La rutina de URL encoding observada solo trataba correctamente espacios.

Esto puede romper parámetros que contengan `&`, `+`, `%`, `?`, `=`, `#`, caracteres Unicode u otros símbolos.

**Solución recomendada:** implementar percent-encoding real y consistente para todos los parámetros.

### 7.4. Rutinas marcadas como cargadas aunque la carga falle

En funciones equivalentes a `LC:run-or-load` / `LC:Require`, se detectó un patrón donde el identificador de rutina podía agregarse a la lista de “loaded” aunque `LC:load-remote-routine` hubiese fallado.

**Riesgo:** estado inconsistente; LispCentral cree que la rutina está cargada aunque la descarga/evaluación falló.

**Solución recomendada:** actualizar `*LC-LOADED-ROUTINES*` solo si la carga devuelve éxito explícito.

### 7.5. Credenciales permanentes expuestas en cliente

Una key reutilizable aparece en loader, variables LISP, URLs y solicitudes.

**Solución recomendada:** key maestra solo para bootstrap/autenticación, token de sesión efímero, expiración corta, scopes, binding a usuario/asiento/HWID, rotación y revocación.

---

## 8. Incidente de conectividad diagnosticado

Una PC nueva presentaba `HTTP Status: 12029` y error COM indicando que no podía establecer conexión.

Pruebas desde PowerShell en la misma PC:

- DNS: OK;
- endpoint resolvía IPv4/IPv6;
- TCP 443: OK;
- `Invoke-WebRequest` al endpoint: llegó correctamente al backend;
- sin key, el backend respondió “API Key faltante”;
- con key + HWID autorizado + `routine=BOOT`, devolvió `200 OK`.

**Conclusión:** backend, DNS, TLS general e Internet estaban funcionando. El problema estaba en el mecanismo HTTP usado desde AutoCAD/MSXML en ese equipo.

---

## 9. Licencias y asientos

El panel mostraba un esquema de equipos/asientos vinculados.

Comportamiento esperado:

```text
token válido
    +
HWID
    +
asiento disponible
    ↓
registrar/vincular equipo
    ↓
autorizar rutina
```

El loader construye el HWID usando `COMPUTERNAME` + `USERNAME`.

Debe tratarse como un identificador lógico, no necesariamente como identidad criptográfica fuerte.

Recomendaciones:

- distinguir device identifier de device trust;
- usar tokens de sesión;
- permitir revocación;
- registrar fecha/hora;
- controlar límite de asientos;
- agregar telemetría de anomalías;
- evitar que el HWID sea el único factor de autorización.

---

## 10. Escala práctica de protección discutida

Escala conceptual de 1 a 10, donde 10 sería prácticamente imposible de extraer/reverse-engineer.

> 10/10 real no existe para código que debe ejecutarse localmente en una máquina controlada por el usuario.

| Modelo | Protección práctica aproximada |
|---|---:|
| `.LSP` entregado en texto | 1/10 |
| LISP remoto + `eval` en texto | 3/10 |
| LISP ofuscado/minificado | 4/10 |
| FAS/VLX compilado + ofuscación | 5–6/10 |
| Plugin .NET compilado + ofuscación/licencia | 6–7/10 |
| C++ / ObjectARX + anti-tamper/licencia | 7–8/10 |
| Arquitectura híbrida con lógica sensible server-side | 8/10 |
| Código crítico casi totalmente server-side | 9/10 |
| Código secreto local imposible de extraer | 10/10: no realista |

Evaluación actual de LispCentral en protección de IP: aproximadamente **3/10**.

Objetivo comercial realista: **7–8/10**.

---

## 11. Restricción fundamental: el LISP debe interactuar con AutoCAD

Muchas rutinas AutoLISP necesitan ejecutarse dentro del AutoCAD del cliente para modificar el DWG abierto, interactuar con selección, entidades, comandos, ActiveX, UI, reactors, etc.

Ejemplos:

- `ssget`;
- `entsel`;
- `getpoint`;
- `entget`;
- `entmod`;
- `entmake`;
- `command`;
- `vla-*`;
- `vlax-*`;
- reactors;
- DCL;
- interacción con documento activo.

Por lo tanto, **no es posible simplemente ejecutar todo el LISP en un servidor remoto y esperar que modifique en tiempo real el DWG abierto en otra PC**, salvo que exista un componente local que transmita estado y aplique resultados.

---

## 12. Ejecución server-side: Autodesk APS / Automation

Se discutió Autodesk Platform Services / Automation para AutoCAD como vía de ejecución en cloud.

Modelo conceptual:

```text
DWG + parámetros
    ↓
Automation en cloud
    ↓
AutoCAD engine headless
    ↓
ejecuta rutina compatible
    ↓
genera DWG/resultado
    ↓
cliente recibe resultado
```

Esto puede proteger mucho mejor el source porque el LISP no necesita ser enviado al arrendatario.

Limitaciones:

- no equivale a controlar el AutoCAD interactivo del cliente;
- muchas rutinas interactivas requieren adaptación;
- DCL, UI, interacción con clicks y algunos componentes COM/ActiveX pueden no funcionar igual en headless;
- debe validarse contra documentación oficial y pruebas de compatibilidad antes de diseñar el producto alrededor de esta opción.

---

## 13. Clasificación propuesta de rutinas del marketplace

### Clase A — Cloud compatible

Características:

- acepta DWG + parámetros;
- procesa automáticamente;
- no requiere interacción humana durante ejecución;
- devuelve DWG o resultado.

Ejemplos: auditoría, limpieza de DWG, normalización, batch processing, generación automática, actualización masiva de bloques, extracción y estándares.

Protección potencial: alta, aproximadamente 8–9/10.

### Clase B — Híbrida

Características:

- el usuario interactúa localmente;
- el cliente recoge selección/parámetros;
- envía datos al servidor;
- el servidor realiza el cálculo/algoritmo valioso;
- el cliente aplica el resultado al DWG.

```text
AutoCAD
  ↓
selección/datos
  ↓
LispCentral client
  ↓
Cloud
  ↓
cálculo
  ↓
resultado
  ↓
cliente modifica DWG
```

Protección potencial: 7–9/10 según diseño.

### Clase C — Local/interactiva

Características:

- requiere interacción constante;
- depende del documento activo;
- usa UI, DCL, ActiveX, reactors o estado de sesión;
- no es razonable trasladarla a cloud.

Protección recomendada:

- compilar/empaquetar;
- no entregar `.lsp` textual;
- usar FAS/VLX o cliente más protegido;
- licencias y sesiones;
- watermarking.

Protección aproximada: 5–7/10.

---

## 14. Arquitectura propuesta para LispCentral v2

```text
                       AUTOR
                         |
                    upload LISP
                         |
                         v
                LISPCENTRAL CLOUD
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
  Security Scan      Validation        Build
        |                |                |
        +----------------+----------------+
                         |
                     Source Vault
                         |
                    Marketplace
                         |
             +-----------+-----------+
             |                       |
             v                       v
        CLOUD MODE              LOCAL MODE
             |                       |
       Automation/APS          paquete compilado
             |                 FAS/VLX/.NET/etc.
             |                       |
             v                       v
       resultado/DWG            AutoCAD cliente
```

---

## 15. Pipeline recomendado para autores

```text
UPLOAD
  ↓
guardar source privado
  ↓
análisis estático
  ↓
validación de dependencias
  ↓
compatibilidad AutoCAD
  ↓
clasificación Cloud / Hybrid / Local
  ↓
build/compilación si aplica
  ↓
firma
  ↓
publicación
```

El source original debe permanecer en un **Source Vault** y no entregarse directamente a arrendatarios.

---

## 16. FAS/VLX como protección local

Para rutinas que deban ejecutarse localmente:

```text
autor sube .lsp
    ↓
LispCentral conserva source
    ↓
compila
    ↓
entrega .fas / .vlx
```

Ventajas:

- elimina la extracción trivial del source textual mediante una simple petición HTTP;
- el usuario recibe un artefacto compilado;
- aumenta el coste de reverse engineering.

Limitaciones:

- no es protección absoluta;
- sigue siendo código ejecutado en una máquina controlada por el usuario;
- hay que gestionar compatibilidad de AutoCAD, LISPSYS, Unicode, dependencias y versión.

---

## 17. .NET / ObjectARX como capas futuras

Se consideró una evolución donde el runtime local de LispCentral pudiera ser .NET/C# o C++/ObjectARX.

Ventajas:

- mayor resistencia que LISP textual;
- mejor encapsulación de licencias, sesiones, firma, comunicación, anti-tamper e interfaz.

Limitaciones:

- .NET puede ser decompilado;
- C++ también puede ser reverse-engineered;
- aumenta complejidad y coste de mantenimiento;
- no reemplaza un buen modelo de autorización.

---

## 18. Watermarking

Se propuso individualizar el código/paquete entregado por usuario, licencia, asiento, HWID o sesión.

Objetivo:

- no impedir necesariamente la extracción;
- permitir atribuir una copia filtrada a una licencia específica;
- elevar el riesgo para quien redistribuye.

Ejemplo conceptual:

```text
cliente A -> build variante 8172
cliente B -> build variante 2951
cliente C -> build variante 6308
```

Debe implementarse sin alterar funcionalidad ni exponer el marcador de forma trivial.

---

## 19. Tokens efímeros y sesiones

Modelo actual problemático: key relativamente permanente, reutilizable y visible en cliente.

Modelo recomendado:

```text
LICENSE KEY
    ↓
bootstrap/login
    ↓
AUTH SERVER
    ↓
SESSION TOKEN
    ↓
API
```

El token de sesión debería incluir o estar asociado a:

- cuenta;
- asiento;
- HWID;
- scopes;
- suite;
- expiración;
- permisos.

Duración: corta, renovable y revocable.

Esto reduce el impacto de una credencial interceptada.

---

## 20. Firma vs cifrado

### Firma

Sirve para comprobar autenticidad, integridad y que el payload fue emitido por LispCentral.

No impide que el usuario lo lea.

### Cifrado

Oculta el payload durante tránsito/almacenamiento, pero si el cliente debe descifrarlo para ejecutar, el contenido descifrado estará disponible localmente.

**Conclusión:** firma y cifrado son capas útiles, pero no resuelven por sí solos la protección del source local.

---

## 21. Amenaza inversa: autores maliciosos

El marketplace no solo debe proteger al autor contra el arrendatario.

También debe proteger al arrendatario contra un autor malicioso.

```text
autor desconocido
    ↓
sube LISP
    ↓
LispCentral distribuye
    ↓
otro usuario lo ejecuta dentro de AutoCAD
```

Un LISP malicioso podría intentar acceder a archivos, abrir procesos, llamar COM, realizar conexiones, cargar módulos, modificar entorno o ejecutar código secundario.

LispCentral necesita un **Security Gate** antes de publicar.

---

## 22. Security Gate recomendado

### Análisis estático

Buscar usos sensibles como:

- `startapp`;
- shell o equivalentes;
- `vl-file-delete`;
- `load`;
- `eval`;
- `read` sobre contenido externo;
- COM/ActiveX;
- creación de procesos;
- red;
- escritura en ubicaciones sensibles;
- persistencia;
- acceso a sistema.

### Sandbox

Ejecutar el LISP en un entorno aislado con DWG de prueba, sistema de archivos controlado, red monitorizada, límites de tiempo, captura de llamadas y logs.

### Firma

Una vez aprobado: compilar/empaquetar, firmar y publicar.

---

## 23. Modos de protección visibles en el marketplace

### Cloud Protected

- el código no se entrega al usuario;
- se ejecuta en entorno cloud;
- protección máxima disponible.

### Hybrid Protected

- solo una parte local;
- algoritmo sensible en cloud;
- buena protección.

### Desktop Protected

- ejecución local;
- paquete compilado/protegido;
- source no entregado oficialmente;
- protección razonable, no absoluta.

Esto puede convertirse en una característica comercial del marketplace.

---

## 24. Qué no es posible garantizar

No es posible garantizar:

> “El código ejecutará localmente dentro de AutoCAD, pero el dueño de la PC nunca podrá inspeccionarlo ni reconstruirlo.”

Ese objetivo es irreal para cualquier software local, incluyendo C++, C#, Java, Python, JavaScript, juegos, DRM y aplicaciones de escritorio.

La protección debe medirse por coste de extracción, conocimientos requeridos, tiempo, capacidad de reutilización, trazabilidad y riesgo de redistribución.

---

## 25. Regla arquitectónica principal

> Todo código que llegue a una máquina controlada por el cliente debe considerarse eventualmente observable.

Por lo tanto:

- el código realmente secreto debe permanecer server-side cuando sea posible;
- el código necesariamente local debe entregarse compilado/protegido;
- las credenciales deben ser efímeras;
- la distribución debe ser trazable;
- el marketplace debe tener controles de seguridad para código de terceros.

---

## 26. Prioridades recomendadas

### P0 — Inmediato

1. Rotar keys que hayan quedado expuestas durante pruebas.
2. Dejar de enviar tokens permanentes dentro de URLs cuando sea posible.
3. Corregir manejo de errores HTTP/COM.
4. Corregir URL encoding.
5. No marcar rutinas como loaded si la carga falla.
6. Implementar logs claros de transporte, HTTP status, autorización, asiento, descarga y evaluación.

### P1 — Corto plazo

1. Implementar sesiones efímeras.
2. Crear API de autenticación separada.
3. Introducir rate limiting.
4. Auditar acceso por HWID/asiento.
5. Añadir firma de paquetes/payloads.
6. Construir clasificador de rutinas Cloud/Hybrid/Local.

### P2 — Medio plazo

1. Pipeline de compilación FAS/VLX para paquetes locales.
2. Source Vault.
3. Watermarking por cliente/build.
4. Security Gate para LISP de terceros.
5. Sandbox automatizado.
6. Manifiesto de dependencias y compatibilidad.

### P3 — Evolución

1. Runtime LispCentral local en .NET/ObjectARX.
2. Soporte para Automation/APS.
3. Conversión de ciertas rutinas a híbridas.
4. Build farm por versión de AutoCAD.
5. Sistema de reputación/seguridad de autores.

---

## 27. Manifiesto recomendado para cada paquete

```json
{
  "package": "Autor.Rutina",
  "version": "2.3.1",
  "execution_mode": "local",
  "autocad_versions": ["2025", "2026"],
  "platform": "windows",
  "dependencies": [
    "interface.dcl",
    "blocks.dwg"
  ],
  "permissions": [
    "dwg.read",
    "dwg.write"
  ],
  "network": false,
  "build": "fas",
  "signed": true
}
```

Debe servir para compatibilidad, permisos, revisión, marketplace, diagnóstico y seguridad.

---

## 28. Preguntas abiertas

1. ¿Cuál será el formato principal de distribución local: FAS, VLX, .NET o combinación?
2. ¿Qué versiones de AutoCAD serán soportadas?
3. ¿Windows solamente o también macOS?
4. ¿Cómo compilar automáticamente los LISP subidos por terceros?
5. ¿Cómo manejar dependencias DCL/PAT/LIN/DWG/DLL?
6. ¿Cómo identificar rutinas compatibles con Automation?
7. ¿Qué llamadas serán prohibidas en marketplace?
8. ¿Cómo se implementará el sandbox?
9. ¿Qué nivel de telemetría es aceptable?
10. ¿Qué política de revocación/licencia tendrá un autor?
11. ¿Qué protección jurídica/licenciamiento complementará la protección técnica?
12. ¿Cómo se manejarán actualizaciones y rollback?
13. ¿Cómo evitar que una cuenta autorizada descargue masivamente todo su catálogo?
14. ¿Qué rate limits se aplicarán?
15. ¿Cómo se protegerá el source almacenado en LispCentral?

---

## 29. Próxima auditoría técnica sugerida

La siguiente fase debería analizar:

- endpoints del backend;
- flujo completo de autenticación;
- lógica de seat binding;
- flujo `INDEX`;
- flujo `getRoutine`;
- descarga de cada módulo;
- permisos por paquete;
- respuestas de error;
- rate limiting;
- storage de source;
- upload de autores;
- publicación;
- builds;
- panel de administración;
- revocación;
- logs;
- recuperación ante filtración.

Entregables sugeridos:

1. threat model;
2. diagrama de arquitectura actual;
3. diagrama de arquitectura objetivo;
4. matriz de riesgos;
5. backlog P0/P1/P2;
6. protocolo de sesiones;
7. formato de manifiesto;
8. política de publicación;
9. pipeline de build;
10. checklist de seguridad.

---

## 30. Contexto que un LLM debe conservar

Al continuar este proyecto, asumir:

- LispCentral es un SaaS/marketplace de LISP para AutoCAD.
- El negocio depende de que autores puedan rentar rutinas a otros usuarios.
- No se debe proponer simplemente “mover todo al servidor”, porque muchos LISP necesitan ejecutarse dentro de AutoCAD.
- La protección absoluta del código local no es posible.
- El objetivo práctico es elevar el coste de extracción y reducir el valor de lo interceptado.
- La arquitectura actual entrega LISP textual vía HTTPS y lo ejecuta con `read` + `eval`.
- Ya se demostró que ese source puede capturarse mediante una petición HTTPS autorizada.
- El nivel de protección actual se estima en ~3/10.
- El objetivo realista es ~7–8/10.
- FAS/VLX, .NET/ObjectARX, sesiones efímeras, firma, watermarking y rate limiting son capas complementarias.
- Automation/APS puede servir para rutinas cloud-compatible, pero no reemplaza ejecución interactiva local.
- Debe existir un Security Gate para código de terceros.
- No reproducir ni volver a exponer keys reales en documentos, ejemplos o logs.
- Priorizar una arquitectura que proteja simultáneamente: propiedad intelectual del autor, seguridad del arrendatario, integridad de LispCentral y experiencia interactiva dentro de AutoCAD.

---

## 31. Objetivo de arquitectura

> Permitir que desarrolladores publiquen y moneticen automatizaciones AutoCAD con distribución controlada, ejecución compatible con las necesidades reales de AutoCAD, protección comercial razonable de propiedad intelectual, seguridad frente a código malicioso y una experiencia SaaS centralizada de licencias, versiones y actualizaciones.

---

## 32. Principio de diseño final

**No intentar hacer “invisible” un código que necesariamente debe ejecutarse localmente.**

En su lugar:

1. minimizar el source textual entregado;
2. compilar lo local;
3. mantener lo crítico en servidor cuando sea viable;
4. usar sesiones efímeras;
5. firmar y verificar paquetes;
6. individualizar builds;
7. limitar y auditar descargas;
8. escanear/sandboxear código de terceros;
9. clasificar cada LISP según su modo de ejecución;
10. diseñar la protección como un sistema de capas.
