// utils/safeJsonParser.js

/**
 * API yanıtlarını güvenli bir şekilde parse eder
 * LaTeX ve özel karakterleri handle eder
 */
export function safeJsonParse(text, fallbackValue = null) {
    if (!text || typeof text !== 'string') {
        console.warn('Invalid input for JSON parse');
        return fallbackValue;
    }
    
    try {
        // İlk deneme: Direkt parse
        return JSON.parse(text);
    } catch (firstError) {
        console.warn('First parse attempt failed, trying to clean...');
        
        try {
            // İkinci deneme: Temizlenmiş versiyon
            let cleaned = text;
            
            // 1. BOM karakterini kaldır
            cleaned = cleaned.replace(/^\uFEFF/, '');
            
            // 2. Kontrol karakterlerini temizle
            cleaned = cleaned.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
            
            // 3. Yanlış escape edilmiş ters slash'ları düzelt
            // Tek \ karakterlerini \\ yap (JSON string içinde olmayanlar hariç)
            cleaned = cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
            
            // 4. Geçersiz Unicode sequence'lerini temizle
            cleaned = cleaned.replace(/\\u(?![0-9a-fA-F]{4})/g, '\\\\u');
            
            // 5. Çift tırnakları düzelt (string içinde olmayanlar)
            // Bu regex karmaşık olabilir, basit bir yaklaşım:
            cleaned = cleaned.replace(/([^\\])"([^"]*)"([^\\]|$)/g, '$1\\"$2\\"$3');
            
            return JSON.parse(cleaned);
            
        } catch (secondError) {
            console.error('JSON parse failed even after cleaning:', secondError);
            console.error('Problematic text:', text.substring(0, 200) + '...');
            
            // Son çare: Basit bir regex ile JSON objesini çıkarmaya çalış
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (finalError) {
                console.error('Final JSON extraction attempt failed');
            }
            
            return fallbackValue;
        }
    }
}

/**
 * LaTeX içeriğini JSON-safe hale getirir
 */
export function makeLatexJsonSafe(latex) {
    if (!latex) return '';
    
    return latex
        // Ters slash'ları escape et
        .replace(/\\/g, '\\\\')
        // Çift tırnakları escape et
        .replace(/"/g, '\\"')
        // Newline'ları escape et
        .replace(/\n/g, '\\n')
        // Tab'ları escape et
        .replace(/\t/g, '\\t')
        // Carriage return'leri escape et
        .replace(/\r/g, '\\r');
}

/**
 * API'ye gönderilecek prompt'taki LaTeX'i temizler
 */
export function prepareLatexForPrompt(latex) {
    if (!latex) return '';
    
    return latex
        // Çoklu dolar işaretlerini düzelt
        .replace(/\$\$\$/g, '$$')
        .replace(/\$\s+\$/g, '$$')
        // Gereksiz boşlukları temizle
        .trim();
}