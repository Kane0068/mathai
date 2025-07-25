// www/js/pages/profile.js

import { AuthManager } from '../modules/auth.js';

// Gerekli HTML elementlerini seç
const nameEl = document.getElementById('display-name');
const emailEl = document.getElementById('display-email');
const membershipEl = document.getElementById('display-membership');
const upgradeSection = document.getElementById('upgrade-section');
const logoutBtn = document.getElementById('logout-btn');

/**
 * Kullanıcı verilerini alıp profil sayfasındaki ilgili alanları doldurur.
 * @param {object} userData - Firestore'dan gelen kullanıcı verisi.
 */
function fillProfileData(userData) {
    if (userData) {
        nameEl.textContent = userData.displayName;
        emailEl.textContent = userData.email;
        
        if (userData.membershipType === 'premium') {
            membershipEl.textContent = 'Premium';
            membershipEl.className = 'font-bold text-purple-600';
        } else {
            membershipEl.textContent = 'Standart';
            membershipEl.className = 'font-bold text-gray-800';
            upgradeSection.classList.remove('hidden');
        }
    } else {
        // Bu durum normalde AuthManager tarafından engellenir.
        nameEl.textContent = "Veri bulunamadı.";
        emailEl.textContent = "Veri bulunamadı.";
        membershipEl.textContent = "Veri bulunamadı.";
    }
}

// Sayfa yüklendiğinde, korumalı sayfa başlatıcısını çağır.
// Başarılı olursa, `fillProfileData` fonksiyonunu çalıştırır.
window.addEventListener('load', () => {
    AuthManager.initProtectedPage(fillProfileData);
});

// Çıkış yap butonuna olay dinleyici ekle.
logoutBtn.addEventListener('click', () => {
    AuthManager.logout();
});
