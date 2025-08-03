// www/js/services/promptBuilder.js - YENİ VE BİRLEŞİK VERSİYON

/**
 * Zengin, birleşik bir çözüm nesnesi istemek için tek, kapsamlı bir prompt oluşturur.
 * Bu prompt, özet, adım adım çözüm, interaktif seçenekler ve doğrulama bilgilerini tek seferde alır.
 *
 * @param {string} problemContext Kullanıcının girdiği orijinal problem metni.
 * @returns {string} Gemini API'ye gönderilecek olan birleşik prompt.
 */
export function buildUnifiedSolutionPrompt(problemContext) {
    return `
        Sen, öğrencilere matematiği sevdiren uzman bir matematik öğretmenisin. Görevin, aşağıda verilen problemi analiz etmek ve öğrencinin konuyu tam olarak anlamasını sağlayacak zengin ve yapılandırılmış bir JSON nesnesi oluşturmaktır.

        Problem: "${problemContext}"

        İstenen JSON Yapısı:
        Lütfen aşağıdaki şemaya harfiyen uyarak SADECE geçerli bir JSON nesnesi döndür. Başka hiçbir metin veya açıklama ekleme.

        JSON ŞEMASI:
        {
          "problemOzeti": {
            "verilenler": ["Anlaşılır dille yazılmış problemdeki veriler (örn: 'Karenin bir kenarı: 5 cm')"],
            "istenen": "Problemin neyi bulmayı amaçladığının net bir açıklaması",
            "konu": "Matematik dalı (örn: 'Geometri', 'Cebir', 'Aritmetik')",
            "zorlukSeviyesi": "kolay | orta | zor"
          },
          "adimlar": [
            {
              "adimNo": 1,
              "adimBasligi": "Bu adımın kısa başlığı (örn: 'Alan Formülünü Yazma')",
              "adimAciklamasi": "Bu adımın neden ve nasıl yapıldığının SÖZEL açıklaması. Öğrenciye rehberlik et.",
              "cozum_lateks": "Bu adımın matematiksel çözümünü içeren LaTeX ifadesi (örn: 'Alan = a^2').",
              "ipucu": "Öğrenci takılırsa verilecek yardımcı ipucu.",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "Yaygın bir kavram yanılgısını içeren hatalı LaTeX ifadesi (örn: 'Alan = 4 \\\\times a').",
                  "hataAciklamasi": "Bu seçeneğin neden yanlış olduğunun SÖZEL açıklaması."
                },
                {
                  "metin_lateks": "Başka bir yaygın hesaplama veya mantık hatası içeren hatalı LaTeX ifadesi (örn: 'Alan = 2 \\\\times a').",
                  "hataAciklamasi": "Bu hatanın mantığının SÖZEL açıklaması."
                }
              ]
            }
          ],
          "tamCozumLateks": [
            "Tüm çözüm adımlarının baştan sona sıralı LaTeX ifadeleri (her adım bir dize)."
          ],
          "sonucKontrolu": "Bulunan sonucun doğruluğunu kontrol etmek için kullanılabilecek bir yöntemin SÖZEL açıklaması."
        }

        ÖNEMLİ KURALLAR:
        1.  **SADECE JSON:** Yanıtın sadece ve sadece yukarıdaki şemaya uygun bir JSON nesnesi olmalıdır.
        2.  **LaTeX FORMATI:** Tüm matematiksel ifadeler, LaTeX formatında olmalıdır.
        3.  **ÖĞRETİCİ DİL:** Açıklamalar ve ipuçları, sabırlı ve teşvik edici bir öğretmen dilinde yazılmalıdır.
        4.  **İKİ YANLIŞ SEÇENEK:** Her adım için mantıklı ve yaygın hatalara dayanan İKİ adet yanlış seçenek üretmek zorunludur.
        5.  **TÜRKÇE:** Tüm metin içerikleri (açıklamalar, başlıklar, ipuçları) akıcı ve doğru Türkçe ile yazılmalıdır.
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