import { auth, db } from "./databaze.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentUser = null;
let currentUserData = null;

export function requireAuth(callback) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        currentUser = user;

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                currentUserData = userSnap.data();
            }

            const usernameElements = document.querySelectorAll("#username");
            usernameElements.forEach(el => {
                el.textContent = currentUserData?.nickname || user.email;
            });

            if (typeof callback === "function") {
                callback(user, currentUserData);
            }
        } catch (error) {
            console.error("Chyba při načítání uživatele:", error);
        }
    });
}

export function setupLogout() {
    const logoutButtons = document.querySelectorAll("#logout");

    logoutButtons.forEach(button => {
        button.addEventListener("click", async () => {
            try {
                await signOut(auth);
                window.location.href = "index.html";
            } catch (error) {
                console.error("Chyba při odhlášení:", error);
            }
        });
    });
}

export function getCurrentUser() {
    return currentUser;
}

export function getCurrentUserData() {
    return currentUserData;
}