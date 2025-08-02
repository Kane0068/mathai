// www/js/services/promptBuilder.js

/**
 * ÖZET PROMPT - Öğretici yapıda
 */
export function buildSummaryPrompt(problemContext) {
    return `
        Sen deneyimli bir matematik öğretmenisin. Aşağıdaki matematik problemini öğrenciye açık ve anlaşılır şekilde özetle.
        
        Problem: ${problemContext}
        
        GÖREVİN:
        1. Problemi analiz et
        2. Verilenleri net olarak listele
        3. İsteneni açık şekilde belirt
        4. Öğrencinin anlayabileceği dilde yaz
        
        JSON ŞEMASI:
        {
            "problemOzeti": {
                "verilenler": [
                    "Öğrenci dostu açıklama ve değer (örn: 'Ahmet'in başlangıçtaki para miktarı: 50 TL')"
                ],
                "istenen": "Ne bulunması gerektiğinin net açıklaması",
                "ipucu": "Problemi çözmek için kullanılabilecek yaklaşım önerisi",
                "zorlukSeviyesi": "kolay | orta | zor",
                "tahminiCozumSuresi": "dakika cinsinden"
            }
        }
        
        ÖRNEKLER:
        ✅ İyi: "Dikdörtgenin uzun kenarı: 12 cm"
        ❌ Kötü: "a = 12"
        
        ✅ İyi: "Dikdörtgenin alanını bulmamız isteniyor"
        ❌ Kötü: "A = ?"
        
        DİL KURALLARI:
        - Türkçe karakterleri doğru kullan
        - Matematiksel sembolleri LaTeX formatında yaz: $sembol$
        - Öğrenci seviyesine uygun açıklamalar yap
        
        SADECE JSON FORMATINDA YANIT VER.
    `;
}

/**
 * ÇÖZÜM PROMPT - Adım adım öğretici
 */
export function buildFullSolutionPrompt(problemContext) {
    return `
        Sen sabırlı ve öğretici bir matematik öğretmenisin. Problemi adım adım, öğrencinin anlayabileceği şekilde çöz.
        
        Problem: ${problemContext}
        
        ÇÖZÜM YAKLAŞIMIN:
        1. Her adımı net ve anlaşılır yaz
        2. Neden o işlemi yaptığını açıkla
        3. Yaygın hataları belirt
        4. Her adımda öğrenciyi teşvik et
        
        JSON ŞEMASI:
        {
            "adimlar": [
                {
                    "adimNo": 1,
                    "adimBasligi": "Bu adımda ne yapıyoruz?",
                    "adimAciklamasi": "SADECE SÖZEL açıklama - neden bu işlemi yapıyoruz",
                    "cozum_lateks": "$$matematiksel_ifade$$",
                    "ipucu": "Bu adımda dikkat edilmesi gereken nokta",
                    "yayginHatalar": ["Öğrencilerin bu adımda yapabileceği yaygın hatalar"],
                    "alternatifYontem": "Varsa alternatif çözüm yolu"
                }
            ],
            "tamCozumLateks": [
                "$$adim_1$$",
                "$$adim_2$$",
                "$$sonuc$$"
            ],
            "sonucKontrolu": "Sonucun doğruluğunu kontrol etme yöntemi",
            "benzerSorular": ["Bu konuda pratik yapılabilecek benzer soru tipleri"]
        }
        
        ADIM YAZIM KURALLARI:
        - Her adım öncekine bağlı olmalı
        - İşlem sırası net olmalı
        - Açıklamalar motive edici olmalı
        - "Harika!", "Çok iyi!", "Devam edelim!" gibi ifadeler kullan
        
        MATEMATİK KURALLARI:
        - Tüm matematiksel ifadeler $$ içinde
        - Kesirler: \\frac{pay}{payda}
        - Kökler: \\sqrt{ifade}
        - Üsler: x^{us}
        
        SADECE JSON FORMATINDA YANIT VER.
    `;
}


export function buildInteractiveOptionsPrompt(stepData, allSteps, currentStepIndex) {
    // Prompt'u daha basit ve temiz yapalım
    const currentLatex = stepData.cozum_lateks
        .replace(/\$/g, '')
        .replace(/\\\\/g, '\\'); // Basitleştir

    return `
        Matematik adımı için 2 yanlış seçenek üret.
        
        Doğru cevap: ${currentLatex}
        
        KURALLAR:
        - Doğru cevaba çok benzesin
        - Küçük hatalar içersin
        - LaTeX formatında olsun
        
        JSON formatı:
        {
            "yanlisSecenekler": [
                {
                    "metin": "latex ifadesi",
                    "hataAciklamasi": "hata türü"
                },
                {
                    "metin": "latex ifadesi", 
                    "hataAciklamasi": "hata türü"
                }
            ]
        }
        
        Örnekler:
        - İşaret hatası
        - Hesaplama hatası  
        - İşlem sırası hatası
        
        SADECE JSON döndür, başka açıklama yapma.
    `;
}

/**
 * DOĞRULAMA PROMPT - Öğretici geri bildirim
 */
export function buildStepValidationPrompt(studentInput, expectedStepData) {
    return `
        Sen anlayışlı ve destekleyici bir matematik öğretmenisin. Öğrencinin cevabını değerlendir.
        
        Beklenen çözüm: ${expectedStepData.cozum_lateks}
        Öğrenci cevabı: ${studentInput}
        Adım açıklaması: ${expectedStepData.adimAciklamasi}
        
        DEĞERLENDİRME KRİTERLERİ:
        1. Matematiksel doğruluk
        2. Yaklaşım doğruluğu
        3. Küçük yazım hatalarına tolerans
        4. Farklı ama doğru çözümleri kabul et
        
        JSON ŞEMASI:
        {
            "dogruMu": boolean,
            "dogrulukOrani": number (0-100),
            "geriBildirim": "KISA, motive edici, SÖZEL geri bildirim",
            "neden": "Yanlışsa SÖZEL olarak neden yanlış",
            "ipucu": "Bir sonraki deneme için yardımcı olacak ipucu",
            "tesvik": "Öğrenciyi motive edecek bir cümle",
            "alternatifCozum": "Eğer farklı ama doğru bir yaklaşımsa belirt"
        }
        
        GERİ BİLDİRİM ÖRNEKLERİ:
        
        Doğru cevap için:
        - "Harika! Tam olarak doğru yaklaşım! 🎉"
        - "Mükemmel! Çok güzel düşünmüşsün! ⭐"
        - "Bravo! Adım adım ilerliyorsun! 👏"
        
        Yanlış cevap için:
        - "Yaklaştın ama küçük bir hata var. Tekrar dene!"
        - "İyi deneme! Şu noktayı gözden geçir..."
        - "Neredeyse doğru! Biraz daha dikkatli bak."
        
        KURALLAR:
        - ASLA matematik sembolü kullanma geribildirimde
        - Çok kısa ve net ol
        - Her zaman pozitif ve cesaretlendirici ol
        - Türkçe karakterleri doğru kullan
        
        SADECE JSON FORMATINDA YANIT VER.
    `;
}

/**
 * DÜZELTME PROMPT - Geliştirilmiş
 */
export function buildCorrectionPrompt(originalPrompt, faultyResponse, errorMessage) {
    return `
        ÖNEMLİ: Önceki yanıtın JSON formatında hata vardı. Lütfen düzelt.
        
        HATA DETAYI:
        ${errorMessage}
        
        HATALI YANIT:
        ${faultyResponse}
        
        DÜZELTME TALİMATLARI:
        1. JSON syntax'ını kontrol et
        2. Tüm string'leri tırnak içine al
        3. Virgülleri kontrol et
        4. Ters slash karakterlerini düzgün escape et (\ yerine \\)
        5. Unicode karakterleri düzgün kodla
        
        ORİJİNAL İSTEK:
        ${originalPrompt}
        
        SADECE geçerli JSON formatında yanıt ver. Başka açıklama ekleme.
    `;
}

// promptBuilder.js sonuna ekleyin

/**
 * API yanıtını normalize et
 */
export function normalizeApiResponse(response) {
    if (!response) return null;
    
    // Adımları normalize et
    if (response.adimlar && Array.isArray(response.adimlar)) {
        response.adimlar = response.adimlar.map(adim => ({
            ...adim,
            // LaTeX içeriğini temizle
            cozum_lateks: cleanLatexContent(adim.cozum_lateks),
            // Açıklamayı temizle
            adimAciklamasi: cleanTextContent(adim.adimAciklamasi),
            // İpucunu temizle
            ipucu: cleanTextContent(adim.ipucu)
        }));
    }
    
    // Özet kısmını normalize et
    if (response.problemOzeti) {
        if (response.problemOzeti.verilenler) {
            response.problemOzeti.verilenler = response.problemOzeti.verilenler.map(cleanTextContent);
        }
        if (response.problemOzeti.istenen) {
            response.problemOzeti.istenen = cleanTextContent(response.problemOzeti.istenen);
        }
    }
    
    return response;
}

function cleanLatexContent(content) {
    if (!content) return '';
    
    // Markdown bold işaretlerini kaldır
    let cleaned = content.replace(/\*\*(.*?)\*\*/g, '$1');
    
    // Çift delimiter'ları düzelt
    cleaned = cleaned
        .replace(/\$\$\$/g, '$$')
        .replace(/\$\s+\$/g, '$$');
    
    // Gereksiz boşlukları temizle
    cleaned = cleaned.trim();
    
    return cleaned;
}

function cleanTextContent(content) {
    if (!content) return '';
    
    // HTML entity'leri decode et
    const textarea = document.createElement('textarea');
    textarea.innerHTML = content;
    let cleaned = textarea.value;
    
    // Gereksiz boşlukları temizle
    cleaned = cleaned.trim();
    
    return cleaned;
}

/**
 * Matematik sorusu validasyon prompt'u
 */
export function buildMathValidationPrompt(problemContext) {
    return `
        Aşağıdaki metin bir matematik sorusu/problemi mi yoksa alakasız bir içerik mi? Dikkatli analiz et.

        Metin: ${problemContext}

        YANIT FORMATI (SADECE JSON):
        {
            "isMathProblem": boolean,
            "confidence": number (0-1),
            "category": "algebra" | "geometry" | "arithmetic" | "calculus" | "statistics" | "other" | "not_math",
            "reason": "string - Neden matematik sorusu olduğu/olmadığı",
            "educationalMessage": "string - Kullanıcıya gösterilecek mesaj"
        }

        DEĞERLENDİRME KRİTERLERİ:
        - Matematiksel terimler, sayılar, işlemler içermeli
        - Çözülecek bir problem veya soru olmalı
        - Sadece sayı yazmak matematik sorusu değildir
        - "Merhaba", "Test", anlamsız metinler matematik sorusu değildir
        - Geometrik şekiller, denklemler, word problemler matematik sorusudur
        
        ÖRNEKLER:
        ✅ Matematik: "2x + 5 = 15 denklemini çöz"
        ✅ Matematik: "Ali'nin 5 elması var, 3 tane daha aldı. Kaç elması oldu?"
        ❌ Matematik değil: "Merhaba nasılsın"
        ❌ Matematik değil: "123456"
        ❌ Matematik değil: "test test test"

        SADECE JSON FORMATINDA YANIT VER.
    `;
}