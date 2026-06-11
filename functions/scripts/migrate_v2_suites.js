const admin = require('firebase-admin');
const fs = require('fs');

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function migrate() {
    console.log("Iniciando migración V2: Sincronización de suiteIds en lispFiles...");

    try {
        // 1. Obtener todos los grupos para tener el mapeo groupId -> suiteId en memoria
        const groupsSnap = await db.collection('groups').get();
        const groupsMap = {};
        groupsSnap.forEach(doc => {
            groupsMap[doc.id] = doc.data().suiteId;
        });
        console.log(`Cargados ${groupsSnap.size} grupos en memoria.`);

        // 2. Obtener todos los groupFiles
        const groupFilesSnap = await db.collection('groupFiles').get();
        const fileToSuites = {}; // fileId -> Set(suiteId)
        
        groupFilesSnap.forEach(doc => {
            const data = doc.data();
            const fileId = data.fileId;
            const groupId = data.groupId;
            
            if (fileId && groupId && groupsMap[groupId]) {
                if (!fileToSuites[fileId]) {
                    fileToSuites[fileId] = new Set();
                }
                fileToSuites[fileId].add(groupsMap[groupId]);
            }
        });
        
        console.log(`Analizados ${groupFilesSnap.size} groupFiles. Identificados ${Object.keys(fileToSuites).length} lispFiles únicos asociados a suites.`);

        // 3. Actualizar los lispFiles con el array suiteIds
        const batch = db.batch();
        let updateCount = 0;

        for (const [fileId, suiteIdsSet] of Object.entries(fileToSuites)) {
            const suiteIdsArray = Array.from(suiteIdsSet);
            const lispRef = db.collection('lispFiles').doc(fileId);
            batch.update(lispRef, { suiteIds: suiteIdsArray });
            updateCount++;
            
            if (updateCount % 400 === 0) { // Firestore batch limit is 500
                await batch.commit();
                console.log(`Committed batch de ${updateCount} actualizaciones...`);
            }
        }

        if (updateCount > 0 && updateCount % 400 !== 0) {
            await batch.commit();
        }

        console.log(`Migración completada exitosamente. Se actualizaron ${updateCount} lispFiles con el array suiteIds.`);
        process.exit(0);
    } catch (error) {
        console.error("Error durante la migración:", error);
        process.exit(1);
    }
}

migrate();
