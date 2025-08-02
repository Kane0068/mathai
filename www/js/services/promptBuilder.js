// www/js/services/promptBuilder.js

/**
 * 1. BUTON: "ÇÖZÜME BAŞLA"
 * Bir matematik probleminin sadece özetini çıkarmak için prompt oluşturur.
 * @param {string} problemContext - Kullanıcının girdiği problem metni.
 * @returns {string} Özetleme için oluşturulmuş prompt.
 */
export function buildSummaryPrompt(problemContext) {
    return `
        Aşağıdaki matematik problemini analiz et ve SADECE aşağıdaki JSON formatında bir özet çıkar. Çözüm yapma, sadece problemi özetle. Yanıtın SADECE Türkçe olsun. Matematiksel ifadeler MathJax uyumlu LaTeX formatında olmalı.

        JSON ŞEMASI:
        {
          "problemOzeti": {
            "verilenler": [
              "Türkçe açıklama ve matematiksel ifade: $LaTeX_inline$"
            ],
            "istenen": "Soruda ne istendiğinin Türkçe açıklaması: $\\sqrt{x^2}$"
          }
        }

        Problem: ${problemContext}

        SADECE JSON FORMATINDA YANIT VER, BAŞKA METİN EKLEME.
    `;
}

/**
 * 2. BUTON: "TÜM ÇÖZÜMÜ GÖSTER"
 * Bir matematik probleminin tüm çözüm adımlarını almak için prompt oluşturur.
 * @param {string} problemContext - Kullanıcının girdiği problem metni.
 * @returns {string} Tam çözüm için oluşturulmuş prompt.
 */
export function buildFullSolutionPrompt(problemContext) {
    // Bu prompt, sizin eski "masterSolutionPrompt" metninizin çözüm kısmıdır.
    // Özet kısmı çıkarılmış ve sadece çözüm adımlarına odaklanılmıştır.
    return `
        Aşağıdaki matematik problemini çöz ve yanıtını BELİRTİLEN JSON formatında ver.
        KRİTİK: TÜM YANITLAR TÜRKÇE OLMALIDIR. Matematiksel ifadeler MathJax v3 ve KaTeX ile uyumlu, birebir LaTeX formatında olmalıdır.

        JSON ŞEMASI:
        {
          "adimlar": [
            {
              "adimAciklamasi": "SADECE SÖZEL Türkçe açıklama - MATEMATİK SEMBOLÜ VEYA LaTeX YOK",
              "cozum_lateks": "$$salt_lateks_ifadesi$$",
              "ipucu": "SADECE SÖZEL Türkçe ipucu - MATEMATİK SEMBOLÜ VEYA LaTeX YOK"
            }
          ],
          "tamCozumLateks": [
            "$$adim_1_salt_lateks$$",
            "$$adim_2_salt_lateks$$",
            "$$final_cevap_salt_lateks$$"
          ]
        }
        
        ÖNEMLİ: adimAciklamasi ve ipucu alanlarını matematiksel sembollerden, kesirlerden, köklerden veya herhangi bir LaTeX'ten tamamen arındır. Sadece tanımlayıcı Türkçe kelimeler kullan.

        Problem: ${problemContext}

        SADECE JSON FORMATINDA YANIT VER, BAŞKA METİN EKLEME.
    `;
}

/**
 * 3. BUTON: "İNTERAKTİF ÇÖZÜM" - REVİZE EDİLMİŞ 2
 * Bir çözüm adımı için, doğru adımdaki LaTeX ifadesine yapısal olarak benzeyen,
 * SADECE LaTeX içeren 2 yanlış seçenek (çeldirici) üretmek için prompt oluşturur.
 * @param {object} stepData - Mevcut doğru adımın verileri { adimAciklamasi, cozum_lateks }.
 * @returns {string} Yüksek kaliteli, sadece işlem içeren interaktif seçenekler için prompt.
 */
export function buildInteractiveOptionsPrompt(stepData) {
    return `
        Bir matematik probleminin aşağıda bilgileri verilen DOĞRU çözüm adımına yapısal olarak ÇOK BENZEYEN ama yaygın öğrenci hataları içeren 2 TANE YANLIŞ LaTeX ifadesi üret.

        Doğru Adım (LaTeX): 
        "${stepData.cozum_lateks}"

        Üreteceğin yanlış seçenekler (çeldiriciler) için şu kurallara uy:
        - SADECE bir LaTeX ifadesi döndür. İçinde Türkçe açıklama OLMASIN.
        - Yapısal olarak doğru adıma benzesinler. Örneğin, doğru adım kesir içeriyorsa çeldiriciler de kesir içersin.
        - Yaygın hataları yansıtsınlar (işlem hatası, işaret hatası, yanlış formül kullanımı vb.).
        
        Yanıtını SADECE aşağıdaki JSON formatında ver. 'metin' alanı sadece LaTeX içermelidir.
        
        JSON ŞEMASI:
        {
          "yanlisSecenekler": [
            { "metin": "$$yanlis_secenek_1_salt_lateks$$" },
            { "metin": "$$yanlis_secenek_2_salt_lateks$$" }
          ]
        }

        SADECE JSON FORMATINDA YANIT VER.
    `;
}

/**
 * 4. BUTON: "KENDİM ÇÖZECEĞİM"
 * Kullanıcının girdiği bir adımın doğruluğunu kontrol etmek için prompt oluşturur.
 * @param {string} studentInput - Öğrencinin girdiği çözüm adımı.
 * @param {object} expectedStepData - Beklenen doğru adımın verileri.
 * @returns {string} Adım doğrulama için oluşturulmuş prompt.
 */
export function buildStepValidationPrompt(studentInput, expectedStepData) {
    return `
        Bir öğrencinin matematik adımını değerlendir ve JSON formatında KISA bir geri bildirim ver.

        Beklenen Doğru Adım: "${expectedStepData.cozum_lateks}"
        Öğrencinin Cevabı: "${studentInput}"

        JSON ŞEMASI:
        {
          "dogruMu": boolean,
          "geriBildirim": "string - SADECE SÖZEL, çok kısa ve net bir geri bildirim. Örneğin: 'İşlem hatası yapmışsın.' veya 'Harika, doğru yoldasın!'",
          "neden": "string - SADECE SÖZEL, neden yanlış olduğuna dair 1 cümlelik ipucu. Örneğin: 'Sayıları toplarken işaretlere dikkat etmelisin.'"
        }
        
        KURALLAR:
        - Matematiksel olarak eşdeğer cevapları (örneğin x+y ve y+x) doğru kabul et.
        - Geri bildirim ve neden alanları KESİNLİKLE LaTeX veya matematik sembolü içermemeli.
        - Yanıtların tamamı Türkçe olmalı.
        - Çok kısa ve teşvik edici ol.

        SADECE JSON FORMATINDA YANIT VER.
    `;
}

/**
 * YENİ FONKSİYON: "KENDİ KENDİNİ DÜZELTME" PROMPT'U
 * API'nin hatalı JSON yanıtını düzeltmesini istemek için bir prompt oluşturur.
 * @param {string} originalPrompt - Başarısız olan orijinal prompt.
 * @param {string} faultyResponse - API'nin verdiği hatalı metin yanıtı.
 * @param {string} errorMessage - Alınan JavaScript hata mesajı (örn: SyntaxError).
 * @returns {string} Düzeltme için oluşturulmuş yeni prompt.
 */
export function buildCorrectionPrompt(originalPrompt, faultyResponse, errorMessage) {
    return `
        Daha önceki bir isteğime yanıt olarak verdiğin metin, istemci tarafında bir JavaScript hatasına neden oldu.
        Senden bu hatayı düzelterek isteğimi yeniden yanıtlamanı istiyorum.

        VERDİĞİN HATALI YANIT:
        ---
        ${faultyResponse}
        ---

        BU YANITIN NEDEN OLDUĞU HATA MESAJI:
        ---
        ${errorMessage}
        ---
        
        Bu hata, genellikle JSON formatının bozuk olmasından veya stringler içindeki özel karakterlerin (özellikle ters taksim '\\') doğru şekilde escape edilmemesinden ('\\\\') kaynaklanır.

        Lütfen aşağıdaki ORİJİNAL İSTEĞİMİ, bu hataya neden olmayacak şekilde, SADECE geçerli bir JSON formatında yeniden yanıtla.
        
        ORİJİNAL İSTEK:
        ---
        ${originalPrompt}
        ---
    `;
}