// Duplicate Detection and Management Module
const DuplicateManager = {
    // Find all potential duplicates
    findAllDuplicates: () => {
        const duplicateGroups = [];
        const processedIds = new Set();
        
        STATE.transactions.forEach(transaction => {
            if (processedIds.has(transaction.id)) return;
            
            const similarTransactions = DuplicateManager.findSimilarTransactions(transaction);
            
            if (similarTransactions.length > 0) {
                duplicateGroups.push({
                    original: transaction,
                    duplicates: similarTransactions,
                    confidence: DuplicateManager.calculateConfidence(transaction, similarTransactions)
                });
                
                // Mark all as processed
                processedIds.add(transaction.id);
                similarTransactions.forEach(t => processedIds.add(t.id));
            }
        });
        
        return duplicateGroups.sort((a, b) => b.confidence - a.confidence);
    },
    
    // Find similar transactions to a given transaction
    findSimilarTransactions: (targetTransaction) => {
        const timeThreshold = 5 * 60 * 1000; // 5 minutes
        const amountThreshold = 0.01; // 1 cent
        
        return STATE.transactions.filter(transaction => {
            if (transaction.id === targetTransaction.id) return false;
            
            // Name similarity (exact match for now, could be improved with fuzzy matching)
            const nameMatch = transaction.name.toLowerCase().trim() === targetTransaction.name.toLowerCase().trim();
            
            // Amount similarity
            const amountMatch = Math.abs(transaction.amount - targetTransaction.amount) <= amountThreshold;
            
            // Time similarity
            const timeDiff = Math.abs(new Date(transaction.date) - new Date(targetTransaction.date));
            const timeMatch = timeDiff <= timeThreshold;
            
            // Method similarity (optional)
            const methodMatch = !transaction.method || !targetTransaction.method || 
                               transaction.method === targetTransaction.method;
            
            return nameMatch && amountMatch && timeMatch && methodMatch;
        });
    },
    
    // Calculate confidence score for duplicate detection
    calculateConfidence: (original, duplicates) => {
        let confidence = 0;
        
        duplicates.forEach(duplicate => {
            let score = 0;
            
            // Exact name match
            if (original.name.toLowerCase().trim() === duplicate.name.toLowerCase().trim()) {
                score += 40;
            }
            
            // Exact amount match
            if (Math.abs(original.amount - duplicate.amount) < 0.01) {
                score += 30;
            }
            
            // Time proximity (closer = higher score)
            const timeDiff = Math.abs(new Date(original.date) - new Date(duplicate.date));
            if (timeDiff < 60 * 1000) { // Less than 1 minute
                score += 20;
            } else if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes
                score += 15;
            } else if (timeDiff < 60 * 60 * 1000) { // Less than 1 hour
                score += 10;
            }
            
            // Same payment method
            if (original.method && duplicate.method && original.method === duplicate.method) {
                score += 10;
            }
            
            confidence = Math.max(confidence, score);
        });
        
        return confidence;
    },
    
    // Mark transaction as duplicate
    markAsDuplicate: (transactionId, originalId) => {
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (transaction) {
            transaction.isDuplicate = true;
            transaction.duplicateOf = originalId;
            transaction.duplicateMarkedAt = new Date().toISOString();
            
            DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
            eventEmitter.emit('transactionMarkedAsDuplicate', { transactionId, originalId });
        }
    },
    
    // Unmark transaction as duplicate
    unmarkAsDuplicate: (transactionId) => {
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (transaction) {
            delete transaction.isDuplicate;
            delete transaction.duplicateOf;
            delete transaction.duplicateMarkedAt;
            
            DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
            eventEmitter.emit('transactionUnmarkedAsDuplicate', { transactionId });
        }
    },
    
    // Remove duplicate transaction
    removeDuplicate: (transactionId) => {
        if (TransactionManager.delete(transactionId)) {
            showToast('Duplicata removida com sucesso!', 'success');
            eventEmitter.emit('duplicateRemoved', { transactionId });
            return true;
        }
        return false;
    },
    
    // Auto-resolve duplicates based on rules
    autoResolveDuplicates: (rules = {}) => {
        const defaultRules = {
            keepNewest: true, // Keep the newest transaction
            removeExact: true, // Remove exact duplicates automatically
            minConfidence: 80 // Minimum confidence to auto-remove
        };
        
        const resolveRules = { ...defaultRules, ...rules };
        const duplicateGroups = DuplicateManager.findAllDuplicates();
        let resolvedCount = 0;
        
        duplicateGroups.forEach(group => {
            if (group.confidence >= resolveRules.minConfidence) {
                if (resolveRules.removeExact) {
                    // Remove exact duplicates
                    group.duplicates.forEach(duplicate => {
                        if (DuplicateManager.isExactDuplicate(group.original, duplicate)) {
                            if (resolveRules.keepNewest) {
                                // Keep the newer transaction
                                const originalDate = new Date(group.original.date);
                                const duplicateDate = new Date(duplicate.date);
                                
                                if (duplicateDate < originalDate) {
                                    DuplicateManager.removeDuplicate(duplicate.id);
                                    resolvedCount++;
                                }
                            } else {
                                // Remove duplicate (keep original)
                                DuplicateManager.removeDuplicate(duplicate.id);
                                resolvedCount++;
                            }
                        }
                    });
                }
            }
        });
        
        if (resolvedCount > 0) {
            showToast(`${resolvedCount} duplicatas resolvidas automaticamente!`, 'success');
            updateHomeStats();
            updateGoalsDisplay();
        }
        
        return resolvedCount;
    },
    
    // Check if two transactions are exact duplicates
    isExactDuplicate: (transaction1, transaction2) => {
        return (
            transaction1.name.toLowerCase().trim() === transaction2.name.toLowerCase().trim() &&
            Math.abs(transaction1.amount - transaction2.amount) < 0.01 &&
            transaction1.method === transaction2.method &&
            Math.abs(new Date(transaction1.date) - new Date(transaction2.date)) < 60 * 1000 // 1 minute
        );
    },
    
    // Get duplicate statistics
    getDuplicateStats: () => {
        const duplicateGroups = DuplicateManager.findAllDuplicates();
        const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0);
        const totalValue = duplicateGroups.reduce((sum, group) => {
            return sum + group.duplicates.reduce((groupSum, dup) => groupSum + dup.amount, 0);
        }, 0);
        
        return {
            groupCount: duplicateGroups.length,
            duplicateCount: totalDuplicates,
            totalValue: totalValue,
            highConfidenceCount: duplicateGroups.filter(g => g.confidence >= 80).length
        };
    },
    
    // Show duplicate management interface
    showDuplicateManager: () => {
        const duplicateGroups = DuplicateManager.findAllDuplicates();
        const stats = DuplicateManager.getDuplicateStats();
        
        if (duplicateGroups.length === 0) {
            showToast('Nenhuma duplicata encontrada!', 'success');
            return;
        }
        
        let content = `
            <div class="duplicate-manager">
                <div class="duplicate-stats">
                    <h4>Estatísticas de Duplicatas</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${stats.groupCount}</span>
                            <span class="stat-label">Grupos</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.duplicateCount}</span>
                            <span class="stat-label">Duplicatas</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${UTILS.formatCurrency(stats.totalValue)}</span>
                            <span class="stat-label">Valor Total</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value">${stats.highConfidenceCount}</span>
                            <span class="stat-label">Alta Confiança</span>
                        </div>
                    </div>
                </div>
                
                <div class="duplicate-actions">
                    <button class="btn btn-primary" onclick="DuplicateManager.autoResolveDuplicates(); closeModal();">
                        <span>🤖</span> Resolver Automaticamente
                    </button>
                    <button class="btn btn-danger" onclick="DuplicateManager.removeAllDuplicates(); closeModal();">
                        <span>🗑️</span> Remover Todas
                    </button>
                </div>
                
                <div class="duplicate-groups">
        `;
        
        duplicateGroups.forEach((group, index) => {
            const confidenceClass = group.confidence >= 80 ? 'high' : group.confidence >= 60 ? 'medium' : 'low';
            
            content += `
                <div class="duplicate-group confidence-${confidenceClass}">
                    <div class="group-header">
                        <h5>Grupo ${index + 1}</h5>
                        <div class="confidence-badge">
                            <span class="confidence-score">${group.confidence}%</span>
                            <span class="confidence-label">confiança</span>
                        </div>
                    </div>
                    
                    <div class="original-transaction">
                        <div class="transaction-badge">Original</div>
                        <div class="transaction-details">
                            <div class="transaction-name">${group.original.name}</div>
                            <div class="transaction-info">
                                ${UTILS.formatCurrency(group.original.amount)} • 
                                ${UTILS.formatDate(group.original.date)} • 
                                ${group.original.method || 'N/A'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="duplicate-transactions">
                        ${group.duplicates.map(duplicate => `
                            <div class="duplicate-transaction">
                                <div class="transaction-badge duplicate">Duplicata</div>
                                <div class="transaction-details">
                                    <div class="transaction-name">${duplicate.name}</div>
                                    <div class="transaction-info">
                                        ${UTILS.formatCurrency(duplicate.amount)} • 
                                        ${UTILS.formatDate(duplicate.date)} • 
                                        ${duplicate.method || 'N/A'}
                                    </div>
                                </div>
                                <div class="transaction-actions">
                                    <button class="btn btn-sm btn-outline" onclick="DuplicateManager.markAsDuplicate('${duplicate.id}', '${group.original.id}')">
                                        <span>🏷️</span> Marcar
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="DuplicateManager.removeDuplicate('${duplicate.id}'); DuplicateManager.showDuplicateManager();">
                                        <span>🗑️</span> Remover
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
        
        showModal('Gerenciador de Duplicatas', content);
    },
    
    // Remove all duplicates
    removeAllDuplicates: () => {
        if (!confirm('Tem certeza que deseja remover todas as duplicatas? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        const duplicateGroups = DuplicateManager.findAllDuplicates();
        let removedCount = 0;
        
        duplicateGroups.forEach(group => {
            group.duplicates.forEach(duplicate => {
                if (DuplicateManager.removeDuplicate(duplicate.id)) {
                    removedCount++;
                }
            });
        });
        
        showToast(`${removedCount} duplicatas removidas!`, 'success');
        updateHomeStats();
        updateGoalsDisplay();
    },
    
    // Setup automatic duplicate detection
    setupAutoDuplicateDetection: () => {
        eventEmitter.on('transactionAdded', (transaction) => {
            if (STATE.settings.autoDetectDuplicates) {
                const similarTransactions = DuplicateManager.findSimilarTransactions(transaction);
                
                if (similarTransactions.length > 0) {
                    const confidence = DuplicateManager.calculateConfidence(transaction, similarTransactions);
                    
                    if (confidence >= 70) {
                        // Mark as potential duplicate
                        transaction.isPossibleDuplicate = true;
                        transaction.duplicateConfidence = confidence;
                        
                        // Show notification
                        showToast(`Possível duplicata detectada (${confidence}% confiança)`, 'warning', 5000);
                        
                        // Auto-resolve if confidence is very high
                        if (confidence >= 90 && STATE.settings.autoResolveDuplicates) {
                            setTimeout(() => {
                                DuplicateManager.autoResolveDuplicates({ minConfidence: 90 });
                            }, 1000);
                        }
                    }
                }
            }
        });
    }
};

// Fuzzy matching for better duplicate detection
const FuzzyMatcher = {
    // Calculate Levenshtein distance between two strings
    levenshteinDistance: (str1, str2) => {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },
    
    // Calculate similarity percentage between two strings
    similarity: (str1, str2) => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) {
            return 1.0;
        }
        
        const distance = FuzzyMatcher.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    },
    
    // Check if two transaction names are similar
    areNamesSimilar: (name1, name2, threshold = 0.8) => {
        const cleanName1 = name1.toLowerCase().trim();
        const cleanName2 = name2.toLowerCase().trim();
        
        return FuzzyMatcher.similarity(cleanName1, cleanName2) >= threshold;
    }
};

// Enhanced duplicate detection with fuzzy matching
const EnhancedDuplicateDetector = {
    // Find similar transactions with fuzzy matching
    findSimilarTransactionsFuzzy: (targetTransaction, threshold = 0.8) => {
        const timeThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const amountThreshold = 0.01; // 1 cent
        
        return STATE.transactions.filter(transaction => {
            if (transaction.id === targetTransaction.id) return false;
            
            // Fuzzy name matching
            const nameMatch = FuzzyMatcher.areNamesSimilar(
                transaction.name, 
                targetTransaction.name, 
                threshold
            );
            
            // Amount similarity
            const amountMatch = Math.abs(transaction.amount - targetTransaction.amount) <= amountThreshold;
            
            // Time similarity (more lenient)
            const timeDiff = Math.abs(new Date(transaction.date) - new Date(targetTransaction.date));
            const timeMatch = timeDiff <= timeThreshold;
            
            return nameMatch && amountMatch && timeMatch;
        });
    }
};

// Global functions
function showDuplicateChecker() {
    DuplicateManager.showDuplicateManager();
}

// Initialize duplicate detection
document.addEventListener('DOMContentLoaded', () => {
    DuplicateManager.setupAutoDuplicateDetection();
});

// Export for global use
window.DuplicateManager = DuplicateManager;
window.FuzzyMatcher = FuzzyMatcher;