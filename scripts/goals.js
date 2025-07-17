// Goals Management Module - CORRIGIDO
const GoalsManager = {
    // Update goals display
    updateDisplay: () => {
        console.log('Updating goals display...');
        const currentMonth = new Date().toISOString().substring(0, 7);
        
        let monthlyTransactions = [];
        if (typeof TransactionManager !== 'undefined') {
            monthlyTransactions = TransactionManager.getByDateRange(
                `${currentMonth}-01`, 
                `${currentMonth}-31`
            );
        } else {
            // Fallback: filter transactions manually
            monthlyTransactions = STATE.transactions.filter(t => 
                t.date.startsWith(currentMonth)
            );
        }
        
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const remaining = Math.max(0, STATE.monthlyGoals.goal - monthlyTotal);
        const progress = STATE.monthlyGoals.goal > 0 ? (monthlyTotal / STATE.monthlyGoals.goal) * 100 : 0;
        
        console.log('Monthly total:', monthlyTotal, 'Goal:', STATE.monthlyGoals.goal, 'Progress:', progress);
        
        const daysToClose = GoalsManager.calculateDaysToClose();
        
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = Math.min(progress, 100) + '%';
            
            // Change color based on progress
            if (progress >= 100) {
                progressFill.style.background = 'var(--danger-color, #ef4444)';
            } else if (progress >= STATE.monthlyGoals.alertPercentage) {
                progressFill.style.background = 'var(--warning-color, #f59e0b)';
            } else {
                progressFill.style.background = 'var(--success-color, #10b981)';
            }
        }
        
        if (progressText) {
            progressText.textContent = `${progress.toFixed(1)}%`;
        }
        
        // Update progress info
        const elements = {
            spentAmount: monthlyTotal,
            remainingAmount: remaining,
            daysToClose: daysToClose,
            bestDay: STATE.monthlyGoals.bestBuyDate || 20
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'spentAmount' || id === 'remainingAmount') {
                    element.textContent = UTILS.formatCurrency(value);
                } else {
                    element.textContent = value;
                }
            }
        });
        
        // Update form inputs
        const formElements = {
            monthlyGoal: STATE.monthlyGoals.goal || 0,
            dueDate: STATE.monthlyGoals.dueDate || 15,
            bestBuyDate: STATE.monthlyGoals.bestBuyDate || 20,
            alertPercentage: STATE.monthlyGoals.alertPercentage || 80
        };
        
        Object.entries(formElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
        
        // Show alerts if needed
        GoalsManager.checkAlerts(progress, monthlyTotal);
        
        // Update recent transactions in goals section
        GoalsManager.updateRecentTransactions();
        
        // Update charts if available
        if (typeof GoalsCharts !== 'undefined' && typeof Chart !== 'undefined') {
            setTimeout(() => GoalsCharts.refreshGoalsCharts(), 300);
        }
    },
    
    // Calculate days to close
    calculateDaysToClose: () => {
        const today = new Date();
        const currentDay = today.getDate();
        const dueDate = STATE.monthlyGoals.dueDate || 15;
        
        if (currentDay <= dueDate) {
            return dueDate - currentDay;
        } else {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
            return Math.ceil((nextMonth - today) / (1000 * 60 * 60 * 24));
        }
    },
    
    // Check and show alerts
    checkAlerts: (progress, monthlyTotal) => {
        const alertPercentage = STATE.monthlyGoals.alertPercentage || 80;
        
        if (progress >= 100) {
            if (STATE.settings.notifications && !sessionStorage.getItem('goalExceededAlert')) {
                showToast('⚠️ Meta mensal ultrapassada!', 'error', 5000);
                sessionStorage.setItem('goalExceededAlert', 'true');
            }
        } else if (progress >= alertPercentage) {
            const key = `goalAlertAt${Math.floor(progress / 10) * 10}`;
            if (STATE.settings.notifications && !sessionStorage.getItem(key)) {
                showToast(`⚠️ ${progress.toFixed(1)}% da meta mensal atingida`, 'warning', 4000);
                sessionStorage.setItem(key, 'true');
            }
        }
    },
    
    // Save goals
    save: () => {
        const elements = ['monthlyGoal', 'dueDate', 'bestBuyDate', 'alertPercentage'];
        const newGoals = {};
        let hasError = false;
        
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                let value = element.value;
                
                if (id === 'monthlyGoal') {
                    value = parseFloat(value) || 0;
                    if (value < 0) {
                        showToast('Meta mensal deve ser positiva', 'error');
                        hasError = true;
                        return;
                    }
                } else if (id === 'dueDate' || id === 'bestBuyDate') {
                    value = parseInt(value) || (id === 'dueDate' ? 15 : 20);
                    if (value < 1 || value > 31) {
                        showToast('Dia deve estar entre 1 e 31', 'error');
                        hasError = true;
                        return;
                    }
                } else if (id === 'alertPercentage') {
                    value = parseInt(value) || 80;
                    if (value < 0 || value > 100) {
                        showToast('Porcentagem deve estar entre 0 e 100', 'error');
                        hasError = true;
                        return;
                    }
                }
                
                newGoals[id] = value;
            }
        });
        
        if (hasError) return;
        
        // Update state
        STATE.monthlyGoals = {
            goal: newGoals.monthlyGoal || 0,
            dueDate: newGoals.dueDate || 15,
            bestBuyDate: newGoals.bestBuyDate || 20,
            alertPercentage: newGoals.alertPercentage || 80
        };
        
        // Save to storage
        DataManager.save(CONFIG.STORAGE_KEYS.MONTHLY_GOALS, STATE.monthlyGoals);
        
        // Update display
        GoalsManager.updateDisplay();
        
        showToast('Metas salvas com sucesso!', 'success');
        eventEmitter.emit('goalsSaved', STATE.monthlyGoals);
    },
    
    // Reset goals
    reset: () => {
        if (confirm('Deseja realmente resetar todas as metas?')) {
            STATE.monthlyGoals = {
                goal: 0,
                dueDate: 15,
                bestBuyDate: 20,
                alertPercentage: 80
            };
            
            DataManager.save(CONFIG.STORAGE_KEYS.MONTHLY_GOALS, STATE.monthlyGoals);
            GoalsManager.updateDisplay();
            
            showToast('Metas resetadas', 'success');
            eventEmitter.emit('goalsReset');
        }
    },
    
    // Update recent transactions in goals section
    updateRecentTransactions: () => {
        const container = document.getElementById('goalsRecentList');
        if (!container) return;
        
        const recentTransactions = STATE.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        container.innerHTML = '';
        
        if (recentTransactions.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <p>Nenhuma transação recente</p>
                </div>
            `;
            return;
        }
        
        recentTransactions.forEach((transaction, index) => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            const uniqueId = transaction.id || `goals-transaction-${index}`;
            item.innerHTML = `
                <div class="recent-info">
                    <div class="recent-name">${transaction.name}</div>
                    <div class="recent-date">
                        ${UTILS.formatDate(transaction.date)}
                        ${transaction.category ? `• ${transaction.category}` : ''}
                    </div>
                </div>
                <div class="recent-amount">${UTILS.formatCurrency(transaction.amount)}</div>
                <div class="recent-actions">
                    <button class="btn btn-sm btn-outline" onclick="GoalsManager.editTransaction('${uniqueId}')" title="Editar">
                        <span>✏️</span>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="GoalsManager.deleteTransaction('${uniqueId}')" title="Excluir">
                        <span>🗑️</span>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    },
    
    // Edit transaction from goals section
    editTransaction: (transactionId) => {
        if (typeof TransactionUI !== 'undefined') {
            TransactionUI.editTransaction(transactionId);
        } else {
            showToast('Função de edição não disponível', 'error');
        }
    },
    
    // Delete transaction from goals section
    deleteTransaction: (transactionId) => {
        if (typeof TransactionManager !== 'undefined') {
            if (TransactionManager.delete(transactionId)) {
                setTimeout(() => {
                    GoalsManager.updateDisplay();
                    updateHomeStats();
                }, 100);
                showToast('Transação excluída com sucesso!', 'success');
            }
        } else {
            showToast('Função de exclusão não disponível', 'error');
        }
    },
    
    // Get spending insights
    getSpendingInsights: () => {
        const insights = [];
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        
        if (monthlyTransactions.length === 0) {
            return insights;
        }
        
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const dailyAverage = monthlyTotal / new Date().getDate();
        const projectedTotal = dailyAverage * 30;
        
        // Projection insight
        if (STATE.monthlyGoals.goal > 0) {
            const projectionDiff = projectedTotal - STATE.monthlyGoals.goal;
            if (projectionDiff > 0) {
                insights.push({
                    type: 'warning',
                    title: 'Projeção Mensal',
                    message: `Com base na média atual, você pode ultrapassar sua meta em ${UTILS.formatCurrency(projectionDiff)}`
                });
            } else {
                insights.push({
                    type: 'success',
                    title: 'Projeção Mensal',
                    message: `Você está no caminho certo! Projeção: ${UTILS.formatCurrency(projectedTotal)}`
                });
            }
        }
        
        // Best day insight
        const daysToClose = GoalsManager.calculateDaysToClose();
        const today = new Date().getDate();
        const bestDay = STATE.monthlyGoals.bestBuyDate || 20;
        
        if (today <= bestDay && daysToClose > 0) {
            insights.push({
                type: 'info',
                title: 'Melhor Dia para Compras',
                message: `Ainda faltam ${bestDay - today} dias para o melhor dia de compras (dia ${bestDay})`
            });
        }
        
        // Category spending pattern
        const categoryTotals = {};
        monthlyTransactions.forEach(t => {
            if (t.category) {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });
        
        const topCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topCategory) {
            const percentage = (topCategory[1] / monthlyTotal) * 100;
            insights.push({
                type: 'info',
                title: 'Categoria Dominante',
                message: `${topCategory[0]} representa ${percentage.toFixed(1)}% dos seus gastos (${UTILS.formatCurrency(topCategory[1])})`
            });
        }
        
        return insights;
    },
    
    // Show spending insights
    showInsights: () => {
        const insights = GoalsManager.getSpendingInsights();
        
        if (insights.length === 0) {
            showToast('Nenhum insight disponível', 'info');
            return;
        }
        
        const content = `
            <div class="spending-insights">
                <h4>Insights de Gastos</h4>
                <div class="insights-list">
                    ${insights.map(insight => `
                        <div class="insight-item insight-${insight.type}">
                            <h5>${insight.title}</h5>
                            <p>${insight.message}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        showModal('Insights de Gastos', content);
    }
};

// Goals predictions and recommendations
const GoalsPredictor = {
    // Predict if user will exceed goal
    predictGoalExceedance: () => {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        
        if (monthlyTransactions.length === 0 || STATE.monthlyGoals.goal === 0) {
            return null;
        }
        
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const currentDay = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        
        const dailyAverage = monthlyTotal / currentDay;
        const projectedTotal = dailyAverage * daysInMonth;
        
        const exceedance = projectedTotal - STATE.monthlyGoals.goal;
        const probability = exceedance > 0 ? Math.min(90, (exceedance / STATE.monthlyGoals.goal) * 100 + 50) : 0;
        
        return {
            willExceed: exceedance > 0,
            exceedanceAmount: exceedance,
            probability: probability,
            projectedTotal: projectedTotal,
            recommendedDailyBudget: (STATE.monthlyGoals.goal - monthlyTotal) / (daysInMonth - currentDay)
        };
    },
    
    // Get spending recommendations
    getRecommendations: () => {
        const prediction = GoalsPredictor.predictGoalExceedance();
        const recommendations = [];
        
        if (!prediction) {
            recommendations.push({
                type: 'info',
                title: 'Configure sua meta',
                message: 'Defina uma meta mensal para receber recomendações personalizadas'
            });
            return recommendations;
        }
        
        if (prediction.willExceed) {
            recommendations.push({
                type: 'warning',
                title: 'Risco de Ultrapassar Meta',
                message: `Há ${prediction.probability.toFixed(0)}% de chance de ultrapassar sua meta em ${UTILS.formatCurrency(prediction.exceedanceAmount)}`
            });
            
            if (prediction.recommendedDailyBudget > 0) {
                recommendations.push({
                    type: 'info',
                    title: 'Orçamento Diário Recomendado',
                    message: `Para não ultrapassar a meta, limite seus gastos a ${UTILS.formatCurrency(prediction.recommendedDailyBudget)} por dia`
                });
            }
        } else {
            recommendations.push({
                type: 'success',
                title: 'Meta Controlada',
                message: `Você está no caminho certo! Projeção: ${UTILS.formatCurrency(prediction.projectedTotal)}`
            });
        }
        
        // Category-specific recommendations
        const categoryRecommendations = GoalsPredictor.getCategoryRecommendations();
        recommendations.push(...categoryRecommendations);
        
        return recommendations;
    },
    
    // Get category-specific recommendations
    getCategoryRecommendations: () => {
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        
        const categoryTotals = {};
        monthlyTransactions.forEach(t => {
            if (t.category) {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });
        
        const recommendations = [];
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1]);
        
        // Top spending category
        if (sortedCategories.length > 0) {
            const [topCategory, topAmount] = sortedCategories[0];
            const totalSpent = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
            const percentage = (topAmount / totalSpent) * 100;
            
            if (percentage > 40) {
                recommendations.push({
                    type: 'warning',
                    title: 'Categoria Dominante',
                    message: `${topCategory} representa ${percentage.toFixed(1)}% dos seus gastos. Considere revisar esta categoria.`
                });
            }
        }
        
        // Zero spending categories
        const unusedCategories = Object.keys(STATE.categories).filter(cat => !categoryTotals[cat]);
        if (unusedCategories.length > 0 && sortedCategories.length > 0) {
            recommendations.push({
                type: 'info',
                title: 'Categorias Não Utilizadas',
                message: `Você tem ${unusedCategories.length} categorias sem gastos este mês. Considere removê-las ou utilizá-las.`
            });
        }
        
        return recommendations;
    }
};

// Global functions
function saveGoals() {
    GoalsManager.save();
}

function resetGoals() {
    GoalsManager.reset();
}

function updateGoalsDisplay() {
    GoalsManager.updateDisplay();
}

function showGoals() {
    hideAllScreens();
    document.getElementById('goals-screen').classList.remove('hidden');
    GoalsManager.updateDisplay();
}

function showSpendingInsights() {
    GoalsManager.showInsights();
}

// Auto-update goals display
setInterval(() => {
    if (!document.getElementById('goals-screen').classList.contains('hidden')) {
        GoalsManager.updateDisplay();
    }
}, 60000); // Update every minute

// Listen for transaction changes
eventEmitter.on('transactionAdded', () => {
    if (!document.getElementById('goals-screen').classList.contains('hidden')) {
        setTimeout(() => GoalsManager.updateDisplay(), 300);
    }
});

eventEmitter.on('transactionUpdated', () => {
    if (!document.getElementById('goals-screen').classList.contains('hidden')) {
        setTimeout(() => GoalsManager.updateDisplay(), 300);
    }
});

eventEmitter.on('transactionDeleted', () => {
    if (!document.getElementById('goals-screen').classList.contains('hidden')) {
        setTimeout(() => GoalsManager.updateDisplay(), 300);
    }
});