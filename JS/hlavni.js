import { db } from "./databaze.js";
import { requireAuth, setupLogout } from "./app.js";

import {
    collection,
    doc,
    setDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const todayLabel = document.getElementById("todayLabel");
const journalInput = document.getElementById("journalInput");
const saveJournalBtn = document.getElementById("saveJournalBtn");
const journalList = document.getElementById("journalList");
const pageMessage = document.getElementById("pageMessage");
const moodButtons = document.querySelectorAll(".mood-btn");
const selectedMoodText = document.getElementById("selectedMoodText");

const journalPagination = document.getElementById("journalPagination");
const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageIndicator = document.getElementById("pageIndicator");

let userId = null;
let selectedMood = "";
let allJournalEntries = [];
let currentPage = 1;
const entriesPerPage = 3;

const dayNames = [
    "Neděle",
    "Pondělí",
    "Úterý",
    "Středa",
    "Čtvrtek",
    "Pátek",
    "Sobota"
];

requireAuth(async (user) => {
    userId = user.uid;
    setTodayLabel();
    resetForm();
    await loadJournalEntries();
});

setupLogout();

function showMessage(text, color = "#16a34a") {
    pageMessage.textContent = text;
    pageMessage.style.color = color;
}

function getTodayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatTodayLabel() {
    const now = new Date();
    return `${dayNames[now.getDay()]} ${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}`;
}

function setTodayLabel() {
    todayLabel.textContent = formatTodayLabel();
}

function resetMoodSelection() {
    selectedMood = "";
    moodButtons.forEach(btn => btn.classList.remove("selected"));
    selectedMoodText.textContent = "Vybraná nálada: žádná";
}

function resetForm() {
    journalInput.value = "";
    resetMoodSelection();
}

moodButtons.forEach((button) => {
    button.addEventListener("click", () => {
        moodButtons.forEach(btn => btn.classList.remove("selected"));
        button.classList.add("selected");
        selectedMood = button.dataset.mood;
        selectedMoodText.textContent = `Vybraná nálada: ${selectedMood}`;
    });
});

function escapeHtml(text) {
    return text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getTotalPages() {
    return Math.max(1, Math.ceil(allJournalEntries.length / entriesPerPage));
}

function updatePagination() {
    const totalPages = getTotalPages();

    pageIndicator.textContent = `Stránka ${currentPage} / ${totalPages}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    journalPagination.style.display = allJournalEntries.length > 0 ? "flex" : "none";
}

function renderJournalEntries() {
    journalList.innerHTML = "";

    if (allJournalEntries.length === 0) {
        journalList.innerHTML = `<p class="empty-journal">Zatím nemáš žádné zápisky.</p>`;
        updatePagination();
        return;
    }

    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const visibleEntries = allJournalEntries.slice(startIndex, endIndex);

    visibleEntries.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "journal-item";

        const dateSource = entry.updatedAt || entry.createdAt;
        const dateText = dateSource
            ? new Date(dateSource).toLocaleString("cs-CZ")
            : "Neznámé datum";

        item.innerHTML = `
            <div class="journal-item-top">
                <div>
                    <strong>${escapeHtml(entry.dateLabel || "Zápis")}</strong>
                    <small class="journal-date">${dateText}</small>
                </div>

                <div class="journal-mood">${escapeHtml(entry.mood || "—")}</div>
            </div>

            <p class="journal-text">${escapeHtml(entry.text || "")}</p>

            <button class="delete-btn" data-id="${entry.id}">Smazat</button>
        `;

        journalList.appendChild(item);
    });

    document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = button.dataset.id;

            const potvrzeni = confirm("Opravdu chceš smazat tento zápis?");
            if (!potvrzeni) return;

            try {
                await deleteDoc(doc(db, "users", userId, "journal_entries", id));
                showMessage("Zápis smazán.");

                await loadJournalEntries();

                const totalPages = getTotalPages();
                if (currentPage > totalPages) {
                    currentPage = totalPages;
                }

                renderJournalEntries();
            } catch (error) {
                console.error(error);
                showMessage("Chyba při mazání zápisu.", "#dc2626");
            }
        });
    });

    updatePagination();
}

async function loadJournalEntries() {
    const entriesRef = collection(db, "users", userId, "journal_entries");
    const q = query(entriesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    allJournalEntries = [];

    snapshot.forEach((docSnap) => {
        allJournalEntries.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    const totalPages = getTotalPages();
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    renderJournalEntries();
}

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderJournalEntries();
    }
});

nextPageBtn.addEventListener("click", () => {
    if (currentPage < getTotalPages()) {
        currentPage++;
        renderJournalEntries();
    }
});

saveJournalBtn.addEventListener("click", async () => {
    const text = journalInput.value.trim();

    if (!text) {
        showMessage("Napiš zápis.", "#dc2626");
        return;
    }

    if (!selectedMood) {
        showMessage("Vyber náladu pomocí smajlíku.", "#dc2626");
        return;
    }

    const now = new Date();
    const nowIso = now.toISOString();

    const entryId = `${getTodayKey()}_${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}-${now.getMilliseconds()}`;

    try {
        await setDoc(doc(db, "users", userId, "journal_entries", entryId), {
            text: text,
            mood: selectedMood,
            date: getTodayKey(),
            dateLabel: formatTodayLabel(),
            createdAt: nowIso,
            updatedAt: nowIso
        });

        showMessage("Zápis byl uložen.");
        resetForm();

        currentPage = 1;
        await loadJournalEntries();
    } catch (error) {
        console.error(error);
        showMessage("Chyba při ukládání zápisu.", "#dc2626");
    }
});