// mathAutocomplete.js
// Akıllı matematik giriş ve sembol arama.
// Sadece autocomplete ve sembol arama ile ilgili fonksiyonlar burada olmalı.
// Ortak yardımcılar utils.js'e taşınmalı.

// =================================================================================
//  MathAi - Matematik Autocomplete Sistemi
//  Real-time matematik ifade tamamlama ve önerileri
// =================================================================================

export class MathAutocomplete {
    constructor() {
        this.patterns = this.initializePatterns();
        this.debounceTimeout = null;
        this.mathSymbols = this.initializeMathSymbols();
    }
    
    // Ortaokul ve Lise matematik patterns
    initializePatterns() {
        return {
            // ====================== ORTAOKUL SEVİYESİ ======================
            
            // Temel Aritmetik
            basic_arithmetic: [
                {
                    pattern: /(\d+)\s*\+\s*(\d+)/,
                    completion: (match) => {
                        const result = parseInt(match[1]) + parseInt(match[2]);
                        return `${match[1]} + ${match[2]} = ${result}`;
                    },
                    explanation: "Toplama işlemi",
                    confidence: 0.95
                },
                {
                    pattern: /(\d+)\s*-\s*(\d+)/,
                    completion: (match) => {
                        const result = parseInt(match[1]) - parseInt(match[2]);
                        return `${match[1]} - ${match[2]} = ${result}`;
                    },
                    explanation: "Çıkarma işlemi",
                    confidence: 0.95
                },
                {
                    pattern: /(\d+)\s*×\s*(\d+)/,
                    completion: (match) => {
                        const result = parseInt(match[1]) * parseInt(match[2]);
                        return `${match[1]} × ${match[2]} = ${result}`;
                    },
                    explanation: "Çarpma işlemi",
                    confidence: 0.95
                }
            ],

            // Kesirler
            fractions: [
                {
                    pattern: /(\d+)\/(\d+)\s*\+\s*(\d+)\/(\d+)/,
                    completion: (match) => {
                        const [, a, b, c, d] = match.map(Number);
                        return `${a}/${b} + ${c}/${d} = (${a}×${d} + ${c}×${b})/(${b}×${d})`;
                    },
                    explanation: "Kesir toplama: payda eşitleme",
                    confidence: 0.9
                },
                {
                    pattern: /(\d+)\/(\d+)\s*-\s*(\d+)\/(\d+)/,
                    completion: (match) => {
                        const [, a, b, c, d] = match.map(Number);
                        return `${a}/${b} - ${c}/${d} = (${a}×${d} - ${c}×${b})/(${b}×${d})`;
                    },
                    explanation: "Kesir çıkarma: payda eşitleme",
                    confidence: 0.9
                },
                {
                    pattern: /(\d+)\/(\d+)\s*×\s*(\d+)\/(\d+)/,
                    completion: (match) => {
                        const [, a, b, c, d] = match.map(Number);
                        return `${a}/${b} × ${c}/${d} = ${a*c}/${b*d}`;
                    },
                    explanation: "Kesir çarpma: pay ile pay, payda ile payda çarp",
                    confidence: 0.9
                },
                {
                    pattern: /(\d+)\/(\d+)\s*÷\s*(\d+)\/(\d+)/,
                    completion: (match) => {
                        const [, a, b, c, d] = match.map(Number);
                        return `${a}/${b} ÷ ${c}/${d} = ${a}/${b} × ${d}/${c} = ${a*d}/${b*c}`;
                    },
                    explanation: "Kesir bölme: ikinci kesri ters çevir ve çarp",
                    confidence: 0.9
                }
            ],

            // Yüzdeler
            percentages: [
                {
                    pattern: /(\d+)%\s*of\s*(\d+)|(\d+)\s*sayısının\s*(\d+)%/i,
                    completion: (match) => {
                        const percent = match[1] || match[4];
                        const number = match[2] || match[3];
                        const result = (number * percent / 100);
                        return `${number} sayısının %${percent}'ı = ${number} × ${percent}/100 = ${result}`;
                    },
                    explanation: "Yüzde hesaplama: sayı × yüzde ÷ 100",
                    confidence: 0.9
                },
                {
                    pattern: /(\d+)\s*increase.*(\d+)%|(\d+).*%(\d+).*artış/i,
                    completion: (match) => {
                        const base = match[1] || match[3];
                        const percent = match[2] || match[4];
                        const increase = base * percent / 100;
                        const result = parseInt(base) + increase;
                        return `${base} sayısının %${percent} artışı = ${base} + ${increase} = ${result}`;
                    },
                    explanation: "Yüzde artış hesaplama",
                    confidence: 0.85
                }
            ],

            // Üslü Sayılar (Ortaokul)
            basic_powers: [
                {
                    pattern: /(\d+)\^(\d+)/,
                    completion: (match) => {
                        const base = parseInt(match[1]);
                        const exp = parseInt(match[2]);
                        if (exp <= 5) {
                            const result = Math.pow(base, exp);
                            return `${base}^${exp} = ${result}`;
                        }
                        return `${base}^${exp}`;
                    },
                    explanation: "Üslü sayı hesaplama",
                    confidence: 0.9
                },
                {
                    pattern: /√(\d+)/,
                    completion: (match) => {
                        const num = parseInt(match[1]);
                        const sqrt = Math.sqrt(num);
                        if (Number.isInteger(sqrt)) {
                            return `√${num} = ${sqrt}`;
                        }
                        return `√${num}`;
                    },
                    explanation: "Karekök hesaplama",
                    confidence: 0.9
                }
            ],

            // ====================== LİSE SEVİYESİ ======================

            // İntegraller
            integral: [
                {
                    pattern: /∫\s*x\^?(\d+)/i,
                    completion: (match) => {
                        const n = parseInt(match[1]);
                        return `∫x^${n}dx = x^${n+1}/${n+1} + C`;
                    },
                    explanation: "Kuvvet kuralı: ∫x^n dx = x^(n+1)/(n+1) + C",
                    confidence: 0.95
                },
                {
                    pattern: /∫\s*(\d+)x\^?(\d+)?/i,
                    completion: (match) => {
                        const coeff = parseInt(match[1]);
                        const exp = match[2] ? parseInt(match[2]) : 1;
                        return `∫${coeff}x^${exp}dx = ${coeff}x^${exp+1}/${exp+1} + C`;
                    },
                    explanation: "Sabit çarpanlı kuvvet integrali",
                    confidence: 0.9
                },
                {
                    pattern: /∫\s*sin\s*\(\s*x\s*\)/i,
                    completion: () => `∫sin(x)dx = -cos(x) + C`,
                    explanation: "Sinüs fonksiyonu integrali",
                    confidence: 0.95
                },
                {
                    pattern: /∫\s*cos\s*\(\s*x\s*\)/i,
                    completion: () => `∫cos(x)dx = sin(x) + C`,
                    explanation: "Kosinüs fonksiyonu integrali",
                    confidence: 0.95
                },
                {
                    pattern: /∫\s*e\^x/i,
                    completion: () => `∫e^x dx = e^x + C`,
                    explanation: "Eksponansiyel fonksiyon integrali",
                    confidence: 0.95
                },
                {
                    pattern: /∫\s*1\/x/i,
                    completion: () => `∫(1/x)dx = ln|x| + C`,
                    explanation: "1/x integrali doğal logaritma verir",
                    confidence: 0.95
                }
            ],

            // Türevler
            derivative: [
                {
                    pattern: /(d\/dx|f')\s*\(\s*x\^(\d+)\s*\)/i,
                    completion: (match) => {
                        const n = parseInt(match[2]);
                        if (n === 1) return `d/dx(x) = 1`;
                        if (n === 0) return `d/dx(1) = 0`;
                        return `d/dx(x^${n}) = ${n}x^${n-1}`;
                    },
                    explanation: "Kuvvet kuralı: d/dx(x^n) = nx^(n-1)",
                    confidence: 0.95
                },
                {
                    pattern: /(d\/dx|f')\s*\(\s*(\d+)x\^?(\d+)?\s*\)/i,
                    completion: (match) => {
                        const coeff = parseInt(match[2]);
                        const exp = match[3] ? parseInt(match[3]) : 1;
                        if (exp === 1) return `d/dx(${coeff}x) = ${coeff}`;
                        return `d/dx(${coeff}x^${exp}) = ${coeff * exp}x^${exp-1}`;
                    },
                    explanation: "Sabit çarpanlı kuvvet türevi",
                    confidence: 0.9
                },
                {
                    pattern: /(d\/dx|f')\s*\(\s*sin\s*\(\s*x\s*\)\s*\)/i,
                    completion: () => `d/dx(sin(x)) = cos(x)`,
                    explanation: "Sinüs fonksiyonu türevi",
                    confidence: 0.95
                },
                {
                    pattern: /(d\/dx|f')\s*\(\s*cos\s*\(\s*x\s*\)\s*\)/i,
                    completion: () => `d/dx(cos(x)) = -sin(x)`,
                    explanation: "Kosinüs fonksiyonu türevi",
                    confidence: 0.95
                },
                {
                    pattern: /(d\/dx|f')\s*\(\s*e\^x\s*\)/i,
                    completion: () => `d/dx(e^x) = e^x`,
                    explanation: "e^x türevi kendisine eşittir",
                    confidence: 0.95
                },
                {
                    pattern: /(d\/dx|f')\s*\(\s*ln\s*\(\s*x\s*\)\s*\)/i,
                    completion: () => `d/dx(ln(x)) = 1/x`,
                    explanation: "Doğal logaritma türevi",
                    confidence: 0.95
                }
            ],

            // Trigonometri
            trigonometry: [
                {
                    pattern: /sin\^?2.*\+.*cos\^?2/i,
                    completion: () => `sin²(x) + cos²(x) = 1`,
                    explanation: "Temel trigonometrik kimlik",
                    confidence: 0.98
                },
                {
                    pattern: /sin\((\d+)°?\)/i,
                    completion: (match) => {
                        const angle = parseInt(match[1]);
                        const values = {
                            0: '0', 30: '1/2', 45: '√2/2', 60: '√3/2', 90: '1',
                            120: '√3/2', 135: '√2/2', 150: '1/2', 180: '0'
                        };
                        return values[angle] ? `sin(${angle}°) = ${values[angle]}` : `sin(${angle}°)`;
                    },
                    explanation: "Özel açıların sinüs değerleri",
                    confidence: 0.9
                },
                {
                    pattern: /cos\((\d+)°?\)/i,
                    completion: (match) => {
                        const angle = parseInt(match[1]);
                        const values = {
                            0: '1', 30: '√3/2', 45: '√2/2', 60: '1/2', 90: '0',
                            120: '-1/2', 135: '-√2/2', 150: '-√3/2', 180: '-1'
                        };
                        return values[angle] ? `cos(${angle}°) = ${values[angle]}` : `cos(${angle}°)`;
                    },
                    explanation: "Özel açıların kosinüs değerleri",
                    confidence: 0.9
                },
                {
                    pattern: /tan\((\d+)°?\)/i,
                    completion: (match) => {
                        const angle = parseInt(match[1]);
                        const values = {
                            0: '0', 30: '√3/3', 45: '1', 60: '√3', 
                            120: '-√3', 135: '-1', 150: '-√3/3', 180: '0'
                        };
                        return values[angle] ? `tan(${angle}°) = ${values[angle]}` : `tan(${angle}°)`;
                    },
                    explanation: "Özel açıların tanjant değerleri",
                    confidence: 0.9
                }
            ],

            // Logaritma
            logarithm: [
                {
                    pattern: /log\s*(\d+)/i,
                    completion: (match) => {
                        const num = parseInt(match[1]);
                        if (num === 1) return `log(1) = 0`;
                        if (num === 10) return `log(10) = 1`;
                        if (num === 100) return `log(100) = 2`;
                        if (num === 1000) return `log(1000) = 3`;
                        return `log(${num})`;
                    },
                    explanation: "10 tabanında logaritma",
                    confidence: 0.85
                },
                {
                    pattern: /ln\s*(\d+)/i,
                    completion: (match) => {
                        const num = parseInt(match[1]);
                        if (num === 1) return `ln(1) = 0`;
                        if (num === 2.718 || num === 3) return `ln(e) = 1`;
                        return `ln(${num})`;
                    },
                    explanation: "Doğal logaritma (e tabanında)",
                    confidence: 0.85
                },
                {
                    pattern: /log\s*\(\s*(\w+)\s*\)\s*\+\s*log\s*\(\s*(\w+)\s*\)/i,
                    completion: (match) => `log(${match[1]}) + log(${match[2]}) = log(${match[1]} × ${match[2]})`,
                    explanation: "Logaritma toplama kuralı: log(a) + log(b) = log(ab)",
                    confidence: 0.9
                },
                {
                    pattern: /log\s*\(\s*(\w+)\s*\)\s*-\s*log\s*\(\s*(\w+)\s*\)/i,
                    completion: (match) => `log(${match[1]}) - log(${match[2]}) = log(${match[1]}/${match[2]})`,
                    explanation: "Logaritma çıkarma kuralı: log(a) - log(b) = log(a/b)",
                    confidence: 0.9
                }
            ],

            // Denklemler
            equations: [
                {
                    pattern: /(\w+)\^2\s*=\s*(\d+)/i,
                    completion: (match) => {
                        const variable = match[1];
                        const value = match[2];
                        return `${variable}² = ${value} ⟹ ${variable} = ±√${value}`;
                    },
                    explanation: "İkinci derece denklem: x² = a ⟹ x = ±√a",
                    confidence: 0.9
                },
                {
                    pattern: /(\w+)\^2\s*\+\s*(\d+)\s*\*?\s*(\w+)\s*\+\s*(\d+)\s*=\s*0/i,
                    completion: (match) => {
                        const [, x, b, , c] = match;
                        return `${x}² + ${b}${x} + ${c} = 0 ⟹ ${x} = (-${b} ± √(${b}² - 4×1×${c}))/2`;
                    },
                    explanation: "İkinci derece denklem çözümü (abc formülü)",
                    confidence: 0.85
                },
                {
                    pattern: /(\d+)\s*(\w+)\s*=\s*(\d+)/i,
                    completion: (match) => {
                        const coeff = parseInt(match[1]);
                        const variable = match[2];
                        const value = parseInt(match[3]);
                        const result = value / coeff;
                        return `${coeff}${variable} = ${value} ⟹ ${variable} = ${value}/${coeff} = ${result}`;
                    },
                    explanation: "Basit doğrusal denklem çözümü",
                    confidence: 0.95
                }
            ],

            // Limitler
            limits: [
                {
                    pattern: /lim.*x.*→.*(\d+).*(\w+)/i,
                    completion: (match) => {
                        const point = match[1];
                        const expr = match[2];
                        return `lim(x→${point}) ${expr}`;
                    },
                    explanation: "Limit hesaplama",
                    confidence: 0.8
                },
                {
                    pattern: /lim.*x.*→.*∞/i,
                    completion: () => `lim(x→∞) f(x)`,
                    explanation: "Sonsuzda limit",
                    confidence: 0.8
                }
            ],

            // Matrisler
            matrices: [
                {
                    pattern: /det\s*\(\s*A\s*\)|A\s*determinant/i,
                    completion: () => `det(A) = |A|`,
                    explanation: "Matris determinantı",
                    confidence: 0.85
                },
                {
                    pattern: /A\^{-1}|A\s*inverse/i,
                    completion: () => `A⁻¹ = (1/det(A)) × adj(A)`,
                    explanation: "Matris tersi formülü",
                    confidence: 0.85
                }
            ],

            // Geometri
            geometry: [
                {
                    pattern: /area.*circle|daire.*alan/i,
                    completion: () => `A = πr²`,
                    explanation: "Daire alanı formülü",
                    confidence: 0.9
                },
                {
                    pattern: /area.*triangle|üçgen.*alan/i,
                    completion: () => `A = (1/2) × taban × yükseklik`,
                    explanation: "Üçgen alanı formülü",
                    confidence: 0.9
                },
                {
                    pattern: /pythagoras|pitagor/i,
                    completion: () => `a² + b² = c²`,
                    explanation: "Pisagor teoremi",
                    confidence: 0.95
                },
                {
                    pattern: /volume.*sphere|küre.*hacim/i,
                    completion: () => `V = (4/3)πr³`,
                    explanation: "Küre hacmi formülü",
                    confidence: 0.9
                }
            ],

            // Olasılık
            probability: [
                {
                    pattern: /P\s*\(\s*A\s*∪\s*B\s*\)/i,
                    completion: () => `P(A ∪ B) = P(A) + P(B) - P(A ∩ B)`,
                    explanation: "Birleşim olasılığı formülü",
                    confidence: 0.9
                },
                {
                    pattern: /P\s*\(\s*A\s*∩\s*B\s*\)/i,
                    completion: () => `P(A ∩ B) = P(A) × P(B|A)`,
                    explanation: "Kesişim olasılığı formülü",
                    confidence: 0.9
                }
            ]
        };
    }
    
    initializeMathSymbols() {
        return {
            // Temel matematik sembolleri
            'integral': '∫',
            'sum': '∑',
            'product': '∏',
            'infinity': '∞',
            'pi': 'π',
            'sqrt': '√',
            'cbrt': '∛',
            'fourthrt': '∜',
            'degree': '°',
            'plusminus': '±',
            'minusplus': '∓',
            
            // Karşılaştırma sembolleri
            'leq': '≤',
            'geq': '≥',
            'neq': '≠',
            'approx': '≈',
            'equiv': '≡',
            'similar': '∼',
            'congruent': '≅',
            'proportional': '∝',
            'much_less': '≪',
            'much_greater': '≫',
            
            // Küme sembolleri
            'in': '∈',
            'notin': '∉',
            'subset': '⊂',
            'superset': '⊃',
            'subseteq': '⊆',
            'superseteq': '⊇',
            'union': '∪',
            'intersection': '∩',
            'emptyset': '∅',
            'complement': '∁',
            
            // Mantık sembolleri
            'and': '∧',
            'or': '∨',
            'not': '¬',
            'implies': '⇒',
            'iff': '⇔',
            'therefore': '∴',
            'because': '∵',
            'exists': '∃',
            'forall': '∀',
            
            // Ok sembolleri
            'rightarrow': '→',
            'leftarrow': '←',
            'uparrow': '↑',
            'downarrow': '↓',
            'leftrightarrow': '↔',
            'updownarrow': '↕',
            'rightarrowdbl': '⇒',
            'leftarrowdbl': '⇐',
            'leftrightarrowdbl': '⇔',
            
            // Yunan harfleri (küçük)
            'alpha': 'α',
            'beta': 'β',
            'gamma': 'γ',
            'delta': 'δ',
            'epsilon': 'ε',
            'zeta': 'ζ',
            'eta': 'η',
            'theta': 'θ',
            'iota': 'ι',
            'kappa': 'κ',
            'lambda': 'λ',
            'mu': 'μ',
            'nu': 'ν',
            'xi': 'ξ',
            'omicron': 'ο',
            'pi_letter': 'π',
            'rho': 'ρ',
            'sigma': 'σ',
            'tau': 'τ',
            'upsilon': 'υ',
            'phi': 'φ',
            'chi': 'χ',
            'psi': 'ψ',
            'omega': 'ω',
            
            // Yunan harfleri (büyük)
            'Alpha': 'Α',
            'Beta': 'Β',
            'Gamma': 'Γ',
            'Delta': 'Δ',
            'Epsilon': 'Ε',
            'Zeta': 'Ζ',
            'Eta': 'Η',
            'Theta': 'Θ',
            'Iota': 'Ι',
            'Kappa': 'Κ',
            'Lambda': 'Λ',
            'Mu': 'Μ',
            'Nu': 'Ν',
            'Xi': 'Ξ',
            'Omicron': 'Ο',
            'Pi': 'Π',
            'Rho': 'Ρ',
            'Sigma': 'Σ',
            'Tau': 'Τ',
            'Upsilon': 'Υ',
            'Phi': 'Φ',
            'Chi': 'Χ',
            'Psi': 'Ψ',
            'Omega': 'Ω',
            
            // Üst simgeler (superscript)
            'sup0': '⁰',
            'sup1': '¹',
            'sup2': '²',
            'sup3': '³',
            'sup4': '⁴',
            'sup5': '⁵',
            'sup6': '⁶',
            'sup7': '⁷',
            'sup8': '⁸',
            'sup9': '⁹',
            'supplus': '⁺',
            'supminus': '⁻',
            'supn': 'ⁿ',
            
            // Alt simgeler (subscript)
            'sub0': '₀',
            'sub1': '₁',
            'sub2': '₂',
            'sub3': '₃',
            'sub4': '₄',
            'sub5': '₅',
            'sub6': '₆',
            'sub7': '₇',
            'sub8': '₈',
            'sub9': '₉',
            'subplus': '₊',
            'subminus': '₋',
            'subn': 'ₙ',
            
            // Kesirler
            'half': '½',
            'third': '⅓',
            'twothirds': '⅔',
            'quarter': '¼',
            'threequarters': '¾',
            'fifth': '⅕',
            'sixth': '⅙',
            'eighth': '⅛',
            
            // Geometri sembolleri
            'angle': '∠',
            'rightangle': '∟',
            'triangle': '△',
            'square': '□',
            'circle': '○',
            'parallel': '∥',
            'perpendicular': '⊥',
            'similar_geom': '∼',
            'congruent_geom': '≅',
            
            // Analiz sembolleri
            'partial': '∂',
            'nabla': '∇',
            'laplacian': '∆',
            'limit': 'lim',
            'integral_double': '∬',
            'integral_triple': '∭',
            'integral_contour': '∮',
            
            // Özel sayılar ve sabitler
            'euler': 'e',
            'imaginary': 'i',
            'complex': 'ℂ',
            'real': 'ℝ',
            'natural': 'ℕ',
            'integer': 'ℤ',
            'rational': 'ℚ',
            'irrational': 'ℙ',
            
            // Diğer matematik sembolleri
            'factorial': '!',
            'permutation': 'P',
            'combination': 'C',
            'absolute': '|',
            'norm': '‖',
            'ceiling': '⌈',
            'floor': '⌊',
            'divides': '∣',
            'notdivides': '∤',
            'modulo': 'mod',
            
            // Operatörler
            'times': '×',
            'divide': '÷',
            'cdot': '⋅',
            'star': '⋆',
            'circ': '∘',
            'oplus': '⊕',
            'ominus': '⊖',
            'otimes': '⊗',
            'oslash': '⊘',
            
            // Kök ve üs sembolleri
            'sqrt_symbol': '√',
            'cbrt_symbol': '∛',
            'fourthrt_symbol': '∜',
            'exp': 'exp',
            'log': 'log',
            'ln': 'ln',
            'lg': 'lg',
            
            // Trigonometri
            'sin': 'sin',
            'cos': 'cos',
            'tan': 'tan',
            'cot': 'cot',
            'sec': 'sec',
            'csc': 'csc',
            'arcsin': 'arcsin',
            'arccos': 'arccos',
            'arctan': 'arctan',
            
            // Hiperbolik fonksiyonlar
            'sinh': 'sinh',
            'cosh': 'cosh',
            'tanh': 'tanh',
            'coth': 'coth',
            'sech': 'sech',
            'csch': 'csch',
            
            // Diğer özel karakterler
            'copyright': '©',
            'registered': '®',
            'trademark': '™',
            'ellipsis': '…',
            'bullet': '•',
            'asterisk': '∗',
            'dagger': '†',
            'doubledagger': '‡',
            'section': '§',
            'paragraph': '¶',
            'prime': '′',
            'doubleprime': '″',
            'tripleprime': '‴'
        };
    }
    
    // Yerel pattern'lara göre öneriler üret
    getLocalSuggestions(input) {
        const suggestions = [];
        const cleanInput = input.trim();
        
        if (cleanInput.length < 2) return suggestions;
        
        // Tüm pattern kategorilerini kontrol et
        Object.entries(this.patterns).forEach(([category, categoryPatterns]) => {
            categoryPatterns.forEach(pattern => {
                const match = cleanInput.match(pattern.pattern);
                if (match) {
                    try {
                        const completion = pattern.completion(match);
                        suggestions.push({
                            type: 'local',
                            category: category,
                            text: completion,
                            explanation: pattern.explanation,
                            confidence: pattern.confidence || 0.8,
                            input: cleanInput
                        });
                    } catch (error) {
                        console.warn('Pattern completion error:', error);
                    }
                }
            });
        });
        
        // Sembol önerileri ekle
        const symbolSuggestions = this.getSymbolSuggestions(cleanInput);
        suggestions.push(...symbolSuggestions);
        
        // Güven skoruna göre sırala
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
    
    // Sembol önerileri
    getSymbolSuggestions(input) {
        const suggestions = [];
        const lowerInput = input.toLowerCase();
        
        Object.entries(this.mathSymbols).forEach(([name, symbol]) => {
            if (name.includes(lowerInput) || lowerInput.includes(name)) {
                suggestions.push({
                    type: 'symbol',
                    category: 'symbol',
                    text: symbol,
                    explanation: `${name} sembolü: ${symbol}`,
                    confidence: 0.7,
                    input: input
                });
            }
        });
        
        return suggestions;
    }
    
    // API'den akıllı öneriler al
    async getAPISuggestions(currentInput, fullText) {
        if (currentInput.length < 3) return [];
        
        const prompt = `
        Matematik çözümünde kullanıcı şunu yazıyor: "${currentInput}"
        Tam metin: "${fullText}"
        
        Bu ifadeyi mantıklı şekilde tamamlayacak matematik önerilerini ver.
        
        JSON formatında yanıt ver:
        {
            "suggestions": [
                {
                    "completion": "tamamlanmış matematik ifadesi",
                    "explanation": "kısa açıklama (maksimum 50 karakter)", 
                    "confidence": 0.8,
                    "category": "integral|derivative|algebra|trigonometry"
                }
            ]
        }
        
        KURALLAR:
        - Maksimum 3 öneri
        - Kısa ve pratik olsun
        - Matematiksel olarak doğru olsun
        - Lise seviyesine uygun olsun
        - Türkçe açıklama yap
        `;
        
        try {
            if (typeof window.makeApiCall === 'function') {
                const response = await window.makeApiCall({
                    contents: [{
                        role: "user",
                        parts: [{ text: prompt }]
                    }]
                });
                
                if (response && response.suggestions && Array.isArray(response.suggestions)) {
                    return response.suggestions.map(s => ({
                        type: 'api',
                        category: s.category || 'general',
                        text: s.completion || '',
                        explanation: s.explanation || '',
                        confidence: s.confidence || 0.7,
                        input: currentInput
                    }));
                }
            }
        } catch (error) {
            console.warn('API suggestion hatası:', error);
        }
        
        return [];
    }
    
    // Kombinlenmiş öneriler al
    async getSuggestions(currentInput, fullText) {
        const localSuggestions = this.getLocalSuggestions(currentInput);
        const apiSuggestions = await this.getAPISuggestions(currentInput, fullText);
        
        // Kombinle, duplikatları kaldır ve sırala
        const allSuggestions = [...localSuggestions, ...apiSuggestions];
        const uniqueSuggestions = this.removeDuplicates(allSuggestions);
        
        return uniqueSuggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 5);
    }
    
    // Duplikat önerileri kaldır
    removeDuplicates(suggestions) {
        const seen = new Set();
        return suggestions.filter(suggestion => {
            const key = suggestion.text.toLowerCase().trim();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
}

// Singleton instance
export const mathAutocomplete = new MathAutocomplete();


export class SmartMathInput {
    constructor(containerId) {
        try {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container not found: ${containerId}`);
        }
        this.input = null;
        this.suggestionBox = null;
        this.autocomplete = mathAutocomplete;
        this.isVisible = false;
        this.currentSuggestions = [];
        this.selectedIndex = -1;
        this.debounceTimeout = null;
        
        this.initializeUI();
        this.setupEventListeners();
        console.log('SmartMathInput successfully initialized');
    } catch (error) {
        console.error('SmartMathInput initialization error:', error);
        this.initializeFallback();
    }

    }
    
    initializeUI() {
        this.container.innerHTML = this.createAutocompleteHTML();
        this.input = this.container.querySelector('#smart-math-input');
        this.suggestionBox = this.container.querySelector('#math-suggestions');
    }
    
    createAutocompleteHTML() {
        return `
            <div class="smart-math-container relative">
                <textarea 
                    id="smart-math-input" 
                    class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    rows="4"
                    placeholder="Matematik ifadesini yazmaya başlayın... (∫, d/dx, sin, cos, √ vs.)"
                ></textarea>
                
                <!-- Öneri kutusu -->
                <div id="math-suggestions" class="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg hidden max-h-60 overflow-y-auto">
                    <!-- Öneriler buraya dinamik olarak eklenecek -->
                </div>
                
                <!-- Kısayol bilgileri -->
                <div class="mt-2 text-xs text-gray-500 flex flex-wrap gap-4">
                    <span>🔧 <kbd class="px-1 bg-gray-100 rounded">Tab</kbd> kabul et</span>
                    <span>⬆️⬇️ Önerilerde gezin</span>
                    <span>🔍 <kbd class="px-1 bg-gray-100 rounded">Ctrl+Space</kbd> önerileri göster</span>
                    <span>❌ <kbd class="px-1 bg-gray-100 rounded">Esc</kbd> kapat</span>
                </div>
                
                <!-- Genişletilmiş matematik sembolleri -->
                <div class="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    
                    <!-- Kategori Seçici -->
                    <div class="flex flex-wrap gap-2 mb-3">
                        <button class="symbol-category-btn active px-2 py-1 text-xs bg-blue-500 text-white rounded" data-category="basic">
                            Temel
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="greek">
                            Yunan
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="operators">
                            İşlemler
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="relations">
                            İlişkiler
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="sets">
                            Kümeler
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="geometry">
                            Geometri
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="calculus">
                            Analiz
                        </button>
                        <button class="symbol-category-btn px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300" data-category="arrows">
                            Oklar
                        </button>
                    </div>
                    
                    <!-- Sembol Kategorileri -->
                    <div class="symbol-categories">
                        
                        <!-- Temel Semboller -->
                        <div id="symbols-basic" class="symbol-category active">
                            <div class="text-xs text-blue-700 font-medium mb-2">Temel Matematik:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['∫', '∑', '∏', 'π', '√', '∛', '∞', '±', '∓', '≠', '≈', '≡', '°', '′', '″'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- Yunan Harfleri -->
                        <div id="symbols-greek" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">Yunan Harfleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                            <div class="text-xs text-blue-700 font-medium mb-2 mt-3">Büyük Harfler:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Θ', 'Λ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- İşlem Sembolleri -->
                        <div id="symbols-operators" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">İşlem Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['×', '÷', '⋅', '⋆', '∘', '⊕', '⊖', '⊗', '⊘', '!', 'mod', '∂', '∇', '∆'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- İlişki Sembolleri -->
                        <div id="symbols-relations" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">İlişki Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['≤', '≥', '≠', '≈', '≡', '∼', '≅', '∝', '≪', '≫', '⊥', '∥', '∣', '∤'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- Küme Sembolleri -->
                        <div id="symbols-sets" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">Küme Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅', '∁', 'ℂ', 'ℝ', 'ℕ', 'ℤ', 'ℚ'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- Geometri Sembolleri -->
                        <div id="symbols-geometry" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">Geometri Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['∠', '∟', '△', '□', '○', '∥', '⊥', '∼', '≅', '⌈', '⌊', '|', '‖'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- Analiz Sembolleri -->
                        <div id="symbols-calculus" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">Analiz Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['∫', '∬', '∭', '∮', '∂', '∇', '∆', 'lim', 'd/dx', 'sin', 'cos', 'tan', 'ln', 'log', 'exp'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <!-- Ok Sembolleri -->
                        <div id="symbols-arrows" class="symbol-category hidden">
                            <div class="text-xs text-blue-700 font-medium mb-2">Ok Sembolleri:</div>
                            <div class="flex flex-wrap gap-1">
                                ${['→', '←', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇔', '⇑', '⇓', '⇕'].map(symbol => 
                                    `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-blue-200 rounded hover:bg-blue-100 transition-colors" data-symbol="${symbol}" title="${this.getSymbolDescription(symbol)}">${symbol}</button>`
                                ).join('')}
                            </div>
                        </div>
                        
                    </div>
                    
                    <!-- Arama kutusu -->
                    <div class="mt-3 pt-3 border-t border-blue-200">
                        <input 
                            type="text" 
                            id="symbol-search" 
                            placeholder="Sembol ara... (örn: alpha, integral, sum)" 
                            class="w-full text-xs px-2 py-1 border border-blue-200 rounded focus:outline-none focus:border-blue-400"
                        >
                        <div id="symbol-search-results" class="mt-2 flex flex-wrap gap-1 hidden">
                            <!-- Arama sonuçları buraya gelecek -->
                        </div>
                    </div>
                    
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        // Real-time input değişikliği
        this.input.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                this.handleInput(e.target.value, e.target.selectionStart);
            }, 200); // 200ms debounce
        });
        
        // Klavye navigasyonu
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Hızlı sembol ekleme
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-symbol')) {
                e.preventDefault();
                this.insertSymbol(e.target.dataset.symbol);
            }
        });

        // Kategori değiştirme
    this.container.addEventListener('click', (e) => {
        if (e.target.classList.contains('symbol-category-btn')) {
            e.preventDefault();
            this.switchSymbolCategory(e.target.dataset.category);
        }
        
        if (e.target.classList.contains('quick-symbol')) {
            e.preventDefault();
            this.insertSymbol(e.target.dataset.symbol);
        }
    });

    
    
    // Sembol arama
    const symbolSearch = this.container.querySelector('#symbol-search');
    if (symbolSearch) {
        symbolSearch.addEventListener('input', (e) => {
            this.searchSymbols(e.target.value);
        });
        
        symbolSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const firstResult = this.container.querySelector('#symbol-search-results .quick-symbol');
                if (firstResult) {
                    this.insertSymbol(firstResult.dataset.symbol);
                    symbolSearch.value = '';
                    this.clearSymbolSearch();
                }
            }
        });
    }
        
        // Focus/blur events
        this.input.addEventListener('focus', () => {
            // Focus olduğunda mevcut içerikle önerileri göster
            if (this.input.value.trim()) {
                this.handleInput(this.input.value, this.input.selectionStart);
            }
        });
        
        this.input.addEventListener('blur', () => {
            // Blur olduğunda kısa bir süre sonra önerileri gizle
            setTimeout(() => {
                this.hideSuggestions();
            }, 150);
        });
        
        // Dışarı tıklama - önerileri gizle
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }
    
    async handleInput(text, cursorPos) {
        if (!text.trim()) {
            this.hideSuggestions();
            return;
        }
        
        // Kullanıcının yazdığı son kısmı analiz et
        const beforeCursor = text.substring(0, cursorPos);
        const currentLine = this.getCurrentLine(beforeCursor);
        
        try {
            // API'ye gönderip akıllı öneriler al
            const suggestions = await this.autocomplete.getSuggestions(currentLine, text);
            
            if (suggestions.length > 0) {
                this.showSuggestions(suggestions);
            } else {
                this.hideSuggestions();
            }
        } catch (error) {
            console.error('Suggestion error:', error);
            this.hideSuggestions();
        }
    }
    
    getCurrentLine(text) {
        const lines = text.split('\n');
        return lines[lines.length - 1] || '';
    }
    
    showSuggestions(suggestions) {
        let html = '';
        
        suggestions.forEach((suggestion, index) => {
            const categoryColors = {
                'integral': 'border-l-blue-400 bg-blue-50',
                'derivative': 'border-l-green-400 bg-green-50', 
                'trigonometry': 'border-l-purple-400 bg-purple-50',
                'equation': 'border-l-orange-400 bg-orange-50',
                'symbol': 'border-l-gray-400 bg-gray-50',
                'api': 'border-l-indigo-400 bg-indigo-50'
            };
            
            const colorClass = categoryColors[suggestion.category] || 'border-l-gray-400 bg-gray-50';
            
            html += `
                <div class="suggestion-item p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 ${index === this.selectedIndex ? 'bg-blue-100 border-blue-300' : ''} ${colorClass} border-l-4" 
                     data-index="${index}">
                    <div class="flex items-start justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="font-mono text-sm text-gray-800 truncate" title="${this.escapeHtml(suggestion.text)}">${this.escapeHtml(suggestion.text)}</div>
                            <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span class="truncate">${suggestion.explanation}</span>
                                <span class="text-xs px-1 py-0.5 bg-white rounded text-gray-600">${suggestion.category}</span>
                            </div>
                        </div>
                        <div class="ml-3 flex items-center gap-1 flex-shrink-0">
                            <div class="confidence-bar w-8 h-1 bg-gray-200 rounded overflow-hidden">
                                <div class="h-full bg-blue-500 rounded transition-all" style="width: ${suggestion.confidence * 100}%"></div>
                            </div>
                            <kbd class="text-xs px-1 bg-gray-100 rounded text-gray-600">Tab</kbd>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (html) {
            this.suggestionBox.innerHTML = html;
            this.suggestionBox.classList.remove('hidden');
            this.currentSuggestions = suggestions;
            this.selectedIndex = -1;
            this.isVisible = true;
            
            // Suggestion tıklama eventi
            this.suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
                item.addEventListener('mousedown', (e) => {
                    e.preventDefault(); // Blur event'ini engelle
                    const index = parseInt(item.dataset.index);
                    this.acceptSuggestion(index);
                });
            });
        } else {
            this.hideSuggestions();
        }
    }
    switchSymbolCategory(category) {
        // Tüm kategori butonlarını pasif yap
        const categoryBtns = this.container.querySelectorAll('.symbol-category-btn');
        categoryBtns.forEach(btn => {
            btn.classList.remove('active', 'bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });
        
        // Seçili kategori butonunu aktif yap
        const activeBtn = this.container.querySelector(`[data-category="${category}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active', 'bg-blue-500', 'text-white');
            activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        }
        
        // Tüm sembol kategorilerini gizle
        const symbolCategories = this.container.querySelectorAll('.symbol-category');
        symbolCategories.forEach(cat => {
            cat.classList.add('hidden');
            cat.classList.remove('active');
        });
        
        // Seçili kategoriyi göster
        const activeCategory = this.container.querySelector(`#symbols-${category}`);
        if (activeCategory) {
            activeCategory.classList.remove('hidden');
            activeCategory.classList.add('active');
        }
        
        // Arama sonuçlarını temizle
        this.clearSymbolSearch();
    }

    // Sembol arama fonksiyonu
    searchSymbols(query) {
        const searchResults = this.container.querySelector('#symbol-search-results');
        if (!searchResults) return;
        
        if (!query.trim()) {
            this.clearSymbolSearch();
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const matchedSymbols = [];
        
        // Sembol isimlerinde arama yap
        Object.entries(this.autocomplete.mathSymbols).forEach(([name, symbol]) => {
            if (name.toLowerCase().includes(lowerQuery) || 
                this.getSymbolDescription(symbol).toLowerCase().includes(lowerQuery)) {
                matchedSymbols.push({ name, symbol });
            }
        });
        
        // Özel arama terimleri
        const specialSearches = {
            'kök': ['√', '∛', '∜'],
            'root': ['√', '∛', '∜'],
            'üs': ['²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'],
            'power': ['²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'],
            'kesir': ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅙', '⅛'],
            'fraction': ['½', '⅓', '⅔', '¼', '¾', '⅕', '⅙', '⅛'],
            'ok': ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔'],
            'arrow': ['→', '←', '↑', '↓', '↔', '⇒', '⇐', '⇔'],
            'eşit': ['=', '≠', '≈', '≡', '≅'],
            'equal': ['=', '≠', '≈', '≡', '≅'],
            'büyük': ['>', '≥', '≫'],
            'greater': ['>', '≥', '≫'],
            'küçük': ['<', '≤', '≪'],
            'less': ['<', '≤', '≪'],
            'toplam': ['∑', '+', '⊕'],
            'sum': ['∑', '+', '⊕'],
            'çarpım': ['∏', '×', '⋅', '⊗'],
            'product': ['∏', '×', '⋅', '⊗'],
            'küme': ['∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅'],
            'set': ['∈', '∉', '⊂', '⊃', '⊆', '⊇', '∪', '∩', '∅'],
            'fonksiyon': ['sin', 'cos', 'tan', 'log', 'ln', 'exp'],
            'function': ['sin', 'cos', 'tan', 'log', 'ln', 'exp']
        };
        
        if (specialSearches[lowerQuery]) {
            specialSearches[lowerQuery].forEach(symbol => {
                if (!matchedSymbols.find(m => m.symbol === symbol)) {
                    matchedSymbols.push({ name: 'özel', symbol });
                }
            });
        }
        
        // Sonuçları göster
        if (matchedSymbols.length > 0) {
            const resultsHTML = matchedSymbols.slice(0, 20).map(match => 
                `<button class="quick-symbol px-2 py-1 text-sm bg-white border border-green-200 rounded hover:bg-green-100 transition-colors" 
                        data-symbol="${match.symbol}" 
                        title="${this.getSymbolDescription(match.symbol)}">${match.symbol}</button>`
            ).join('');
            
            searchResults.innerHTML = resultsHTML;
            searchResults.classList.remove('hidden');
        } else {
            searchResults.innerHTML = '<span class="text-xs text-gray-500 italic">Sonuç bulunamadı</span>';
            searchResults.classList.remove('hidden');
        }
    }
    // Arama sonuçlarını temizle
    clearSymbolSearch() {
        const searchResults = this.container.querySelector('#symbol-search-results');
        if (searchResults) {
            searchResults.classList.add('hidden');
            searchResults.innerHTML = '';
        }
    }

    // Sembol açıklamasını al
    getSymbolDescription(symbol) {
        const descriptions = {
            '∫': 'İntegral',
            '∑': 'Toplam (Sigma)',
            '∏': 'Çarpım (Pi)',
            'π': 'Pi sayısı',
            '√': 'Karekök',
            '∛': 'Küpkök',
            '∜': 'Dördüncü kök',
            '∞': 'Sonsuzluk',
            '±': 'Artı-eksi',
            '∓': 'Eksi-artı',
            '≤': 'Küçük eşit',
            '≥': 'Büyük eşit',
            '≠': 'Eşit değil',
            '≈': 'Yaklaşık eşit',
            '≡': 'Özdeş',
            '∼': 'Benzer',
            '≅': 'Uyumlu',
            '∝': 'Orantılı',
            '≪': 'Çok küçük',
            '≫': 'Çok büyük',
            '∈': 'Elemanıdır',
            '∉': 'Elemanı değildir',
            '⊂': 'Alt kümesi',
            '⊃': 'Üst kümesi',
            '⊆': 'Alt küme veya eşit',
            '⊇': 'Üst küme veya eşit',
            '∪': 'Birleşim',
            '∩': 'Kesişim',
            '∅': 'Boş küme',
            '∁': 'Tümleyen',
            '∧': 'Ve (and)',
            '∨': 'Veya (or)',
            '¬': 'Değil (not)',
            '⇒': 'İse o halde',
            '⇔': 'Ancak ve ancak',
            '∴': 'O halde',
            '∵': 'Çünkü',
            '∃': 'Vardır',
            '∀': 'Hepsi için',
            '→': 'Sağ ok',
            '←': 'Sol ok',
            '↑': 'Yukarı ok',
            '↓': 'Aşağı ok',
            '↔': 'Çift yönlü ok',
            '↕': 'Dikey çift ok',
            'α': 'Alfa',
            'β': 'Beta',
            'γ': 'Gama',
            'δ': 'Delta',
            'ε': 'Epsilon',
            'θ': 'Teta',
            'λ': 'Lambda',
            'μ': 'Mü',
            'σ': 'Sigma',
            'φ': 'Fi',
            'ψ': 'Psi',
            'ω': 'Omega',
            '°': 'Derece',
            '′': 'Prime',
            '″': 'Çift prime',
            '²': 'Kare',
            '³': 'Küp',
            '½': 'Yarım',
            '¼': 'Çeyrek',
            '¾': 'Üçte dört',
            '×': 'Çarpı',
            '÷': 'Bölü',
            '⋅': 'Nokta çarpım',
            '∂': 'Kısmi türev',
            '∇': 'Nabla',
            '∆': 'Delta (Laplacian)',
            '∠': 'Açı',
            '∟': 'Dik açı',
            '△': 'Üçgen',
            '□': 'Kare',
            '○': 'Daire',
            '∥': 'Paralel',
            '⊥': 'Dik',
            '!': 'Faktöriyel',
            'ℂ': 'Karmaşık sayılar',
            'ℝ': 'Gerçek sayılar',
            'ℕ': 'Doğal sayılar',
            'ℤ': 'Tam sayılar',
            'ℚ': 'Rasyonel sayılar'
        };
        
        return descriptions[symbol] || symbol;
    }

    // Gelişmiş sembol ekleme
    insertSymbol(symbol) {
        const cursorPos = this.input.selectionStart;
        const text = this.input.value;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        // Özel sembol işlemleri
        let insertText = symbol;
        let newCursorPos = cursorPos + symbol.length;
        
        // Özel durumlar
        if (symbol === '∫') {
            insertText = '∫ dx';
            newCursorPos = cursorPos + 1; // İntegral sembolünden sonra cursor
        } else if (symbol === '∑') {
            insertText = '∑(n=1 to ∞) ';
            newCursorPos = cursorPos + insertText.length;
        } else if (symbol === '√') {
            insertText = '√()';
            newCursorPos = cursorPos + 2; // Parantez içine cursor
        } else if (symbol === 'lim') {
            insertText = 'lim(x→) ';
            newCursorPos = cursorPos + 7; // Ok sonrasına cursor
        } else if (symbol === 'd/dx') {
            insertText = 'd/dx()';
            newCursorPos = cursorPos + 5; // Parantez içine cursor
        } else if (['sin', 'cos', 'tan', 'ln', 'log'].includes(symbol)) {
            insertText = symbol + '()';
            newCursorPos = cursorPos + symbol.length + 1; // Parantez içine cursor
        }
        
        const newText = beforeCursor + insertText + afterCursor;
        this.input.value = newText;
        
        // Cursor'u doğru pozisyona koy
        this.input.setSelectionRange(newCursorPos, newCursorPos);
        this.input.focus();
        
        // Görsel feedback
        this.showSymbolInsertedEffect(symbol);
        
        // Input event'ini tetikle
        setTimeout(() => {
            this.handleInput(newText, newCursorPos);
        }, 50);
    }

    // Sembol eklendiğinde görsel feedback
    showSymbolInsertedEffect(symbol) {
        const effect = document.createElement('div');
        effect.className = 'absolute top-0 right-0 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-bl-lg border border-green-200 z-50';
        effect.innerHTML = `✓ ${symbol} eklendi`;
        effect.style.animation = 'slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 1.7s forwards';
        
        this.container.style.position = 'relative';
        this.container.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
    
    hideSuggestions() {
        if (this.suggestionBox) {
            this.suggestionBox.classList.add('hidden');
            this.isVisible = false;
            this.currentSuggestions = [];
            this.selectedIndex = -1;
        }
    }
    
    handleKeydown(e) {
        if (!this.isVisible) {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                this.handleInput(this.input.value, this.input.selectionStart);
            }
            return;
        }
        
        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.acceptSuggestion(this.selectedIndex);
                } else if (this.currentSuggestions.length > 0) {
                    this.acceptSuggestion(0);
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, this.currentSuggestions.length - 1);
                this.updateSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection();
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSuggestions();
                this.input.focus();
                break;
                
            case 'Enter':
                if (this.isVisible && this.selectedIndex >= 0) {
                    e.preventDefault();
                    this.acceptSuggestion(this.selectedIndex);
                }
                break;
        }
    }
    
    updateSelection() {
        const items = this.suggestionBox.querySelectorAll('.suggestion-item');
        items.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('bg-blue-100', 'border-blue-300');
                item.classList.remove('bg-blue-50');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('bg-blue-100', 'border-blue-300');
            }
        });
    }
    
    acceptSuggestion(index) {
        const suggestion = this.currentSuggestions[index];
        if (!suggestion) return;
        
        // Mevcut satırı suggestion ile değiştir
        const cursorPos = this.input.selectionStart;
        const text = this.input.value;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        // Mevcut satırın başlangıç pozisyonunu bul
        const lineStart = beforeCursor.lastIndexOf('\n') + 1;
        const currentLine = beforeCursor.substring(lineStart);
        
        // Yeni metin oluştur
        const newText = text.substring(0, lineStart) + suggestion.text + afterCursor;
        
        this.input.value = newText;
        
        // Cursor'u suggestion'ın sonuna konumlandır
        const newCursorPos = lineStart + suggestion.text.length;
        this.input.setSelectionRange(newCursorPos, newCursorPos);
        
        this.hideSuggestions();
        this.input.focus();
        
        // Başarı efekti
        this.showAcceptedEffect(suggestion);
    }
    
    insertSymbol(symbol) {
        const cursorPos = this.input.selectionStart;
        const text = this.input.value;
        const beforeCursor = text.substring(0, cursorPos);
        const afterCursor = text.substring(cursorPos);
        
        const newText = beforeCursor + symbol + afterCursor;
        this.input.value = newText;
        
        // Cursor'u sembolün sonuna konumlandır
        const newCursorPos = cursorPos + symbol.length;
        this.input.setSelectionRange(newCursorPos, newCursorPos);
        
        this.input.focus();
        
        // Input event'ini tetikle
        this.handleInput(newText, newCursorPos);
    }
    
    showAcceptedEffect(suggestion) {
        const effect = document.createElement('div');
        effect.className = 'absolute top-0 right-0 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-bl-lg border border-green-200 z-50';
        effect.innerHTML = `✓ ${suggestion.category} eklendi`;
        effect.style.animation = 'fadeInOut 2s ease-in-out';
        
        this.container.style.position = 'relative';
        this.container.appendChild(effect);
        
        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
    initializeFallback() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="fallback-math-input">
                    <textarea 
                        id="fallback-math-input" 
                        class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        placeholder="Matematik çözümünüzü buraya yazın..."
                    ></textarea>
                    <div class="mt-2 text-xs text-orange-600">
                        ⚠️ Akıllı matematik önerileri geçici olarak kullanılamıyor. Normal text input kullanılıyor.
                    </div>
                </div>
            `;
            
            this.input = this.container.querySelector('#fallback-math-input');
        }
    }
    getValue() {
        try {
            if (this.input) {
                return this.input.value || '';
            }
            return '';
        } catch (error) {
            console.error('getValue error:', error);
            return '';
        }
    }
    
    setValue(value) {
        try {
            if (this.input) {
                this.input.value = value || '';
            }
        } catch (error) {
            console.error('setValue error:', error);
        }
    }
    
    focus() {
        if (this.input) {
            this.input.focus();
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}