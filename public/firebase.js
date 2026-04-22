// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAA2Tl7kWuX1RQcqeVgRR5cf_Mwt-DZX-w",
  authDomain: "avora-fc8b4.firebaseapp.com",
  projectId: "avora-fc8b4",
  storageBucket: "avora-fc8b4.firebasestorage.app",
  messagingSenderId: "520572013150",
  appId: "1:520572013150:web:a7efe5fce0a4e26df342cf"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
