// www/js/services/promptBuilder.js - YENİ VE BİRLEŞİK VERSİYON

/**
 * Zengin, birleşik bir çözüm nesnesi istemek için tek, kapsamlı bir prompt oluşturur.
 * Bu prompt, özet, adım adım çözüm, interaktif seçenekler ve doğrulama bilgilerini tek seferde alır.
 *
 * @param {string} problemContext Kullanıcının girdiği orijinal problem metni.
 * @returns {string} Gemini API'ye gönderilecek olan birleşik prompt.
 */
// www/js/services/promptBuilder.js dosyasındaki bu fonksiyonu güncelleyin.

export function buildUnifiedSolutionPrompt(problemContext) {
    return `
        Sen, öğrencilere matematiği sevdiren uzman bir matematik öğretmenisin. Görevin, aşağıda verilen problemi analiz etmek ve öğrencinin konuyu tam olarak anlamasını sağlayacak zengin ve yapılandırılmış bir JSON nesnesi oluşturmaktır.

        Problem: "${problemContext}"

        İstenen JSON Yapısı:
        Lütfen aşağıdaki şemaya harfiyen uyarak SADECE geçerli bir JSON nesnesi döndür. Başka hiçbir metin veya açıklama ekleme.

        JSON ŞEMASI:
        {
          "problemOzeti": {
            "verilenler": ["Anlaşılır dille yazılmış problemdeki veriler."],
            "istenen": "Problemin neyi bulmayı amaçladığının net bir açıklaması",
            "konu": "Matematik dalı",
            "zorlukSeviyesi": "kolay | orta | zor"
          },
          "adimlar": [
            {
              "adimNo": 1,
              "adimBasligi": "Bu adımın kısa başlığı",
              // --- GÜNCELLENDİ: LaTeX talimatı eklendi ---
              "adimAciklamasi": "Bu adımın neden ve nasıl yapıldığının SÖZEL açıklaması. Bu metin içindeki TÜM matematiksel ifadeler (değişkenler, formüller, sayılar) $...$ arasına alınmalıdır.",
              "cozum_lateks": "Bu adımın matematiksel çözümünü içeren LaTeX ifadesi.",
              "ipucu": "Öğrenci takılırsa verilecek yardımcı ipucu. İçindeki matematiksel ifadeler de $...$ arasına alınmalıdır.",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "Hatalı bir LaTeX ifadesi.",
                  // --- GÜNCELLENDİ: LaTeX talimatı eklendi ---
                  "hataAciklamasi": "Bu seçeneğin neden yanlış olduğunun SÖZEL açıklaması. İçindeki matematiksel ifadeler de $...$ arasına alınmalıdır."
                }
              ]
            }
          ],
          "tamCozumLateks": [
            "Tüm çözüm adımlarının baştan sona sıralı LaTeX ifadeleri."
          ],
          "sonucKontrolu": "Bulunan sonucun doğruluğunu kontrol etme yönteminin SÖZEL açıklaması. İçindeki matematiksel ifadeler de $...$ arasına alınmalıdır."
        }

        ÖNEMLİ KURALLAR:
        1.  **SADECE JSON:** Yanıtın sadece ve sadece yukarıdaki şemaya uygun bir JSON nesnesi olmalıdır.
        2.  **LaTeX FORMATI:** Tüm matematiksel ifadeler, LaTeX formatında olmalıdır.
        // --- YENİ KURAL EKLENDİ: En kritik değişiklik ---
        3.  **SATIR-İÇİ LATEX KURALI:** Açıklama, ipucu gibi metin alanlarının içine yazdığın TÜM matematiksel ifadeler, değişkenler, formüller veya tek bir harf bile olsa (örneğin 'x' değişkeni), MUTLAKA tek dolar işaretleri arasına alınmalıdır (Örnek: 'Karenin alanı $a^2$ formülü ile bulunur.'). Bu kurala uymak zorunludur.
        4.  **ÖĞRETİCİ DİL:** Açıklamalar ve ipuçları, sabırlı ve teşvik edici bir öğretmen dilinde yazılmalıdır.
        5.  **İKİ YANLIŞ SEÇENEK:** Her adım için mantıklı ve yaygın hatalara dayanan İKİ adet yanlış seçenek üretmek zorunludur.
        6.  **TÜRKÇE:** Tüm metin içerikleri akıcı ve doğru Türkçe ile yazılmalıdır.
    `;
}


/**
 * API yanıtının hatalı JSON formatı nedeniyle başarısız olması durumunda,
 * API'ye hatayı düzelterek yeniden denemesi için bir prompt oluşturur.
 *
 * @param {string} originalPrompt Başarısız olan ilk istekteki prompt.
 * @param {string} faultyResponse API'den gelen hatalı yanıt metni.
 * @param {string} errorMessage JSON parse hatasının detayı.
 * @returns {string} Gemini API'ye gönderilecek olan düzeltme prompt'u.
 */
export function buildCorrectionPrompt(originalPrompt, faultyResponse, errorMessage) {
    return `
        ÖNEMLİ: Önceki denemede bir JSON format hatası oluştu. Lütfen aşağıda belirtilen isteği tekrar işleyerek bu kez KESİNLİKLE geçerli bir JSON nesnesi döndür.

        HATA DETAYI:
        ${errorMessage}

        HATALI YANITIN BAŞLANGICI:
        ${faultyResponse.substring(0, 300)}...

        DÜZELTME TALİMATLARI:
        1.  Tüm metin (string) değerlerinin çift tırnak (") içinde olduğundan emin ol.
        2.  Nesnelerdeki son elemandan sonra virgül (,) olmadığından emin ol.
        3.  JSON içindeki LaTeX ifadelerinde geçen ters eğik çizgileri (\) doğru şekilde kaçış karakteriyle kullan (\\\\).
        4.  Yanıtında JSON nesnesi dışında hiçbir metin, açıklama veya not bulunmasın.

        ORİJİNAL İSTEK:
        ---
        ${originalPrompt}
        ---

        Lütfen SADECE geçerli JSON formatında doğru yanıtı ver.
    `;
}

/**
 * Bir metnin matematik sorusu olup olmadığını doğrulamak için bir prompt oluşturur.
 *
 * @param {string} problemContext Kullanıcının girdiği metin.
 * @returns {string} Gemini API'ye gönderilecek olan doğrulama prompt'u.
 */
export function buildMathValidationPrompt(problemContext) {
    return `
        Aşağıdaki metnin bir matematik sorusu/problemi olup olmadığını analiz et.

        Metin: "${problemContext}"

        YANIT FORMATI (SADECE JSON):
        {
            "isMathProblem": boolean,
            "confidence": number (0-1 arası güven skoru),
            "category": "Cebir" | "Geometri" | "Aritmetik" | "Kalkülüs" | "İstatistik" | "Diğer" | "Matematik Değil",
            "reason": "Neden matematik sorusu olduğu veya olmadığı hakkında kısa bir gerekçe.",
            "educationalMessage": "Kullanıcıya gösterilecek yapıcı mesaj."
        }

        DEĞERLENDİRME KRİTERLERİ:
        - İçerik, çözülmesi gereken bir soru veya problem içermelidir.
        - Matematiksel terimler, sayılar, denklemler veya şekillerden bahsetmelidir.
        - Sadece "Merhaba", "Nasılsın", "test" gibi genel metinler veya anlamsız karakter dizileri matematik sorusu DEĞİLDİR.
        - Sadece bir sayı yazmak (örn: "12345") bir problem DEĞİLDİR.

        SADECE JSON FORMATINDA YANIT VER.
    `;
}

// www/js/services/promptBuilder.js dosyasının sonuna bu yeni fonksiyonu ekleyin.

/**
 * Öğrencinin adımını, tüm çözüm akışını göz önünde bulundurarak esnek bir şekilde değerlendirmek
 * için bir prompt oluşturur. Adım atlamayı ve matematiksel eşdeğerliği anlar.
 * @param {string} studentInput Öğrencinin girdiği cevap.
 * @param {object} stepData Mevcut adım ve tüm çözümle ilgili veriler.
 * @returns {string} Gemini API'ye gönderilecek olan değerlendirme prompt'u.
 */
export function buildFlexibleStepValidationPrompt(studentInput, stepData) {
    // Çözüm yol haritasını daha okunabilir bir metne dönüştür.
    const solutionRoadmap = stepData.allSteps.map((step, index) =>
        `  - Adım ${index + 1}: ${step.cozum_lateks}`
    ).join('\n');

    return `
        Sen, son derece anlayışlı, esnek ve teşvik edici bir matematik öğretmenisin. Görevin, bir öğrencinin cevabını, çözüm akışının tamamını göz önünde bulundurarak değerlendirmektir.

        **TEMEL KURAL: MATEMATİKSEL EŞDEĞERLİK VE ADIM ATLAMAYI ANLA**
        Öğrencinin cevabı, beklenen mevcut adıma VEYA gelecekteki herhangi bir adıma matematiksel olarak eşdeğerse, cevabı **DOĞRU** kabul et. Eşitliğin sağ ve sol tarafının yer değiştirmesi gibi durumlar eşdeğerdir.

        **DEĞERLENDİRME BİLGİLERİ:**
        - Problemin Tam Çözüm Yol Haritası:
        ${solutionRoadmap}
        - Öğrencinin Şu Anki Adımı: Adım ${stepData.currentStepIndex + 1}
        - Mevcut Adımda Beklenen Cevap (LaTeX): "${stepData.correctAnswer}"
        - Öğrencinin Verdiği Cevap: "${studentInput}"

        **DEĞERLENDİRME VE YANIT GÖREVLERİ:**
        1.  **Eşdeğerlik Kontrolü:** Öğrencinin cevabının, yol haritasındaki adımlardan herhangi birine matematiksel olarak eşdeğer olup olmadığını kontrol et. (Örnek: "2(x+5)" ile "2x+10" eşdeğerdir; "4x-10=20" ile "20=4x-10" eşdeğerdir).
        2.  **Adım Tespiti:** Eğer cevap doğruysa, yol haritasında hangi adıma karşılık geldiğini bul (örneğin, 3. adıma denk geliyor). Bu adım numarasını "matchedStepIndex" olarak (0'dan başlayarak) döndür.
        3.  **Final Cevap Tespiti:** Eğer öğrenci doğrudan final cevabı verdiyse (genellikle son adım), bunu 'isFinalAnswer' olarak işaretle.
        4.  **Geri Bildirim Stili:** ASLA "Yanlış cevap", "Hatalı" gibi yargılayıcı ifadeler kullanma. Her zaman yapıcı, yol gösterici ve pozitif bir dil kullan.

        **İSTENEN JSON YANIT FORMATI (SADECE JSON):**
        {
          "isCorrect": boolean,
          "matchedStepIndex": number, // Eşleşen adımın indeksi (0'dan başlar). Yanlışsa -1 olabilir.
          "isFinalAnswer": boolean,
          "feedbackMessage": "Kişiselleştirilmiş, sıcak ve eğitici geri bildirim mesajı.",
          "hintForNext": "Eğer cevap doğruysa bir sonraki adım için kısa bir ipucu veya yanlışsa mevcut adımı çözmek için bir yönlendirme."
        }

        Lütfen SADECE JSON formatında bir yanıt ver.
    `;
}