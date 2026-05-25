// LispCentral - JavaScript UI Logic & AutoCAD Communication
// Archivo: main_loader.js

// 1. Manejo de Pestañas (UI)
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    // Activa la pestaña clickeada
    event.currentTarget.classList.add('active');
    document.getElementById('panel-' + tabId).classList.add('active');
}

// 2. Comunicación JS -> LISP (Dibujar Perfil)
function drawSteelProfile() {
    const perfil = document.getElementById('sel-perfil').value;
    const vista = document.getElementById('sel-vista').value;

    // En un entorno de producción con la API de AutoCAD:
    if (typeof Acad !== 'undefined') {
        // Pasamos variables al entorno LISP antes de ejecutar el comando
        // Nota: esto es un approach común. Otro es que LISP llame a una función JS para pedir los datos.
        Acad.Editor.executeCommand(`(setvar "USERS1" "${perfil}") `);
        Acad.Editor.executeCommand(`(setvar "USERS2" "${vista}") `);

        // Ejecutamos el comando LISP
        Acad.Editor.executeCommand("LC_STEEL_DRAW ");
    } else {
        // Fallback para pruebas en navegador normal
        console.log(`[LispCentral Mockup] Comando enviado a AutoCAD: LC_STEEL_DRAW. Perfil: ${perfil}, Vista: ${vista}`);
        alert(`Comando de dibujo enviado al motor.\nPerfil: ${perfil}\nVista: ${vista}`);
    }
}

// 3. Comunicación LISP -> JS (Cubicación BOM)
function calculateBOM() {
    if (typeof Acad !== 'undefined') {
        // Ejecutamos el comando LISP que escanea el dibujo y genera el JSON
        Acad.Editor.executeCommand("LC_BOM_EXPORT ");

        // Asumimos que hay un mecanismo de "callback" o que el LISP guarda en C:\Temp\lc_bom.json
        // En un entorno real, usaríamos una promesa y leeríamos el archivo/variable.
        alert("Comando LC_BOM_EXPORT ejecutado. \n(En producción, la tabla se actualizaría automáticamente leyendo el JSON resultante).");

    } else {
        console.log("[LispCentral Mockup] Simulando lectura de JSON desde LISP...");

        // Simulamos la respuesta del LISP (El JSON que escupió LC_BOM_EXPORT.lsp)
        const mockJsonResponse = [
            {"id": "2E4A", "tipo": "W12x26", "longitud": 6.00, "peso": 232.20},
            {"id": "2E4B", "tipo": "W12x26", "longitud": 4.50, "peso": 174.15},
            {"id": "2E4C", "tipo": "W14x30", "longitud": 5.00, "peso": 223.50}
        ];

        renderBomTable(mockJsonResponse);
    }
}

// Renderiza los datos en la tabla HTML
function renderBomTable(data) {
    const tbody = document.getElementById('bom-body');
    tbody.innerHTML = ''; // Limpiar tabla

    let pesoTotal = 0;

    data.forEach(item => {
        pesoTotal += item.peso;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.tipo}</td>
            <td>${item.longitud.toFixed(2)}</td>
            <td>${item.peso.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    // Fila de Total
    const rowTotal = document.createElement('tr');
    rowTotal.style.fontWeight = "bold";
    rowTotal.style.backgroundColor = "#555";
    rowTotal.innerHTML = `
        <td colspan="2" style="text-align: right;">TOTAL:</td>
        <td>${pesoTotal.toFixed(2)} kg</td>
    `;
    tbody.appendChild(rowTotal);
}
