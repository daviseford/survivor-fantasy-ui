import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

config(); // Load .env for VITE_FIREBASE_DATABASE_URL etc.

const keyPath = path.join(process.cwd(), "firebase-private-key.json");

if (!fs.existsSync(keyPath)) {
  console.error(
    "Missing firebase-private-key.json in project root. Download from Firebase Console > Project Settings > Service accounts.",
  );
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL;

const app = initializeApp({
  credential: cert(serviceAccount),
  ...(databaseURL ? { databaseURL } : {}),
});

export const adminAuth = getAuth(app);
