// Data Management Module
const DataManager = {
    // Save data to localStorage
    save: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            ERROR_HANDLER.handle(error, 'DataManager.save');
            return false;
        }
    },
    
    // Load data from localStorage
    load: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            ERROR_HANDLER.handle(error, 'DataManager.load');
            return defaultValue;
        }
    },
    
    // Save all application data
    saveAll: () => {
        const saveOperations = [
            { key: CONFIG.STORAGE_KEYS.TRANSACTIONS, data: STATE.transactions },
            { key: CONFIG.STORAGE_KEYS.CATEGORIES, data: STATE.categories },
            { key: CONFIG.STORAGE_KEYS.LEARNED_CATEGORIES, data: STATE.learnedCategories },
            { key: CONFIG.STORAGE_KEYS.CUSTOM_COLORS, data: STATE.customColors },
            { key: CONFIG.STORAGE_KEYS.MONTHLY_GOALS, data: STATE.monthlyGoals },
            { key: CONFIG.STORAGE_KEYS.THEME, data: STATE.currentTheme },
            { key: CONFIG.STORAGE_KEYS.AI_HISTORY, data: STATE.aiHistory },
            { key: CONFIG.STORAGE_KEYS.SETTINGS, data: STATE.settings }
        ];
        
        let successCount = 0;
        saveOperations.forEach(operation => {
            if (DataManager.save(operation.key, operation.data)) {
                successCount++;
            }
        });
        
        return successCount === saveOperations.length;
    },
    
    // Load all application data
    loadAll: () => {
        STATE.transactions = DataManager.load(CONFIG.STORAGE_KEYS.TRANSACTIONS, []);
        STATE.categories = DataManager.load(CONFIG.STORAGE_KEYS.CATEGORIES, {});
        STATE.learnedCategories = DataManager.load(CONFIG.STORAGE_KEYS.LEARNED_CATEGORIES, {});
        STATE.customColors = DataManager.load(CONFIG.STORAGE_KEYS.CUSTOM_COLORS, {});
        STATE.monthlyGoals = DataManager.load(CONFIG.STORAGE_KEYS.MONTHLY_GOALS, {
            goal: 0,
            dueDate: 15,
            bestBuyDate: 20,
            alertPercentage: 80
        });
        STATE.currentTheme = DataManager.load(CONFIG.STORAGE_KEYS.THEME, 'light');
        STATE.aiHistory = DataManager.load(CONFIG.STORAGE_KEYS.AI_HISTORY, []);
        STATE.settings = DataManager.load(CONFIG.STORAGE_KEYS.SETTINGS, {
            autoDetectDuplicates: true,
            smartCategorization: true,
            voiceEnabled: true,
            notifications: true
        });
        
        // Initialize categories if empty
        if (Object.keys(STATE.categories).length === 0) {
            initializeCategories();
        }
        
        eventEmitter.emit('dataLoaded');
    },
    
    // Export data for backup
    exportData: () => {
        const exportData = {
            transactions: STATE.transactions,
            categories: STATE.categories,
            learnedCategories: STATE.learnedCategories,
            customColors: STATE.customColors,
            monthlyGoals: STATE.monthlyGoals,
            settings: STATE.settings,
            exportDate: new Date().toISOString(),
            version: CONFIG.APP_VERSION
        };
        
        return exportData;
    },
    
    // Import data from backup
    importData: (data) => {
        try {
            // Validate data structure
            if (!data || typeof data !== 'object') {
                throw new Error('Dados inválidos');
            }
            
            // Backup current data
            const backup = DataManager.exportData();
            
            // Import data
            if (data.transactions) STATE.transactions = data.transactions;
            if (data.categories) STATE.categories = data.categories;
            if (data.learnedCategories) STATE.learnedCategories = data.learnedCategories;
            if (data.customColors) STATE.customColors = data.customColors;
            if (data.monthlyGoals) STATE.monthlyGoals = data.monthlyGoals;
            if (data.settings) STATE.settings = data.settings;
            
            // Save imported data
            if (DataManager.saveAll()) {
                showToast('Dados importados com sucesso!', 'success');
                eventEmitter.emit('dataImported');
                return true;
            } else {
                throw new Error('Falha ao salvar dados importados');
            }
        } catch (error) {
            ERROR_HANDLER.handle(error, 'DataManager.importData');
            showToast('Erro ao importar dados', 'error');
            return false;
        }
    },
    
    // Clear all data
    clearAll: () => {
        if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
            Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            
            // Reset state
            STATE.transactions = [];
            STATE.categories = {};
            STATE.learnedCategories = {};
            STATE.customColors = {};
            STATE.monthlyGoals = {
                goal: 0,
                dueDate: 15,
                bestBuyDate: 20,
                alertPercentage: 80
            };
            STATE.currentTheme = 'light';
            STATE.aiHistory = [];
            STATE.settings = {
                autoDetectDuplicates: true,
                smartCategorization: true,
                voiceEnabled: true,
                notifications: true
            };
            
            initializeCategories();
            
            showToast('Todos os dados foram limpos', 'success');
            eventEmitter.emit('dataCleared');
            
            // Refresh UI
            location.reload();
        }
    }
};

// Advanced Transaction Management
const TransactionManager = {
    // Add new transaction
    add: (transaction) => {
        try {
            // Validate transaction
            if (!TransactionManager.validate(transaction)) {
                throw new Error('Dados da transação inválidos');
            }
            
            // Generate ID if not present
            if (!transaction.id) {
                transaction.id = UTILS.generateId();
            }
            
            // Add timestamps
            transaction.createdAt = new Date().toISOString();
            transaction.updatedAt = new Date().toISOString();
            
            // Apply smart categorization
            if (STATE.settings.smartCategorization) {
                transaction = SmartCategorizer.categorize(transaction);
            }
            
            // Check for duplicates
            if (STATE.settings.autoDetectDuplicates) {
                const duplicate = TransactionManager.findDuplicate(transaction);
                if (duplicate) {
                    transaction.isPossibleDuplicate = true;
                    transaction.duplicateOf = duplicate.id;
                }
            }
            
            STATE.transactions.push(transaction);
            DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
            
            eventEmitter.emit('transactionAdded', transaction);
            return transaction;
        } catch (error) {
            ERROR_HANDLER.handle(error, 'TransactionManager.add');
            return null;
        }
    },
    
    // Update existing transaction
    update: (id, updates) => {
        try {
            const index = STATE.transactions.findIndex(t => t.id === id);
            if (index === -1) {
                throw new Error('Transação não encontrada');
            }
            
            // Update transaction
            STATE.transactions[index] = {
                ...STATE.transactions[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
            
            eventEmitter.emit('transactionUpdated', STATE.transactions[index]);
            return STATE.transactions[index];
        } catch (error) {
            ERROR_HANDLER.handle(error, 'TransactionManager.update');
            return null;
        }
    },
    
    // Delete transaction
    delete: (id) => {
        try {
            const index = STATE.transactions.findIndex(t => t.id === id);
            if (index === -1) {
                throw new Error('Transação não encontrada');
            }
            
            const deletedTransaction = STATE.transactions.splice(index, 1)[0];
            DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
            
            eventEmitter.emit('transactionDeleted', deletedTransaction);
            return true;
        } catch (error) {
            ERROR_HANDLER.handle(error, 'TransactionManager.delete');
            return false;
        }
    },
    
    // Find transactions by criteria
    find: (criteria) => {
        return STATE.transactions.filter(transaction => {
            return Object.entries(criteria).every(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.includes(transaction[key]);
                }
                return transaction[key] === value;
            });
        });
    },
    
    // Find duplicate transactions
    findDuplicate: (transaction) => {
        const threshold = 5 * 60 * 1000; // 5 minutes
        
        return STATE.transactions.find(existing => {
            if (existing.id === transaction.id) return false;
            
            const sameName = existing.name.toLowerCase().trim() === transaction.name.toLowerCase().trim();
            const sameAmount = Math.abs(existing.amount - transaction.amount) < 0.01;
            const sameDate = Math.abs(new Date(existing.date) - new Date(transaction.date)) < threshold;
            
            return sameName && sameAmount && sameDate;
        });
    },
    
    // Validate transaction data
    validate: (transaction) => {
        const requiredFields = ['name', 'amount', 'date'];
        
        for (const field of requiredFields) {
            if (!transaction[field]) {
                showToast(`Campo obrigatório: ${field}`, 'error');
                return false;
            }
        }
        
        if (!UTILS.validateAmount(transaction.amount)) {
            showToast('Valor inválido', 'error');
            return false;
        }
        
        if (!UTILS.validateDate(transaction.date)) {
            showToast('Data inválida', 'error');
            return false;
        }
        
        return true;
    },
    
    // Get transactions by date range
    getByDateRange: (startDate, endDate) => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        return STATE.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate >= start && transactionDate <= end;
        });
    },
    
    // Get monthly transactions
    getMonthlyTransactions: (year, month) => {
        return STATE.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getFullYear() === year && transactionDate.getMonth() === month;
        });
    },
    
    // Get transaction statistics
    getStatistics: () => {
        const total = STATE.transactions.reduce((sum, t) => sum + t.amount, 0);
        const count = STATE.transactions.length;
        const average = count > 0 ? total / count : 0;
        
        const categoryTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.category) {
                categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
            }
        });
        
        const largestExpense = count > 0 ? Math.max(...STATE.transactions.map(t => t.amount)) : 0;
        const smallestExpense = count > 0 ? Math.min(...STATE.transactions.map(t => t.amount)) : 0;
        
        return {
            total,
            count,
            average,
            categoryTotals,
            largestExpense,
            smallestExpense
        };
    }
};

// Smart Categorization System
const SmartCategorizer = {
    // Categorize transaction based on patterns
    categorize: (transaction) => {
        const name = transaction.name.toLowerCase();
        
        // Check learned categories first
        if (STATE.learnedCategories[name]) {
            transaction.category = STATE.learnedCategories[name].category;
            transaction.subcategory = STATE.learnedCategories[name].subcategory;
            return transaction;
        }
        
        // Check predefined patterns
        for (const [category, data] of Object.entries(CONFIG.DEFAULT_CATEGORIES)) {
            if (data.patterns) {
                for (const pattern of data.patterns) {
                    if (name.includes(pattern)) {
                        transaction.category = category;
                        // Try to find a suitable subcategory
                        const subcategory = SmartCategorizer.findSubcategory(name, data.subcategories);
                        if (subcategory) {
                            transaction.subcategory = subcategory;
                        }
                        return transaction;
                    }
                }
            }
        }
        
        return transaction;
    },
    
    // Find appropriate subcategory
    findSubcategory: (name, subcategories) => {
        for (const sub of subcategories) {
            if (name.includes(sub.toLowerCase())) {
                return sub;
            }
        }
        return null;
    },
    
    // Learn from user categorization
    learn: (transactionName, category, subcategory) => {
        const key = transactionName.toLowerCase().trim();
        STATE.learnedCategories[key] = {
            category,
            subcategory: subcategory || '',
            learnedAt: new Date().toISOString()
        };
        
        DataManager.save(CONFIG.STORAGE_KEYS.LEARNED_CATEGORIES, STATE.learnedCategories);
        
        // Apply to existing transactions
        STATE.transactions.forEach(transaction => {
            if (transaction.name.toLowerCase().trim() === key) {
                transaction.category = category;
                transaction.subcategory = subcategory || '';
            }
        });
        
        DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
        
        showToast('IA aprendeu nova categorização!', 'success');
        eventEmitter.emit('categoryLearned', { transactionName, category, subcategory });
    }
};

// Auto-save functionality
let autoSaveInterval;
const startAutoSave = () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(() => {
        DataManager.saveAll();
    }, 30000); // Save every 30 seconds
};

const stopAutoSave = () => {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
};

// Initialize data management
document.addEventListener('DOMContentLoaded', () => {
    DataManager.loadAll();
    startAutoSave();
});

// Save data before page unload
window.addEventListener('beforeunload', () => {
    DataManager.saveAll();
    stopAutoSave();
});