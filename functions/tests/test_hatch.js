const OpenAI = require("openai");

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: 'sk-c32540fdfffe4482b1aba7e8eb61281b'
});

const systemPrompt = `Eres un experto matemático y programador en AutoLISP.
Genera patrones de sombreado (Hatch) de AutoCAD (.pat) basados en estas descripciones.
Contexto: Pruebas de Calidad

REGLAS DE DISEÑO:
1. El código PAT debe ser válido matemáticamente. Formato: "ángulo, x-origen, y-origen, delta-x, delta-y, dash-1, dash-2".
   - ATENCIÓN CRÍTICA: "delta-x" es el desplazamiento PARALELO a la línea. "delta-y" es el desplazamiento PERPENDICULAR a la línea (separación entre líneas de la familia).
   - ERROR COMÚN A EVITAR: Para líneas verticales (ángulo 90), la separación entre columnas DEBE ir en "delta-y", NO en "delta-x". (Ej. "90, 0,0, 0,41" separa las líneas verticales 41 unidades. Si escribes "90, 0,0, 41,0", todas se dibujan en la misma columna X).
2. Genera exactamente 1 patrón de alta calidad por cada descripción.
3. PRECISIÓN ESTRUCTURAL Y DIMENSIONAL (CRÍTICO): 
   - Respeta escrupulosamente la geometría solicitada (ej. "matajuntas" o "stretcher bond" NO es "herringbone" o "espina de pez").
   - Si el usuario provee medidas (ej. 40x20cm, juntas de 1cm, ángulos), DEBES aplicar la matemática exacta para que las proporciones del Hatch reflejen esas medidas a escala 1:1.
4. Formato de salida: Objeto JSON con una propiedad "results" que sea un Array con objetos: { "id": "uuid", "name": "Name in English", "category": "Architecture", "filename": "SHORT_NAME", "description": "DETAILED description in English including ALL units and dimensions", "patCode": "0, 0,0, 0,10..." }. No incluyas la línea del nombre en el patCode. Devuelve SOLO las líneas matemáticas.`;

const prompts = [
  "1. Líneas horizontales simples separadas 10 unidades",
  "2. Cuadrícula de 20x20",
  "3. Pared de ladrillos (matajuntas) 40x20, sin juntas",
  "4. Pared de ladrillos (matajuntas) 40x20, juntas de 1 unidad",
  "5. Patrón de espina de pez (herringbone) con ladrillos de 40x10",
  "6. Líneas diagonales a 45 grados separadas 5 unidades",
  "7. Patrón de panal hexagonal (honeycomb) con lados de 10 unidades",
  "8. Baldosas octogonales con cuadrados pequeños insertados",
  "9. Patrón de zigzag horizontal con líneas a 45 y 135 grados",
  "10. Patrón de parquet de madera tipo canasta (basketweave)"
];

const userPrompt = `Descripciones:\n${prompts.join('\n')}`;

async function test() {
  console.log("Iniciando prueba con DeepSeek...");
  try {
    const completion = await openai.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      model: "deepseek-chat", // Usando deepseek-chat ya que la API puede diferir en nombres.
      response_format: { type: "json_object" }
    });
    
    console.log("Respuesta obtenida:");
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error(error);
  }
}
test();
