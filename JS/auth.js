import { auth, db } from "./databaze.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");

function showMessage(text, color = "#dc2626") {
    message.innerText = text;
    message.style.color = color;
}

function clearMessage() {
    message.innerText = "";
}

function switchToLogin() {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    clearMessage();
}

function switchToRegister() {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    clearMessage();
}

loginTab.addEventListener("click", switchToLogin);
registerTab.addEventListener("click", switchToRegister);

window.register = async function () {
    const nickname = document.getElementById("registerNickname").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    clearMessage();

    if (!nickname || !email || !password) {
        showMessage("Vyplň všechna pole.");
        return;
    }

    if (nickname.length < 3) {
        showMessage("Přezdívka musí mít alespoň 3 znaky.");
        return;
    }

    if (password.length < 6) {
        showMessage("Heslo musí mít alespoň 6 znaků.");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            nickname: nickname,
            nicknameLower: nickname.toLowerCase(),
            email: email,
            createdAt: new Date().toISOString()
        });

        showMessage("Registrace proběhla úspěšně.", "#16a34a");

        setTimeout(() => {
            window.location.href = "hlavni.html";
        }, 600);

    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            showMessage("Tento email už je zaregistrovaný.");
        } else if (error.code === "auth/invalid-email") {
            showMessage("Neplatný email.");
        } else if (error.code === "auth/weak-password") {
            showMessage("Heslo je příliš slabé.");
        } else {
            showMessage("Chyba: " + error.message);
        }
    }
};

window.login = async function () {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    clearMessage();

    if (!email || !password) {
        showMessage("Vyplň email i heslo.");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage("Přihlášení proběhlo úspěšně.", "#16a34a");

        setTimeout(() => {
            window.location.href = "hlavni.html";
        }, 500);

    } catch (error) {
        console.error(error);

        if (error.code === "auth/invalid-credential") {
            showMessage("Špatný email nebo heslo.");
        } else {
            showMessage("Chyba: " + error.message);
        }
    }
};