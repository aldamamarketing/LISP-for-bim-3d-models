const { execSync } = require('child_process');

const PROJECT_ID = 'lispcentral';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

console.log("Obteniendo token de acceso de Google Cloud...");
const token = execSync('gcloud auth print-access-token').toString().trim();

const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function cleanCustomPats() {
    console.log(`\nBuscando patrones personalizados en publicAssets...`);
    const queryPayload = {
        structuredQuery: {
            from: [{ collectionId: 'publicAssets' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'type' },
                    op: 'EQUAL',
                    value: { stringValue: 'hatch' }
                }
            }
        }
    };

    const res = await fetch(`${BASE_URL}:runQuery`, {
        method: 'POST',
        headers,
        body: JSON.stringify(queryPayload)
    });

    if (!res.ok) {
        console.error(`Error querying:`, await res.text());
        return;
    }

    const results = await res.json();
    let count = 0;
    for (const doc of results) {
        if (doc.document && doc.document.name) {
            console.log(`Borrando ${doc.document.name}...`);
            const delRes = await fetch(`https://firestore.googleapis.com/v1/${doc.document.name}`, {
                method: 'DELETE',
                headers
            });
            if (!delRes.ok) {
                console.error(`Error al borrar ${doc.document.name}`);
            } else {
                count++;
            }
        }
    }
    console.log(`\n¡Listo! Se eliminaron ${count} patrones con errores de la base de datos.`);
}

cleanCustomPats().catch(console.error);
