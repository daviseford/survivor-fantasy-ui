import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";
import * as path from "path";

const keyPath = path.join(process.cwd(), "firebase-private-key.json");
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

export const adminAuth = getAuth(app);
