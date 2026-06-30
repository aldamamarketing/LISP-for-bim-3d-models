---
title: 'La guía definitiva: Autoload LISP y AutoCAD (tradicional frente a Cloud JIT)'
description: 'Aprenda a cargar sus rutinas de AutoLISP automáticamente en AutoCAD. Comparamos el método appload/acad.lsp con la nueva tecnología JIT.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["add lisp to autocad", "autocad autoload lisp", "acad lsp"]
---**TL;DR:** Hay tres formas principales de *cargar automáticamente* rutinas LISP en AutoCAD: usar la carpeta *Startup Suite* (comando APPLOAD), editar el archivo `acaddoc.lsp` malicioso/propenso a fallas o adoptar la arquitectura de nube corporativa (compilación JIT), que evita la pérdida de propiedad intelectual y garantiza que todo el equipo use la misma versión del código.

Una de las búsquedas más frecuentes en el universo CAD es *"add lisp to autocad"* o *"autocad autoload lisp"*. Es el principal problema de cualquier usuario avanzado: descargas o desarrollas una rutina increíble, pero no quieres tener que arrastrarla a la pantalla o usar el comando "APPLOAD" cada vez que abres un nuevo dibujo.

En esta guía detallamos los métodos tradicionales y presentamos la evolución definitiva para las oficinas de ingeniería.

## Método 1: Startup Suite (el camino del principiante)

La forma más sencilla y accesible de forma nativa en AutoCAD.

1. Escriba `APPLOAD` en la línea de comando y presione Enter.
2.En la ventana que se abre, busque la sección "Startup Suite" (generalmente en la esquina inferior derecha) y haga clic en el botón **Contenido...**
3. Haga clic en **Agregar...** y busque su archivo `.lsp`, `.fas` o `.vlx`.
4. Cierra las ventanas. AutoCAD ahora cargará este archivo cada vez que se inicie.

**El problema:** Funciona bien para un usuario aislado. Pero si eres un BIM Manager con 20 diseñadores, tendrás que hacer esto máquina a máquina. Si actualiza la rutina, deberá pedirles a todos que reemplacen el archivo en C:.

## Método 2: Los infames `acad.lsp` y `acaddoc.lsp` (la antigua forma de CAD Manager)

Las oficinas que mantienen sus LISP en servidores de red (por ejemplo, `Z:\Routines\`) generalmente utilizan archivos de inicialización global.
AutoCAD, cuando se abre, busca automáticamente archivos llamados `acad.lsp` (se carga una vez por sesión) o `acaddoc.lsp` (se carga con cada pestaña de dibujo abierta).

Puede crear un archivo `acaddoc.lsp` que contenga:
```ceceo
(cargar "Z:\\Rutinas\\mi-rutina-1.lsp")
(cargar "Z:\\Rutinas\\mi-rutina-2.lsp")
(princ "\n¡Rutinas cargadas exitosamente!")
(principal)
```

**Altos riesgos:**
* **Lentitud extrema:** Si la red (VPN) es lenta, AutoCAD se bloqueará durante minutos al intentar cargar docenas de LISP en cada pestaña nueva.
* **Vulnerabilidad:** Los archivos `acad.lsp` son el vector número uno para los "virus de AutoCAD" (macros maliciosos que se replican eliminando comandos o bloqueando archivos guardados).
* **Robo de propiedad intelectual:** Cualquier ex empleado puede insertar un pendrive y copiar toda la carpeta de red cuyo desarrollo costó miles de reales.

## Método 3: Compilación JIT en la nube (el modo SaaS empresarial)

Si su equipo tiene más de 3 diseñadores, la "carpeta de red" es una bomba de tiempo de seguridad y versiones. Aquí es donde entra en juego la tecnología *Just-In-Time* introducida por **LispCentral**.

En lugar de cargar el código fuente en el ordenador local del empleado, LispCentral funciona como un "cargador" transparente.

> [!IMPORTANTE]
> **Cómo funciona la arquitectura de disco cero:**
> El usuario hace clic en el botón "Generar Viga" en AutoCAD. En este milisegundo exacto, nuestro cargador realiza una solicitud HTTPS cifrada a los servidores LispCentral, verifica los permisos/licencias del empleado, descarga la rutina directamente en la RAM (sin siquiera tocar el disco duro) y ejecuta el código.

### Ventajas del Método JIT (LispCentral):
1. **Implementación instantánea:** ¿Ha encontrado un error en su LISP? Corregir y subir al panel web. La próxima vez que su equipo haga clic, todos ejecutarán la versión parcheada automáticamente.
2. **Protección total:** El código `.lsp` original nunca llega a la computadora física, lo que elimina las posibilidades de robo de propiedad intelectual (IP).
3. **Administración de licencias (puestos):** A través del panel web, puede bloquear el acceso a una computadora específica con un solo clic.

## Preguntas frecuentes (FAQ)

### 1. ¿Qué sucede si la computadora del empleado pierde Internet usando JIT?
En la fase actual de LispCentral, la arquitectura garantiza la máxima seguridad a través del acceso únicamente en línea. Si el usuario está desconectado, LISP no se activará, protegiendo el código de la empresa de exportaciones no autorizadas en el modo fuera de línea.

### 2. ¿APPLOAD acepta lisp compilado?
Sí. Puede cargar automáticamente archivos `.lsp` (texto sin formato), `.fas` (compilación rápida) o `.vlx` (proyecto compilado). Sin embargo, todos ellos siguen siendo susceptibles de ser copiados físicamente por empleados malintencionados si se almacenan localmente.

### 3. ¿Cómo migro mis rutinas locales a la nube de LispCentral?
Simplemente cree una cuenta corporativa en el portal, acceda a **Workspace LISPs (Admin)** y cárguela directamente. Gestionas las suscripciones de tu equipo y los permisos de acceso desde un único panel web.