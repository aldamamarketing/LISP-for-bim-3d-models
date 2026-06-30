const admin = require('firebase-admin');

admin.initializeApp();

async function configureCors() {
  const corsConfiguration = [
    {
      origin: ["*"], // Permite cualquier origen
      method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
      responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
      maxAgeSeconds: 3600
    }
  ];

  const bucketAppspot = admin.storage().bucket("lispcentral.appspot.com");
  
  try {
    await bucketAppspot.setCorsConfiguration(corsConfiguration);
    console.log("CORS configurado en lispcentral.appspot.com");
  } catch(e) {
    console.error("Fallo lispcentral.appspot.com", e.message);
  }
}

configureCors().catch(console.error);
