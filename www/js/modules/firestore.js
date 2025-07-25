// www/js/modules/firestore.js

// auth.js'de başlatılan auth ve db nesnelerini import ediyoruz.
import { auth, db } from './auth.js'; 
import { doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Tüm Firestore veritabanı işlemlerini yöneten merkezi nesne.
export const FirestoreManager = {
    /**
     * Yeni bir kullanıcı için Firestore'da veri kaydı oluşturur.
     * @param {object} user - Firebase Auth'dan gelen kullanıcı nesnesi.
     * @param {object} additionalData - Kayıt formundan gelen ek veriler (displayName, phoneNumber).
     */
    async createUserData(user, additionalData) {
        const userRef = doc(db, "users", user.uid);
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: additionalData.displayName,
            phoneNumber: additionalData.phoneNumber,
            membershipType: 'free',
            dailyQueryCount: 0,
            lastQueryDate: new Date().toISOString().split('T')[0]
        };
        await setDoc(userRef, userData);
        console.log("Firestore: Kullanıcı verisi başarıyla oluşturuldu:", user.uid);
        return userData;
    },

    /**
     * Mevcut kullanıcının verilerini Firestore'dan çeker.
     * Günlük sorgu hakkını kontrol eder ve gerekirse sıfırlar.
     * @param {object} user - Firebase Auth'dan gelen kullanıcı nesnesi.
     * @returns {object|null} Kullanıcı verisi veya null.
     */
    async getUserData(user) {
        if (!user) {
            console.error("FirestoreManager: getUserData çağrıldı ama user nesnesi sağlanmadı!");
            return null;
        }

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            console.error(`Firestore: Veri bulunamadı! UID: ${user.uid}.`);
            return null;
        }

        let userData = docSnap.data();
        const today = new Date().toISOString().split('T')[0];

        // Günlük sorgu sayısını sıfırlama mantığı
        if (userData.lastQueryDate !== today) {
            userData.dailyQueryCount = 0;
            userData.lastQueryDate = today;
            await updateDoc(userRef, {
                dailyQueryCount: 0,
                lastQueryDate: today
            });
            console.log("Firestore: Günlük sorgu hakkı sıfırlandı.");
        }

        return userData;
    },

    /**
     * Kullanıcının günlük sorgu sayısını artırır/azaltır.
     * @param {number} amount - Eklenecek veya çıkarılacak miktar (varsayılan: 1).
     * @returns {number|null} Yeni sorgu sayısı veya null.
     */
    async incrementQueryCount(amount = 1) {
        const user = auth.currentUser;
        if (!user) return null;
        
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) return null;

        const currentCount = docSnap.data().dailyQueryCount || 0;
        const newCount = currentCount + amount;

        await updateDoc(userRef, { dailyQueryCount: newCount });
        console.log("Firestore: Sorgu sayısı güncellendi:", newCount);
        return newCount;
    },

    /**
     * Kullanıcının üyelik tipini 'premium' olarak günceller.
     */
    async upgradeToPremium() {
        const user = auth.currentUser;
        if (!user) throw new Error("Önce giriş yapmalısınız.");

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { membershipType: 'premium' });
        console.log("Firestore: Kullanıcı premium üyeliğe yükseltildi!");
    }
};
