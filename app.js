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

// STATE
let allQuotes   = [];
let currentIndex = -1;
let activeFilter = "all";
let searchQuery  = "";

const COLLECTION = "quotes";

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

// DOM REFS
const quoteLoading  = document.getElementById("quote-loading");
const quoteContent  = document.getElementById("quote-content");
const quoteEmpty    = document.getElementById("quote-empty");
const quoteText     = document.getElementById("quote-text");
const quoteAuthor   = document.getElementById("quote-author");
const quoteCategory = document.getElementById("quote-category");
const likeBtn       = document.getElementById("like-btn");
const likeCount     = document.getElementById("like-count");
const copyBtn       = document.getElementById("copy-btn");
const deleteBtn     = document.getElementById("delete-btn");
const newQuoteBtn   = document.getElementById("new-quote-btn");
const quoteCount    = document.getElementById("quote-count");
const inputText     = document.getElementById("input-text");
const inputAuthor   = document.getElementById("input-author");
const inputCategory = document.getElementById("input-category");
const charCurrent   = document.getElementById("char-current");
const submitBtn     = document.getElementById("submit-btn");
const quotesList    = document.getElementById("quotes-list");
const filterBtns    = document.querySelectorAll(".filter-btn");
const searchInput   = document.getElementById("search-input");
const searchClear   = document.getElementById("search-clear");
const searchInfo    = document.getElementById("search-info");

// TOAST
function showToast(msg, type = "info") {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove("show"), 3000);
}

// LOADING HELPER
function setLoading(btn, isLoading, originalHTML) {
    if (isLoading) {
        btn.disabled  = true;
        btn.innerHTML = `<span class="spinner"></span> Loading...`;
    } else {
        btn.disabled  = false;
        btn.innerHTML = originalHTML;
    }
}

// DISPLAY QUOTE IN MAIN CARD
function displayQuote(quote, index) {
    currentIndex = index;

    quoteLoading.style.display = "none";
    quoteEmpty.style.display   = "none";
    quoteContent.style.display = "flex";

    // Retrigger animation
    quoteContent.style.animation = "none";
    quoteContent.offsetHeight;
    quoteContent.style.animation = "";

    quoteText.textContent     = quote.text;
    quoteAuthor.textContent   = `— ${quote.author || "Unknown"}`;
    quoteCategory.textContent = quote.category || "";
    quoteCategory.style.display = quote.category ? "inline-block" : "none";

    likeCount.textContent = quote.likes || 0;
    likeBtn.classList.toggle("liked", !!quote.liked);
}

function showEmpty() {
    quoteLoading.style.display = "none";
    quoteContent.style.display = "none";
    quoteEmpty.style.display   = "flex";
}

// PICK RANDOM QUOTE
function pickRandom() {
    const pool = activeFilter === "liked"
        ? allQuotes.filter(q => q.liked)
        : allQuotes;

    if (pool.length === 0) { showEmpty(); return; }

    let idx, attempts = 0;
    do {
        idx = Math.floor(Math.random() * pool.length);
        attempts++;
    } while (pool[idx].id === allQuotes[currentIndex]?.id && pool.length > 1 && attempts < 10);

    const quote   = pool[idx];
    const realIdx = allQuotes.findIndex(q => q.id === quote.id);
    displayQuote(quote, realIdx);

    document.querySelectorAll(".quote-item").forEach(el => el.classList.remove("active"));
    const activeItem = document.querySelector(`[data-id="${quote.id}"]`);
    if (activeItem) activeItem.classList.add("active");
}
// STATS BAR
function updateStats() {
    const total      = allQuotes.length;
    const liked      = allQuotes.filter(q => q.liked).length;
    const categories = new Set(allQuotes.map(q => q.category).filter(Boolean)).size;
    const authors    = new Set(allQuotes.map(q => q.author).filter(Boolean)).size;

    animateCount("stat-total",      total);
    animateCount("stat-liked",      liked);
    animateCount("stat-categories", categories);
    animateCount("stat-authors",    authors);
    document.getElementById("quote-count").textContent = total;
}

function animateCount(id, target) {
    const el   = document.getElementById(id);
    const from = parseInt(el.textContent) || 0;
    if (from === target) return;

    const step     = target > from ? 1 : -1;
    const steps    = Math.abs(target - from);
    const delay    = Math.max(400 / steps, 16);
    let   current  = from;

    const interval = setInterval(() => {
        current += step;
        el.textContent = current;
        if (current === target) clearInterval(interval);
    }, delay);
}

// SEARCH
searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value.trim().toLowerCase();
    searchClear.style.display = searchQuery ? "flex" : "none";
    searchInfo.style.display  = searchQuery ? "block" : "none";
    renderList();
});

searchClear.addEventListener("click", () => {
    searchInput.value         = "";
    searchQuery               = "";
    searchClear.style.display = "none";
    searchInfo.style.display  = "none";
    renderList();
    searchInput.focus();
});

function highlight(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return text.replace(new RegExp(`(${escaped})`, "gi"), "<mark>$1</mark>");
}

// SAVE IMAGE (html2canvas)
document.getElementById("share-btn").addEventListener("click", async () => {
    const quote = allQuotes[currentIndex];
    if (!quote) return;

    const btn  = document.getElementById("share-btn");
    const orig = btn.innerHTML;
    btn.disabled  = true;
    btn.innerHTML = `<span class="spinner"></span> Saving...`;

    document.getElementById("sc-text").textContent   = quote.text;
    document.getElementById("sc-author").textContent = `— ${quote.author || "Unknown"}`;

    try {
        const canvas = await html2canvas(document.getElementById("share-card"), {
            backgroundColor: "#0a0b0f",
            scale: 2,
            useCORS: true,
            logging: false
        });
        const link    = document.createElement("a");
        link.download = `quote-${Date.now()}.png`;
        link.href     = canvas.toDataURL("image/png");
        link.click();
        showToast("Image saved! ✨", "success");
    } catch (err) {
        console.error("Share error:", err);
        showToast("Failed to save image.", "error");
    } finally {
        btn.disabled  = false;
        btn.innerHTML = orig;
    }
});

// REAL-TIME LISTENER
function startRealtimeListener() {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        allQuotes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        renderList();

        if (currentIndex === -1 && allQuotes.length > 0) {
            pickRandom();
        } else if (allQuotes.length === 0) {
            showEmpty();
            currentIndex = -1;
        }
    });
}

// SEED IF EMPTY
async function seedIfEmpty() {
    const snapshot = await getDocs(collection(db, COLLECTION));
    if (!snapshot.empty) return;

    await Promise.all(
        SEED_QUOTES.map(q =>
            addDoc(collection(db, COLLECTION), { ...q, createdAt: serverTimestamp() })
        )
    );
}

// RENDER LIST
function renderList() {
    // Step 1: filter by liked tab
    const base = activeFilter === "liked"
        ? allQuotes.filter(q => q.liked)
        : allQuotes;

    // Step 2: filter by search query
    const toShow = searchQuery
        ? base.filter(q =>
            q.text.toLowerCase().includes(searchQuery) ||
            (q.author   || "").toLowerCase().includes(searchQuery) ||
            (q.category || "").toLowerCase().includes(searchQuery)
          )
        : base;

    // Update search result info text
    if (searchQuery) {
        searchInfo.innerHTML = `${toShow.length} result${toShow.length !== 1 ? "s" : ""} for "<strong>${searchQuery}</strong>"`;
    }

    // Empty state
    if (toShow.length === 0) {
        quotesList.innerHTML = `<div class="quotes-list-empty">
            ${searchQuery
                ? `No quotes match "<strong>${searchQuery}</strong>"`
                : activeFilter === "liked"
                    ? "No liked quotes yet. Hit ❤️ on a quote!"
                    : "No quotes yet. Add one above!"}
        </div>`;
        return;
    }

    quotesList.innerHTML = toShow.map((q, i) => `
        <div class="quote-item ${q.id === allQuotes[currentIndex]?.id ? "active" : ""}"
             data-id="${q.id}"
             data-index="${allQuotes.findIndex(x => x.id === q.id)}">
            <span class="item-number">${String(i + 1).padStart(2, "0")}</span>
            <div class="item-body">
                <p class="item-text">${highlight(`"${q.text}"`, searchQuery)}</p>
                <span class="item-author">${highlight(`— ${q.author || "Unknown"}`, searchQuery)}</span>
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

    // Click item → show in main card
    document.querySelectorAll(".quote-item").forEach(item => {
        item.addEventListener("click", (e) => {
            if (e.target.closest(".item-like-btn") || e.target.closest(".item-delete-btn")) return;
            const idx = parseInt(item.dataset.index);
            displayQuote(allQuotes[idx], idx);
            document.querySelectorAll(".quote-item").forEach(el => el.classList.remove("active"));
            item.classList.add("active");
        });
    });

    document.querySelectorAll(".item-like-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(btn.dataset.id);
        });
    });

    document.querySelectorAll(".item-delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteQuote(btn.dataset.id);
        });
    });
}
// ADD QUOTE
submitBtn.addEventListener("click", async () => {
    const text     = inputText.value.trim();
    const author   = inputAuthor.value.trim();
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
            author:    author || "Unknown",
            category:  category || "",
            likes:     0,
            liked:     false,
            createdAt: serverTimestamp()
        });
        inputText.value         = "";
        inputAuthor.value       = "";
        inputCategory.value     = "";
        charCurrent.textContent = "0";
        showToast("Quote added to the vault! ✨", "success");
    } catch (err) {
        console.error("Add error:", err);
        showToast("Failed to add quote. Try again.", "error");
    } finally {
        setLoading(submitBtn, false, originalHTML);
    }
});

// DELETE QUOTE
async function deleteQuote(id) {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
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

deleteBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (quote) deleteQuote(quote.id);
});

// TOGGLE LIKE
async function toggleLike(id) {
    const quote = allQuotes.find(q => q.id === id);
    if (!quote) return;

    const newLiked = !quote.liked;
    const newLikes = newLiked
        ? (quote.likes || 0) + 1
        : Math.max((quote.likes || 0) - 1, 0);

    try {
        await updateDoc(doc(db, COLLECTION, id), { liked: newLiked, likes: newLikes });
        if (allQuotes[currentIndex]?.id === id) {
            likeBtn.classList.toggle("liked", newLiked);
            likeCount.textContent = newLikes;
        }
    } catch (err) {
        console.error("Like error:", err);
        showToast("Failed to update like.", "error");
    }
}

likeBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (quote) toggleLike(quote.id);
});

// COPY QUOTE
copyBtn.addEventListener("click", () => {
    const quote = allQuotes[currentIndex];
    if (!quote) return;

    navigator.clipboard.writeText(`"${quote.text}" — ${quote.author || "Unknown"}`).then(() => {
        showToast("Copied to clipboard!", "success");
        const orig = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
    });
});

// NEW QUOTE BUTTON
newQuoteBtn.addEventListener("click", () => {
    newQuoteBtn.classList.add("spinning");
    setTimeout(() => newQuoteBtn.classList.remove("spinning"), 600);
    pickRandom();
});

// CHAR COUNTER
inputText.addEventListener("input", () => {
    charCurrent.textContent = inputText.value.length;
});

// FILTER BUTTONS
filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        filterBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderList();
        pickRandom();
    });
});

// INIT
(async () => {
    await seedIfEmpty();
    startRealtimeListener();
})();

// © 2026 Hassan Javed.