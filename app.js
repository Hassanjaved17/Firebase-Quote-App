// app.js — Quote Vault
// Firestore CRUD: add, read, delete, like quotes

import { db } from "./firebase.js";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ============================================================
// STATE
// ============================================================
let allQuotes = [];       // all quotes from Firestore
let currentIndex = -1;       // index of displayed quote
let activeFilter = "all";    // "all" | "liked"

const COLLECTION = "quotes";

// ── Seed quotes (added only if Firestore is empty) ──────────
const SEED_QUOTES = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "Motivation", likes: 0 },
    { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "Wisdom", likes: 0 },
    { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "Perseverance", likes: 0 },
    { text: "Life is what happens when you're busy making other plans.", author: "John Lennon", category: "Life", likes: 0 },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "Inspiration", likes: 0 },
    { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci", category: "Design", likes: 0 },
    { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "Life", likes: 0 },
    { text: "Two things are infinite: the universe and human stupidity.", author: "Albert Einstein", category: "Humor", likes: 0 },
];

// ============================================================
// DOM REFS
// ============================================================
const quoteLoading = document.getElementById("quote-loading");
const quoteContent = document.getElementById("quote-content");
const quoteEmpty = document.getElementById("quote-empty");
const quoteText = document.getElementById("quote-text");
const quoteAuthor = document.getElementById("quote-author");
const quoteCategory = document.getElementById("quote-category");
const likeBtn = document.getElementById("like-btn");
const likeCount = document.getElementById("like-count");
const copyBtn = document.getElementById("copy-btn");
const deleteBtn = document.getElementById("delete-btn");
const newQuoteBtn = document.getElementById("new-quote-btn");
const quoteCount = document.getElementById("quote-count");

const inputText = document.getElementById("input-text");
const inputAuthor = document.getElementById("input-author");
const inputCategory = document.getElementById("input-category");
const charCurrent = document.getElementById("char-current");
const submitBtn = document.getElementById("submit-btn");

const quotesList = document.getElementById("quotes-list");
const filterBtns = document.querySelectorAll(".filter-btn");

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = "info") {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// ============================================================
// SPINNER HELPER
// ============================================================
function setLoading(btn, isLoading, originalHTML) {
    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner"></span> Loading...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ============================================================
// DISPLAY A QUOTE IN THE MAIN CARD
// ============================================================
function displayQuote(quote, index) {
    currentIndex = index;

    quoteLoading.style.display = "none";
    quoteEmpty.style.display = "none";
    quoteContent.style.display = "flex";

    // Reset animation
    quoteContent.style.animation = "none";
    quoteContent.offsetHeight;
    quoteContent.style.animation = "";

    quoteText.textContent = quote.text;
    quoteAuthor.textContent = `— ${quote.author || "Unknown"}`;
    quoteCategory.textContent = quote.category || "";
    quoteCategory.style.display = quote.category ? "inline-block" : "none";

    likeCount.textContent = quote.likes || 0;
    likeBtn.classList.toggle("liked", !!quote.liked);
}

function showEmpty() {
    quoteLoading.style.display = "none";
    quoteContent.style.display = "none";
    quoteEmpty.style.display = "flex";
}

// ============================================================
// PICK A RANDOM QUOTE (different from current)
// ============================================================
function pickRandom() {
    const filtered = activeFilter === "liked"
        ? allQuotes.filter(q => q.liked)
        : allQuotes;

    if (filtered.length === 0) { showEmpty(); return; }

    let idx;
    let attempts = 0;
    do {
        idx = Math.floor(Math.random() * filtered.length);
        attempts++;
    } while (filtered[idx].id === (allQuotes[currentIndex]?.id) && filtered.length > 1 && attempts < 10);

    const quote = filtered[idx];
    const realIdx = allQuotes.findIndex(q => q.id === quote.id);
    displayQuote(quote, realIdx);

    // Highlight in list
    document.querySelectorAll(".quote-item").forEach(el => el.classList.remove("active"));
    const activeItem = document.querySelector(`[data-id="${quote.id}"]`);
    if (activeItem) activeItem.classList.add("active");
}

// ============================================================
// REAL-TIME LISTENER — Firestore onSnapshot
// ============================================================
function startRealtimeListener() {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allQuotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        quoteCount.textContent = allQuotes.length;
        renderList();

        // Show first quote if nothing displayed yet
        if (currentIndex === -1 && allQuotes.length > 0) {
            pickRandom();
        } else if (allQuotes.length === 0) {
            showEmpty();
            currentIndex = -1;
        }
    });
}

// ============================================================
// SEED FIRESTORE IF EMPTY
// ============================================================
async function seedIfEmpty() {
    const snapshot = await getDocs(collection(db, COLLECTION));
    if (!snapshot.empty) return;

    const promises = SEED_QUOTES.map(q =>
        addDoc(collection(db, COLLECTION), { ...q, createdAt: serverTimestamp() })
    );
    await Promise.all(promises);
}

// ============================================================
// RENDER QUOTES LIST
// ============================================================
function renderList() {
    const toShow = activeFilter === "liked"
        ? allQuotes.filter(q => q.liked)
        : allQuotes;

    if (toShow.length === 0) {
        quotesList.innerHTML = `<div class="quotes-list-empty">
      ${activeFilter === "liked" ? "No liked quotes yet.<br>Hit ❤️ on a quote to save it here." : "No quotes yet. Add one above!"}
    </div>`;
        return;
    }

    quotesList.innerHTML = toShow.map((q, i) => `
    <div class="quote-item ${q.id === allQuotes[currentIndex]?.id ? "active" : ""}"
         data-id="${q.id}"
         data-index="${allQuotes.findIndex(x => x.id === q.id)}">
      <span class="item-number">${String(i + 1).padStart(2, "0")}</span>
      <div class="item-body">
        <p class="item-text">"${q.text}"</p>
        <span class="item-author">— ${q.author || "Unknown"}</span>
      </div>
      <div class="item-actions">
        <button class="item-like-btn ${q.liked ? "liked" : ""}" data-id="${q.id}" title="Like">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${q.liked ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          ${q.likes || 0}
        </button>
        <button class="item-delete-btn" data-id="${q.id}" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>
  `).join("");

    // Click to display in main card
    document.querySelectorAll(".quote-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".item-like-btn") || e.target.closest(".item-delete-btn")) return;
            const idx = parseInt(item.dataset.index);
            displayQuote(allQuotes[idx], idx);
            document.querySelectorAll(".quote-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
        });
    });

    // Like from list
    document.querySelectorAll(".item-like-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(btn.dataset.id);
        });
    });

    // Delete from list
    document.querySelectorAll(".item-delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteQuote(btn.dataset.id);
        });
    });
}

// ============================================================
// ADD QUOTE
// ============================================================
submitBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    const author = inputAuthor.value.trim();
    const category = inputCategory.value.trim();

    if (!text) {
        showToast("Please enter a quote.", "error");
        inputText.focus();
        return;
    }

    const originalHTML = submitBtn.innerHTML;
    setLoading(submitBtn, true);

    try {
        await addDoc(collection(db, COLLECTION), {
            text,
            author: author || "Unknown",
            category: category || "",
            likes: 0,
            liked: false,
            createdAt: serverTimestamp()
        });

        inputText.value = "";
        inputAuthor.value = "";
        inputCategory.value = "";
        charCurrent.textContent = "0";
        showToast("Quote added to the vault! ✨", "success");
    } catch (err) {
        console.error("Add error:", err);
        showToast("Failed to add quote. Try again.", "error");
    } finally {
        setLoading(submitBtn, false, originalHTML);
    }
});

// ============================================================
// DELETE QUOTE
// ============================================================
async function deleteQuote(id) {
    try {
        await deleteDoc(doc(db, COLLECTION, id));

        // If deleted quote was displayed, pick a new one
        if (allQuotes[currentIndex]?.id === id) {
            currentIndex = -1;
            pickRandom();
        }
        showToast("Quote removed.", "info");
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Failed to delete. Try again.", "error");
    }
}

// Main card delete button
deleteBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (quote) deleteQuote(quote.id);
});

// ============================================================
// TOGGLE LIKE
// ============================================================
async function toggleLike(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;

    const newLiked = !quote.liked;
    const newLikes = newLiked ? (quote.likes || 0) + 1 : Math.max((quote.likes || 0) - 1, 0);

    try {
        await updateDoc(doc(db, COLLECTION, id), { liked: newLiked, likes: newLikes });

        // Update main card if this is the current quote
        if (allQuotes[currentIndex]?.id === id) {
            likeBtn.classList.toggle("liked", newLiked);
            likeCount.textContent = newLikes;
        }
    } catch (err) {
        console.error("Like error:", err);
        showToast("Failed to update like.", "error");
    }
}

// Main card like button
likeBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (quote) toggleLike(quote.id);
});

// ============================================================
// COPY QUOTE
// ============================================================
copyBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (!quote) return;

    const text = `"${quote.text}" — ${quote.author || "Unknown"}`;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Copied to clipboard!", "success");
        const orig = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
    });
});

// ============================================================
// NEW RANDOM QUOTE BUTTON
// ============================================================
newQuoteBtn.addEventListener("click", () => {
    newQuoteBtn.classList.add("spinning");
    setTimeout(() => newQuoteBtn.classList.remove("spinning"), 600);
    pickRandom();
});

// ============================================================
// CHAR COUNTER
// ============================================================
inputText.addEventListener("input", () => {
    charCurrent.textContent = inputText.value.length;
});

// ============================================================
// FILTER BUTTONS
// ============================================================
filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderList();
        pickRandom();
    });
});

// ============================================================
// INIT
// ============================================================
(async () => {
    await seedIfEmpty();
    startRealtimeListener();
})();