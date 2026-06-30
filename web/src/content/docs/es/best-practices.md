---
title: "Mejores Prácticas y Dependencias"
description: "Aprende a estructurar tu código para entrega JIT y gestionar dependencias con LC:Require."
icon: "build"
---
Para alinear tu código antiguo a la arquitectura en la nube y aprovechar la carga Just-In-Time (JIT), sigue estas reglas:

- **Centralizar Lógica:** Un archivo descargado carga todos sus comandos internos en memoria al instante. Agrupa comandos relacionados.
- **LC:Require:** Si un script depende de otro (ej. librería matemática), usa `(LC:Require "NombreLibreria")` en la parte superior de tu LISP.
- **Permisos de Suite:** El archivo principal y sus dependencias DEBEN pertenecer a la misma Suite en LispCentral para pasar las validaciones de DRM.
