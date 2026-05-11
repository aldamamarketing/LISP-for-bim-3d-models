# TMD - Protocolo de Sincronización BIM (Reglas de Negocio)
**Versión:** 2.0  
**Fecha:** 2026-05-11  
**Audiencia:** Agentes de IA / Desarrolladores TMD

---

## 1. Principio Fundamental: "Realidad Física Primero"

> **La geometría física del sólido 3D es la ÚNICA fuente de verdad.**  
> LData es un ESPEJO de la realidad, nunca al revés.

### Implicaciones:
- Si un usuario gira un sólido con `ROTATE` de AutoCAD, esa rotación es una decisión de diseño.
- Si un usuario mueve un sólido con `MOVE`, esa posición es la correcta.
- Ningún comando BIM de la suite debe "corregir" una acción nativa del usuario.
- Los comandos BIM leen la realidad física, actualizan LData para que coincida, y luego operan.

---

## 2. Arquitectura de 2 Fases (Motor BUILD v5.3.0)

### DECISIÓN DE DISEÑO:
El motor de construcción fue dividido en 2 fases independientes para resolver un conflicto
fundamental: BUILD necesita leer la realidad física para preservar ajustes manuales,
pero PROPERTIES necesita que BUILD respete los valores explícitos del usuario sin re-leerlos.

### Fase 1: `TMD:build-sync-reality(wire)`
**PROPÓSITO:** Lee el estado físico del sólido existente y actualiza LData.

**Qué sincroniza:**
- `TMD_PARAMS.ROTACAO` ← rotación física del sólido (via análisis de sección transversal)
- `TMD_PARAMS.PT_A / PT_B` ← posición actual del wire
- `TMD_TIPO` ← re-evaluación VIGA/COLUNA/CONTRAV. según vector del wire

**Qué NO toca:**
- FORMA, DIM_X, DIM_Y, ESPESSURA (vienen del catálogo/perfil)
- JUSTIFICACAO (pospuesta para fase futura)
- MATERIAL, LABIO (datos del perfil)

### Fase 2: `TMD:build-reconstruct(wire)`
**PROPÓSITO:** Toma TMD_PARAMS como verdad absoluta. Borra el sólido viejo y crea uno nuevo.

**Regla crítica:** Esta función NUNCA lee la geometría del sólido existente.
Confía completamente en los datos de TMD_PARAMS.

### Wrapper: `TMD:build-single-wire(wire)`
**PROPÓSITO:** Compatibilidad con los 18+ callers existentes.
Ejecuta Fase 1 → Fase 2 secuencialmente.

---

## 3. Flujo de Comandos

### 3.1 PROPERTIES (El usuario edita explícitamente)
```
1. sync-reality(wire)       → Lee sólido físico → Actualiza LData
2. Muestra diálogo DCL      → Usuario ve la REALIDAD (no datos obsoletos)
3. Usuario modifica valores  → Ej: cambia rotación de 0° a 90°
4. Actualiza TMD_PARAMS     → ROTACAO = 90° (valor explícito del usuario)
5. build-reconstruct(wire)  → Borra viejo, crea nuevo a 90° (SIN re-leer física)
```
**¿Por qué no hay conflicto?** Porque reconstruct confía en TMD_PARAMS que
ya tiene el valor explícito del usuario. No re-lee la realidad del sólido viejo.

### 3.2 BUILD (El sistema reconstruye)
```
1. sync-reality(wire)       → Lee sólido a 45° → TMD_PARAMS.ROTACAO = 45°
2. build-reconstruct(wire)  → Borra viejo, crea nuevo a 45° (misma posición)
```
**¿Por qué funciona?** Porque sync-reality ya actualizó LData con la posición
real. Reconstruct solo materializa lo que LData dice.

### 3.3 ROTATE nativo + BUILD posterior
```
1. Usuario rota sólido con ROTATE de AutoCAD a +35°
2. (LData sigue diciendo 0° — desincronizado)
3. Usuario ejecuta BUILD
4. sync-reality(wire)       → Lee sólido a 35° → TMD_PARAMS.ROTACAO = 35°
5. build-reconstruct(wire)  → Borra viejo, crea nuevo a 35° (preserva diseño)
```

### 3.4 COPY + BUILD (Fase Fénix)
```
1. Usuario copia sólido+wire con COPY
2. Ambos tienen LData del original (handles incorrectos)
3. BUILD detecta clon → TMD:build-ensure-wire crea nuevo wire
4. sync-reality → Lee estado físico del clon
5. build-reconstruct → Reconstruye en la nueva posición
```

---

## 4. Lógica de Sincronización de Niveles (Z)

### Barrido Geométrico (All Wires First)
1. Detectar `Delta_Z1` (Nivel_Ini) y `Delta_Z2` (Nivel_Fim).
2. **SMART MOVE (Traslación Rápida):**
   - Condición: `Delta_Z1 == Delta_Z2`.
   - Acción: `vla-move` sobre Wire Y sólido hijo simultáneamente.
3. **STRETCH (Deformación):**
   - Condición: `Delta_Z1 != Delta_Z2`.
   - Acción: Modificar endpoints de la LINE.
   - Consecuencia: Marcar para BUILD masivo.

---

## 5. Aislamiento de Grupos
- **Independencia de Elementos:** No procesar grupos como bloques atómicos.
- **Protocolo PICKSTYLE:**
  1. Guardar `PICKSTYLE` actual.
  2. Forzar `PICKSTYLE = 0`.
  3. Procesar elementos individualmente.
  4. Restaurar `PICKSTYLE` original.

---

## 6. Estrategia Fénix (Recuperación de Huérfanos)
- **Escenario:** Sólidos copiados sin su Wire original.
- **Acción:**
  1. Extraer ADN (`TMD_PARAMS`) del sólido.
  2. Calcular centroide y posición relativa.
  3. Engendrar nuevo Wire (LINE) en posición correcta.
  4. Vincular sólido al nuevo Wire.

---

## 7. El Guardián (Auto-Sanado)
- El Inspector (`PROPERTIES`) ajusta el Desfase en LData si la `Z_Real` física
  no coincide con `Nivel + Desfase` teórico.

---

## 8. Clasificación Automática de Tipo
- **Función:** `TMD:wire-evaluate-vector(ptA, ptB)`
- **Reglas:**
  - Wire vertical (dZ >> dXY) → `COLUNA`
  - Wire horizontal (dXY >> dZ) → `VIGA`
  - Wire diagonal → `CONTRAVENTAMENTO`
- **Cuándo se ejecuta:** En Fase 1 (sync-reality) y al crear wires nuevos.

---

## 9. Detección de Rotación Física
- **Función:** `TMD:sync-extract-rotation(wire, solid)`
- **Método:** Análisis de sección transversal via `vla-SectionSolid`.
  1. Corta el sólido en su punto medio, perpendicular al eje del wire.
  2. Explota la región resultante en líneas.
  3. Identifica la línea más larga (eje principal del perfil).
  4. Proyecta sobre los ejes locales del wire para obtener el ángulo.
- **Normalización:** 0°-180° (perfiles simétricos cada 180°).
- **Snapping:** ±1° a 0° y 90° para tolerancia de construcción.

---

## Historial de Decisiones

| Fecha | Versión | Decisión | Razón |
|-------|---------|----------|-------|
| 2026-05-07 | 1.0 | Soberanía Geométrica | Evitar desfases por movimiento manual |
| 2026-05-07 | 1.1 | Estrategia Fénix | Recuperar sólidos copiados sin wire |
| 2026-05-08 | 1.2 | Detección por Sección Transversal | BBox diagonal era imprecisa |
| 2026-05-11 | 2.0 | **Arquitectura 2 Fases** | El cálculo delta (born_rot) era frágil y contaminaba valores explícitos de Properties. Reemplazado por lectura directa de la realidad física. |
