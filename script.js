/* ============================================================
  QUOTE VAULT v2 — SCRIPT.JS
  Handles: Auth guard, logout, user display in header
  Author  : Hassan Javed
  © 2026 Hassan Javed — All Rights Reserved
  ============================================================ */

import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ── Helpers ──────────────────────────────────────────────────
function getDisplayName(user) {
  if (user.displayName) return user.displayName;
  return user.email ? user.email.split("@")[0] : "User";
}

function getInitials(user) {
  if (user.displayName) {
    return user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  }
  return user.email ? user.email[0].toUpperCase() : "?";
}

// ── Auth Guard + Populate header ─────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  // Populate user info in header if elements exist
  const nameEl     = document.getElementById("user-name");
  const initialsEl = document.getElementById("user-initials");

  if (nameEl)     nameEl.textContent     = getDisplayName(user);
  if (initialsEl) initialsEl.textContent = getInitials(user);
});

// ── Logout ───────────────────────────────────────────────────
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled  = true;
    logoutBtn.innerHTML = `
      <span class="spinner" style="border-color:rgba(248,113,113,.3);border-top-color:var(--danger)"></span>
      Signing out…`;

    try {
      await signOut(auth);
      window.location.href = "index.html";
    } catch (err) {
      console.error("Logout error:", err.message);
      logoutBtn.disabled  = false;
      logoutBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg> Logout`;
    }
  });
}

// © 2026 Hassan Javed — All Rights Reserved