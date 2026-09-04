import path from "path";
import fs from "fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

let db: any = null;

export function getAdminDb() {
  if (!db) {
    try {
      let firebaseConfig: any = null;
      const configPath = path.join(process.cwd(), "firebase-applet-config.json");
      if (fs.existsSync(configPath)) {
        try {
          firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
        } catch (e) {
          // ignore parsing error
        }
      }

      const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "gen-lang-client-0750978639";
      const databaseId = firebaseConfig?.firestoreDatabaseId || "ai-studio-8e7b370f-a125-45b3-9073-afa4676db100";
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey) {
        return null;
      }

      if (clientEmail && !clientEmail.includes(projectId)) {
        return null;
      }

      const existingApps = getApps();
      let app: any;

      if (existingApps.length === 0) {
        app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        app = existingApps[0];
      }

      if (databaseId && app) {
        db = getFirestore(app, databaseId);
      } else if (app) {
        db = getFirestore(app);
      } else {
        db = getFirestore();
      }
    } catch (err) {
      console.warn("Firebase Admin initialization skipped or unavailable:", err);
      return null;
    }
  }
  return db;
}

export { FieldValue, Timestamp };
