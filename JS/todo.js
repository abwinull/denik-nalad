import { db } from "./databaze.js";
import { requireAuth, setupLogout } from "./app.js";

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const todoInput = document.getElementById("todoInput");
const addTodoBtn = document.getElementById("addTodoBtn");
const todoGroups = document.getElementById("todoGroups");
const message = document.getElementById("pageMessage");

let userId = null;

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
    await loadTodoGroups();
});

setupLogout();

function showMessage(text, color = "#16a34a") {
    message.textContent = text;
    message.style.color = color;
}

function getTodayData() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return {
        docId: `${year}-${month}-${day}`,
        dayName: dayNames[now.getDay()],
        dateLabel: `${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}`,
        createdAt: now.toISOString()
    };
}

async function loadTodoGroups() {
    todoGroups.innerHTML = "";

    const todosRef = collection(db, "users", userId, "todos");
    const q = query(todosRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        todoGroups.innerHTML = `<p>Zatím nemáš žádné úkoly.</p>`;
        return;
    }

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const tasks = data.tasks || [];

        const box = document.createElement("div");
        box.className = "todo-day-box";

        let tasksHtml = "";

        if (tasks.length === 0) {
            tasksHtml = `<p class="empty-tasks">Pro tento den zatím nejsou žádné úkoly.</p>`;
        } else {
            tasks.forEach((task, index) => {
                tasksHtml += `
                    <div class="todo-task-row">
                        <label class="todo-label">
                            <input 
                                type="checkbox" 
                                class="todo-check" 
                                data-docid="${docSnap.id}" 
                                data-index="${index}"
                                ${task.done ? "checked" : ""}
                            >
                            <span class="${task.done ? "done-text" : ""}">${task.text}</span>
                        </label>

                        <button 
                            class="delete-btn task-delete-btn" 
                            data-docid="${docSnap.id}" 
                            data-index="${index}">
                            Smazat
                        </button>
                    </div>
                `;
            });
        }

        box.innerHTML = `
            <div class="todo-day-header">
                <h3>${data.dayName}</h3>
                <small>${data.dateLabel} • ${new Date(data.createdAt).toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit"
                })}</small>
            </div>

            <div class="todo-task-list">
                ${tasksHtml}
            </div>
        `;

        todoGroups.appendChild(box);
    });

    bindTaskEvents();
}

function bindTaskEvents() {
    document.querySelectorAll(".todo-check").forEach((checkbox) => {
        checkbox.addEventListener("change", async () => {
            const docId = checkbox.dataset.docid;
            const index = Number(checkbox.dataset.index);

            const todoRef = doc(db, "users", userId, "todos", docId);
            const todoSnap = await getDoc(todoRef);

            if (!todoSnap.exists()) return;

            const data = todoSnap.data();
            const tasks = data.tasks || [];

            if (!tasks[index]) return;

            tasks[index].done = checkbox.checked;

            await updateDoc(todoRef, { tasks });
            await loadTodoGroups();
        });
    });

    document.querySelectorAll(".task-delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const docId = button.dataset.docid;
            const index = Number(button.dataset.index);

            const todoRef = doc(db, "users", userId, "todos", docId);
            const todoSnap = await getDoc(todoRef);

            if (!todoSnap.exists()) return;

            const data = todoSnap.data();
            let tasks = data.tasks || [];

            tasks.splice(index, 1);

            if (tasks.length === 0) {
                await deleteDoc(todoRef);
            } else {
                await updateDoc(todoRef, { tasks });
            }

            await loadTodoGroups();
        });
    });
}

addTodoBtn.addEventListener("click", async () => {
    const text = todoInput.value.trim();

    if (!text) {
        showMessage("Napiš úkol.", "#dc2626");
        return;
    }

    try {
        const today = getTodayData();
        const todoRef = doc(db, "users", userId, "todos", today.docId);
        const todoSnap = await getDoc(todoRef);

        if (todoSnap.exists()) {
            const data = todoSnap.data();
            const tasks = data.tasks || [];

            tasks.push({
                text: text,
                done: false
            });

            await updateDoc(todoRef, { tasks });
        } else {
            await setDoc(todoRef, {
                dayName: today.dayName,
                dateLabel: today.dateLabel,
                createdAt: today.createdAt,
                tasks: [
                    {
                        text: text,
                        done: false
                    }
                ]
            });
        }

        todoInput.value = "";
        showMessage("Úkol přidán.");
        await loadTodoGroups();
    } catch (error) {
        console.error(error);
        showMessage("Chyba při ukládání úkolu.", "#dc2626");
    }
});