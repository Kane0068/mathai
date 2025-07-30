// =================================================================================
//  Problem Solver Service - Handles math problem solving logic
// =================================================================================

import { config } from '../core/config.js';

export class ProblemSolverService {
    constructor(apiService, stateManager, uiService) {
        this.apiService = apiService;
        this.stateManager = stateManager;
        this.uiService = uiService;
        this.masterSolutionPrompt = this.buildMasterPrompt();
    }
    
    async solveProblem(inputType, inputData) {
        try {
            this.stateManager.setLoading(true, 'Problem çözülüyor...');
            
            let prompt, image = null;
            
            switch (inputType) {
                case 'photo':
                    prompt = this.masterSolutionPrompt;
                    image = inputData;
                    break;
                    
                case 'handwriting':
                    prompt = this.buildHandwritingPrompt(inputData);
                    break;
                    
                case 'text':
                    prompt = this.buildTextPrompt(inputData);
                    break;
                    
                default:
                    throw new Error(`Unsupported input type: ${inputType}`);
            }
            
            // Show animated loading steps
            const loadingSteps = this.getLoadingSteps(inputType);
            this.uiService.showAnimatedLoading(loadingSteps);
            
            const response = await this.apiService.makeApiCall(prompt, image);
            const solutionData = this.parseSolutionResponse(response);
            
            // Validate solution structure
            this.validateSolution(solutionData);
            
            // Store solution in state
            this.stateManager.setSolution(solutionData);
            this.stateManager.setLoading(false);
            
            return solutionData;
            
        } catch (error) {
            this.stateManager.setLoading(false);
            this.stateManager.setError(error.message);
            throw error;
        }
    }
    
    buildMasterPrompt() {
        return `Solve the math problem and respond in the following JSON format.

CRITICAL: ALL RESPONSES MUST BE IN TURKISH LANGUAGE. Mathematical expressions must follow the exact LaTeX format compatible with MathJax v3 and KaTeX renderer.

INTELLIGENT STEP CREATION RULES:
- Analyze the problem complexity and create appropriate number of steps
- Simple concept questions (like "which is irrational?"): 1-2 steps maximum
- Multiple choice questions: Focus on the logical reasoning, not checking each option separately
- Calculation problems: Break into natural mathematical steps
- Complex proofs: More detailed steps are acceptable

ROADMAP CONTENT RULES FOR adimAciklamasi AND ipucu:
- ABSOLUTELY NO LaTeX expressions in adimAciklamasi and ipucu fields
- Use ONLY verbal explanations in Turkish
- Be brief and direct about what to think or do
- Focus on the thinking process, not showing calculations
- Example GOOD: "Hangi sayının rasyonel olmadığını belirlemek için kök altındaki sayıları incele"
- Example BAD: "√2 ifadesini kontrol et" (no LaTeX symbols)

JSON SCHEMA:
{
  "problemOzeti": {
    "verilenler": [
      "Turkish explanation text with math: $LaTeX_inline$",
      "Another data in Turkish: $\\\\frac{a}{b} = 5$"
    ],
    "istenen": "What is requested in Turkish: $\\\\sqrt{x^2 + y^2}$"
  },
  "adimlar": [
    {
      "adimAciklamasi": "PURE VERBAL Turkish explanation - NO MATH SYMBOLS OR LaTeX",
      "cozum_lateks": "$$pure_latex_expression$$",
      "ipucu": "PURE VERBAL Turkish helpful hint - NO MATH SYMBOLS OR LaTeX", 
      "yanlisSecenekler": [
        {
          "metin": "$$wrong_latex_expression$$",
          "yanlisGeriBildirimi": "Turkish explanation why it's wrong with math: $LaTeX_inline$"
        }
      ]
    }
  ],
  "tamCozumLateks": [
    "$$step_1_pure_latex$$",
    "$$step_2_pure_latex$$", 
    "$$final_answer_pure_latex$$"
  ]
}

STEP EXAMPLES BY PROBLEM TYPE:

For "Which number is irrational?" type questions:
- Step 1: "Rasyonel ve irrasyonel sayıları ayırt etme kurallarını hatırla"
- Step 2: "Verilen seçenekleri tek tek incele ve hangisinin kesir şeklinde yazılamayacağını belirle"

For calculation problems:
- Step 1: "Verilen değerleri formülde yerine koy"
- Step 2: "İşlem sırasını takip ederek hesapla"
- Step 3: "Sonucu kontrol et"

For geometry problems:
- Step 1: "Şeklin özelliklerini belirle"
- Step 2: "Uygun formülü seç"
- Step 3: "Hesaplamaları yap"

IMPORTANT: Keep adimAciklamasi and ipucu fields completely free of mathematical symbols, fractions, square roots, or any LaTeX. Use only descriptive Turkish words.`;
    }
    
    buildHandwritingPrompt(canvasData) {
        return `${this.masterSolutionPrompt}

Bu el yazısı matematik problemi çöz. Canvas verisi: ${JSON.stringify(canvasData)}`;
    }
    
    buildTextPrompt(textData) {
        return `${this.masterSolutionPrompt}

Bu matematik problemini çöz: "${textData}"`;
    }
    
    getLoadingSteps(inputType) {
        const baseSteps = [
            {
                title: "Problem Analiz Ediliyor",
                description: "Matematik problemi inceleniyor..."
            },
            {
                title: "Çözüm Stratejisi Belirleniyor",
                description: "En uygun çözüm yöntemi seçiliyor..."
            },
            {
                title: "Adım Adım Çözüm Hazırlanıyor",
                description: "Detaylı çözüm adımları oluşturuluyor..."
            }
        ];
        
        if (inputType === 'photo') {
            baseSteps.unshift({
                title: "Görsel İşleniyor",
                description: "Fotoğraftaki matematik problemi okunuyor..."
            });
        } else if (inputType === 'handwriting') {
            baseSteps.unshift({
                title: "El Yazısı Tanınıyor",
                description: "Çizilen matematik ifadesi analiz ediliyor..."
            });
        }
        
        return baseSteps;
    }
    
    parseSolutionResponse(response) {
        try {
            // Clean the response
            let cleanResponse = response.trim();
            
            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\s*|\s*```/g, '');
            
            // Parse JSON
            const solutionData = JSON.parse(cleanResponse);
            
            return solutionData;
            
        } catch (error) {
            console.error('Failed to parse solution response:', error);
            throw new Error('Çözüm formatı geçersiz. Lütfen tekrar deneyin.');
        }
    }
    
    validateSolution(solutionData) {
        const required = ['problemOzeti', 'adimlar', 'tamCozumLateks'];
        const missing = required.filter(field => !solutionData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Çözümde eksik alanlar: ${missing.join(', ')}`);
        }
        
        if (!Array.isArray(solutionData.adimlar) || solutionData.adimlar.length === 0) {
            throw new Error('Çözüm adımları geçersiz');
        }
        
        if (!Array.isArray(solutionData.tamCozumLateks) || solutionData.tamCozumLateks.length === 0) {
            throw new Error('Tam çözüm LaTeX ifadeleri eksik');
        }
        
        // Validate each step
        solutionData.adimlar.forEach((step, index) => {
            const stepRequired = ['adimAciklamasi', 'cozum_lateks'];
            const stepMissing = stepRequired.filter(field => !step[field]);
            
            if (stepMissing.length > 0) {
                throw new Error(`Adım ${index + 1}'de eksik alanlar: ${stepMissing.join(', ')}`);
            }
        });
        
        console.log('✅ Solution validation passed');
    }
    
    // Utility methods
    getCurrentSolution() {
        return this.stateManager.getStateValue('problem')?.solution;
    }
    
    hasSolution() {
        return !!this.getCurrentSolution();
    }
    
    clearSolution() {
        this.stateManager.setSolution(null);
    }
    
    // Export solution for sharing/saving
    exportSolution(format = 'json') {
        const solution = this.getCurrentSolution();
        
        if (!solution) {
            throw new Error('No solution to export');
        }
        
        switch (format) {
            case 'json':
                return JSON.stringify(solution, null, 2);
                
            case 'latex':
                return solution.tamCozumLateks.join('\n\n');
                
            case 'text':
                return this.solutionToText(solution);
                
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    
    solutionToText(solution) {
        let text = 'PROBLEM ÖZETİ:\n';
        
        if (solution.problemOzeti.verilenler) {
            text += 'Verilenler:\n';
            solution.problemOzeti.verilenler.forEach((item, i) => {
                text += `${i + 1}. ${item}\n`;
            });
        }
        
        if (solution.problemOzeti.istenen) {
            text += `İstenen: ${solution.problemOzeti.istenen}\n\n`;
        }
        
        text += 'ÇÖZÜM ADIMLARI:\n';
        solution.adimlar.forEach((step, i) => {
            text += `Adım ${i + 1}: ${step.adimAciklamasi}\n`;
            text += `Çözüm: ${step.cozum_lateks}\n`;
            if (step.ipucu) {
                text += `İpucu: ${step.ipucu}\n`;
            }
            text += '\n';
        });
        
        return text;
    }
}