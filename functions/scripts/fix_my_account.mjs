import fs from 'fs';

async function run() {
  try {
    const authConfigRaw = fs.readFileSync('../web/test_e2e.mjs', 'utf8');
    const apiKeyMatch = authConfigRaw.match(/apiKey:\s*"([^"]+)"/);
    const projectIdMatch = authConfigRaw.match(/projectId:\s*"([^"]+)"/);
    
    if (!apiKeyMatch || !projectIdMatch) {
       console.log("Could not parse config from test_e2e.mjs");
       process.exit(1);
    }
    
    const apiKey = apiKeyMatch[1];
    const projectId = projectIdMatch[1];
    const uid = '087wYtSrpcau1MBeCAeUi38um3x1'; // Your user ID from previous E2E runs

    // Authenticate using the REST API to get a token
    console.log("Authenticating...");
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: "123456@gmail.com",
        password: "password123", // Using the mock pass from previous tests
        returnSecureToken: true
      })
    });
    
    const authData = await authRes.json();
    if (!authData.idToken) {
       console.log("Failed to auth. Data:", authData);
       process.exit(1);
    }
    console.log("Authed.");

    const idToken = authData.idToken;

    // Use Firestore REST API to check for global suite
    const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
    
    const queryPayload = {
      structuredQuery: {
        from: [{ collectionId: 'subscriptions' }],
        where: {
          compositeFilter: {
            op: 'AND',
            filters: [
              { fieldFilter: { field: { fieldPath: 'tenantId' }, op: 'EQUAL', value: { stringValue: uid } } },
              { fieldFilter: { field: { fieldPath: 'isGlobal' }, op: 'EQUAL', value: { booleanValue: true } } }
            ]
          }
        }
      }
    };

    console.log("Checking for global suite...");
    const qRes = await fetch(queryUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(queryPayload)
    });
    
    const qData = await qRes.json();
    
    // Firestore REST API runQuery returns [{document: ...}] or [{readTime: ...}] if empty
    if (qData.length > 0 && qData[0].document) {
       console.log("Global suite already exists for this user:", qData[0].document.name);
       process.exit(0);
    }

    console.log("No Global Suite found. Creating one via REST API...");
    
    const addUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/subscriptions`;
    
    const docData = {
      fields: {
        tenantId: { stringValue: uid },
        isGlobal: { booleanValue: true },
        purchasedSeats: { integerValue: "1" },
        assignedDevices: { arrayValue: { values: [] } },
        status: { stringValue: 'active' },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    const addRes = await fetch(addUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(docData)
    });

    const addData = await addRes.json();
    console.log("Creation result:", addData.name ? "Success" : addData);
    
  } catch (err) {
    console.log("Error:", err);
  }
}

run();
