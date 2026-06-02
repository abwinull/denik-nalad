import { db } from "./databaze.js";
import { requireAuth, setupLogout } from "./app.js";

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    setDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const selectedDayTitle = document.getElementById("selectedDayTitle");
const selectedDayDate = document.getElementById("selectedDayDate");
const dayProgressText = document.getElementById("dayProgressText");
const pageMessage = document.getElementById("pageMessage");
const dayHabitsList = document.getElementById("dayHabitsList");

const calendarMonthLabel = document.getElementById("calendarMonthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const manageHabitsModal = document.getElementById("manageHabitsModal");
const openManageHabitsBtn = document.getElementById("openManageHabitsBtn");
const closeManageHabitsBtn = document.getElementById("closeManageHabitsBtn");

const habitInput = document.getElementById("habitInput");
const addHabitBtn = document.getElementById("addHabitBtn");
const masterHabitsList = document.getElementById("masterHabitsList");

let userId = null;
let masterHabits = [];
let selectedDate = new Date();
let currentMonthDate = new Date();
let calendarRenderId = 0;

const monthNames = [
    "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
    "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"
];

const dayNames = [
    "Neděle", "Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota"
];

requireAuth(async (user) => {
    userId = user.uid;

    await loadMasterHabits();
    await renderSelectedDay();
    await renderCalendar();
});

setupLogout();

function showMessage(text, color = "#16a34a") {
    pageMessage.textContent = text;
    pageMessage.style.color = color;
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function formatDateLabel(date) {
    return `${dayNames[date.getDay()]} ${date.getDate()}. ${date.getMonth() + 1}. ${date.getFullYear()}`;
}

function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

function getMondayFirstDay(day) {
    return day === 0 ? 6 : day - 1;
}

function getProgressColors(percent) {
    const red = Math.round(255 - (percent * 1.4));
    const green = Math.round(70 + (percent * 1.6));
    return `rgb(${Math.max(80, red)}, ${Math.min(220, green)}, 100)`;
}

async function loadMasterHabits() {
    masterHabits = [];

    const habitsRef = collection(db, "users", userId, "habits_master");
    const q = query(habitsRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    snapshot.forEach((docSnap) => {
        masterHabits.push({
            id: docSnap.id,
            ...docSnap.data()
        });
    });

    renderMasterHabitsModal();
}

function renderMasterHabitsModal() {
    masterHabitsList.innerHTML = "";

    if (masterHabits.length === 0) {
        masterHabitsList.innerHTML = `<p class="empty-info">Zatím nemáš žádné každodenní návyky.</p>`;
        return;
    }

    masterHabits.forEach((habit) => {
        const item = document.createElement("div");
        item.className = "master-habit-item";

        item.innerHTML = `
            <span>${habit.text}</span>
            <button class="delete-btn habit-delete-btn" data-id="${habit.id}">Smazat</button>
        `;

        masterHabitsList.appendChild(item);
    });

    document.querySelectorAll(".habit-delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = button.dataset.id;

            try {
                await deleteDoc(doc(db, "users", userId, "habits_master", id));
                await loadMasterHabits();
                await renderSelectedDay();
                await renderCalendar();
                showMessage("Návyk smazán.");
            } catch (error) {
                console.error(error);
                showMessage("Chyba při mazání návyku.", "#dc2626");
            }
        });
    });
}

async function getCheckedHabitsForDate(date) {
    const dateKey = formatDateKey(date);
    const dayRef = doc(db, "users", userId, "habits_days", dateKey);
    const daySnap = await getDoc(dayRef);

    if (!daySnap.exists()) {
        return [];
    }

    const data = daySnap.data();
    return data.checkedHabits || [];
}

async function saveCheckedHabitsForDate(date, checkedHabits) {
    const dateKey = formatDateKey(date);
    const dayRef = doc(db, "users", userId, "habits_days", dateKey);

    await setDoc(dayRef, {
        date: dateKey,
        checkedHabits: checkedHabits,
        updatedAt: new Date().toISOString()
    });
}

async function renderSelectedDay() {
    selectedDayTitle.textContent = "Návyky pro vybraný den";
    selectedDayDate.textContent = formatDateLabel(selectedDate);

    dayHabitsList.innerHTML = "";

    if (masterHabits.length === 0) {
        dayProgressText.textContent = "Splněno: 0 / 0";
        dayHabitsList.innerHTML = `<p class="empty-info">Nejdřív si přidej každodenní návyky.</p>`;
        return;
    }

    const checkedHabits = await getCheckedHabitsForDate(selectedDate);
    let doneCount = 0;

    masterHabits.forEach((habit) => {
        if (checkedHabits.includes(habit.id)) {
            doneCount++;
        }

        const item = document.createElement("div");
        item.className = "day-habit-item";

        item.innerHTML = `
            <label class="day-habit-label">
                <input type="checkbox" class="day-habit-check" data-id="${habit.id}" ${checkedHabits.includes(habit.id) ? "checked" : ""}>
                <span>${habit.text}</span>
            </label>
        `;

        dayHabitsList.appendChild(item);
    });

    dayProgressText.textContent = `Splněno: ${doneCount} / ${masterHabits.length}`;

    document.querySelectorAll(".day-habit-check").forEach((checkbox) => {
        checkbox.addEventListener("change", async () => {
            const habitId = checkbox.dataset.id;
            let newChecked = await getCheckedHabitsForDate(selectedDate);

            if (checkbox.checked) {
                if (!newChecked.includes(habitId)) {
                    newChecked.push(habitId);
                }
            } else {
                newChecked = newChecked.filter(id => id !== habitId);
            }

            try {
                await saveCheckedHabitsForDate(selectedDate, newChecked);
                await renderSelectedDay();
                await renderCalendar();
            } catch (error) {
                console.error(error);
                showMessage("Chyba při ukládání dne.", "#dc2626");
            }
        });
    });
}

async function getDayPercent(date) {
    if (masterHabits.length === 0) return 0;

    const checkedHabits = await getCheckedHabitsForDate(date);
    return Math.round((checkedHabits.length / masterHabits.length) * 100);
}

async function renderCalendar() {
    const thisRenderId = ++calendarRenderId;

    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    calendarMonthLabel.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstWeekDay = getMondayFirstDay(firstDay.getDay());
    const daysInMonth = lastDay.getDate();

    const dateList = [];

    for (let day = 1; day <= daysInMonth; day++) {
        dateList.push(new Date(year, month, day));
    }

    const percents = await Promise.all(dateList.map(date => getDayPercent(date)));

    if (thisRenderId !== calendarRenderId) {
        return;
    }

    calendarGrid.innerHTML = "";

    for (let i = 0; i < firstWeekDay; i++) {
        const empty = document.createElement("div");
        empty.className = "calendar-day empty";
        calendarGrid.appendChild(empty);
    }

    dateList.forEach((dateObj, index) => {
        const percent = percents[index];
        const day = dateObj.getDate();

        const dayEl = document.createElement("div");
        dayEl.className = "calendar-day";
        dayEl.textContent = day;

        if (percent > 0) {
            dayEl.style.background = getProgressColors(percent);
            dayEl.style.color = "white";
        } else {
            dayEl.style.background = "#f3f4f6";
            dayEl.style.color = "#111827";
        }

        if (isSameDate(dateObj, new Date())) {
            dayEl.classList.add("today");
        }

        if (isSameDate(dateObj, selectedDate)) {
            dayEl.classList.add("selected");
        }

        dayEl.addEventListener("click", async () => {
            selectedDate = new Date(dateObj);
            await renderSelectedDay();
            await renderCalendar();
        });

        calendarGrid.appendChild(dayEl);
    });
}

openManageHabitsBtn.addEventListener("click", () => {
    manageHabitsModal.classList.remove("hidden");
});

closeManageHabitsBtn.addEventListener("click", () => {
    manageHabitsModal.classList.add("hidden");
});

manageHabitsModal.addEventListener("click", (e) => {
    if (e.target === manageHabitsModal) {
        manageHabitsModal.classList.add("hidden");
    }
});

addHabitBtn.addEventListener("click", async () => {
    const text = habitInput.value.trim();

    if (!text) {
        showMessage("Napiš návyk.", "#dc2626");
        return;
    }

    try {
        await addDoc(collection(db, "users", userId, "habits_master"), {
            text: text,
            createdAt: new Date().toISOString()
        });

        habitInput.value = "";
        await loadMasterHabits();
        await renderSelectedDay();
        await renderCalendar();
        showMessage("Návyk přidán.");
    } catch (error) {
        console.error(error);
        showMessage("Chyba při přidání návyku.", "#dc2626");
    }
});

prevMonthBtn.addEventListener("click", async () => {
    currentMonthDate = new Date(
        currentMonthDate.getFullYear(),
        currentMonthDate.getMonth() - 1,
        1
    );
    await renderCalendar();
});

nextMonthBtn.addEventListener("click", async () => {
    currentMonthDate = new Date(
        currentMonthDate.getFullYear(),
        currentMonthDate.getMonth() + 1,
        1
    );
    await renderCalendar();
});