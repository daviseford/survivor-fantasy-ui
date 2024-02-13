import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// https://dev.to/farazamiruddin/react-firebase-add-firebase-to-a-react-app-4nc9
const firebaseConfig = {
  apiKey: "AIzaSyB1T5LgmsCrKQHIIeMokbglUBWduiksD_Y",
  authDomain: "survivor-fantasy-51c4b.firebaseapp.com",
  projectId: "survivor-fantasy-51c4b",
  storageBucket: "survivor-fantasy-51c4b.appspot.com",
  messagingSenderId: "608839041450",
  appId: "1:608839041450:web:0bc074ccf72ad23ff4ebd3",
  measurementId: "G-W4DJMFJDPW",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
getAnalytics(app);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
