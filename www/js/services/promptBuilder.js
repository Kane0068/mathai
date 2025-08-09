// www/js/services/promptBuilder.js

// www/js/services/promptBuilder.js

/**
 * Zengin, birleşik bir çözüm nesnesi istemek için tek, kapsamlı bir prompt oluşturur.
 * Bu prompt, özet, adım adım çözüm, interaktif seçenekler ve doğrulama bilgilerini tek seferde alır.
 *
 * @param {string} problemContext Kullanıcının girdiği orijinal problem metni.
 * @returns {string} Gemini API'ye gönderilecek olan birleşik prompt.
 */
export function buildUnifiedSolutionPrompt(problemContext) {
    return `
        Sen, öğrencilere matematiği sevdiren, Sokratik yöntemle öğreten uzman bir matematik öğretmenisin. Görevin, aşağıda verilen problemi analiz etmek ve öğrencinin konuyu tam olarak anlamasını sağlayacak, pedagojik değeri yüksek, zengin ve yapılandırılmış bir JSON nesnesi oluşturmaktır.
        
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
              "adimBasligi": "Bu adımın kısa ve açıklayıcı başlığı",
              "adimAciklamasi": "Bu adımın neden ve nasıl yapıldığının SÖZEL açıklaması. Bu metin içindeki TÜM matematiksel ifadeler MUTLAKA tek dolar işareti arasına alınmalıdır.",
              "cozum_lateks": "Bu adımın matematiksel çözümünü içeren saf LaTeX ifadesi. ASLA dolar işareti kullanma.",
              "odak_alan_lateks": "Bu adımın başında, bir önceki adımdan gelen ifadenin içinde odaklanılması gereken LaTeX kısmı. Örneğin, bir önceki adımın sonucu '$2x+10=20$' ise ve bu adımda '+10' karşıya atılacaksa, bu alan '$+10$' olmalıdır. Eğer özel bir odak alanı yoksa null bırak.",
              "ipucu": "Öğrenci takılırsa verilecek yardımcı ipucu. İçindeki matematiksel ifadeler de tek dolar işareti arasına alınmalıdır.",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "Doğru cevaba yapısal olarak çok benzeyen ancak yaygın bir öğrenci hatası içeren saf LaTeX ifadesi. ASLA dolar işareti kullanma.",
                  "hataAciklamasi": "Bu seçeneğin neden yanlış olduğunun SÖZEL açıklaması. İçindeki matematiksel ifadeler de tek dolar işareti arasına alınmalıdır."
                }
              ]
            }
          ],
          "tamCozumLateks": [
            "Tüm çözüm adımlarının baştan sona sıralı saf LaTeX ifadeleri. ASLA dolar işareti kullanma. Dizinin son elemanı, problemin nihai ve en sadeleştirilmiş cevabı olmalıdır."
          ],
          "sonucKontrolu": "Bulunan sonucun doğruluğunu kontrol etme yönteminin SÖZEL açıklaması. İçindeki matematiksel ifadeler de tek dolar işareti arasına alınmalıdır."
        }

        **TEMEL KURALLAR VE TALİMATLAR - ÇOK ÖNEMLİ:**

        1.  **NİHAİ VE SADELEŞTİRİLMİŞ SONUÇ:**
            -   Çözümün son adımı ('adimlar' dizisinin son elemanı) ve 'tamCozumLateks' dizisinin son elemanı, her zaman problemin **en sade ve nihai** sonucunu içermelidir.
            -   ✅ DOĞRU: 'x = 5'
            -   ❌ YANLIŞ: 'x = 10/2'
            -   ✅ DOĞRU: 'y = -6'
            -   ❌ YANLIŞ: 'y = -18/3'
            -   Her adım kendi içinde mantıklı bir ilerleme göstermelidir. Son adıma kadar sadeleştirme işlemlerini adım adım yap.

        2.  **İNANDIRICI ÇELDİRİCİ (YANLIŞ SEÇENEK) ÜRETME KURALLARI:**
            -   Her adım için **İKİ TANE** yanlış seçenek üretmek zorunludur.
            -   Çeldiriciler, doğru cevaba yapısal olarak (uzunluk, karmaşıklık olarak) **çok benzemelidir.**
            -   Çeldiriciler, aşağıdaki **yaygın öğrenci hatalarından** birini yansıtmalıdır:
                * **İşaret Hatası:** Bir terimi karşıya atarken işaretini (+/-) değiştirmemek. ('2x = 20 + 10' gibi)
                * **İşlem Önceliği Hatası:** Parantez, çarpma/bölme, toplama/çıkarma sırasını karıştırmak.
                * **Ters İşlem Hatası:** Denklemin her iki tarafına bölme yapmak yerine çarpma yapmak. ('x = 10 * 2' gibi)
                * **Sadeleştirme Hatası:** Kesirleri veya terimleri yanlış sadeleştirmek.
                * **Katsayıyı/Terimi Unutma:** Bir sonraki adıma geçerken denklemdeki bir terimi veya katsayıyı yazmayı unutmak. ('x = 20 - 10' gibi, '2' katsayısı unutulmuş)

        3.  **LATEX FORMATLAMA KURALLARI:**
            -   **Metin İçi LaTeX ('adimAciklamasi', 'ipucu', 'hataAciklamasi', 'sonucKontrolu'):** TÜM matematiksel ifadeler, değişkenler, formüller **TEK dolar işareti ($...$)** içine alınmalıdır.
            -   **Saf LaTeX ('cozum_lateks', 'metin_lateks', 'tamCozumLateks'):** Bu alanlarda **ASLA** dolar işareti ($) veya başka bir sınırlayıcı ('\\(`, `\\[') kullanılmamalıdır. Doğrudan LaTeX kodu yazılmalıdır.

        **ÖRNEK ÇIKTI:**
        Problem: "2x + 10 = 20 denklemini çözün."
        {
          "problemOzeti": {
            "verilenler": ["$2x + 10 = 20$ denklemi verilmiş"],
            "istenen": "$x$ değişkeninin değerini bulmak",
            "konu": "Birinci Dereceden Denklemler",
            "zorlukSeviyesi": "kolay"
          },
          "adimlar": [
            {
              "adimNo": 1,
              "adimBasligi": "Sabit Terimi Eşitliğin Diğer Tarafına Atma",
              "adimAciklamasi": "Denklemde $x$'i yalnız bırakma yolundaki ilk adım, $+10$ sabit terimini eşitliğin sağ tarafına işaretini değiştirerek (yani $-10$ olarak) geçirmektir. Bu durumda $2x + 10 = 20$ denklemi $2x = 20 - 10$ halini alır.",
              "cozum_lateks": "2x = 20 - 10",
              "odak_alan_lateks": "+10",
              "ipucu": "Unutma, bir terim eşitliğin diğer tarafına geçerken işareti değişir. Artı ise eksi, eksi ise artı olur.",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "2x = 20 + 10",
                  "hataAciklamasi": "Bu seçenekte $+10$ terimi karşıya geçirilirken yaygın bir hata yapılmış ve işareti değiştirilmemiş."
                },
                {
                  "metin_lateks": "x + 10 = 20 / 2",
                  "hataAciklamasi": "Burada işlem önceliği hatası var. Önce sabit terim karşıya atılmalı, sonra katsayıya bölünmelidir."
                }
              ]
            },
            {
              "adimNo": 2,
              "adimBasligi": "Sadeleştirme ve Değişkeni Yalnız Bırakma",
              "adimAciklamasi": "Şimdi sağ taraftaki işlemi yaparak denklemi sadeleştirelim: $2x = 10$. Amacımız $x$'i bulmak olduğu için, her iki tarafı da $x$'in katsayısı olan $2$'ye böleriz.",
              "cozum_lateks": "x = \\frac{10}{2}",
              "odak_alan_lateks": "2x",
              "ipucu": "$x$'i tamamen yalnız bırakmak için önündeki katsayıya ne yapmalısın? Genellikle her iki tarafı bu katsayıya böleriz.",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "x = 10 - 2",
                  "hataAciklamasi": "Bu seçenekte, bölme işlemi yerine yanlışlıkla çıkarma işlemi yapılmış. $2x$, '$2$ çarpı $x$' demektir."
                },
                {
                  "metin_lateks": "x = 10 \\cdot 2",
                  "hataAciklamasi": "Burada da bir ters işlem hatası var. Katsayı olan $2$'den kurtulmak için bölmek gerekirken, çarpma yapılmış."
                }
              ]
            },
            {
              "adimNo": 3,
              "adimBasligi": "Nihai Sonucu Bulma",
              "adimAciklamasi": "Son adımda, bölme işlemini tamamlayarak $x$'in nihai değerini buluruz. $10$ bölü $2$, $5$'e eşittir.",
              "cozum_lateks": "x = 5",
              "odak_alan_lateks": "\\frac{10}{2}",
              "ipucu": "Bu sadece basit bir bölme işlemi. Sonuca ulaştın sayılır!",
              "yanlisSecenekler": [
                {
                  "metin_lateks": "x = -5",
                  "hataAciklamasi": "Son bölme işleminde bir işaret hatası yapılmış gibi görünüyor. Pozitif bir sayının pozitif bir sayıya bölümü yine pozitiftir."
                },
                {
                  "metin_lateks": "x = 1/2",
                  "hataAciklamasi": "Burada kesir ters çevrilmiş. Payın paydaya bölünmesi gerekirken, payda paya bölünmüş."
                }
              ]
            }
          ],
          "tamCozumLateks": [
            "2x + 10 = 20",
            "2x = 20 - 10",
            "2x = 10",
            "x = \\frac{10}{2}",
            "x = 5"
          ],
          "sonucKontrolu": "Bulduğumuz $x = 5$ değerini en baştaki denklemde yerine koyarak sağlamasını yapabiliriz. $2(5) + 10$ işlemi $10 + 10 = 20$ sonucunu verir. Eşitliğin sağ tarafı da $20$ olduğu için çözümümüz doğrudur."
        }
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
        1. Tüm metin (string) değerlerinin çift tırnak (") içinde olduğundan emin ol.
        2. Nesnelerdeki son elemandan sonra virgül (,) olmadığından emin ol.
        3. JSON içindeki LaTeX ifadelerinde geçen ters eğik çizgileri (\\) doğru şekilde kaçış karakteriyle kullan (\\\\).
        4. Yanıtında JSON nesnesi dışında hiçbir metin, açıklama veya not bulunmasın.
        5. LATEX FORMAT KURALLARINA MUTLAKA UY:
           - Metin içindeki matematik: TEK dolar işareti kullan
           - Saf LaTeX alanları: HİÇ dolar işareti kullanma

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

// 🎯 MEVCUT buildFlexibleStepValidationPrompt fonksiyonunu SİLİP, YERİNE BUNU YAPIŞTIRIN

export function buildFlexibleStepValidationPrompt(studentInput, stepData, mistakeHistory = []) {
    const solutionRoadmap = stepData.allSteps.map((step, index) =>
        `  - Adım ${index + 1}: ${step.cozum_lateks}`
    ).join('\n');

    // Hata geçmişini prompt'a eklemek için formatla
    const pastMistakesSection = mistakeHistory.length > 0 ? `
        **ÖĞRENCİNİN BU OTURUMDAKİ GEÇMİŞ HATALARI:**
        ${mistakeHistory.map(m => `- ${m}`).join('\n')}

        **EK GÖREV:** Öğrencinin şu anki cevabı, geçmişteki bu hatalardan birine benziyor mu? Eğer benziyorsa, "feedbackMessage" içinde buna nazikçe değin. Örneğin: "Sanki yine bir işaret hatası yapmış olabilir misin? Kontrol etmeye ne dersin?"
    ` : '';

    return `
        Sen, son derece sabırlı, teşvik edici ve Sokratik yöntemle öğreten bir matematik koçusun. Görevin, öğrencinin cevabını ASLA "yanlış" veya "hatalı" gibi kelimelerle yargılamadan değerlendirmektir. Amacın, öğrencinin kendi hatasını bulmasını sağlamak veya doğru yolda olduğunu teyit edip bir sonraki adımı düşündürmektir.

        **DEĞERLENDİRME BİLGİLERİ:**
        - Problemin Çözüm Yol Haritası:\n${solutionRoadmap}
        - Öğrencinin Şu Anki Adımı: Adım ${stepData.currentStepIndex + 1}
        - Beklenen Cevap (LaTeX): "${stepData.correctAnswer}"
        - Öğrencinin Verdiği Cevap: "${studentInput}"
        ${pastMistakesSection}

        **GÖREVİN:**
        Aşağıdaki JSON formatına göre SADECE bir JSON nesnesi döndür.

        **JSON ŞEMASI:**
        {
          "isCorrect": boolean,
          "feedbackMessage": "Öğrenciye doğrudan göstereceğimiz, sıcak ve sohbet havasında bir metin.",
          "hintForNext": "Eğer cevap yanlışsa veya öğrenci yardım istediyse, ona yol gösterecek bir sonraki ipucu.",
          "isFinalAnswer": boolean,
          "matchedStepIndex": number,
          "isStepSkipped": boolean,
          "proceed_to_next_step": boolean,
          "mistake_type": "Kısa hata kategorisi (Örn: 'İşaret Hatası', 'İşlem Önceliği Hatası', 'Sadeleştirme Hatası'). Cevap doğruysa veya hata türü belirsizse null bırak."
        }
    `;
}
/**
 * API tarafından üretilmiş bir JSON çözümünü alıp, hem format hem de matematiksel doğruluk
 * açısından kontrol etmesini ve gerekirse düzeltmesini isteyen bir prompt oluşturur.
 * @param {string} generatedJsonString - İlk API çağrısından gelen JSON metni.
 * @returns {string} Gemini API'ye gönderilecek olan doğrulama ve düzeltme prompt'u.
 */
export function buildVerificationPrompt(generatedJsonString) {
    return `
        Sen, son derece titiz bir kalite güvence uzmanı ve uzman bir matematik öğretmenisin. Görevin, aşağıda sana verilen ve daha önce başka bir AI tarafından üretilmiş olan JSON nesnesini denetlemektir.

        DENETLENECEK JSON:
        \`\`\`json
        ${generatedJsonString}
        \`\`\`

        GÖREVLERİN:
        1. **MATEMATİKSEL DOĞRULUK KONTROLÜ:** 'adimlar' içindeki matematiksel işlemleri adım adım kontrol et.
        2. **İÇERİK KONTROLÜ:** JSON'daki tüm alanların eksiksiz, mantıklı ve kurallara uygun doldurulduğundan emin ol.
        3. **LATEX FORMAT KONTROLÜ:** 
           - Metin içindeki matematiksel ifadelerin TEK dolar işareti içinde olduğunu kontrol et
           - Saf LaTeX alanlarında HİÇ dolar işareti olmadığını kontrol et
           - \\(...\\) veya \\[...\\] formatları kullanılmışsa bunları düzelt

        FORMAT KURALLARI:
        - adimAciklamasi, ipucu, hataAciklamasi, sonucKontrolu: İçindeki matematik TEK $ içinde
        - cozum_lateks, metin_lateks, tamCozumLateks: HİÇ $ işareti olmamalı

        YANIT FORMATI:
        - **EĞER JSON MÜKEMMELSE:** JSON'u HİÇBİR DEĞİŞİKLİK YAPMADAN, olduğu gibi geri döndür.
        - **EĞER HATA BULURSAN:** Tüm hataları düzelttiğin JSON'un SON HALİNİ geri döndür.

        Unutma, senden beklenen tek çıktı, ya orijinal JSON'un kendisi ya da tamamen düzeltilmiş versiyonudur. Başka hiçbir metin veya açıklama ekleme.
    `;
}


/**
 * Kullanıcı girdisinin uygunluğunu denetlemek için bir prompt oluşturur.
 * @param {string} userInput Kullanıcının girdiği metin.
 * @returns {string} Gemini API'ye gönderilecek olan denetleme prompt'u.
 */
export function buildInputModerationPrompt(userInput) {
    return `
        Sen bir içerik moderatörüsün. Görevin, aşağıdaki kullanıcı girdisini analiz etmek ve belirli kategorilere girip girmediğini belirlemektir.
        
        Kullanıcı Girdisi: "${userInput}"

        Lütfen aşağıdaki JSON şemasına harfiyen uyarak SADECE geçerli bir JSON nesnesi döndür. Başka hiçbir metin veya açıklama ekleme.

        JSON ŞEMASI:
        {
          "isSafe": boolean, // Girdi güvenli ve problemle ilgiliyse true, değilse false.
          "reason": "Neden güvenli olmadığı hakkında kısa bir kategori. Güvenliyse 'safe' yaz. Kategoriler: 'küfür', 'tehdit', 'kişisel_bilgi', 'alakasız', 'spam'."
        }

        ÖRNEKLER:
        - Girdi: "x'in karesi 5" -> {"isSafe": true, "reason": "safe"}
        - Girdi: "salak saçma sorular" -> {"isSafe": false, "reason": "küfür"}
        - Girdi: "nasılsın" -> {"isSafe": false, "reason": "alakasız"}
        - Girdi: "bilmiyorum" -> {"isSafe": true, "reason": "safe"}
    `;
}