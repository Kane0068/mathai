// www/js/core/Config.js - Updated with API Configuration
export const APP_CONFIG = {
    // Firebase Configuration
    firebase: {
        apiKey: "AIzaSyB7ltgEuxgDz4Fjy4WTs65Fio--vbrCgMM",
        authDomain: "mathai-a3bab.firebaseapp.com",
        projectId: "mathai-a3bab",
        storageBucket: "mathai-a3bab.firebasestorage.app",
        messagingSenderId: "738862131547",
        appId: "1:738862131547:web:91212c884c4eb8812bd27e"
    },

    // API Configuration
    api: {
        // Gemini AI Configuration
        gemini: {
            apiKey: "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs",
            model: "gemini-2.0-flash",
            baseUrl: "https://generativelanguage.googleapis.com/v1beta",
            get endpoint() {
                return `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
            }
        },
        
        // File Upload Limits
        maxFileSize: 5 * 1024 * 1024, // 5MB
        supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        
        // Query Limits
        dailyLimits: {
            free: 5,
            premium: 200
        },
        
        // Request Configuration
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        retryDelay: 1000 // 1 second
    },

    // Canvas Configuration
    canvas: {
        defaultTool: 'pen',
        backgroundColor: '#ffffff',
        penColor: '#000000',
        penWidth: 2,
        eraserWidth: 10
    },

    // UI Configuration
    ui: {
        notificationDuration: 5000,
        loadingTimeout: 30000,
        animationDuration: 300
    }
};

// API Prompts Configuration
export const API_PROMPTS = {
    // Master solution prompt for Turkish math problems
    masterSolution: `MATEMATIK PROBLEM ÇÖZÜCÜ - KATKI KURALLARI

🚨 KRİTİK TALİMATLAR - MUTLAKA TAKİP ET:

1. YANIT FORMATI GEREKSİNİMLERİ:
   - Yanıt SADECE geçerli JSON olmalı
   - JSON'dan önce veya sonra ASLA ekstra metin yazma
   - Tüm string'ler için çift tırnak kullan
   - Sondaki virgülleri kaldır
   - Karakter kaçışlarını doğru yap (\\n, \\", \\\\)

2. ALAN ÖZEL KURALLARI - MUTLAKA UYULACAK:
   
   adimAciklamasi alanı için:
   ✅ SADECE Türkçe metin: "Verilen değerleri yerine koy"
   ❌ YASAK: √, ∫, ∑, π, α, β, θ, ≤, ≥, ≠, ±, $, $$, \\(, \\), \\[, \\]
   ❌ YASAK: \\frac, \\sqrt, \\sum, \\int, herhangi bir LaTeX komut
   
   ipucu alanı için:
   ✅ SADECE Türkçe metin: "Bu adımda işlem sırasına dikkat et"
   ❌ YASAK: Tüm matematik sembolleri ve LaTeX komutları
   
   cozum_lateks alanı için:
   ✅ SADECE LaTeX: "$$x = \\frac{a + b}{c}$$"
   ✅ MUTLAKA $$ ile başla ve bitir
   ❌ YASAK: Türkçe kelimeler bu alanda

3. ZORUNLU DOĞRULAMA KELİMELERİ:
   - Türkçe alanlarda kullan: "hesapla", "bul", "belirle", "çöz", "yerine koy"
   - Matematik sembolleri yerine kelime kullan: "karekök" (√ değil), "pi sayısı" (π değil)

4. ÖRNEK DOĞRU FORMAT:
   ✅ "adimAciklamasi": "Denklemin sol tarafındaki değerleri topla"
   ❌ "adimAciklamasi": "x + y = 5 denklemini çöz"
   
   ✅ "cozum_lateks": "$$x + y = 5$$"
   ❌ "cozum_lateks": "x + y = 5"

5. ZORUNLU JSON ŞEMASI:
{
  "problemOzeti": {
    "verilenler": ["Türkçe açıklama 1", "Türkçe açıklama 2"],
    "istenen": "Türkçe açıklama"
  },
  "adimlar": [
    {
      "adimAciklamasi": "SADECE Türkçe metin",
      "cozum_lateks": "$$LaTeX formül$$",
      "ipucu": "SADECE Türkçe ipucu metni"
    }
  ],
  "tamCozumLateks": ["$$Formül 1$$", "$$Formül 2$$"],
  "sonuclar": ["Türkçe sonuç açıklaması"]
}

6. PROBLEM CONTEXT: {PROBLEM_CONTEXT}

ÖNEMLİ: Yanıt olarak SADECE yukarıdaki JSON formatını döndür. Başka hiçbir metin ekleme!`,

    // Validation prompt for user answers
    answerValidation: `Bu matematik adımının doğruluğunu değerlendir:

Beklenen Çözüm: {EXPECTED_ANSWER}
Öğrenci Cevabı: {STUDENT_ANSWER}
Adım Açıklaması: {STEP_DESCRIPTION}

JSON formatında yanıt ver:
{
    "isCorrect": boolean,
    "accuracy": number (0-1),
    "feedback": "Türkçe geri bildirim",
    "specificError": "Hata açıklaması veya null",
    "improvement": "İyileştirme önerisi"
}`,

    // Problem analysis prompt
    problemAnalysis: `Bu matematik problemini analiz et ve türünü belirle:

Problem: {PROBLEM_TEXT}

JSON formatında yanıt ver:
{
    "problemType": "cebir|geometri|analiz|sayılar|olasılık",
    "difficulty": "kolay|orta|zor",
    "requiredKnowledge": ["kavram1", "kavram2"],
    "estimatedTime": number (dakika)
}`
};

// View Configuration
export const VIEWS = {
    UPLOAD: 'upload',
    SUMMARY: 'summary', 
    SOLVING: 'solving',
    INTERACTIVE: 'interactive',
    RESULT: 'result'
};

// DOM Element IDs Configuration
export const ELEMENTS = {
    // Upload elements
    imageUploader: 'imageUploader',
    cameraUploader: 'cameraUploader',
    imagePreview: 'imagePreview',
    previewContainer: 'preview-container',
    uploadSelection: 'upload-selection',
    
    // Button elements
    startFromPhotoBtn: 'startFromPhotoBtn',
    selectFileBtn: 'selectFileBtn',
    takePhotoBtn: 'takePhotoBtn',
    changePhotoBtn: 'changePhotoBtn',
    
    // Canvas elements
    handwritingCanvas: 'handwritingCanvas',
    
    // Result elements
    question: 'question',
    resultContainer: 'result-container',
    
    // Input elements
    keyboardInput: 'keyboard-input'
};

// Error Messages Configuration
export const ERROR_MESSAGES = {
    AUTH_FAILED: 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
    USER_NOT_FOUND: 'Kullanıcı bulunamadı.',
    NETWORK_ERROR: 'İnternet bağlantısı hatası. Lütfen bağlantınızı kontrol edin.',
    FILE_TOO_LARGE: 'Dosya boyutu çok büyük. Maksimum 5MB olabilir.',
    INVALID_FILE_TYPE: 'Desteklenmeyen dosya türü. JPEG, PNG, GIF veya WebP yükleyin.',
    API_ERROR: 'Sunucu hatası. Lütfen tekrar deneyin.',
    QUERY_LIMIT_EXCEEDED: 'Günlük sorgu limitiniz doldu. Yarın tekrar deneyin.',
    TIMEOUT_ERROR: 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.',
    VALIDATION_ERROR: 'Geçersiz veri. Lütfen girdiğinizi kontrol edin.'
};

// Success Messages Configuration
export const SUCCESS_MESSAGES = {
    FILE_UPLOADED: 'Dosya başarıyla yüklendi!',
    PROBLEM_SOLVED: 'Problem başarıyla çözüldü!',
    STEP_CORRECT: 'Doğru! Bir sonraki adıma geçiliyor.',
    SOLUTION_COMPLETED: 'Tebrikler! Çözümü tamamladınız.',
    PROFILE_UPDATED: 'Profil bilgileriniz güncellendi.'
};

// Development Configuration
export const DEV_CONFIG = {
    //enableDebugMode: process.env.NODE_ENV === 'development',
    enableConsoleLogging: true,
    enablePerformanceMonitoring: true,
    apiMockMode: false // Set to true to use mock API responses
};