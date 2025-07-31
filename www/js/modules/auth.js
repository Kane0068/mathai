// www/js/modules/auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { APP_CONFIG } from '../core/Config.js';
import { FirestoreManager } from "./firestore.js";

// Initialize Firebase with config from centralized config
const app = initializeApp(APP_CONFIG.firebase);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const AuthManager = {
    /**
     * Initialize authentication for protected pages
     * @param {Function} onSuccess - Callback when user is authenticated
     */
    initProtectedPage: function(onSuccess) {
        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                try {
                    if (!user) {
                        // User not authenticated, redirect to login
                        window.location.href = 'login.html';
                        return;
                    }

                    // User authenticated, get user data
                    const userData = await FirestoreManager.getUserData(user);
                    
                    if (onSuccess) {
                        onSuccess(userData);
                    }
                    
                    resolve(userData);
                    unsubscribe(); // Clean up listener after first successful auth
                    
                } catch (error) {
                    console.error('Auth initialization error:', error);
                    reject(error);
                    unsubscribe();
                }
            });
        });
    },

    /**
     * Initialize authentication for public pages (login, register)
     * Redirects to main app if user is already authenticated
     */
    initPublicPage: function() {
        return new Promise((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe(); // Clean up listener immediately
                
                if (user) {
                    // User already authenticated, redirect to main app
                    window.location.href = 'index.html';
                } else {
                    // User not authenticated, stay on public page
                    resolve();
                }
            });
        });
    },

    /**
     * Sign out current user and redirect to login
     */
    logout: function() {
        return signOut(auth)
            .then(() => {
                console.log('User signed out successfully');
                window.location.href = "login.html";
            })
            .catch((error) => {
                console.error('Logout error:', error);
                // Force redirect even if logout fails
                window.location.href = "login.html";
            });
    },

    /**
     * Get current authenticated user
     * @returns {User|null} Current user or null if not authenticated
     */
    getCurrentUser: function() {
        return auth.currentUser;
    },

    /**
     * Check if user is currently authenticated
     * @returns {boolean} True if user is authenticated
     */
    isAuthenticated: function() {
        return !!auth.currentUser;
    },

    /**
     * Get current user's UID
     * @returns {string|null} User UID or null if not authenticated
     */
    getCurrentUserId: function() {
        return auth.currentUser?.uid || null;
    },

    /**
     * Add authentication state change listener
     * @param {Function} callback - Callback function to handle auth state changes
     * @returns {Function} Unsubscribe function
     */
    onAuthStateChange: function(callback) {
        return onAuthStateChanged(auth, callback);
    }
};