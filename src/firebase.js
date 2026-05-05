import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyAclOf2qoR-6Qh4a2iooHDqnKT9qAs7zs0",
  authDomain: "gymtracker-app-4d04a.firebaseapp.com",
  projectId: "gymtracker-app-4d04a",
  storageBucket: "gymtracker-app-4d04a.firebasestorage.app",
  messagingSenderId: "261039309002",
  appId: "1:261039309002:web:872e596690ee9cf4307433"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
