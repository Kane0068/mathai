// utils.js
// Ortak yardımcı fonksiyonlar ve sabitler

// === Firebase Configuration ===
export const firebaseConfig = {
    apiKey: "AIzaSyB7ltgEuxgDz4Fjy4WTs65Fio--vbrCgMM",
    authDomain: "mathai-a3bab.firebaseapp.com",
    projectId: "mathai-a3bab",
    storageBucket: "mathai-a3bab.firebasestorage.app",
    messagingSenderId: "738862131547",
    appId: "1:738862131547:web:91212c884c4eb8812bd27e"
};

// === API Configuration ===
export const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

// === DOM Utilities ===
/**
 * DOM elementini güvenli şekilde getirir.
 * @param {string} id - Elementin ID'si
 * @returns {HTMLElement|null}
 */
export function getElement(id) {
    return document.getElementById(id);
}

/**
 * Multiple elements güvenli şekilde getirir.
 * @param {string[]} ids - Element ID'leri
 * @returns {Object} - ID'lere göre elementler
 */
export function getElements(...ids) {
    const elements = {};
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
    return elements;
}

/**
 * Element varlığını kontrol eder.
 * @param {HTMLElement} element 
 * @returns {boolean}
 */
export function elementExists(element) {
    return element !== null && element !== undefined;
}

// === Object Utilities ===
/**
 * Basit derin kopya (deep clone) fonksiyonu.
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * İki objeyi güvenli şekilde birleştirir.
 * @param {Object} target 
 * @param {Object} source 
 * @returns {Object}
 */
export function safeMerge(target, source) {
    return { ...target, ...source };
}

// === String Utilities ===
/**
 * HTML kaçış karakterlerini güvenli şekilde uygular.
 * @param {string} text 
 * @returns {string}
 */
export function escapeHtml(text) {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Metin içeriğini temizler.
 * @param {string} text 
 * @returns {string}
 */
export function sanitizeText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
}

// === Async Utilities ===
/**
 * Belirtilen süre kadar bekler.
 * @param {number} ms - Milisaniye
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry mekanizması ile async fonksiyon çalıştırır.
 * @param {Function} fn - Çalıştırılacak fonksiyon
 * @param {number} maxRetries - Maksimum deneme sayısı
 * @param {number} delay - Denemeler arası bekleme
 * @returns {Promise}
 */
export async function retry(fn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries) {
                await sleep(delay);
            }
        }
    }
    
    throw lastError;
}

// === Validation Utilities ===
/**
 * Email formatını kontrol eder.
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Telefon numarası formatını kontrol eder.
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidPhone(phone) {
    const phoneRegex = /^\d{10,15}$/;
    return phoneRegex.test(phone);
}

/**
 * Şifre güçlülüğünü kontrol eder.
 * @param {string} password 
 * @returns {boolean}
 */
export function isValidPassword(password) {
    return password && password.length >= 6;
}

// === Math Utilities ===
/**
 * Sayıyı güvenli şekilde parse eder.
 * @param {any} value 
 * @returns {number}
 */
export function safeParseInt(value) {
    const parsed = parseInt(value);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * İki sayı arasında random değer üretir.
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// === Date Utilities ===
/**
 * Bugünün tarihini YYYY-MM-DD formatında döndürür.
 * @returns {string}
 */
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Timestamp'i okunabilir formata çevirir.
 * @param {number} timestamp 
 * @returns {string}
 */
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('tr-TR');
}

// === Error Utilities ===
/**
 * Error objesini safe string'e çevirir.
 * @param {Error} error 
 * @returns {string}
 */
export function errorToString(error) {
    if (!error) return 'Unknown error';
    return error.message || error.toString();
}

/**
 * Hata loglamak için konsol wrapper.
 * @param {string} context 
 * @param {Error} error 
 * @param {any} extra 
 */
export function logError(context, error, extra = null) {
    console.error(`[${context}]`, error, extra);
}

// === Device Detection ===
/**
 * Mobil cihaz olup olmadığını kontrol eder.
 * @returns {boolean}
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Touch desteği olup olmadığını kontrol eder.
 * @returns {boolean}
 */
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// === Local Storage Utilities ===
/**
 * Local storage'dan güvenli veri okur.
 * @param {string} key 
 * @param {any} defaultValue 
 * @returns {any}
 */
export function getStorageItem(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        logError('getStorageItem', error);
        return defaultValue;
    }
}

/**
 * Local storage'a güvenli veri yazar.
 * @param {string} key 
 * @param {any} value 
 * @returns {boolean}
 */
export function setStorageItem(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        logError('setStorageItem', error);
        return false;
    }
}

/**
 * Local storage'dan veri siler.
 * @param {string} key 
 * @returns {boolean}
 */
export function removeStorageItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        logError('removeStorageItem', error);
        return false;
    }
}

// === Performance Utilities ===
/**
 * Performans ölçümü başlatır.
 * @param {string} label 
 * @returns {Function} - Ölçümü bitiren fonksiyon
 */
export function startPerformanceMeasure(label) {
    const startTime = performance.now();
    return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`Performance [${label}]: ${duration.toFixed(2)}ms`);
        return duration;
    };
} 