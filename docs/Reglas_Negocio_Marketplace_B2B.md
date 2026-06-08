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

1. **Suite Global Automática y Asiento Gratuito:** 
   El sistema crea automáticamente una "Suite Global" (no editable por el usuario) que agrupa **todos** los comandos LISP subidos por ese creador. 
   - A esta Suite Global se le otorga **únicamente 1 asiento gratuito (`purchasedSeats: 1`)**.
   - Se auto-asigna a la primera conexión detectada, aunque el creador puede rotar este asiento a otra PC (hwId) a voluntad.
   - *Razón:* Garantiza que el desarrollador pueda probar todo su código en su máquina principal de forma unificada, pero previene el abuso de crear múltiples suites para obtener asientos gratis.
2. **Expansión Interna (Self-Scaling):**
   Si el desarrollador desea usar su propio código en una segunda PC (ej. un empleado de su despacho), debe comprar "Asientos Adicionales" para su propia Suite o cuenta.
3. **Control de Visibilidad y Monetización:**
   El creador puede empaquetar sus comandos en Suites comerciales configuradas como `private`, `link` (Oculto pero compartible) o `store` (Público). En caso de venta, el creador define el precio base por asiento.

---

## 3. Reglas de Negocio para Clientes (Consumer Model)

1. **Pool de Dispositivos Centralizado (Auto-Registro):**
   Un Tenant gestiona sus PCs desde un panel unificado ("Mis Dispositivos"). Las PCs se autoregistran en el Pool cuando el loader se ejecuta. El `hwId` se calcula basándose en la **sesión de Windows y el usuario logueado en la aplicación**.
2. **Compra Granular:**
   Un Tenant puede comprar `X` asientos de la Suite A y `Y` asientos de la Suite B.
3. **Asignación Flexible (Automática/Manual):**
   Los asientos comprados pueden auto-asignarse a los dispositivos registrados, con la opción de que el administrador ajuste manualmente las asignaciones en la pestaña "Mis Licencias", marcando/desmarcando qué PCs (HWIDs) del Pool tienen permiso.
4. **Revocación y Rotación:**
   El administrador puede desmarcar una PC de una Suite para liberar el asiento y rotarlo hacia otra PC ya cadastrada (ej. si un empleado cambia de laptop).

---

## 4. Gestión de Asientos, Facturación y Anti-Abuso (Casos Límite)

Para garantizar un modelo de suscripción empresarial justo y sin fricciones, se aplican las siguientes reglas al modificar la cantidad de asientos contratados:

1. **Añadir Asientos (Upgrade Aditivo):**
   El cliente puede comprar asientos adicionales en cualquier momento. El backend simplemente incrementa el valor de `purchasedSeats` para la suite correspondiente. Si hay equipos pendientes de asignar en el pool, podrían absorber estos asientos automáticamente si la auto-asignación está activa.
2. **Reducir Asientos (Downgrade Diferido y Sobregiro):**
   Si un cliente baja su plan de 5 a 3 asientos, el sistema permite la reducción inmediata en facturación, pero aplica el **Downgrade Diferido**: los 5 asientos siguen activos hasta finalizar el mes pagado. 
   - **El Estado Sobregirado (Over Limit):** Al iniciar el nuevo mes, si el cliente mantiene 5 PCs asignadas pero solo paga 3 (`5/3`), la suite entra en "Sobregiro". El backend **suspende el acceso a toda la suite para todos los equipos** y el frontend alerta en rojo. El servicio solo se restablece cuando el administrador desvincula 2 equipos manualmente desde el panel.
3. **Cancelar Suscripción (Churn):**
   Al cancelar, el servicio expira a fin de mes. El documento de suscripción cambia a `status: "expired"` (no se borra). Las asignaciones de equipos se preservan. Si el cliente reactiva el pago, recupera inmediatamente el acceso en los equipos ya configurados.
4. **Abuso de Rotación (El "Penalty Box"):**
   Para evitar la evasión de licencias mediante la micro-rotación (ej. un empleado desasigna su PC para prestársela a otro cada hora), se impone un **Cooldown de 7 Días**. 
   - Al desvincular un `hwId` de una suite, ese equipo específico queda bloqueado en la base de datos (Penalty Box) y no puede ser reasignado a esa suite durante 7 días. El panel web notificará claramente al administrador *antes* de ejecutar la desvinculación.

---

## 5. Ejecución Cruzada y Namespaces (Resolución de Colisiones)

Para asegurar que un cliente pueda consumir código de múltiples creadores sin que los comandos de AutoCAD entren en conflicto:

1. **Resolución en el Loader (`?routine=INDEX`):**
   El endpoint que devuelve el índice de comandos disponibles analizará TODAS las licencias activas del consumidor, filtrando aquellas que estén en estado "Sobregirado".
2. **Alias Locales (Manejo Futuro de Colisiones):**
   En fases posteriores, la plataforma manejará las colisiones de nombres (ej. dos creadores tienen el comando `CORTAR`) asignando un **Alias Local** personalizado en la cuenta del cliente. El código nativo se invoca normalmente, pero el usuario dispara el alias en su consola.
3. **Ejecución Única y Caché en RAM:**
   El comando "fantasma" (JIT loader) descarga el `.lsp` **solo la primera vez** que se ejecuta. Las ejecuciones posteriores cargan el código directamente desde la RAM local, eliminando cualquier latencia y garantizando el aislamiento Zero-Disk.

---

## 6. Cuadros de Mando (Dashboards)

### 6.1 Panel del Consumidor
- **Mis Dispositivos:** Lista de HWIDs. Opción de revocar y limpiar máquinas inactivas.
- **Mis Licencias:** Tarjetas de Suites propias y compradas. Muestra ocupación en tiempo real (Ej. "2/5 Asientos"). Informa sobre estados de Sobregiro y aplica el Bloqueo Preventivo del Penalty Box al reasignar equipos.

### 6.2 Panel del Creador (Métricas)
- **Ventas y Uso:** Panel de métricas que muestra total de ingresos, cantidad de clientes únicos y total de asientos activos en todo el mundo consumiendo sus LISPs.
