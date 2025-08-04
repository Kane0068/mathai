// www/js/core/mathApi.js - BİRLEŞTİRİLMİŞ API SERVİSİ

const GEMINI_API_KEY = "AIzaSyDbjH9TXIFLxWH2HuYJlqIFO7Alhk1iQQs";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

class MathApiService {
    constructor() {
        this.maxRetries = 3;
        this.baseDelay = 1000;
    }

    // Birleşik çözüm prompt'u
    buildSolutionPrompt(problemContext) {
        return `
Sen matematik öğretmenisin. Aşağıdaki problemi çöz ve JSON formatında yanıt ver.

Problem: "${problemContext}"

JSON Formatı:
{
  "problemOzeti": {
    "verilenler": ["Problem verileri"],
    "istenen": "Ne bulunacak",
    "konu": "Matematik dalı",
    "zorlukSeviyesi": "kolay|orta|zor"
  },
  "adimlar": [
    {
      "adimNo": 1,
      "adimBasligi": "Adım başlığı",
      "adimAciklamasi": "Açıklama",
      "cozum_lateks": "LaTeX ifadesi",
      "ipucu": "İpucu",
      "yanlisSecenekler": [
        {
          "metin_lateks": "Yanlış LaTeX",
          "hataAciklamasi": "Hata açıklaması"
        }
      ]
    }
  ],
  "tamCozumLateks": ["LaTeX adımları"],
  "sonucKontrolu": "Kontrol yöntemi"
}

SADECE JSON YANITI VER.
        `;
    }

    // Validasyon prompt'u
    buildValidationPrompt(problemContext) {
        return `
Aşağıdaki metin matematik problemi mi? JSON yanıt ver.

Metin: "${problemContext}"

JSON Formatı:
{
    "isMathProblem": boolean,
    "confidence": number (0-1),
    "category": "Matematik dalı veya 'Matematik Değil'",
    "reason": "Gerekçe",
    "educationalMessage": "Kullanıcı mesajı"
}

SADECE JSON YANITI VER.
        `;
    }

    // JSON çıkarma
    extractJson(text) {
        if (!text) return null;
        
        const jsonRegex = /```(?:json)?\s*(\{[\s\S]*\})\s*```/;
        const match = text.match(jsonRegex);
        
        if (match && match[1]) {
            return match[1];
        }
        
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1);
        }
        
        return null;
    }

    // Güvenli JSON parse
    safeJsonParse(jsonString) {
        if (!jsonString) return null;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('JSON Parse hatası:', error);
            return null;
        }
    }

    // API çağrısı
    async callApi(prompt, imageBase64 = null) {
        const payload = {
            contents: [{
                parts: [
                    { text: prompt },
                    ...(imageBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: imageBase64 }}] : [])
                ]
            }]
        };

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const response = await fetch(GEMINI_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`API Hatası: ${response.status}`);
                }

                const data = await response.json();
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!rawText) {
                    throw new Error('API yanıtı boş');
                }

                const jsonString = this.extractJson(rawText);
                const parsed = this.safeJsonParse(jsonString);
                
                if (!parsed) {
                    throw new Error('JSON parse edilemedi');
                }

                return parsed;
            } catch (error) {
                console.warn(`API Deneme ${attempt} başarısız:`, error.message);
                
                if (attempt === this.maxRetries) {
                    throw new Error(`API çağrısı başarısız: ${error.message}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, this.baseDelay * attempt));
            }
        }
    }

    // Öğrenci adım doğrulama prompt'u
    buildStudentStepPrompt(studentInput, stepData) {
        return `
Sen anlayışlı bir matematik öğretmenisin. Öğrencinin adımını değerlendir.

Mevcut Adım: "${stepData.description}"
Beklenen Cevap: "${stepData.correctAnswer}"
Öğrenci Cevabı: "${studentInput}"

KURALLAR:
1. Matematiksel eşdeğerlik varsa DOĞRU kabul et
2. Öğrenci ileriki adımı verdiyse DOĞRU kabul et
3. Esnek değerlendir, küçük format farkları görmezden gel

JSON Formatı:
{
    "dogruMu": boolean,
    "isFinalAnswer": boolean,
    "geriBildirim": "Kısa açıklama",
    "neden": "Yanlışsa neden",
    "ipucu": "Sonraki adım için ipucu"
}

SADECE JSON YANITI VER.
        `;
    }

    // Ana servis fonksiyonları
    async getSolution(problemContext, imageBase64 = null) {
        const prompt = this.buildSolutionPrompt(problemContext);
        return await this.callApi(prompt, imageBase64);
    }

    async validateProblem(problemContext, imageBase64 = null) {
        const prompt = this.buildValidationPrompt(problemContext);
        return await this.callApi(prompt, imageBase64);
    }

    async validateStudentStep(studentInput, stepData) {
        const prompt = this.buildStudentStepPrompt(studentInput, stepData);
        return await this.callApi(prompt);
    }
}

export const mathApi = new MathApiService();