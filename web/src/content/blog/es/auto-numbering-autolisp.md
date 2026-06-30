---
title: 'Auto Numbering en AutoLISP: La Lógica de Bucles (Loops) para Textos Secuenciales'
description: 'Aprende a crear rutinas AutoLISP de auto-numeración usando bucles while y repeat. Oculta la matemática compleja y emite textos en serie en AutoCAD.'
pubDate: 2026-05-28
heroImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop'
author: 'Equipo LispCentral'
tags: ["auto numbering in autocad lisp", "cad lisp routines", "autolisp macro application"]
---

**TL;DR:** Crear textos secuenciales (1, 2, 3...) manualmente en AutoCAD es propenso a errores. Un simple bucle `(while)` en AutoLISP puede solicitar el clic del usuario indefinidamente, incrementando un número inicial y dibujando la entidad de texto (`entmake`) dinámicamente. Esta es la esencia de la automatización paramétrica en la ingeniería.

Si estás diseñando espacios de estacionamiento, numerando estacas topográficas o identificando ejes de estructura, escribir "1", copiar, pegar y editar a "2" es el extremo opuesto a la productividad.

Por eso, "auto numbering in autocad lisp" es una de las búsquedas más tradicionales para quienes quieren aprender a programar en LISP.

## La Anatomía Lógica del "Auto-Numerador"

Para que una rutina LISP emita números en secuencia al hacer clic en la pantalla, necesitas dominar tres conceptos fundamentales del lenguaje:

1.  **Variables Globales (Memoria Dinámica):** Almacenar cuál fue el "último número" utilizado, para que la próxima vez que llames al comando, continúe desde el número correcto.
2.  **El Bucle de Repetición (`while`):** Hacer que AutoCAD "atrape" al usuario en el comando hasta que presione *Esc* o *Enter*.
3.  **Creación Rápida de Entidades (`entmake`):** Evitar el comando nativo `_TEXT` (que es lento y está sujeto a configuraciones de estilos locales) e inyectar el objeto de Texto directamente en la base de datos de AutoCAD.

### El Fragmento de Código Básico

A continuación, hay un pseudo-código que demuestra la lógica matemática del incremento continuo (bucle):

```lisp
(defun c:AutoNum ( / pto str)
  ;; Pide al usuario el número inicial si no existe
  (if (not *LispCentral-Num*) (setq *LispCentral-Num* 1))
  
  ;; El bucle 'while' mantiene al usuario solicitando puntos en la pantalla
  (while (setq pto (getpoint "\nHaz clic para insertar el número: "))
    
    ;; Convierte el número entero (1) a string ("1")
    (setq str (itoa *LispCentral-Num*))
    
    ;; Crea el texto mediante manipulación directa de la base de datos (rápido y seguro)
    (entmake (list '(0 . "TEXT") (cons 10 pto) (cons 40 2.5) (cons 1 str)))
    
    ;; Incrementa la variable matemática en +1
    (setq *LispCentral-Num* (1+ *LispCentral-Num*))
  )
  (princ)
)
```

> [!IMPORTANT]
> **Consejo Pro:** Observa el asterisco en `*LispCentral-Num*`. En la nomenclatura LISP, las variables con asterisco en ambos lados no se limpian al final del comando (`/ pto str`). Esto asegura que "recuerden" su valor entre la ejecución de un comando y otro.

## Escalando el Problema: Equipos y Prefijos Complejos

La lógica anterior resuelve el problema para 1 dibujante haciendo estacas simples.
Sin embargo, en la realidad corporativa (BIM), la nomenclatura suele ser compleja: `"ESTACA-01-A"`, `"VIGA-P02-L1"`. 

Cuando la complejidad aumenta y necesitas paneles HTML elegantes en AutoCAD (`OpenDCL` o Paletas React), la programación manual en AutoLISP comienza a volverse pesada. 

Es en este punto donde entra la tecnología de **LispCentral**. Te permitimos crear interfaces web hermosas que se comunican de forma nativa con AutoCAD. Tu equipo solo necesitará completar un formulario "Prefijo: VIGA-", "Inicio: 1", y la nube se encargará de todo lo demás.

## Preguntas Frecuentes (FAQ)

### 1. ¿El auto-numerador LISP reemplaza a AutoCAD Civil 3D o Revit?
Depende del caso de uso. El software estrictamente BIM o de infraestructura (Civil 3D) tiene un etiquetado automático inteligente vinculado a los ejes (Alineaciones). Sin embargo, usar LISP en AutoCAD es miles de veces más ligero y versátil para marcadores genéricos, diagramas eléctricos y esquemas P&ID.

### 2. ¿El comando "TCOUNT" (Express Tools) ya no hace auto-numbering?
Sí, Express Tools tiene el comando nativo `TCOUNT`. La diferencia es que TCOUNT *reemplaza* los textos ya existentes. Necesitas tener los textos ya dibujados en la pantalla para luego aplicar TCOUNT. El LISP personalizado (mostrado en este artículo) dibuja los textos *al hacer clic*, lo que lo hace mucho más dinámico para el mapeo de puntos.

### 3. ¿Cómo puedo probar esta rutina de numeración?
Puedes pegar el fragmento de código anterior en la línea de comandos de AutoCAD, escribir `AutoNum` y probarlo. Si deseas crear una interfaz profesional para esta herramienta y distribuirla a tu empresa de ingeniería en la nube sin temor a que te roben el código, crea tu cuenta *Beta* en el portal LispCentral.
