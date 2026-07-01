# Standardization as a Service — Flujos de Trabajo y Alcance

Este documento define los flujos de trabajo, decisiones de diseño y límites del MVP para el módulo de gestión de estándares CAD de LispCentral.

---

## 1. Roles

| Rol | Acceso | Descripción |
|---|---|---|
| **CAD Manager / Owner** | Read + Write | Crea, edita y sincroniza normas. Gestiona el equipo. |
| **Dibujante / Member** | Read-Only | Consume el estándar. Puede auditar y aplicar normas a su DWG. |

---

## 2. Flujo del CAD Manager

### 2.1 Actualizar Estándar (DWG → Cloud)
El Manager trabaja directamente en AutoCAD — cero fricción.

1. Configura capas, estilos de texto y cotas en un `.dwg`.
2. En la paleta, selecciona su equipo y hace clic en el botón de subir (ícono nube verde).
3. La paleta llama `(tmd:extract-stds teamId token)` vía JS.
4. El LISP extrae **Layers + TextStyles + DimStyles** y hace POST a `/uploadDraft`.
5. La paleta hace polling a `/getDraft` cada 2s.
6. Al detectar el draft, abre el **DiffMergePanel** con 3 categorías:
   - 🔵 **New in DWG** — existe en DWG, no en Cloud → acción: Añadir (default: marcado)
   - 🟡 **Modified** — existe en ambos, propiedades distintas → acción: Sobrescribir (default: desmarcado)
   - 🔴 **Missing in DWG** — existe en Cloud, no en DWG → acción: Eliminar de la norma (default: desmarcado por seguridad)
7. Manager revisa, selecciona, y hace **COMMIT**.
8. Frontend hace POST a `/syncStandard` con el estándar resultante.

> [!IMPORTANT]
> El DiffMergePanel tiene sub-grupos por tipo (Layers, TextStyles, DimStyles) dentro de cada categoría (New/Modified/Missing). Sub-grupos son colapsables — **pendiente de implementar en Fase 1**.

### 2.2 Soft Delete (planificado)
Actualmente el COMMIT hace `delete` real del campo en Firestore. La arquitectura correcta es marcar con `_deprecated: true` para preservar historial. No implementado en MVP — documentado como deuda técnica.

---

## 3. Flujo del Dibujante / CAD Manager (modo consumo)

### 3.1 Apply Standard to DWG (Cloud → DWG, ciego)
Acción directa. Sin revisión previa.
1. El Manager/Dibujante hace clic en **"Apply Standard to DWG"** (botón naranja en footer).
2. La paleta JS llama `tmd:apply-layer(name, color, ltype, lw)` para cada capa del estándar.
3. La paleta JS llama `tmd:apply-textstyle(name, font, height)` para cada estilo.
4. Al terminar, llama `c:TMD_APPLY_COMPLETE` para regen de vistas.

> [!NOTE]
> El JS parsea el JSON del estándar y llama la función LISP individualmente por ítem. Esto evita tener que parsear JSON dentro de LISP (sin soporte nativo). Las capas faltantes se crean, las existentes se corrigen.

### 3.2 Auditar Dibujo (Cloud → DWG, selectivo)
Comparación inversa al Update Standard. La **nube es la fuente de verdad**.

**Proceso:**
1. Usuario hace clic en **"Auditar Dibujo Actual"**.
2. La paleta llama `(tmd:run-audit teamId token)`.
3. El LISP extrae el DWG (mismo mecanismo que extract) y sube a `/uploadDraft`.
4. La paleta recibe el snapshot y abre el **panel de auditoría** mostrando:

| Tipo de Violación | Descripción | Fix disponible |
|---|---|---|
| **Property Violation** | Capa existe en ambos, pero con color/ltype/lineweight incorrecto | ✅ `tmd:apply-layer` corrige propiedades |
| **Missing Layer** | Capa en la norma Cloud que no existe en el DWG | ✅ `tmd:apply-layer` la crea |
| **Non-Standard Layer** | Capa en DWG que no existe en la norma | ⚠️ Ofrecer renombrar a capa estándar vía `tmd:rename-layer` |

> [!IMPORTANT]
> **Renombrar es la operación correcta para capas no-estándar.** `vla-put-name` renombra la capa y todos los objetos la siguen automáticamente — es O(1). Mover objetos entre capas requiere iterar entidades (O(n), complejo). Moverse al estándar de la industria: Layer Translator (`LAYTRANS`) de AutoCAD hace exactamente esto.

> [!WARNING]
> **Fuera del scope MVP:** Escanear entidades para detectar objetos en capas no-estándar. Requeriría iterar el DWG completo y puede congelar AutoCAD en archivos grandes.

---

## 4. Arquitectura LISP — JIT en Memoria

En producción, los módulos LISP **nunca se escriben a disco en el cliente**. El Loader:
1. Descarga el código fuente de los módulos core desde la nube.
2. Los evalúa con `Acad.Application.ExecuteLisp(sourceCode)` directamente en la sesión de AutoCAD.
3. Las funciones quedan disponibles en memoria para toda la sesión.

```
lisp/
├── core/                    ← Servidos JIT (eval en memoria)
│   ├── tmd_utils.lsp
│   ├── tmd_saas_extract.lsp
│   ├── tmd_saas_apply.lsp
│   └── tmd_saas_audit.lsp
└── dev/
    └── test_saas_palette.lsp  ← Solo para testing local
```

Para testing local: `c:TMD_LOAD_CORE` carga los módulos desde el path del proyecto.

---

## 5. Scope del MVP

### ✅ Implementado
- Extracción de Layers, TextStyles, DimStyles al cloud
- DiffMergePanel 3-way (New / Modified / Missing in DWG)
- Filtro de búsqueda funcional durante edición
- Footer oculto y dropdown bloqueado durante edición
- Módulos LISP core estructurados y listos para JIT

### 🔧 En Progreso
- Sub-grupos colapsables en DiffMergePanel (por tipo: Layers / TextStyles / DimStyles)
- "Apply Standard to DWG" — botón conectado, falta lógica en el frontend para llamar tmd:apply-layer por ítem

### ❌ Fuera de Scope MVP
- Soft Delete (marcar `_deprecated: true` en lugar de borrar)
- Panel de Auditoría UI (backend listo, UI pendiente)
- Renombramiento de capas no-estándar (UI del mapping)
- Blocks (.dwg) en la norma
- Estilos de trazado (CTB/STB)
- Auditoría de entidades en capas no-estándar
- Analytics Dashboard
- Headless backend (procesamiento DWG sin AutoCAD en servidor)

## Lecciones Aprendidas y Est�ndares de Arquitectura
### 1. Codificaci�n AutoLISP (Legacy ANSI vs UTF-8)
Los motores AutoLISP antiguos (ej. AutoCAD 2021) presentan fallos cr�ticos (File load canceled) cuando cargan archivos .lsp con codificaci�n UTF-8 que contienen caracteres no-ASCII (tildes, e�es, guiones largos). **Soluci�n permanente**: Todos los archivos del n�cleo LISP (ej. 	md_saas_extract_v2.lsp, 	md_saas_audit_v2.lsp) deben escribirse estrictamente en ingl�s y ASCII puro.

### 2. Idempotencia de la Paleta CEF (Blackboard Variables)
Debido a que el contexto de variables LISP se reinicia por cada documento abierto, usar variables locales para rastrear si la paleta ya fue inyectada causa ventanas duplicadas. **Soluci�n**: Utilizar las funciones de Blackboard de AutoLISP (l-bb-set, l-bb-ref) para compartir estados de la aplicaci�n (*LC-SAAS-PALETTE-OPEN*) a trav�s de todos los dibujos, asegurando una instancia �nica de la interfaz.

## Roadmap a Futuro (Expansi�n del Est�ndar)
La visi�n arquitect�nica del SaaS es cubrir el ecosistema completo de objetos nombrados (Named Objects) y variables de entorno del DWG. 

### 1. Variables Globales del Dibujo
El est�ndar debe dictar y corregir:
- **Unidades de Inserci�n (INSUNITS)**
- **Escalas Globales (LTSCALE, DIMSCALE)**
- **Variables de visualizaci�n y precisi�n (AUPREC, LUPREC)**

### 2. Estandarizaci�n Profunda de Objetos (Purge-level)
Inspirado en el �rbol de dependencias de AutoCAD, las siguientes iteraciones del motor de extracci�n/auditor�a incluir�n:
- Blocks (Bloques din�micos y est�ticos)
- Multileader Styles (MLeader)
- Table Styles
- Materials
- Plot Styles (CTB/STB asignations)
- Detail & Section View Styles

La arquitectura JSON actual (basada en \layers\, \	extStyles\, \dimStyles\) est� dise�ada para escalar horizontalmente y soportar estas nuevas ramas sin romper la compatibilidad hacia atr�s.
