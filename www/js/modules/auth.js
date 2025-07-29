// auth.js
// Kimlik doğrulama işlemleri

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, logError } from "./utils.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
//export const functions = getFunctions(app, 'europe-west1'); // Bölgeyi doğru belirttiğinden emin ol

// Import FirestoreManager after it's defined to avoid circular dependency
let FirestoreManager;
import('./firestore.js').then(module => {
    FirestoreManager = module.FirestoreManager;
});

export const AuthManager = {
    initProtectedPage: function(onSuccess) {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                window.location.href = 'login.html';
            } else {
                try {
                    // Wait for FirestoreManager to be loaded
                    if (!FirestoreManager) {
                        const module = await import('./firestore.js');
                        FirestoreManager = module.FirestoreManager;
                    }
                    
                    const userData = await FirestoreManager.getUserData(user);
                    if (onSuccess) {
                        onSuccess(userData);
                    }
                } catch (error) {
                    logError('AuthManager.initProtectedPage', error);
                    window.location.href = 'login.html';
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
        signOut(auth)
            .then(() => {
                window.location.href = "login.html";
            })
            .catch((error) => {
                logError('AuthManager.logout', error);
                window.location.href = "login.html";
            });
    }
};
