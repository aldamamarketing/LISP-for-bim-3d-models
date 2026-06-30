---
title: 'El Caos de acad.lsp: Cómo gestionar y proteger la Propiedad Intelectual (IP) de su código'
description: 'Descubra cómo los virus de AutoCAD utilizan acad.lsp y comprenda por qué almacenar rutinas LISP en carpetas de red expone a su empresa al robo de propiedad intelectual.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1510511459019-5efa32f5fb1b?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["lisp programming", "acad lsp", "autocad lisp command"]
---**TL;DR:** Administrar la automatización de su LISP mediante la distribución de archivos en la red de la empresa a través de `acad.lsp` es un modelo obsoleto. Además de la gran vulnerabilidad a los virus de macro que destruyen los archivos DWG, el código fuente propietario de la empresa está expuesto a robos en pendrives e intrusiones fuera de línea. El mercado avanza hacia plataformas SaaS (como LispCentral), donde el código reside en servidores cifrados y se ejecuta mediante inyección de RAM (Zero-Disk).

Todo administrador CAD/BIM experimentado conoce el valor de un código bien construido. Una rutina de AutoLISP capaz de detallar escaleras, perfiles metálicos estructurales o extraer cantidades complejas representa decenas de horas y miles de dólares en investigación y desarrollo.

Sin embargo, muchas empresas tratan esta *Propiedad Intelectual (PI)* de la peor manera posible: guardando el archivo `rotina-miraculosa.lsp` en el disco `Z:\Rede\CAD\`.

## El fallo de seguridad fundamental de "acad.lsp"

Cuando se inicia AutoCAD o cuando se abre un nuevo proyecto (`.dwg`), sigue una rutina de verificación. Si existe un archivo llamado `acad.lsp` o `acaddoc.lsp` en el mismo directorio que el archivo del proyecto, o en la red configurada como *Ruta de soporte*, AutoCAD carga y ejecuta este código LISP de forma ciega.

> [!ADVERTENCIA]
> **El vector de ataque de virus de AutoCAD:**
> Los piratas informáticos y los primeros programas maliciosos escriben "virus de macro" en AutoCAD utilizando este defecto. El virus LISP se copia a sí mismo en todas las carpetas de la red infectando archivos `acad.lsp`. Al abrir el DWG, bloquea los comandos `EXPLODE` o `BURST`, dañando la usabilidad del proyecto hasta que se escanea manualmente.

### ¿Por qué el cifrado NATIVO (.FAS/.VLX) no es suficiente?

Autodesk ofrece una herramienta de compilación visual (Make Application) que convierte el archivo de texto `.lsp` en archivos binarios indescifrables: `.fas` (Fast Load) o `.vlx` (Visual Lisp Executable).

Esto protege su "secreto comercial" contra competidores que lean su código, ¿verdad? **Parcialmente.**
Incluso si el empleado malintencionado (o competidor) no puede "leer" el código fuente de su `.vlx`, aún puede **robar y ejecutar el archivo**. Si copia el archivo compilado en el pendrive y lo lleva a abrir su propia empresa, la herramienta (que rentabiliza toda la automatización de su empresa) seguirá funcionando perfectamente allí.

## La respuesta del mercado moderno: arquitectura SaaS JIT

Por eso las empresas de tecnología dejaron de distribuir CD y empezaron a ofrecer servicios en la nube (Netflix vs Blockbuster).

La plataforma **LispCentral** trae esta tecnología SaaS a AutoLISP, protegiendo su infraestructura con lo que llamamos **Compilación y ejecución JIT (Just-In-Time)**.

**Cómo tu automatización es 100% segura con LispCentral:**
1. No guarda LISP en la red local. Los registras (subes) en tu Panel LispCentral vía web (Firebase Hosting de alta seguridad).
2. Su empleado utiliza AutoCAD con la **Paleta LispCentral**. Cuando hace clic en "Generar Pilar", la Paleta envía una solicitud de autenticación a través de Token (HTTPS).
3. El servidor verifica: "¿Tiene este usuario una licencia y permiso activos en su Panel?"
4. En caso afirmativo, el servidor devuelve el código LISP y se inyecta directamente en la **RAM** de AutoCAD.

El *archivo LISP nunca escribe ni un solo byte en el disco duro* de la computadora local del empleado. Si el empleado deja la empresa y usted apaga su llave en el Panel LispCentral, en el siguiente segundo ya no se ejecuta nada. No se robaron IP corporativas.

## Preguntas frecuentes (FAQ)

### 1. Mi servidor tiene bloqueo de puertos y Active Directory (AD). ¿Son seguros mis LISP en la red?
Quizás contra hackers externos. Contra *amenazas internas* (el ex empleado con un pendrive/Google Drive copiando las herramientas para abrir su propia consultoría), no. La única forma de proteger las amenazas internas es eliminar el código local de la ecuación.

### 2. ¿Qué pasa si AutoCAD no tiene acceso a Internet cuando ejecuta LispCentral JIT?
La arquitectura de LispCentral se basa en la filosofía de **Seguridad sólo en línea**. En ubicaciones remotas sin ninguna señal (sitios de construcción aislados vía satélite), la rutina no validará la sesión (para evitar el secuestro de la versión en caché) y no se ejecutará. El costo es insignificante dada la garantía de propiedad intelectual inviolable.

### 3. ¿Cómo limpiar un virus alojado en archivos "acad.lsp"?
Autodesk pone a disposición la herramienta **AutoCAD Security Tool** de forma gratuita en el repositorio de App Store o simplemente bloqueando la variable del sistema `ACADLSPASDOC=0` y el uso estricto de `SECURELOAD`. Consulte nuestra documentación oficial para conocer las mitigaciones técnicas.