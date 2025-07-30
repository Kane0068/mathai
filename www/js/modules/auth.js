// www/js/modules/auth.js

// DÜZELTME: Tüm import linkleri temiz ve doğru formatta.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FirestoreManager } from "./firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const firebaseConfig = {
    apiKey: "AIzaSyB7ltgEuxgDz4Fjy4WTs65Fio--vbrCgMM",
    authDomain: "mathai-a3bab.firebaseapp.com",
    projectId: "mathai-a3bab",
    storageBucket: "mathai-a3bab.firebasestorage.app",
    messagingSenderId: "738862131547",
    appId: "1:738862131547:web:91212c884c4eb8812bd27e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
//export const functions = getFunctions(app, 'europe-west1'); // Bölgeyi doğru belirttiğinden emin ol

export const AuthManager = {
    initProtectedPage: function(onSuccess) {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                const userData = await FirestoreManager.getUserData(user);
                if (onSuccess) {
                    onSuccess(userData);
                }
            }
        });
    },
    initPublicPage: function() {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
                window.location.href = 'index.html';
            }
        });
    },
    logout: function() {
        signOut(auth).then(() => {
            window.location.href = "login.html";
        }).catch((error) => {
            console.error('Logout error:', error);
            window.location.href = "login.html";
        });
    }
};
