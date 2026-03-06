/* ============================================================
  QUOTE VAULT v2 — AUTH.JS
  Author  : Hassan Javed
  GitHub  : https://github.com/Hassanjaved17
  Built   : March 2026
  © 2026 Hassan Javed — All Rights Reserved
  ============================================================ */

import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ============================================================
// WHITELIST
// Set to TRUE to restrict access to specific emails only
// Set to FALSE to allow ANYONE to sign up (LinkedIn demo mode)
// ============================================================
const WHITELIST_ENABLED = false;

const WHITELISTED_EMAILS = [
  "hassandeveloper341@gmail.com",
  "hassanaptech9@gmail.com",
  "devhassan65@gmail.com",
  "ibrahimkhan@gmail.com",
  // add more here...
];

function isAllowed(email) {
  if (!WHITELIST_ENABLED) return true;   // ← anyone allowed
  return WHITELISTED_EMAILS.includes(email.trim().toLowerCase());
}

// ============================================================
// AUTH STATE — if already logged in → skip to dashboard
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "dashboard.html";
});

// ============================================================
// TOAST NOTIFICATION SYSTEM
// ============================================================
function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const icons = {
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--show"));

  setTimeout(() => {
    toast.classList.remove("toast--show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 4000);
}

// ============================================================
// LOADING STATE HELPERS
// ============================================================
function setLoading(btn, isLoading) {
  if (isLoading) {
    btn.disabled = true;
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
  } else {
    btn.disabled  = false;
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
  }
}

// ============================================================
// INLINE ERROR HELPERS
// ============================================================
function setInputError(inputId, message) {
  clearInputError(inputId);
  const input = document.getElementById(inputId);
  input.classList.add("input--error");
  const err = document.createElement("span");
  err.className   = "input-error-msg";
  err.textContent = message;
  input.insertAdjacentElement("afterend", err);
}

function clearInputError(inputId) {
  const input = document.getElementById(inputId);
  input.classList.remove("input--error");
  const msg = input.nextElementSibling;
  if (msg && msg.classList.contains("input-error-msg")) msg.remove();
}

function clearAllErrors(prefix) {
  clearInputError(`${prefix}-email`);
  clearInputError(`${prefix}-password`);
}

// ============================================================
// FIREBASE ERROR → HUMAN-READABLE
// ============================================================
function friendlyError(code) {
  const map = {
    "auth/email-already-in-use":   "That email is already registered.",
    "auth/invalid-email":          "Please enter a valid email address.",
    "auth/weak-password":          "Password must be at least 6 characters.",
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password. Try again.",
    "auth/invalid-credential":     "Incorrect email or password.",
    "auth/too-many-requests":      "Too many attempts. Try again later.",
    "auth/popup-closed-by-user":   "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ============================================================
// SIGN UP
// ============================================================
const signupForm = document.getElementById("signup-form");
if (signupForm) signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors("signup");

  const email    = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const btn      = document.getElementById("signup-btn");

  if (!email)              return setInputError("signup-email",    "Email is required.");
  if (!password)           return setInputError("signup-password", "Password is required.");
  if (password.length < 6) return setInputError("signup-password", "Minimum 6 characters.");

  if (!isAllowed(email)) {
    setInputError("signup-email", "This email is not authorized to sign up.");
    showToast("Access denied.", "error");
    return;
  }

  setLoading(btn, true);
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast("Account created! Redirecting...", "success");
    // onAuthStateChanged handles redirect ✅
  } catch (err) {
    const msg = friendlyError(err.code);
    setInputError("signup-email", msg);
    showToast(msg, "error");
    setLoading(btn, false);
  }
});

// ============================================================
// LOGIN
// ============================================================
const loginForm = document.getElementById("login-form");
if (loginForm) loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAllErrors("login");

  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn      = document.getElementById("login-btn");

  if (!email)    return setInputError("login-email",    "Email is required.");
  if (!password) return setInputError("login-password", "Password is required.");

  if (!isAllowed(email)) {
    setInputError("login-email", "This email is not authorized.");
    showToast("Access denied.", "error");
    return;
  }

  setLoading(btn, true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Welcome back! Redirecting...", "success");
    // onAuthStateChanged handles redirect ✅
  } catch (err) {
    const msg = friendlyError(err.code);
    setInputError("login-password", msg);
    showToast(msg, "error");
    setLoading(btn, false);
  }
});

// ============================================================
// GOOGLE SIGN-IN
// ============================================================
const googleBtn = document.getElementById("google-btn");
if (googleBtn) googleBtn.addEventListener("click", async () => {
  const btn      = googleBtn;
  const provider = new GoogleAuthProvider();
  setLoading(btn, true);

  try {
    const result = await signInWithPopup(auth, provider);

    if (!isAllowed(result.user.email)) {
      await result.user.delete();
      showToast(`${result.user.email} is not authorized.`, "error");
      setLoading(btn, false);
      return;
    }

    showToast("Signed in with Google! Redirecting...", "success");
    // onAuthStateChanged handles redirect ✅
  } catch (err) {
    showToast(friendlyError(err.code), "error");
    setLoading(btn, false);
  }
});

// ============================================================
// PASSWORD RESET — runs on reset.html
// ============================================================
const resetForm = document.getElementById("reset-form");
if (resetForm) resetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("reset-email").value.trim();
  const btn   = document.getElementById("reset-btn");

  if (!email) return setInputError("reset-email", "Email is required.");

  setLoading(btn, true);
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    console.error("Reset error:", err.code); // silent — security best practice
  } finally {
    document.getElementById("reset-form-wrap").style.display = "none";
    document.getElementById("reset-success").style.display   = "flex";
  }
});

// © 2026 Hassan Javed — All Rights Reserved