// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCc_eF64K7bl0Q_nK2bxND5tgippvUqkZU",
  authDomain: "afripay-bridge.firebaseapp.com",
  projectId: "afripay-bridge",
  storageBucket: "afripay-bridge.firebasestorage.app",
  messagingSenderId: "748987137314",
  appId: "1:748987137314:web:fff80142bbbbda6144797b",
  measurementId: "G-ZCYE8XVL88"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
