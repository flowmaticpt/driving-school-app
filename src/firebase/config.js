// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries


const firebaseConfig = {
  apiKey: "AIzaSyAmR1rST9T6deoGe_w9wllZlf1exAFuRzY",
  authDomain: "drivingschool-195fc.firebaseapp.com",
  projectId: "drivingschool-195fc",
  storageBucket: "drivingschool-195fc.firebasestorage.app",
  messagingSenderId: "149862072942",
  appId: "1:149862072942:web:e20df3e1b7e817d1d89c7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;