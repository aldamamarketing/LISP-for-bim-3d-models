# Reglas de Negocio: Marketplace B2B y Sistema de Licencias (Entitlements)

Este documento centraliza las reglas de negocio, la arquitectura de facturación y la gestión de permisos (Entitlements) para la plataforma LispCentral en su modelo de **Marketplace B2B/B2C**.

---

## 1. Conceptos Core

Para permitir que los desarrolladores vendan su código y que los clientes empresariales lo compren y distribuyan entre sus empleados, el sistema utiliza un modelo de **Licencias Granulares por Suite** (Entitlements).

### 1.1 Entidades Principales
- **Tenant (Usuario/Empresa):** Una entidad registrada en la plataforma. Puede tener el rol dual de "Creador" (sube código) y "Consumidor" (compra código).
- **Dispositivo (Seat/HWID):** Un equipo físico (PC) registrado bajo el paraguas de un Tenant.
- **Suite (Producto):** Un conjunto empaquetado de archivos LISP. Puede ser público (Marketplace) o privado.
- **Licencia (Entitlement):** El contrato que une a un Tenant con una Suite. Define cuántos asientos (`purchasedSeats`) pagó el Tenant y qué dispositivos específicos (`assignedDevices`) están autorizados a usar la Suite.

---

## 2. Reglas de Negocio para Creadores (Developer Model)

1. **Garantía de Asiento Gratuito:** 
   Todo usuario que sube su propio código (crea una Suite) obtiene de forma automática e inmediata una licencia gratuita de **1 asiento (`purchasedSeats: 1`)** para esa Suite.
   - *Razón:* Garantiza que el desarrollador siempre pueda probar su código en su máquina principal sin pagar.
2. **Expansión Interna (Self-Scaling):**
   Si el desarrollador desea usar su propio código en una segunda PC (ej. un empleado de su despacho), debe comprar "Asientos Adicionales" para su propia Suite.
3. **Control de Visibilidad y Monetización:**
   El creador puede configurar su Suite como `private`, `link` (Oculto pero compartible) o `store` (Público). En caso de venta, el creador define el precio base por asiento.

---

## 3. Reglas de Negocio para Clientes (Consumer Model)

1. **Pool de Dispositivos Centralizado:**
   Un Tenant gestiona todas sus PCs desde un panel unificado ("Mis Dispositivos"). Las PCs se autoregistran cuando intentan abrir LispCentral desde AutoCAD, o se pueden gestionar manualmente.
2. **Compra Granular:**
   Un Tenant puede comprar `X` asientos de la Suite A y `Y` asientos de la Suite B.
3. **Asignación Manual Segura:**
   Comprar un asiento NO da acceso automático a toda la empresa. El administrador del Tenant debe ir a la pestaña "Mis Licencias" y **marcar explícitamente qué PCs (HWIDs) del Pool** tienen permiso para consumir esa Suite. 
   - *Límite Técnico:* El sistema no permitirá asignar un número de PCs mayor a `purchasedSeats`.
4. **Revocación y Rotación:**
   El administrador puede desmarcar una PC de una Suite para liberar el asiento y asignárselo a otra PC (ej. si un empleado es despedido o cambia de laptop).

---

## 4. Ejecución Cruzada y Namespaces (Resolución de Colisiones)

Para asegurar que un cliente pueda consumir código de múltiples creadores sin que los comandos de AutoCAD entren en conflicto:

1. **Resolución en el Loader (`?routine=INDEX`):**
   El endpoint que devuelve el índice de comandos disponibles analizará TODAS las licencias activas del consumidor.
2. **Prefijos Integrados (Anti-Colisión):**
   Si un Creador A y un Creador B nombran un archivo como `CORTAR.lsp`, la plataforma o bien forza un namespace en el JIT loader (ej. descargando la versión exacta amarrada al ID de la Suite que el cliente compró), o exige a los creadores usar prefijos únicos comerciales (ej. `LC_TMD_CORTAR` vs `EX_CORTAR`).
3. **Aislamiento en RAM:**
   El backend asegura que cuando la `PC-JUAN` solicita `CORTAR`, el sistema verifique el `hwId` contra la colección de licencias activas y descargue desde el Bucket original del Creador correspondiente, inyectándolo de forma segura (Zero-Disk) en AutoCAD.

---

## 5. Cuadros de Mando (Dashboards)

### 5.1 Panel del Consumidor
- **Mis Dispositivos:** Lista de HWIDs. Opción de revocar y limpiar máquinas inactivas.
- **Mis Licencias:** Tarjetas de Suites propias y compradas. Muestra ocupación (Ej. "2/5 Asientos"). Botón para asignar checkboxes a máquinas del Pool.

### 5.2 Panel del Creador (Métricas)
- **Ventas y Uso:** Panel de métricas que muestra total de ingresos, cantidad de clientes únicos y total de asientos activos en todo el mundo consumiendo sus LISPs.
