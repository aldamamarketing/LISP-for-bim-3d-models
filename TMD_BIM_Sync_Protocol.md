# TMD - Protocolo de Sincronización BIM (Reglas de Negocio)
**Versión:** 2.1  
**Fecha:** 2026-05-12  
**Audiencia:** Agentes de IA / Desarrolladores TMD

---

## 1. Principio Fundamental: "Realidad Física Primero"

> **La geometría física del sólido 3D es la ÚNICA fuente de verdad.**  
> LData es un ESPEJO de la realidad, nunca al revés.

### Implicaciones:
- Si un usuario gira o mueve un sólido con comandos nativos, esa es la verdad del diseño.
- Los comandos BIM leen la realidad física, actualizan LData para que coincida, y luego operan.

---

## 2. Capas de Sincronización (v5.24)

### 2.1 Sincronización de Identidad (DNA Fix)
AutoCAD reasigna Handles dinámicamente al copiar objetos. El sistema implementa la "Vacunación" de ADN:
- **TMD_SELF_HANDLE:** Almacena el Handle real del objeto en el dibujo actual.
- **Protocolo de Saneamiento:** Durante el `TMD_SYNC`, el motor sobreescribe el ADN antiguo con el Handle presente, reparando vínculos rotos y asegurando que `handent` sea siempre válido.

### 2.2 Protocolo de Contención Geométrica
Para evitar "falsos positivos" en estructuras densas (vigas colineales), el motor v5.24 impone tres filtros:
1.  **Bloqueo Direccional:** Paralelismo > 99% (Error < 0.5°).
2.  **Contención Transversal:** El cable debe residir dentro del área de la sección del sólido (Ancho/2 + tolerancia).
3.  **Regla Invariable del Centro:** El punto medio del cable **debe** estar contenido dentro del tramo longitudinal del sólido.

---

## 3. Arquitectura del Motor (Fases)

### Fase 1: `TMD:build-sync-reality(wire)`
**PROPÓSITO:** Lee el estado físico del sólido vinculado y actualiza LData (`TMD_PARAMS`).

### Fase 2: `TMD:build-reconstruct(wire)`
**PROPÓSITO:** Toma `TMD_PARAMS` como verdad absoluta, borra el sólido viejo y crea uno nuevo. **NUNCA** lee la geometría del sólido existente en esta fase.

---

## 4. Herramientas de Inspección Forense

### 4.1 TMD_SYNC (Motor Masivo)
Escanea el dibujo buscando inconsistencias.
- **Saneamiento:** Actualiza Identidades y Punteros.
- **Adopción:** Vincula huérfanos por geometría.
- **Fase Fénix:** Regenera cables para sólidos sin pareja.

### 4.2 TMD_FORENSIC v3.0 (Inspector Unificado)
Herramienta de "Rayos X" para diagnóstico individual.
- **Análisis Cruzado:** Seleccionas un objeto y el sistema rastrea a su pareja, verifica Handles (DNA Check) y valida el paralelismo y longitud en tiempo real.

---

## 5. Historial de Decisiones

| Fecha | Versión | Decisión | Razón |
|-------|---------|----------|-------|
| 2026-05-07 | 1.0 | Soberanía Geométrica | Evitar desfases por movimiento manual |
| 2026-05-11 | 2.0 | Arquitectura 2 Fases | Separar lectura de realidad de la reconstrucción técnica |
| 2026-05-12 | 2.1 | **Contención Industrial** | Implementación de Regla del Centro y Saneamiento de ADN para persistencia en copias |

---
*Documento oficial de TM Digital.*
