// www/js/modules/firestore.js

// auth.js'de başlatılan auth ve db nesnelerini import ediyoruz.
import { auth, db } from './auth.js'; 
import { doc, getDoc, setDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Tüm Firestore veritabanı işlemlerini yöneten merkezi nesne.
export const FirestoreManager = {
    /**
     * Yeni bir kullanıcı için Firestore'da veri kaydı oluşturur.
     * @param {object} user - Firebase Auth'dan gelen kullanıcı nesnesi.
     * @param {object} additionalData - Kayıt formundan gelen ek veriler veya Google'dan gelen bilgiler.
     */
    async createUserData(user, additionalData = {}) {
        const userRef = doc(db, "users", user.uid);
        
        // Kullanıcının daha önce oluşturulup oluşturulmadığını kontrol et
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            console.log("Firestore: Mevcut kullanıcı, veri oluşturma atlandı.", user.uid);
            return docSnap.data();
        }

        const today = new Date();
        const userData = {
            uid: user.uid,
            email: user.email,
            displayName: additionalData.displayName || user.displayName || 'Kullanıcı',
            provider: user.providerData[0].providerId, // 'password', 'google.com' etc.
            
            // Ücretsiz Kullanıcı Limitleri
            dailyQueryCount: 3, // Herkese başlangıçta 3 hak veriyoruz.
            tokenQueries: 0,
            lastQueryDate: today.toISOString().split('T')[0], // YYYY-MM-DD formatı

            // Abonelik Bilgileri (Varsayılan olarak 'free')
            subscription: {
                tier: 'free',
                monthlyQueryLimit: 0,
                monthlyQueryCount: 0,
                lastMonthlyResetDate: today,
                expiresDate: null
            },
            
            createdAt: today
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

    // www/js/modules/firestore.js İÇİNE, incrementQueryCount'un ALTINA EKLEYİN

    /**
     * [GEÇİCİ] Kullanıcının günlük sorgu hakkını istemci tarafından 1 azaltır.
     * @returns {boolean} İşlemin başarılı olup olmadığını döndürür.
     */
    async decrementQueryCountClientSide() {
        const user = auth.currentUser;
        if (!user) {
            console.error("decrementQueryCount: Kullanıcı giriş yapmamış.");
            return false;
        }

        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (!docSnap.exists()) {
            console.error("decrementQueryCount: Kullanıcı verisi bulunamadı.");
            return false;
        }

        const currentCount = docSnap.data().dailyQueryCount || 0;
        if (currentCount <= 0) {
            console.log("decrementQueryCount: Kullanıcının zaten hakkı yok.");
            return false; // Zaten hakkı yoksa azaltma
        }

        const newCount = currentCount - 1;
        await updateDoc(userRef, { dailyQueryCount: newCount });
        console.log(`Firestore: Günlük sorgu hakkı ${newCount}'a düşürüldü.`);
        return true;
    },

     async updateUserSubscription(tier, expiresDate) {
        const user = auth.currentUser;
        if (!user) throw new Error("Abonelik güncellemek için kullanıcı giriş yapmalı.");
        const userRef = doc(db, "users", user.uid);
        
        const limits = {
            premium_student: 100,
            premium_pro: 300,
            free: 0
        };

        const newSubscriptionData = {
            tier: tier,
            expiresDate: expiresDate ? new Date(expiresDate) : null,
            monthlyQueryLimit: limits[tier] || 0,
            monthlyQueryCount: 0,
            lastMonthlyResetDate: new Date(),
        };
        
        await updateDoc(userRef, { subscription: newSubscriptionData });
        console.log(`Firestore: Kullanıcı aboneliği güncellendi. Yeni Seviye: ${tier}`);
    },

    async addTokenQueries(amount) {
        const user = auth.currentUser;
        if (!user) throw new Error("Jeton eklemek için kullanıcı giriş yapmalı.");
        const userRef = doc(db, "users", user.uid);

        // Firestore'un artırma (increment) özelliğini kullanarak atomik bir şekilde ekleme yap
        await updateDoc(userRef, {
            tokenQueries: increment(amount)
        });
        console.log(`Firestore: Kullanıcıya ${amount} jeton eklendi.`);
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
