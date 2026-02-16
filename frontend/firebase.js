// frontend/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "afripay-bridge.firebaseapp.com",
  projectId: "afripay-bridge",
  storageBucket: "afripay-bridge.firebasestorage.app",
  messagingSenderId: "748987137314",
  appId: "1:748987137314:web:fff80142bbbbda6144797b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
