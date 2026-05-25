# 🤖 Análisis de Viabilidad: Integración de IA y MCP en AutoCAD vía LispCentral

Esta es una evaluación de la propuesta de evolucionar la arquitectura híbrida (CLI + Paleta Web) de LispCentral para integrar Inteligencia Artificial mediante el estándar **MCP (Model Context Protocol)**, transformando la paleta web en una interfaz conversacional/voz que ejecuta herramientas BIM en 2D/3D.

---

## 1. Viabilidad Técnica: ¿Es Posible?
**Absolutamente sí, y la arquitectura actual es el caldo de cultivo perfecto.**
Al tener ya una Paleta Web (HTML/JS) que se comunica bidireccionalmente con el motor de AutoCAD (AutoLISP) y al tener la geometría con un "ADN" estructurado en JSON (LDATA), tienes resuelto el 80% del desafío técnico.

Un LLM (como Claude, GPT-4 o herramientas locales) no puede ver líneas en la pantalla, pero **sí puede leer y generar JSON**. Si el LISP extrae el LDATA de un plano y lo pasa al JS de la paleta, la paleta puede usar MCP para alimentar al LLM con ese "contexto".

### La Arquitectura Propuesta (LispCentral AI)
1.  **Interfaz (Oídos y Boca):** La paleta web contiene un chat (o reconocimiento de voz vía Web Speech API).
2.  **El Cerebro (MCP Client + LLM):** El JavaScript actúa como cliente. Analiza la intención del usuario.
3.  **Las Herramientas (MCP Servers/Tools):** Los comandos LISP actuales (`LC_STEEL_DRAW`, `LC_BOM_EXPORT`, `LC_PROPERTIES`) se exponen como *Tools* (Herramientas) que el LLM puede invocar.
4.  **Los Ojos (LDATA a JSON):** Cuando el usuario dice *"¿Qué viga es esta?"* o *"Cambia todas las vigas W12x26 a W14x30"*, el LISP escanea el dibujo, convierte el LDATA de las entidades seleccionadas a JSON, y se lo pasa al LLM. El LLM responde con un comando: `(LC_API_MODIFY "W14x30")`.

---

## 2. Pros (Las Ventajas Competitivas)

*   **1. Curva de Aprendizaje Cero para el Usuario Final:** En lugar de aprender 50 comandos o buscar botones en el Ribbon, el ingeniero simplemente escribe/habla: *"Genera una grilla de 5x5 metros y pon columnas W10x12 en las intersecciones"*.
*   **2. Automatización Masiva de Tareas Tediosas:**
    *   *Ejemplo:* "Ponle una cota a todas las puertas del plano". El LLM llama a la herramienta `LC_AUTO_DIM_DOORS`.
    *   *Ejemplo:* "Hazme un cuadro de rumbos de esta parcela y expórtalo a Excel".
*   **3. Interrogación del Modelo BIM:** Darle "ojos" a la IA mediante LDATA es el verdadero Game Changer. El usuario puede preguntar: *"¿Cuál es el peso total de acero en esta vista?"* El LLM pide al LISP ejecutar `LC_BOM_EXPORT`, lee el JSON resultante y le responde al humano en lenguaje natural.
*   **4. Resurrección de la Consola (CLI Híbrido):** Al mantener el CLI activo, los usuarios veteranos pueden seguir tecleando rápido, pero los usuarios nuevos pueden apoyarse en la IA en la paleta web.

---

## 3. Contras y Desafíos Técnicos (La Realidad)

*   **1. Latencia y Asincronismo (AutoCAD se congela):** AutoCAD es *Single-Threaded* (monohilo). Si el JavaScript hace una petición a la API de OpenAI y tarda 5 segundos en responder para luego ejecutar un comando LISP, el usuario podría sentir que AutoCAD se trabó. **Solución:** Buen manejo de UI (spinners de carga en la web) y ejecución estrictamente asíncrona.
*   **2. Alucinaciones Destructivas:** Si le dices a la IA *"Borra la viga que sobra"*, el LLM podría interpretar mal la geometría y borrar un eje estructural crítico. **Solución:** La IA *nunca* debe borrar o modificar directamente. Debe proponer el comando LISP en la paleta web, mostrar un previo (highlight de las entidades afectadas) y requerir que el humano presione *"Aprobar"*.
*   **3. El Límite del Contexto Espacial:** Un LLM es terrible entendiendo coordenadas XYZ absolutas o topología visual compleja ("esta viga está tocando a aquella otra"). **Solución:** El LISP debe pre-procesar las relaciones espaciales. En lugar de darle coordenadas crudas a la IA, el LISP debe darle grafos lógicos: `{"Viga_A": {"conectada_a": ["Columna_B", "Viga_C"]}}`.
*   **4. Costos de API (SaaS):** Integrar llamadas a LLMs robustos aumentará tus costos operativos como proveedor SaaS. Deberás crear tiers de suscripción (ej. "LispCentral Pro con Copilot").

---

## 4. Conclusión y Siguiente Paso

La idea no solo es viable, sino que es hacia donde se dirige la industria (ej. *Revit Copilot*, *BricsCAD AI*).

Dado que confirmaste que **el CLI seguirá siendo la entrada principal** y la Paleta Web un complemento visual/interactivo, el paso natural es estructurar tus próximos scripts LISP para que funcionen de 3 maneras simultáneamente:
1.  **Vía CLI:** `C:LC_STEEL_DRAW` (Pide puntos con `getpoint`).
2.  **Vía Paleta Web (Click):** Botones que modifican propiedades y actualizan el LDATA.
3.  **Vía IA (Silencioso/Headless):** Funciones `(LC_API_STEEL_DRAW p1 p2 perfil)` que no interactúan con el usuario, solo reciben argumentos exactos generados por el LLM.