import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOdhZMRvzYEC-m6d2IpjamUVRmrsxzyuU",
  authDomain: "denik-nalad.firebaseapp.com",
  projectId: "denik-nalad",
  storageBucket: "denik-nalad.firebasestorage.app",
  messagingSenderId: "166205266167",
  appId: "1:166205266167:web:1cdf89247b4ad3cf8c1bf2",
  measurementId: "G-L3L2K521S0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };