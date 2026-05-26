# Manual Técnico de Desarrollo Lisp BIM - TM Digital

Este documento centraliza todos los estándares, arquitectura y protocolos de datos para el desarrollo de herramientas en el ecosistema TM Digital para AutoCAD.

---

## 1. Arquitectura del Sistema

El sistema utiliza una arquitectura **Modular y Desacoplada**, diseñada para ser escalable, fácil de depurar e independiente de las limitaciones nativas de AutoCAD.

### Estructura de Directorios
Los motores y utilidades deben organizarse en subcarpetas lógicas:
- **Core/**: El "Cerebro" agnóstico. Recibe medidas y coordenadas y devuelve la geometría resuelta. No interactúa con el usuario.
- **Utils/ (TMD_Utils.lsp)**: Herramientas de apoyo genéricas y **Motor Geométrico Central**. Aquí reside la lógica de matrices y medición que garantiza consistencia entre todos los módulos (Inspector, Tablas, CNC).
- **BIM/**: Gestión de datos inteligentes (Lectura/Escritura de LData, XData y Registro).
- **UI/**: Constructores de interfaces de usuario (DCL dinámicos).

---

## 2. Padrón de Nomenclatura (Namespaces)

Para evitar conflictos con otros plugins y estandarizar el código, se debe utilizar el prefijo **`TMD:`**.

### Reglas de Prefijos
- **Comandos de Usuario**: `c:NOMBRE_COMANDO` (Siempre en mayúsculas). Ejemplo: `(defun c:TMD_SETUP () ...)`
- **Funciones Core**: `TMD:core-` (Ejemplo: `TMD:core-calc-intersection`)
- **Utilidades**: `TMD:util-` (Ejemplo: `TMD:util-get-vertices`)
- **Gestión BIM**: `TMD:bim-` (Ejemplo: `TMD:bim-inject-data`)
- **Interfaces**: `TMD:ui-` (Ejemplo: `TMD:ui-build-dialog`)

---

## 3. Diccionario de Datos BIM (ADN del Objeto)

El sistema se basa en un "Gemelo Digital" donde la geometría 3D contiene la inteligencia necesaria para la fabricación y el presupuesto.

### A. LData (Propiedades Universales - TMD_CORE_PROP)
Todo objeto inteligente debe contener estas propiedades en su diccionario LData:
- `TMD_ID`: ID Único (Handle generado por AutoCAD).
- `TMD_CLASSE`: Categoria (Ej: "ARQUITETURA", "ACM").
- `TMD_TIPO`: Tipo específico (Ej: "PAREDE", "BANDEJA_ACM").
- `TMD_NIVEL`: Plano de inserción (Coordenada Z).
- `TMD_MATERIAL`: Nombre del material principal.
- `TMD_NOME`: Identificador o Tag editable por el usuario.

### B. XData (Metadatos Técnicos - TMD_GEO)
Para sólidos destinados a fabricación (CNC), se utiliza XData con la RegApp `"TMD_GEO"`:
- **Código 1000**: Identificador de Módulo, Tipo de Geometría, Estilo.
- **Código 1040**: Largo Nominal, Altura Nominal.

---

## 4. Protocolos de Modelado y Fabricación

Para garantizar que la automatización LISP funcione sin fallas matemáticas:

### Reglas de Perfil (Molduras/Arremates)
1. **Orientación**: La face izquierda (Eje -X) de la polilínea de perfil debe ser siempre la que entra en contacto con la masa de la columna o pared.
2. **Handle de Memoria**: El sistema debe guardar el `Handle` (identificador único) de las polilíneas base en el Registro de Windows (`HKEY_CURRENT_USER\Software\TMDigital\`) para persistencia entre sesiones.

### Higiene del Archivo
- Limpiar entidades temporales tras la ejecución.
- Forzar `DELOBJ = 1` durante la creación de geometría paramétrica.
- Silenciar el eco de comandos con `CMDECHO = 0` y restaurar el valor original al finalizar.

---

## 5. Lógica de Edición Paramétrica

El flujo de trabajo para modificar objetos sigue el protocolo **Leer-Mapear-Reconstruir**:
1. **Lectura**: El script lee las propiedades `LData` del objeto seleccionado.
2. **Mapeo**: Los datos se cargan en la interfaz de usuario (DCL).
3. **Edición**: El usuario modifica los parámetros.
4. **Gatillo de Reconstrucción**: El script NO intenta "estirar" el 3D existente. **Elimina** el objeto antiguo y **reconstruye** uno nuevo en el mismo punto de inserción con los nuevos datos.

---

## 6. Evolución 3D: El Modelo Analítico (Wireframe)

Para estructuras complejas paramétricas (ej. naves industriales, racks, entramados de vigas), el motor opera bajo el concepto de desacoplamiento entre el Esqueleto Analítico y el de Fabricación Final.

### Puntos del Protocolo:
1. **Líneas Base Vectoriales (`LINES`)**: El diseñador trabaja a alta velocidad modelando la estructura usando simples `LINE`s en el espacio tridimensional de AutoCAD. Esto permite total libertad espacial utilizando las propiedades nativas de *Snaps* y *Nodes* sin cargar memoria ni forzar sustracciones complejas.
2. **Asignación de ADN (`TMD_WIRES`)**: Por medio de una interfaz dinámica, el usuario selecciona múltiples líneas en lote (Multi-Select) e inyecta parámetros lógicos persistentes sin alterar su gráfica (Perfil del Catálogo, Rotación, Justificación). Estas líneas quedan marcadas con `TMD_CLASSE = "ESTRUTURA"`.
3. **El Compilador (`TMD_BUILD`)**: Un actuador global escanea la pantalla buscando objetos analíticos inyectados. Al encontrarlos, lee sus vectores de base (`PT_A` y `PT_B`), resuelve la matriz matemática y genera automáticamente sobre ellos los Sólidos/Mallas en Alta Resolución. Si el modelo alámbrico requiere un estiramiento posterior (ej: hacer un hangar más grande), el comando compilará rápidamente la estructura eliminando los sólidos desactualizados y renderizando una nueva versión sobre el marco re-estirado.

---

## 7. Gestión de Trazabilidad Industrial (v4.0)

A partir de la versión 4.0, el sistema implementa un protocolo de **Trazabilidad Persistente y Frágil** para garantizar que los datos de fabricación sean infalibles.

### A. Marcas de Posición (POS)
Cada pieza única (Perfil + Geometría) debe poseer una marca identificativa (Ej: `m1`, `m2`).
- **Persistencia**: La marca se guarda en la LData de la línea base (`TMD_MARK`).
- **Determinismo**: El proceso de numeración siempre asigna marcas de **Mayor a Menor Longitud**. La pieza más larga del proyecto será siempre la `m1`.

### B. El Protocolo de "Fragile Marking" (Invalidación)
Para evitar que una pieza modificada conserve una marca antigua (lo cual causaría errores de corte en taller), se aplica la regla de **Invalidación Automática**:
1. Cualquier comando que altere la longitud geométrica (`TMD_JOINTS`), el perfil del catálogo (`TMD_VIGAS`) o la orientación analítica debe ejecutar obligatoriamente: `(vlax-ldata-put ent "TMD_MARK" nil)`.
2. **Excepción de Movimiento**: Los comandos de desplazamiento o alineación (`MOVE`, `TMD_ALIGN`) NO invalidan la marca, ya que la pieza física sigue siendo la misma, solo ha cambiado su ubicación en el espacio.
3. Las tablas de reporte operan en modo **Read-Only**. Si encuentran una marca `nil`, dejarán el campo en blanco en la tabla, alertando al usuario de que el modelo ha sido modificado y requiere una nueva numeración.

### C. Flujo de Trabajo Obligatorio
Para obtener un reporte de fabricación válido, el usuario debe seguir este orden:
1. **Modelado/Edición**: Uso de herramientas de diseño.
2. **Numeración Global**: Ejecución de `TMD_TABLAS_NUMERAR` para bautizar las piezas.
3. **Generación de Reportes**: Ejecución de `TMD_TABLAS_DESPIECE` o `MONTAGEM`.

---

## 8. Estándar de Medición 3D (Longitud de Corte Real)

A partir de la v4.1, el sistema estandariza el cálculo de longitudes físicas mediante el protocolo de **Alineación Temporal 3D**.

### A. El Problema del Bounding Box Nativo
AutoCAD devuelve el Bounding Box (`vla-getboundingbox`) siempre alineado al WCS (Mundo). En piezas diagonales o inclinadas, este "cubo" envolvente es mucho más grande que la pieza real, lo que causaba errores de hasta un 30% en los reportes de materiales, POS y pesos.

### B. La Solución: Alineación al Eje X (TMD_Utils)
Para garantizar precisión milimétrica en cualquier ángulo, el sistema utiliza la función centralizada `TMD:util-get-directional-len` (en `TMD_Utils.lsp`), que sigue este protocolo:
1. **Referencia Analítica**: Toma los puntos `P1` y `P2` del Wireframe (Línea) padre como el eje longitudinal absoluto.
2. **Transformación Temporal**: Crea una copia invisible del sólido y la traslada al origen `(0,0,0)`.
3. **Matriz de Base Ortonormal**: Construye una matriz 3D basada en el vector de la viga y el "Algoritmo de Eje Arbitrario". Aplica esta matriz para alinear el sólido exactamente con el Eje X del mundo.
4. **Medición Pura**: Solicita el Bounding Box sobre el objeto ya alineado. La diferencia en la coordenada X es la **Longitud de Corte Real**.
5. **Consistencia Global**: Esta función es el único punto de verdad para el **B.I.M Inspector**, las **Tablas de Montaje** y los **Reportes de Despiece**.

---
