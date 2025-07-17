// Goals Management Module - COMPLETAMENTE REFEITO
const GoalsManager = {
    // Atualizar display das metas
    updateDisplay: () => {
        console.log('=== ATUALIZANDO METAS ===');
        
        // Pegar mês atual
        const now = new Date();
        const currentMonth = '2025-' + String(now.getMonth() + 1).padStart(2, '0'); // Forçar 2025
        console.log('Mês atual:', currentMonth);
        
        // Filtrar transações do mês atual
        const monthlyTransactions = STATE.transactions.filter(t => {
            return t.date && t.date.startsWith(currentMonth);
        });
        
        console.log('Transações do mês:', monthlyTransactions.length);
        
        // Calcular total gasto no mês
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => {
            const amount = parseFloat(t.amount) || 0;
            console.log('Transação:', t.name, 'Valor:', amount);
            return sum + amount;
        }, 0);
        
        console.log('Total gasto no mês:', monthlyTotal);
        console.log('Meta mensal:', STATE.monthlyGoals.goal);
        
        // Calcular valores
        const goal = STATE.monthlyGoals.goal || 0;
        const remaining = Math.max(0, goal - monthlyTotal);
        const progress = goal > 0 ? (monthlyTotal / goal) * 100 : 0;
        const daysToClose = GoalsManager.calculateDaysToClose();
        
        console.log('Progresso calculado:', progress + '%');
        console.log('Restante:', remaining);
        
        // Atualizar barra de progresso
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            const progressPercent = Math.min(progress, 100);
            progressFill.style.width = progressPercent + '%';
            
            // Mudar cor baseado no progresso
            if (progress >= 100) {
                progressFill.style.backgroundColor = '#ef4444'; // vermelho
            } else if (progress >= 80) {
                progressFill.style.backgroundColor = '#f59e0b'; // amarelo
            } else {
                progressFill.style.backgroundColor = '#10b981'; // verde
            }
            
            console.log('Barra atualizada para:', progressPercent + '%');
        }
        
        if (progressText) {
            progressText.textContent = Math.round(progress) + '%';
        }
        
        // Atualizar valores na tela
        const updates = {
            'spentAmount': 'R$ ' + monthlyTotal.toFixed(2).replace('.', ','),
            'remainingAmount': 'R$ ' + remaining.toFixed(2).replace('.', ','),
            'daysToClose': daysToClose,
            'bestDay': STATE.monthlyGoals.bestBuyDate || 20
        };
        
        Object.entries(updates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                console.log('Atualizado', id, 'para:', value);
            } else {
                console.log('Elemento não encontrado:', id);
            }
        });
        
        // Atualizar campos do formulário
        const formUpdates = {
            'monthlyGoal': STATE.monthlyGoals.goal || 0,
            'dueDate': STATE.monthlyGoals.dueDate || 15,
            'bestBuyDate': STATE.monthlyGoals.bestBuyDate || 20,
            'alertPercentage': STATE.monthlyGoals.alertPercentage || 80
        };
        
        Object.entries(formUpdates).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
        
        // Atualizar lista de transações recentes
        GoalsManager.updateRecentTransactions();
        
        console.log('=== METAS ATUALIZADAS ===');
    },
    
    // Calcular dias para fechamento
    calculateDaysToClose: () => {
        const today = new Date();
        const currentDay = today.getDate();
        const dueDate = STATE.monthlyGoals.dueDate || 15;
        
        if (currentDay <= dueDate) {
            return dueDate - currentDay;
        } else {
            // Próximo mês
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
            const diffTime = nextMonth - today;
            return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
    },
    
    // Salvar metas
    save: () => {
        console.log('Salvando metas...');
        
        const goalInput = document.getElementById('monthlyGoal');
        const dueDateInput = document.getElementById('dueDate');
        const bestBuyInput = document.getElementById('bestBuyDate');
        const alertInput = document.getElementById('alertPercentage');
        
        if (!goalInput || !dueDateInput || !bestBuyInput || !alertInput) {
            console.error('Campos do formulário não encontrados');
            showToast('Erro: campos não encontrados', 'error');
            return;
        }
        
        const newGoals = {
            goal: parseFloat(goalInput.value) || 0,
            dueDate: parseInt(dueDateInput.value) || 15,
            bestBuyDate: parseInt(bestBuyInput.value) || 20,
            alertPercentage: parseInt(alertInput.value) || 80
        };
        
        // Validações
        if (newGoals.goal < 0) {
            showToast('Meta deve ser positiva', 'error');
            return;
        }
        
        if (newGoals.dueDate < 1 || newGoals.dueDate > 31) {
            showToast('Dia de vencimento deve estar entre 1 e 31', 'error');
            return;
        }
        
        if (newGoals.bestBuyDate < 1 || newGoals.bestBuyDate > 31) {
            showToast('Melhor dia deve estar entre 1 e 31', 'error');
            return;
        }
        
        if (newGoals.alertPercentage < 0 || newGoals.alertPercentage > 100) {
            showToast('Porcentagem deve estar entre 0 e 100', 'error');
            return;
        }
        
        // Salvar
        STATE.monthlyGoals = newGoals;
        
        if (typeof DataManager !== 'undefined') {
            DataManager.save(CONFIG.STORAGE_KEYS.MONTHLY_GOALS, STATE.monthlyGoals);
        } else {
            localStorage.setItem('konomiza-monthly-goals', JSON.stringify(STATE.monthlyGoals));
        }
        
        console.log('Metas salvas:', newGoals);
        showToast('Metas salvas com sucesso!', 'success');
        
        // Atualizar display
        setTimeout(() => {
            GoalsManager.updateDisplay();
        }, 100);
    },
    
    // Resetar metas
    reset: () => {
        if (confirm('Deseja realmente resetar todas as metas?')) {
            STATE.monthlyGoals = {
                goal: 0,
                dueDate: 15,
                bestBuyDate: 20,
                alertPercentage: 80
            };
            
            if (typeof DataManager !== 'undefined') {
                DataManager.save(CONFIG.STORAGE_KEYS.MONTHLY_GOALS, STATE.monthlyGoals);
            } else {
                localStorage.setItem('konomiza-monthly-goals', JSON.stringify(STATE.monthlyGoals));
            }
            
            showToast('Metas resetadas', 'success');
            GoalsManager.updateDisplay();
        }
    },
    
    // Atualizar transações recentes na seção de metas
    updateRecentTransactions: () => {
        const container = document.getElementById('goalsRecentList');
        if (!container) {
            console.log('Container goalsRecentList não encontrado');
            return;
        }
        
        // Pegar últimas 10 transações
        const recentTransactions = STATE.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        container.innerHTML = '';
        
        if (recentTransactions.length === 0) {
            container.innerHTML = '<div class="no-transactions"><p>Nenhuma transação recente</p></div>';
            return;
        }
        
        recentTransactions.forEach((transaction, index) => {
            const item = document.createElement('div');
            item.className = 'recent-item';
            
            const transactionId = transaction.id || `transaction-${index}`;
            const amount = parseFloat(transaction.amount) || 0;
            const formattedAmount = 'R$ ' + amount.toFixed(2).replace('.', ',');
            const formattedDate = new Date(transaction.date).toLocaleDateString('pt-BR');
            
            item.innerHTML = `
                <div class="recent-info">
                    <div class="recent-name">${transaction.name}</div>
                    <div class="recent-date">
                        ${formattedDate}
                        ${transaction.category ? ` • ${transaction.category}` : ''}
                    </div>
                </div>
                <div class="recent-amount">${formattedAmount}</div>
                <div class="recent-actions">
                    <button class="btn btn-sm btn-outline" onclick="GoalsManager.editTransaction('${transactionId}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="GoalsManager.deleteTransaction('${transactionId}')" title="Excluir">
                        🗑️
                    </button>
                </div>
            `;
            
            container.appendChild(item);
        });
    },
    
    // Editar transação
    editTransaction: (transactionId) => {
        console.log('Editando transação:', transactionId);
        if (typeof TransactionUI !== 'undefined' && TransactionUI.editTransaction) {
            TransactionUI.editTransaction(transactionId);
        } else {
            showToast('Função de edição não disponível', 'error');
        }
    },
    
    // Deletar transação
    deleteTransaction: (transactionId) => {
        console.log('Deletando transação:', transactionId);
        
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            showToast('Transação não encontrada', 'error');
            return;
        }
        
        const amount = parseFloat(transaction.amount) || 0;
        const formattedAmount = 'R$ ' + amount.toFixed(2).replace('.', ',');
        
        if (confirm(`Deseja realmente excluir "${transaction.name}" de ${formattedAmount}?`)) {
            // Remover da lista
            const index = STATE.transactions.findIndex(t => t.id === transactionId);
            if (index !== -1) {
                STATE.transactions.splice(index, 1);
                
                // Salvar
                if (typeof DataManager !== 'undefined') {
                    DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
                } else {
                    localStorage.setItem('konomiza-transactions', JSON.stringify(STATE.transactions));
                }
                
                showToast('Transação excluída com sucesso!', 'success');
                
                // Atualizar displays
                setTimeout(() => {
                    GoalsManager.updateDisplay();
                    if (typeof updateHomeStats !== 'undefined') {
                        updateHomeStats();
                    }
                }, 100);
            }
        }
    }
};

// Funções globais
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
    console.log('Mostrando tela de metas');
    
    if (typeof hideAllScreens !== 'undefined') {
        hideAllScreens();
    }
    
    const goalsScreen = document.getElementById('goals-screen');
    if (goalsScreen) {
        goalsScreen.classList.remove('hidden');
        
        // Atualizar após um pequeno delay
        setTimeout(() => {
            GoalsManager.updateDisplay();
        }, 100);
    } else {
        console.error('Tela de metas não encontrada');
    }
}

// Escutar mudanças nas transações
if (typeof eventEmitter !== 'undefined') {
    eventEmitter.on('transactionAdded', () => {
        console.log('Transação adicionada - atualizando metas');
        setTimeout(() => GoalsManager.updateDisplay(), 200);
    });
    
    eventEmitter.on('transactionDeleted', () => {
        console.log('Transação deletada - atualizando metas');
        setTimeout(() => GoalsManager.updateDisplay(), 200);
    });
    
    eventEmitter.on('transactionUpdated', () => {
        console.log('Transação atualizada - atualizando metas');
        setTimeout(() => GoalsManager.updateDisplay(), 200);
    });
}

// Auto-atualizar metas a cada minuto
setInterval(() => {
    const goalsScreen = document.getElementById('goals-screen');
    if (goalsScreen && !goalsScreen.classList.contains('hidden')) {
        GoalsManager.updateDisplay();
    }
}, 60000);

console.log('Goals.js carregado - versão simplificada');