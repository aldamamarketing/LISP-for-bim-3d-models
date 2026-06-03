const http = require('http');

let pendingCommand = null;
let commandResult = null;
let resultReady = false;

const server = http.createServer((req, res) => {
    // CORS headers para permitir llamadas desde el HTML en AutoCAD
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // El AutoCAD HTML consulta si hay comandos pendientes
    if (req.url === '/command' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ command: pendingCommand }));
        pendingCommand = null; // Lo limpiamos una vez enviado
    } 
    // El AutoCAD HTML envía el resultado de la evaluación
    else if (req.url === '/result' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            commandResult = body;
            resultReady = true;
            res.writeHead(200);
            res.end('OK');
        });
    }
    // El Agente inyecta un comando
    else if (req.url === '/evaluate' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            pendingCommand = body;
            resultReady = false;
            commandResult = null;
            res.writeHead(200);
            res.end('Command queued.');
        });
    }
    // El Agente lee el resultado
    else if (req.url === '/evaluate/result' && req.method === 'GET') {
        if (resultReady) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(commandResult || "undefined");
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Pending');
        }
    }
    else {
        res.writeHead(404);
        res.end();
    }
});

const PORT = 3010;
server.listen(PORT, () => {
    console.log(`📡 Agent Bridge Server escuchando en puerto ${PORT}`);
});
