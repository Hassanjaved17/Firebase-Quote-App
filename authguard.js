/* ============================================================
  QUOTE VAULT v2 — AUTHGUARD.JS
  Paste this as the VERY FIRST script in dashboard.html
  Redirects to login if user is not authenticated
  Author  : Hassan Javed
  © 2026 Hassan Javed — All Rights Reserved
  ============================================================ */

import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Not logged in → kick back to login page
        window.location.href = "index.html";
    }
});

// © 2026 Hassan Javed — All Rights Reserved