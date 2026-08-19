import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ["e2e/**", "node_modules/**", ".claude/**", ".def/**"],
    // Importing anything that transitively reaches src/firebase.ts initializes
    // the Firebase app at module load, and getAuth() throws
    // auth/invalid-api-key on an empty key. Pin inert placeholders so unit
    // tests never depend on a local .env or on CI-provided config, and behave
    // identically everywhere. These are not real credentials and reach no
    // network — initializeApp/getAuth only validate shape.
    env: {
      VITE_FIREBASE_API_KEY: "test-api-key",
      VITE_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      VITE_FIREBASE_PROJECT_ID: "test-project",
      VITE_FIREBASE_STORAGE_BUCKET: "test-project.appspot.com",
      VITE_FIREBASE_MESSAGING_SENDER_ID: "000000000000",
      VITE_FIREBASE_APP_ID: "1:000000000000:web:0000000000000000000000",
      VITE_FIREBASE_MEASUREMENT_ID: "G-TEST000000",
      VITE_FIREBASE_DATABASE_URL: "https://test-project.firebaseio.com",
    },
  },
});
