/* ============================================================
  QUOTE VAULT v2
  Author  : Hassan Javed
  GitHub  : https://github.com/Hassanjaved17
  Built   : March 2026
  Stack   : Firebase Firestore + Vanilla JS + HTML/CSS
  © 2026 Hassan Javed — All Rights Reserved
  ============================================================ */

// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDh9aNB-6RkYZfRgzhfW1m8nLbSZGdUVds",
  authDomain: "fir-auth-app-6e2c7.firebaseapp.com",
  projectId: "fir-auth-app-6e2c7",
  storageBucket: "fir-auth-app-6e2c7.firebasestorage.app",
  messagingSenderId: "896381544054",
  appId: "1:896381544054:web:5274cdb3ed864b507aa157",
  measurementId: "G-SJK9YKXZTS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);   // ← Firestore (Quote Vault)
export const auth = getAuth(app);        // ← Auth (Login page)