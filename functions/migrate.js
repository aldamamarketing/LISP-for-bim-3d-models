const { onRequest } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

exports.runV2Migration = onRequest({ timeoutSeconds: 500 }, async (req, res) => {
    if (!admin.apps.length) admin.initializeApp();
    const db = admin.firestore();

    try {
        const groupsSnap = await db.collection('groups').get();
        const groupsMap = {};
        groupsSnap.forEach(doc => { groupsMap[doc.id] = doc.data().suiteId; });

        const groupFilesSnap = await db.collection('groupFiles').get();
        const fileToSuites = {}; 
        
        groupFilesSnap.forEach(doc => {
            const data = doc.data();
            const fileId = data.fileId;
            const groupId = data.groupId;
            
            if (fileId && groupId && groupsMap[groupId]) {
                if (!fileToSuites[fileId]) fileToSuites[fileId] = new Set();
                fileToSuites[fileId].add(groupsMap[groupId]);
            }
        });

        const batch = db.batch();
        let updateCount = 0;

        for (const [fileId, suiteIdsSet] of Object.entries(fileToSuites)) {
            const lispRef = db.collection('lispFiles').doc(fileId);
            batch.update(lispRef, { suiteIds: Array.from(suiteIdsSet) });
            updateCount++;
        }

        if (updateCount > 0) {
            await batch.commit();
        }

        res.status(200).send(`Migracion completada. Actualizados ${updateCount} lispFiles.`);
    } catch (err) {
        res.status(500).send(`Error: ${err.message}`);
    }
});
