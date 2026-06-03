const cmd = `(async function() {
    try {
        // 1. Fake exec para engañar a Autodesk.AutoCAD.js
        window.exec = function(jsonStr) {
            if (typeof execAsync !== 'undefined') {
                execAsync(jsonStr).catch(e => console.error(e));
                return '{"retCode": 0}';
            }
            return '{"retCode": 0}';
        };
        
        // 2. Cargar el script oficial de Autodesk dinámicamente
        const script = document.createElement('script');
        script.src = 'https://df-prod.autocad360.com/jsapi/v3/Autodesk.AutoCAD.js';
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject("Error cargando Autodesk.AutoCAD.js");
        });
        
        // Esperar un momento a que inicialice
        await new Promise(r => setTimeout(r, 500));
        
        if (typeof Acad === 'undefined' || !Acad.Editor) {
            return "Autodesk API cargada, pero 'Acad' no está disponible.";
        }
        
        if (Acad.Editor.executeCommandAsync) {
            // Intentamos ejecutar
            const res = await Acad.Editor.executeCommandAsync('(alert "HOLA DESDE EL POLYFILL PERFECTO")\\n');
            return "SUCCESS: " + res;
        }
        
    } catch(e) {
        return "ERROR: " + e.toString();
    }
})()`;

async function run() {
    await fetch('http://localhost:3010/evaluate', { method: 'POST', body: cmd });
    while (true) {
        const res = await fetch('http://localhost:3010/evaluate/result');
        if (res.status === 200) {
            console.log(await res.text());
            break;
        }
        await new Promise(r => setTimeout(r, 500));
    }
}

run();
