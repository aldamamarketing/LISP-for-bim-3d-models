# Architectural Plan: Smart Mapping & Renaming

Este plan aborda las nuevas directivas para el motor de auditoría.

## 1. Renombramiento de Capas (Layer Renaming) - Fase 1b
En lugar de intentar borrar y recrear, renombraremos las capas "Extra" para que coincidan con las capas "Faltantes" (Missing) del estándar.
- **Complejidad LISP**: Muy Baja. AutoLISP tiene el comando (command "-rename" "la" "Vieja" "Nueva"). Al hacer esto, todos los objetos en la capa vieja se mantienen intactos, simplemente la capa cambia de nombre.
- **Flujo UI**: En la sección roja ("Extra in DWG"), el usuario podrá seleccionar una capa "Extra" y asignarle un nombre del estándar. Al inyectar a AutoCAD, enviaremos los comandos -rename.

## 2. Limitación Técnica de los Dropdowns (CEF Sharp / React)
Has mencionado: *"asegurate que el dropdaw no sea nativo de windos y no este limitado a la paleta, que se desborde sobre el dibujo si necesario"*.
> [!WARNING]
> **Limitación Infranqueable del Navegador:**
> En tecnologías web integradas (como la Paleta de AutoCAD), la ventana de la paleta es como un "televisor". Una interfaz web construida con <div> (un dropdown personalizado no nativo) **NUNCA** puede salirse físicamente de la pantalla del televisor hacia la pared (el dibujo de AutoCAD). Si la paleta es muy estrecha, el dropdown de React se recortará u ocultará con scroll.
>
> La **ÚNICA** forma de que un dropdown se desborde visualmente por encima de los límites de la paleta hacia el dibujo de AutoCAD, es utilizando la etiqueta HTML nativa <select>. El sistema operativo toma control del <select> y lo dibuja por encima de todo. 
> **Decisión requerida:** Debemos elegir entre un Dropdown hermoso pero limitado por los bordes de la paleta, o el <select> nativo de Windows que sí puede desbordarse.

## 3. Mapeo de Objetos por Estilo a Capas (Fase 2)
Has propuesto vincular estilos de texto a capas específicas (ej: *"Todo texto con estilo X, muévelo a la capa Y"*).
- **Complejidad LISP**: Baja/Media. Es fácil de programar: (setq ss (ssget "X" '((0 . "TEXT,MTEXT") (7 . "NombreEstilo")))) y luego modificar las propiedades de ese grupo para cambiar su capa.
- **Complejidad UI/UX**: Media. Requiere crear una nueva vista o sub-panel en el Editor de Estándares (SaaS) donde el BIM Manager pueda definir estas "Reglas de Mapeo" y guardarlas en la base de datos de Firebase.
- **Viabilidad**: Altamente viable y es una "killer feature" para limpiar planos desastrosos de arquitectos externos.

## Open Questions
1. **Dropdowns**: Entendiendo la limitación explicada arriba, ¿prefieres usar un dropdown web personalizado (React/Tailwind) aceptando que si la paleta es angosta se verá recortado/con scroll, o prefieres el <select> clásico nativo de Windows?
2. **Prioridad**: ¿Deseas que proceda ahora mismo con la programación del **Renombramiento de Capas** en la interfaz actual (DiffMergePanel), o prefieres dejar todo esto documentado y continuar con otro flujo del proyecto?
