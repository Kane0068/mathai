// www/js/pages/premium.js

// Bu sayfa hem giriş yapmış hem de yapmamış kullanıcılar tarafından görülebilir,
// bu yüzden özel bir AuthManager çağrısı yapmıyoruz.
// Ancak Firestore işlemi için giriş yapmış olmak gerekir.
import { FirestoreManager } from '../modules/firestore.js';
import { auth } from '../modules/auth.js';

const upgradeBtn = document.getElementById('upgrade-btn');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');

upgradeBtn.addEventListener('click', async () => {
    // Önce kullanıcının giriş yapıp yapmadığını kontrol et
    if (!auth.currentUser) {
        errorMessage.textContent = 'Bu işlemi yapmak için önce giriş yapmalısınız.';
        errorMessage.classList.remove('hidden');
        return;
    }

    upgradeBtn.disabled = true;
    upgradeBtn.textContent = 'Yükseltiliyor...';
    errorMessage.classList.add('hidden');

    try {
        await FirestoreManager.upgradeToPremium();
        successMessage.classList.remove('hidden');
        upgradeBtn.classList.add('hidden');
        setTimeout(() => {
            window.location.href = 'profile.html'; // Profil sayfasına yönlendir
        }, 2000);
    } catch (error) {
        errorMessage.textContent = 'Bir hata oluştu: ' + error.message;
        errorMessage.classList.remove('hidden');
        upgradeBtn.disabled = false;
        upgradeBtn.textContent = 'Hemen Yükselt';
    }
});
