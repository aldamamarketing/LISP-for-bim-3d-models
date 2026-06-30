---
title: 'AutoCAD LT ahora es compatible con LISP: cómo preparar su oficina'
description: 'Comprenda la reciente actualización de Autodesk que lanzó el uso de rutinas de AutoLISP en AutoCAD LT y descubra cómo distribuir herramientas corporativas.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1581092921461-7d603a115ab3?q=80&w=1200&auto=format&fit=crop'
author: 'Equipe LispCentral'
tags: ["autocad lt lisp", "autocad 2023 lisp", "autolisp autocad"]
---**TL;DR:** Durante casi tres décadas, **AutoCAD LT** ("Lite") estuvo estrictamente limitado y limitado a la automatización a través de AutoLISP, lo que obligó a las empresas a comprar licencias "completas" solo para ejecutar macros de productividad. A partir de la actualización de 2024, Autodesk sorprendió al mercado al activar la compatibilidad nativa con LISP en AutoCAD LT.

La búsqueda de *"autocad lt lisp"* despegó en los foros de CAD y Google. Esto sucede porque una gran parte del mercado utiliza la versión LT por motivos de coste. El lanzamiento de la automatización en AutoCAD LT cambia drásticamente el panorama empresarial.

## La Historia: La Barrera de Costos

Hasta hace poco, el principal punto de venta de la versión completa de AutoCAD no era necesariamente la capacidad de modelado 3D, sino más bien **Soporte y extensibilidad de API** (AutoLISP, .NET, ObjectARX).

Si una oficina de ingeniería tenía 15 diseñadores que necesitaban ejecutar una rutina simple de "Bloque Cuantitativo" desarrollada internamente, el BIM Manager se vio obligado a aprobar la compra de 15 costosas suscripciones completas de AutoCAD, justificando la monstruosa diferencia de precio anual.

## ¿Qué cambia con AutoLISP en AutoCAD LT?

Con la reciente actualización, los usuarios de AutoCAD LT han obtenido el superpoder de cargar archivos `.lsp`, `.fas` y `.vlx`.

> [!CONSEJO]
> **Lo que YA PUEDES hacer en AutoCAD LT:**
> * Cargar rutinas LISP (.lsp) que automatizan dibujos 2D.
> * Utilice el comando `APPLOAD`.
> * Crear atajos personalizados basados ​​en rutinas.

> [!ADVERTENCIA]
> **Lo que AutoCAD LT AÚN NO PUEDE hacer:**
> * Ejecute complementos complejos en `.NET` (DLL) nativo o `ObjectARX`.
> * Rutinas LISP que invocan comandos 3D complejos o renderizado (ya que el motor LT carece del *Solid Modeler* completo).

## El Nuevo Reto: Distribución de Herramientas Corporativas

El lanzamiento generó un efecto secundario inesperado: decenas de oficinas que antes no utilizaban LISP debido a limitaciones técnicas ahora están inundando sus servidores locales con rutinas descargadas de Internet para todo el equipo. Esto creó una pesadilla de gestión y seguridad (el caos de las versiones de macros y los virus).

### La solución LispCentral

Aquí es donde se hace necesaria la transición de un "cuadro aislado" a una **gestión corporativa**.

Si tiene 20 diseñadores que utilizan AutoCAD LT y acaba de comprar/desarrollar una *Architecture Suite* en LISP, ¿cómo se asegura de que todos usen la misma versión y nadie copie el archivo en casa?

**LispCentral** te permite tomar el control. En lugar de enviar el archivo LISP por correo electrónico, lo carga en nuestra plataforma Cloud. LispCentral funciona como un conector (compilador JIT): el usuario de AutoCAD LT hace clic en el botón y la nube entrega la rutina directamente a la RAM de la máquina, cifrada.

## Preguntas frecuentes (FAQ)

### 1. ¿AutoCAD LT 2022 o 2023 ejecuta LISP?
No de forma nativa. Autodesk ha lanzado oficialmente la funcionalidad a partir de AutoCAD LT 2024. Las versiones anteriores de LT permanecen bloqueadas para la automatización de AutoLISP.

### 2. ¿Se ejecutarán las antiguas rutinas de AutoLISP en el nuevo AutoCAD LT?
En la gran mayoría de los casos, sí. Mientras la rutina manipule entidades 2D (Líneas, Polilíneas, Círculos, Texto, Bloques) o extraiga datos (Atributos, DXF), rotará perfectamente. Si la rutina invoca el modelado "3DSOLID", falla.

### 3. ¿Puedo utilizar la plataforma LispCentral en mi AutoCAD LT?
¡Sí! El "Loader" de LispCentral fue diseñado para ser universal y se ejecuta de forma nativa en el nuevo AutoCAD LT, lo que permite a las oficinas con licencias mixtas (Full y LT) utilizar el mismo Hub en la nube para gestionar sus automatizaciones.