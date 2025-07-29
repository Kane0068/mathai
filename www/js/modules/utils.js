// utils.js
// Ortak yardımcı fonksiyonlar burada toplanır.

/**
 * DOM elementini güvenli şekilde getirir.
 * @param {string} id - Elementin ID'si
 * @returns {HTMLElement|null}
 */
export function getElement(id) {
    return document.getElementById(id);
}

/**
 * Basit derin kopya (deep clone) fonksiyonu.
 * @param {Object} obj
 * @returns {Object}
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Diğer yardımcı fonksiyonlar buraya eklenebilir. 