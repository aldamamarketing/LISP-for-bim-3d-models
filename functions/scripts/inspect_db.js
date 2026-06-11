const admin = require('firebase-admin');

if (!admin.apps.length) {
    admin.initializeApp({ projectId: 'lispcentral' });
}

const db = admin.firestore();

async function inspectDb() {
    console.log("--- DB INSPECTION ---");

    const users = await db.collection('users').get();
    console.log(`Users count: ${users.size}`);
    users.docs.forEach(d => console.log(` - User ${d.id}:`, d.data().subscribedSuites));

    const suites = await db.collection('suites').get();
    console.log(`Suites count: ${suites.size}`);

    const groups = await db.collection('groups').get();
    console.log(`Groups count: ${groups.size}`);

    const groupFiles = await db.collection('groupFiles').get();
    console.log(`GroupFiles count: ${groupFiles.size}`);

    const lispFiles = await db.collection('lispFiles').get();
    console.log(`LispFiles count: ${lispFiles.size}`);
    lispFiles.docs.forEach(d => console.log(` - LispFile ${d.id}: suiteIds = ${d.data().suiteIds}`));

    const commands = await db.collection('commands').get();
    console.log(`Commands count: ${commands.size}`);
    commands.docs.forEach(d => console.log(` - Command ${d.id}: lispFileId = ${d.data().lispFileId}`));

    process.exit(0);
}

inspectDb().catch(console.error);
