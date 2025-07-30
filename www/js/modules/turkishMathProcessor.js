// =================================================================================
//  MathAi - Turkish Math Content Processor
//  Advanced Turkish Language Processing for Mathematical Content
// =================================================================================

/**
 * Turkish Math Processor - Specialized processor for Turkish mathematical content
 * Handles Turkish mathematical terminology, formatting, and LaTeX integration
 */
export class TurkishMathProcessor {
    constructor() {
        // Turkish mathematical terminology dictionary
        this.mathTerminology = {
            // Basic operations
            'toplama': { latex: '+', english: 'addition', symbol: '+' },
            'çıkarma': { latex: '-', english: 'subtraction', symbol: '-' },
            'çarpma': { latex: '\\times', english: 'multiplication', symbol: '×' },
            'bölme': { latex: '\\div', english: 'division', symbol: '÷' },
            
            // Advanced operations
            'üs alma': { latex: '^', english: 'exponentiation', symbol: '^' },
            'kök alma': { latex: '\\sqrt', english: 'square root', symbol: '√' },
            'logaritma': { latex: '\\log', english: 'logarithm', symbol: 'log' },
            'doğal logaritma': { latex: '\\ln', english: 'natural logarithm', symbol: 'ln' },
            
            // Trigonometry
            'sinüs': { latex: '\\sin', english: 'sine', symbol: 'sin' },
            'kosinüs': { latex: '\\cos', english: 'cosine', symbol: 'cos' },
            'tanjant': { latex: '\\tan', english: 'tangent', symbol: 'tan' },
            'kotanjant': { latex: '\\cot', english: 'cotangent', symbol: 'cot' },
            'sekant': { latex: '\\sec', english: 'secant', symbol: 'sec' },
            'kosekant': { latex: '\\csc', english: 'cosecant', symbol: 'csc' },
            
            // Set theory
            'küme': { latex: '\\{\\}', english: 'set', symbol: '{}' },
            'boş küme': { latex: '\\emptyset', english: 'empty set', symbol: '∅' },
            'birleşim': { latex: '\\cup', english: 'union', symbol: '∪' },
            'kesişim': { latex: '\\cap', english: 'intersection', symbol: '∩' },
            'fark kümesi': { latex: '\\setminus', english: 'set difference', symbol: '\\' },
            'alt küme': { latex: '\\subset', english: 'subset', symbol: '⊂' },
            'üst küme': { latex: '\\supset', english: 'superset', symbol: '⊃' },
            
            // Numbers and constants
            'doğal sayılar': { latex: '\\mathbb{N}', english: 'natural numbers', symbol: 'ℕ' },
            'tam sayılar': { latex: '\\mathbb{Z}', english: 'integers', symbol: 'ℤ' },
            'rasyonel sayılar': { latex: '\\mathbb{Q}', english: 'rational numbers', symbol: 'ℚ' },
            'gerçek sayılar': { latex: '\\mathbb{R}', english: 'real numbers', symbol: 'ℝ' },
            'karmaşık sayılar': { latex: '\\mathbb{C}', english: 'complex numbers', symbol: 'ℂ' },
            'pi sayısı': { latex: '\\pi', english: 'pi', symbol: 'π' },
            'euler sayısı': { latex: 'e', english: 'euler number', symbol: 'e' },
            'sonsuz': { latex: '\\infty', english: 'infinity', symbol: '∞' },
            
            // Geometry
            'açı': { latex: '\\angle', english: 'angle', symbol: '∠' },
            'dik açı': { latex: '90^\\circ', english: 'right angle', symbol: '90°' },
            'çevre': { latex: 'C', english: 'circumference', symbol: 'C' },
            'alan': { latex: 'A', english: 'area', symbol: 'A' },
            'hacim': { latex: 'V', english: 'volume', symbol: 'V' },
            'yarıçap': { latex: 'r', english: 'radius', symbol: 'r' },
            'çap': { latex: 'd', english: 'diameter', symbol: 'd' },
            'yükseklik': { latex: 'h', english: 'height', symbol: 'h' },
            
            // Relations
            'eşittir': { latex: '=', english: 'equals', symbol: '=' },
            'eşit değildir': { latex: '\\neq', english: 'not equal', symbol: '≠' },
            'büyüktür': { latex: '>', english: 'greater than', symbol: '>' },
            'küçüktür': { latex: '<', english: 'less than', symbol: '<' },
            'büyük eşittir': { latex: '\\geq', english: 'greater than or equal', symbol: '≥' },
            'küçük eşittir': { latex: '\\leq', english: 'less than or equal', symbol: '≤' },
            'yaklaşık eşittir': { latex: '\\approx', english: 'approximately equal', symbol: '≈' },
            'orantılıdır': { latex: '\\propto', english: 'proportional to', symbol: '∝' }
        };
        
        // Turkish mathematical phrases and their LaTeX equivalents
        this.mathPhrases = {
            'karesini al': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*karesini\s*al/g, latex: '$1^2' },
            'küpünü al': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*küpünü\s*al/g, latex: '$1^3' },
            'karekökünü al': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*karekökünü\s*al/g, latex: '\\sqrt{$1}' },
            'mutlak değeri': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*mutlak\s*değeri/g, latex: '|$1|' },
            'faktöriyeli': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*faktöriyeli/g, latex: '$1!' },
            'türevi': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*türevi/g, latex: '\\frac{d}{dx}$1' },
            'integrali': { pattern: /(\w+)(?:'nın|'nin|'nun|'nün)?\s*integrali/g, latex: '\\int $1 dx' }
        };
        
        // Common Turkish question patterns in math
        this.questionPatterns = {
            'kaçtır': { pattern: /(.+?)\s*kaçtır\?*/g, template: '$1 = ?' },
            'nedir': { pattern: /(.+?)\s*nedir\?*/g, template: '$1 = ?' },
            'hesaplayın': { pattern: /(.+?)\s*hesaplayın/g, template: 'Hesapla: $1' },
            'bulunuz': { pattern: /(.+?)\s*bulunuz/g, template: 'Bul: $1' },
            'çözünüz': { pattern: /(.+?)\s*çözünüz/g, template: 'Çöz: $1' },
            'gösteriniz': { pattern: /(.+?)\s*gösteriniz/g, template: 'Göster: $1' },
            'ispatlayınız': { pattern: /(.+?)\s*ispatlayınız/g, template: 'İspat: $1' }
        };
        
        // Number words in Turkish
        this.numberWords = {
            'sıfır': '0', 'bir': '1', 'iki': '2', 'üç': '3', 'dört': '4', 'beş': '5',
            'altı': '6', 'yedi': '7', 'sekiz': '8', 'dokuz': '9', 'on': '10',
            'onbir': '11', 'oniki': '12', 'onüç': '13', 'ondört': '14', 'onbeş': '15',
            'onaltı': '16', 'onyedi': '17', 'onsekiz': '18', 'ondokuz': '19',
            'yirmi': '20', 'otuz': '30', 'kırk': '40', 'elli': '50',
            'altmış': '60', 'yetmiş': '70', 'seksen': '80', 'doksan': '90',
            'yüz': '100', 'bin': '1000', 'milyon': '1000000', 'milyar': '1000000000'
        };
        
        // Ordinal numbers
        this.ordinalNumbers = {
            'birinci': '1.', 'ikinci': '2.', 'üçüncü': '3.', 'dördüncü': '4.', 'beşinci': '5.',
            'altıncı': '6.', 'yedinci': '7.', 'sekizinci': '8.', 'dokuzuncu': '9.', 'onuncu': '10.',
            'onbirinci': '11.', 'onikinci': '12.', 'onüçüncü': '13.', 'ondördüncü': '14.', 'onbeşinci': '15.',
            'onaltıncı': '16.', 'onyedinci': '17.', 'onsekizinci': '18.', 'ondokuzuncu': '19.',
            'yirminci': '20.', 'otuzuncu': '30.', 'kırkıncı': '40.', 'ellinci': '50.',
            'altmışıncı': '60.', 'yetmişinci': '70.', 'sekseninci': '80.', 'doksanıncı': '90.',
            'yüzüncü': '100.', 'bininci': '1000.', 'milyonuncu': '1000000.'
        };
        
        // Turkish case endings and their handling
        this.caseEndings = {
            possessive: ['nın', 'nin', 'nun', 'nün', 'ın', 'in', 'un', 'ün'],
            dative: ['na', 'ne', 'ya', 'ye', 'a', 'e'],
            ablative: ['ndan', 'nden', 'dan', 'den'],
            locative: ['nda', 'nde', 'da', 'de'],
            accusative: ['nı', 'ni', 'nu', 'nü', 'ı', 'i', 'u', 'ü']
        };
        
        // Statistics for optimization
        this.processingStats = {
            conversions: 0,
            errors: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        
        // Cache for processed content
        this.processingCache = new Map();
        this.maxCacheSize = 500;
    }
    
    /**
     * Main processing function for Turkish mathematical content
     */
    processTurkishMathContent(content, options = {}) {
        const processingOptions = {
            convertNumbers: true,
            convertTerminology: true,
            convertPhrases: true,
            convertQuestions: true,
            preserveOriginal: false,
            addTooltips: false,
            ...options
        };
        
        // Check cache first
        const cacheKey = this.generateCacheKey(content, processingOptions);
        if (this.processingCache.has(cacheKey)) {
            this.processingStats.cacheHits++;
            return this.processingCache.get(cacheKey);
        }
        
        this.processingStats.cacheMisses++;
        
        try {
            let processedContent = content;
            const conversions = [];
            
            // Convert number words to digits
            if (processingOptions.convertNumbers) {
                const numberResult = this.convertNumberWords(processedContent);
                processedContent = numberResult.content;
                conversions.push(...numberResult.conversions);
            }
            
            // Convert mathematical terminology
            if (processingOptions.convertTerminology) {
                const termResult = this.convertMathTerminology(processedContent);
                processedContent = termResult.content;
                conversions.push(...termResult.conversions);
            }
            
            // Convert mathematical phrases
            if (processingOptions.convertPhrases) {
                const phraseResult = this.convertMathPhrases(processedContent);
                processedContent = phraseResult.content;
                conversions.push(...phraseResult.conversions);
            }
            
            // Convert question patterns
            if (processingOptions.convertQuestions) {
                const questionResult = this.convertQuestionPatterns(processedContent);
                processedContent = questionResult.content;
                conversions.push(...questionResult.conversions);
            }
            
            const result = {
                originalContent: content,
                processedContent: processedContent,
                conversions: conversions,
                hasTurkishMath: conversions.length > 0,
                processingTime: Date.now()
            };
            
            // Cache the result
            this.processingCache.set(cacheKey, result);
            this.maintainCacheSize();
            
            this.processingStats.conversions += conversions.length;
            return result;
            
        } catch (error) {
            console.error('Turkish math processing error:', error);
            this.processingStats.errors++;
            
            return {
                originalContent: content,
                processedContent: content,
                conversions: [],
                hasTurkishMath: false,
                error: error.message
            };
        }
    }
    
    /**
     * Convert Turkish number words to digits
     */
    convertNumberWords(content) {
        let processedContent = content;
        const conversions = [];
        
        // Convert basic number words
        for (const [turkish, digit] of Object.entries(this.numberWords)) {
            const pattern = new RegExp(`\\b${turkish}\\b`, 'gi');
            const matches = content.match(pattern);
            
            if (matches) {
                processedContent = processedContent.replace(pattern, digit);
                conversions.push({
                    type: 'number_word',
                    original: turkish,
                    converted: digit,
                    count: matches.length
                });
            }
        }
        
        // Convert ordinal numbers
        for (const [turkish, ordinal] of Object.entries(this.ordinalNumbers)) {
            const pattern = new RegExp(`\\b${turkish}\\b`, 'gi');
            const matches = content.match(pattern);
            
            if (matches) {
                processedContent = processedContent.replace(pattern, ordinal);
                conversions.push({
                    type: 'ordinal_number',
                    original: turkish,
                    converted: ordinal,
                    count: matches.length
                });
            }
        }
        
        return { content: processedContent, conversions };
    }
    
    /**
     * Convert Turkish mathematical terminology to LaTeX
     */
    convertMathTerminology(content) {
        let processedContent = content;
        const conversions = [];
        
        for (const [turkish, mathInfo] of Object.entries(this.mathTerminology)) {
            // Create flexible pattern that handles Turkish case endings
            const pattern = this.createFlexiblePattern(turkish);
            const matches = content.match(pattern);
            
            if (matches) {
                // Replace with LaTeX wrapped in appropriate delimiters
                const replacement = this.wrapInMathDelimiters(mathInfo.latex);
                processedContent = processedContent.replace(pattern, replacement);
                
                conversions.push({
                    type: 'terminology',
                    original: turkish,
                    converted: mathInfo.latex,
                    symbol: mathInfo.symbol,
                    english: mathInfo.english,
                    count: matches.length
                });
            }
        }
        
        return { content: processedContent, conversions };
    }
    
    /**
     * Convert Turkish mathematical phrases to LaTeX
     */
    convertMathPhrases(content) {
        let processedContent = content;
        const conversions = [];
        
        for (const [phrase, phraseInfo] of Object.entries(this.mathPhrases)) {
            const matches = [...content.matchAll(phraseInfo.pattern)];
            
            if (matches.length > 0) {
                processedContent = processedContent.replace(phraseInfo.pattern, (match, ...groups) => {
                    let latex = phraseInfo.latex;
                    // Replace group placeholders with actual captured groups
                    groups.forEach((group, index) => {
                        if (group !== undefined) {
                            latex = latex.replace(`$${index + 1}`, group);
                        }
                    });
                    return this.wrapInMathDelimiters(latex);
                });
                
                conversions.push({
                    type: 'phrase',
                    original: phrase,
                    converted: phraseInfo.latex,
                    count: matches.length
                });
            }
        }
        
        return { content: processedContent, conversions };
    }
    
    /**
     * Convert Turkish question patterns
     */
    convertQuestionPatterns(content) {
        let processedContent = content;
        const conversions = [];
        
        for (const [pattern, patternInfo] of Object.entries(this.questionPatterns)) {
            const matches = [...content.matchAll(patternInfo.pattern)];
            
            if (matches.length > 0) {
                processedContent = processedContent.replace(patternInfo.pattern, (match, ...groups) => {
                    let template = patternInfo.template;
                    // Replace group placeholders
                    groups.forEach((group, index) => {
                        if (group !== undefined) {
                            template = template.replace(`$${index + 1}`, group.trim());
                        }
                    });
                    return template;
                });
                
                conversions.push({
                    type: 'question_pattern',
                    original: pattern,
                    converted: patternInfo.template,
                    count: matches.length
                });
            }
        }
        
        return { content: processedContent, conversions };
    }
    
    /**
     * Create flexible pattern that handles Turkish case endings
     */
    createFlexiblePattern(word) {
        // Create a pattern that matches the word with optional Turkish case endings
        const allEndings = [].concat(
            this.caseEndings.possessive,
            this.caseEndings.dative,
            this.caseEndings.ablative,
            this.caseEndings.locative,
            this.caseEndings.accusative
        );
        
        const endingPattern = allEndings.map(ending => `'?${ending}`).join('|');
        return new RegExp(`\\b${word}(?:${endingPattern})?\\b`, 'gi');
    }
    
    /**
     * Wrap LaTeX content in appropriate delimiters
     */
    wrapInMathDelimiters(latex, displayMode = false) {
        if (displayMode) {
            return `$$${latex}$$`;
        } else {
            return `$${latex}$`;
        }
    }
    
    /**
     * Detect if content contains Turkish mathematical terms
     */
    containsTurkishMath(content) {
        const turkishMathPattern = new RegExp(
            Object.keys(this.mathTerminology)
                .concat(Object.keys(this.mathPhrases))
                .concat(Object.keys(this.numberWords))
                .join('|'),
            'i'
        );
        
        return turkishMathPattern.test(content);
    }
    
    /**
     * Extract Turkish mathematical context from content
     */
    extractMathContext(content) {
        const context = {
            terminology: [],
            phrases: [],
            numbers: [],
            questions: [],
            difficulty: 'basic'
        };
        
        // Extract terminology
        for (const [turkish, mathInfo] of Object.entries(this.mathTerminology)) {
            if (content.toLowerCase().includes(turkish.toLowerCase())) {
                context.terminology.push({
                    term: turkish,
                    latex: mathInfo.latex,
                    english: mathInfo.english
                });
            }
        }
        
        // Extract phrases
        for (const [phrase, phraseInfo] of Object.entries(this.mathPhrases)) {
            if (phraseInfo.pattern.test(content)) {
                context.phrases.push({
                    phrase: phrase,
                    latex: phraseInfo.latex
                });
            }
        }
        
        // Extract numbers
        for (const [turkish, digit] of Object.entries(this.numberWords)) {
            if (content.toLowerCase().includes(turkish.toLowerCase())) {
                context.numbers.push({
                    word: turkish,
                    value: digit
                });
            }
        }
        
        // Extract question patterns
        for (const [pattern, patternInfo] of Object.entries(this.questionPatterns)) {
            if (patternInfo.pattern.test(content)) {
                context.questions.push({
                    pattern: pattern,
                    template: patternInfo.template
                });
            }
        }
        
        // Determine difficulty based on terminology complexity
        const advancedTerms = ['türev', 'integral', 'logaritma', 'trigonometri', 'matris'];
        if (advancedTerms.some(term => content.toLowerCase().includes(term))) {
            context.difficulty = 'advanced';
        } else if (context.terminology.length > 3) {
            context.difficulty = 'intermediate';
        }
        
        return context;
    }
    
    /**
     * Generate suggestions for Turkish math content improvement
     */
    generateSuggestions(content) {
        const suggestions = [];
        const context = this.extractMathContext(content);
        
        // Suggest terminology improvements
        const missingTerms = this.findMissingTerminology(content);
        if (missingTerms.length > 0) {
            suggestions.push({
                type: 'terminology',
                message: 'Bu terimler LaTeX formatında yazılabilir',
                terms: missingTerms
            });
        }
        
        // Suggest phrase improvements
        const improvableText = this.findImprovableText(content);
        if (improvableText.length > 0) {
            suggestions.push({
                type: 'phrases',
                message: 'Bu ifadeler matematik notasyonu ile yazılabilir',
                phrases: improvableText
            });
        }
        
        // Suggest formatting improvements
        if (this.needsFormatting(content)) {
            suggestions.push({
                type: 'formatting',
                message: 'İçerik matematik formatında düzenlenebilir',
                recommendations: [
                    'Sayıları rakam olarak yazın',
                    'Matematik terimlerini LaTeX formatında kullanın',
                    'Formülleri matematik delimiterleri içinde yazın'
                ]
            });
        }
        
        return suggestions;
    }
    
    /**
     * Find terminology that could be converted to LaTeX
     */
    findMissingTerminology(content) {
        const missing = [];
        
        for (const [turkish, mathInfo] of Object.entries(this.mathTerminology)) {
            const pattern = this.createFlexiblePattern(turkish);
            if (pattern.test(content)) {
                missing.push({
                    term: turkish,
                    latex: mathInfo.latex,
                    symbol: mathInfo.symbol
                });
            }
        }
        
        return missing;
    }
    
    /**
     * Find text that could be improved with mathematical notation
     */
    findImprovableText(content) {
        const improvable = [];
        
        // Look for mathematical expressions written as text
        const patterns = [
            { pattern: /(\w+)\s*artı\s*(\w+)/g, suggestion: '$1 + $2' },
            { pattern: /(\w+)\s*eksi\s*(\w+)/g, suggestion: '$1 - $2' },
            { pattern: /(\w+)\s*çarpı\s*(\w+)/g, suggestion: '$1 \\times $2' },
            { pattern: /(\w+)\s*bölü\s*(\w+)/g, suggestion: '\\frac{$1}{$2}' },
            { pattern: /(\w+)\s*üzeri\s*(\w+)/g, suggestion: '$1^{$2}' }
        ];
        
        patterns.forEach(({ pattern, suggestion }) => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                improvable.push({
                    original: match[0],
                    suggestion: suggestion.replace('$1', match[1]).replace('$2', match[2])
                });
            });
        });
        
        return improvable;
    }
    
    /**
     * Check if content needs formatting improvements
     */
    needsFormatting(content) {
        // Check for unformatted mathematical expressions
        const indicators = [
            /\b\d+\s*artı\s*\d+/,
            /\b\d+\s*eksi\s*\d+/,
            /\b\d+\s*çarpı\s*\d+/,
            /\b\d+\s*bölü\s*\d+/,
            /\bx\s*artı\s*y/,
            /\ba\s*çarpı\s*b/
        ];
        
        return indicators.some(pattern => pattern.test(content));
    }
    
    /**
     * Utility functions
     */
    generateCacheKey(content, options) {
        return `${content.length}_${JSON.stringify(options)}_${content.substring(0, 50)}`;
    }
    
    maintainCacheSize() {
        if (this.processingCache.size > this.maxCacheSize) {
            const keysToDelete = Array.from(this.processingCache.keys()).slice(0, 50);
            keysToDelete.forEach(key => this.processingCache.delete(key));
        }
    }
    
    /**
     * Get processing statistics
     */
    getProcessingStats() {
        return {
            ...this.processingStats,
            cacheSize: this.processingCache.size,
            hitRate: this.processingStats.cacheHits + this.processingStats.cacheMisses > 0 ?
                    (this.processingStats.cacheHits / (this.processingStats.cacheHits + this.processingStats.cacheMisses) * 100).toFixed(2) + '%' : '0%',
            terminologyCount: Object.keys(this.mathTerminology).length,
            phraseCount: Object.keys(this.mathPhrases).length,
            numberWordCount: Object.keys(this.numberWords).length
        };
    }
    
    /**
     * Reset processor
     */
    reset() {
        this.processingCache.clear();
        this.processingStats = {
            conversions: 0,
            errors: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        console.log('🔄 Turkish Math Processor reset');
    }
}

// Create singleton instance
export const turkishMathProcessor = new TurkishMathProcessor();

// Global access for debugging
window.turkishMathProcessor = turkishMathProcessor;