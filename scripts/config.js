// Configuration and Constants
const CONFIG = {
    // API Configuration - Gemini
    GEMINI_API_KEY: 'AIzaSyCepAHJntXFzOmCO_yKRT0TMh4ZAIIeAe4',
    GEMINI_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    
    // Application Settings
    APP_NAME: 'Konomiza',
    APP_VERSION: '2.1.0',
    MAX_TRANSACTIONS_DISPLAY: 50,
    MAX_AI_HISTORY: 20,
    
    // Default Categories with Smart Patterns
    DEFAULT_CATEGORIES: {
        'Alimentação': {
            subcategories: ['Restaurante', 'Supermercado', 'Delivery', 'Padaria', 'Lanchonete'],
            patterns: ['restaurante', 'supermercado', 'delivery', 'ifood', 'padaria', 'lanchonete', 'bar', 'cafe', 'pizzaria', 'hamburgueria', 'sorveteria', 'açougue', 'hortifruti', 'empório']
        },
        'Transporte': {
            subcategories: ['Combustível', 'Uber', 'Transporte Público', 'Estacionamento', 'Pedágio'],
            patterns: ['posto', 'combustivel', 'gasolina', 'alcool', 'uber', 'taxi', 'onibus', 'metro', 'estacionamento', 'pedagio', 'shell', 'petrobras', 'ipiranga']
        },
        'Lazer': {
            subcategories: ['Cinema', 'Entretenimento', 'Esportes', 'Viagem', 'Livros'],
            patterns: ['cinema', 'teatro', 'show', 'festa', 'viagem', 'hotel', 'pousada', 'livro', 'livraria', 'jogo', 'parque', 'museu', 'netflix', 'spotify', 'amazon prime', 'bar', 'balada', 'clube']
        },
        'Compras': {
            subcategories: ['Roupas', 'Eletrônicos', 'Casa', 'Presentes', 'Farmácia'],
            patterns: ['loja', 'magazine', 'shopping', 'roupa', 'sapato', 'eletronicos', 'farmacia', 'drogaria', 'presente', 'casa', 'decoracao', 'mercado livre', 'amazon', 'americanas']
        },
        'Serviços': {
            subcategories: ['Internet', 'Telefone', 'Assinaturas', 'Bancários', 'Profissionais'],
            patterns: ['internet', 'telefone', 'celular', 'assinatura', 'banco', 'tarifa', 'anuidade', 'advogado', 'medico', 'dentista', 'seguro', 'plano', 'contabilidade']
        },
        'Saúde': {
            subcategories: ['Médico', 'Farmácia', 'Exames', 'Plano de Saúde', 'Academia'],
            patterns: ['medico', 'hospital', 'clinica', 'farmacia', 'drogaria', 'exame', 'laboratorio', 'plano', 'saude', 'academia', 'fisioterapia', 'psicologia']
        },
        'Beleza': {
            subcategories: ['Barbearia', 'Salão', 'Cosméticos', 'Perfumaria'],
            patterns: ['barbearia', 'salao', 'cabelo', 'nail', 'estetica', 'cosmetico', 'perfume', 'maquiagem', 'spa']
        }
    },
    
    // Chart Colors
    CHART_COLORS: [
        '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
        '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
        '#14b8a6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'
    ],
    
    // Animation Settings
    ANIMATION_DURATION: 300,
    LOADING_TIMEOUT: 2000,
    
    // Local Storage Keys
    STORAGE_KEYS: {
        TRANSACTIONS: 'konomiza-transactions',
        CATEGORIES: 'konomiza-categories',
        LEARNED_CATEGORIES: 'konomiza-learned-categories',
        CUSTOM_COLORS: 'konomiza-custom-colors',
        MONTHLY_GOALS: 'konomiza-monthly-goals',
        THEME: 'konomiza-theme',
        AI_HISTORY: 'konomiza-ai-history',
        SETTINGS: 'konomiza-settings'
    },
    
    // Validation Rules
    VALIDATION: {
        MIN_AMOUNT: 0.01,
        MAX_AMOUNT: 999999.99,
        MIN_GOAL: 1,
        MAX_GOAL: 9999999,
        MIN_DAY: 1,
        MAX_DAY: 31,
        MIN_PERCENTAGE: 0,
        MAX_PERCENTAGE: 100
    }
};

// Global State Management
const STATE = {
    currentTheme: 'light',
    transactions: [],
    categories: {},
    learnedCategories: {},
    customColors: {},
    monthlyGoals: {
        goal: 0,
        dueDate: 15,
        bestBuyDate: 20,
        alertPercentage: 80
    },
    searchPopupOpen: false,
    mobileMenuOpen: false,
    directoryHandle: null,
    isLoading: false,
    aiHistory: [],
    settings: {
        autoDetectDuplicates: true,
        smartCategorization: true,
        voiceEnabled: true,
        notifications: true
    }
};

// Utility Functions
const UTILS = {
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(amount);
    },
    
    formatDate: (date) => {
        return new Date(date).toLocaleDateString('pt-BR');
    },
    
    formatDateTime: (date) => {
        return new Date(date).toLocaleString('pt-BR');
    },
    
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    sanitizeInput: (input) => {
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    },
    
    validateAmount: (amount) => {
        const num = parseFloat(amount);
        return !isNaN(num) && num >= CONFIG.VALIDATION.MIN_AMOUNT && num <= CONFIG.VALIDATION.MAX_AMOUNT;
    },
    
    validateDate: (date) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d);
    },
    
    isMobileDevice: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    isOnline: () => {
        return navigator.onLine;
    }
};

// Event Emitter for Custom Events
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }
    
    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// Global Event Emitter Instance
const eventEmitter = new EventEmitter();

// Error Handling
const ERROR_HANDLER = {
    handle: (error, context = 'Unknown') => {
        console.error(`[${context}] Error:`, error);
        
        // Show user-friendly error message
        showToast(`Erro em ${context}: ${error.message || 'Erro desconhecido'}`, 'error');
        
        // Log to analytics if available
        if (window.gtag) {
            window.gtag('event', 'exception', {
                description: error.message || 'Unknown error',
                fatal: false
            });
        }
    },
    
    handleAsync: async (asyncFunction, context = 'Unknown') => {
        try {
            return await asyncFunction();
        } catch (error) {
            ERROR_HANDLER.handle(error, context);
            return null;
        }
    }
};

// Toast Notification System
function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add toast styles if not already present
    if (!document.querySelector('#toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                color: white;
                font-weight: 500;
                z-index: 10000;
                animation: slideInRight 0.3s ease;
            }
            .toast-info { background: var(--info-color); }
            .toast-success { background: var(--success-color); }
            .toast-warning { background: var(--warning-color); }
            .toast-error { background: var(--danger-color); }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Initialize categories with default values
function initializeCategories() {
    STATE.categories = { ...CONFIG.DEFAULT_CATEGORIES };
    
    // Convert patterns to simple arrays for compatibility
    Object.keys(STATE.categories).forEach(category => {
        STATE.categories[category] = STATE.categories[category].subcategories || [];
    });
}

// Export for global access
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, STATE, UTILS, EventEmitter, ERROR_HANDLER };
}