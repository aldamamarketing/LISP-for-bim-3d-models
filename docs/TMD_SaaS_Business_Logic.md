# Lógica de Negocio y Reglas — SaaS Standardization

---

## Contexto del Proyecto

El módulo SaaS de Normas es un **add-on independiente** del LispCentral existente. Se desarrolla de forma aislada como paleta separada (`saas-palette.html`) y, una vez estabilizado, será integrado en el flujo principal de la aplicación. Esta separación permite iterar rápido sin afectar las paletas de producción actuales.

---

## 1. Multitenancy

Un dibujante puede pertenecer a múltiples equipos simultáneamente.

- **ContextSwitcher:** Dropdown en la cabecera de la paleta. Cambia el contexto activo (equipo). Al cambiar, la paleta recarga la norma correspondiente desde Firestore/API.
- El dropdown se **bloquea (pointer-events: none)** durante el modo de edición (DiffMergePanel activo) para evitar cambios de contexto a mitad de una revisión.
- Normas con `isPublic: true` aparecen automáticamente en el dropdown sin necesidad de código de invitación.

---

## 2. Control de Acceso por Rol

| Acción | MEMBER | OWNER |
|---|---|---|
| Ver norma del equipo | ✅ | ✅ |
| Aplicar norma al DWG | ✅ | ✅ |
| Auditar DWG | ✅ | ✅ |
| Subir cambios a la nube (Sync) | ❌ | ✅ |
| Ver botón de subir (nube verde) | ❌ | ✅ (visible solo si `isOwner=true`) |

El rol se resuelve en el **ContextSwitcher** al leer `joinedTeams[teamId].role` del perfil del usuario. El backend valida nuevamente antes de persistir (`syncStandard` verifica `ownerId`).

---

## 3. Gestión del Equipo (CAD Manager)

- **Código de Invitación:** Generado en el Dashboard Web. El Manager lo comparte por canales externos (WhatsApp, email).
- **Revocar Acceso:** El Manager elimina el `teamId` del `joinedTeams` del usuario revocado. El cambio es inmediato — la paleta no mostrará más esa norma.
- **Regenerar Código:** Invalida el código viejo para *nuevas* conexiones. Los miembros ya conectados mantienen acceso.

---

## 4. Modelo de Monetización (Stripe — Fase 2)

| Tier | Usuarios | Precio |
|---|---|---|
| Free / Solo | 1 (solo el Owner) | Gratuito |
| Team | Hasta 5 | $X/mes |
| Corporate | Hasta 20 | $Y/mes |

- **Dibujantes:** Siempre gratuito — maximiza adopción y efecto de red.
- **Owners/Managers:** Pagan para crear entornos privados y gestionar equipos.
- **Si suscripción caduca:** Los dibujantes verán un ícono 🔒 en el equipo. La inyección de normas se bloquea hasta que el Manager regularice el pago.
- **Control de pagos:** Exclusivamente en el Dashboard Web. Ningún flujo de pago existe dentro de AutoCAD.

---

## 5. Privacidad e IP

Las normas corporativas son **propiedad intelectual del Manager**. Las reglas de Firestore impiden que un usuario lea el documento `standards` de un equipo al que no pertenece. El endpoint `getStandard` valida el UID antes de retornar datos.

---

## 6. Analítica (Fase 2)

- Las métricas de uso quedan atadas al `teamId`, no al usuario individual.
- Si un dibujante es revocado, su historial de actividad permanece en el Dashboard del Manager.
- Datos a recolectar: botones clicados, búsquedas, comandos ejecutados, crash reports (vía CEF).
