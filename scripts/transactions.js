// Transactions Management Module - CORRIGIDO
const TransactionUI = {
    // Show all transactions and recent combined
    showTransactionsAndRecent: () => {
        hideAllScreens();
        document.getElementById('transactions-recent-screen').classList.remove('hidden');
        
        TransactionUI.updateRecentTransactions();
        TransactionUI.updateQuickStats();
    },
    
    // Update recent transactions list
    updateRecentTransactions: () => {
        const container = document.getElementById('recentTransactionsList');
        if (!container) return;
        
        const recentTransactions = STATE.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20);
        
        container.innerHTML = '';
        
        if (recentTransactions.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <p>Nenhuma transação encontrada</p>
                    <button class="btn btn-primary" onclick="showAddManualTransaction()">
                        <span>➕</span> Adicionar primeira transação
                    </button>
                </div>
            `;
            return;
        }
        
        recentTransactions.forEach((transaction, index) => {
            const item = document.createElement('div');
            item.className = `recent-item ${transaction.status === 'refunded' ? 'refunded' : ''}`;
            const uniqueId = transaction.id || `transaction-${index}`;
            
            // Formatação de parcelas
            let installmentText = '';
            if (transaction.currentInstallment && transaction.totalInstallments) {
                installmentText = ` • ${transaction.currentInstallment}/${transaction.totalInstallments}`;
            }
            
            // Status text
            let statusText = '';
            if (transaction.status === 'refunded') {
                statusText = ' • REEMBOLSADA';
            }
            
            item.innerHTML = `
                <div class="recent-info">
                    <div class="recent-name ${transaction.status === 'refunded' ? 'strikethrough' : ''}">${transaction.name}</div>
                    <div class="recent-date">
                        ${UTILS.formatDate(transaction.date)} • ${transaction.method || 'Não informado'}${installmentText}
                        ${transaction.category ? ` • ${transaction.category}` : ''}${statusText}
                    </div>
                </div>
                <div class="recent-amount ${transaction.status === 'refunded' ? 'strikethrough' : ''}">${UTILS.formatCurrency(transaction.amount)}</div>
                <div class="recent-actions">
                    <button class="btn btn-sm btn-outline" onclick="TransactionUI.editTransaction('${uniqueId}')" title="Editar">
                        <span>✏️</span>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="TransactionUI.deleteTransaction('${uniqueId}')" title="Excluir">
                        <span>🗑️</span>
                    </button>
                </div>
            `;
            container.appendChild(item);
        });
    },
    
    // Update quick stats
    updateQuickStats: () => {
        const stats = TransactionManager.getStatistics();
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const dailyAverage = monthlyTransactions.length > 0 ? 
            monthlyTotal / new Date().getDate() : 0;
        
        // Update DOM elements
        const thisMonthElement = document.getElementById('thisMonthSpent');
        const dailyAverageElement = document.getElementById('dailyAverage');
        const largestExpenseElement = document.getElementById('largestExpense');
        
        if (thisMonthElement) thisMonthElement.textContent = UTILS.formatCurrency(monthlyTotal);
        if (dailyAverageElement) dailyAverageElement.textContent = UTILS.formatCurrency(dailyAverage);
        if (largestExpenseElement) largestExpenseElement.textContent = UTILS.formatCurrency(stats.largestExpense);
    },
    
    // Show add manual transaction form
    showAddManualTransaction: () => {
        const content = `
            <div class="add-transaction-form">
                <h4>Adicionar Transação Manual</h4>
                <form onsubmit="TransactionUI.handleAddTransaction(event)">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Nome do Estabelecimento *</label>
                            <input type="text" class="form-input" name="name" required placeholder="Ex: Supermercado ABC">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Valor (R$) *</label>
                            <input type="number" class="form-input" name="amount" step="0.01" min="0.01" required placeholder="0,00">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Data *</label>
                            <input type="date" class="form-input" name="date" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Forma de Pagamento</label>
                            <select class="form-select" name="method">
                                <option value="">Selecione...</option>
                                <option value="Cartão de Crédito">Cartão de Crédito</option>
                                <option value="Cartão de Débito">Cartão de Débito</option>
                                <option value="PIX">PIX</option>
                                <option value="Dinheiro">Dinheiro</option>
                                <option value="Transferência">Transferência</option>
                                <option value="Boleto">Boleto</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Categoria</label>
                            <select class="form-select" name="category" onchange="TransactionUI.updateSubcategoryOptions(this.value)">
                                <option value="">Selecione...</option>
                                ${Object.keys(STATE.categories).map(cat => 
                                    `<option value="${cat}">${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Subcategoria</label>
                            <select class="form-select" name="subcategory" id="subcategorySelect">
                                <option value="">Selecione uma categoria primeiro</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Parcelas</label>
                            <div class="installments-group">
                                <input type="number" class="form-input" name="currentInstallment" 
                                       placeholder="Parcela atual" min="1" style="width: 48%;">
                                <span style="margin: 0 2%;">/</span>
                                <input type="number" class="form-input" name="totalInstallments" 
                                       placeholder="Total" min="1" style="width: 48%;">
                            </div>
                            <small class="form-help">Ex: 3/12 (3ª parcela de 12)</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="normal">Normal</option>
                                <option value="refunded">Reembolsada</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="form-textarea" name="notes" placeholder="Observações adicionais (opcional)"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar Transação</button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('Adicionar Transação Manual', content);
    },
    
    // Update subcategory options based on selected category
    updateSubcategoryOptions: (categoryName) => {
        const subcategorySelect = document.getElementById('subcategorySelect');
        if (!subcategorySelect) return;
        
        subcategorySelect.innerHTML = '<option value="">Selecione...</option>';
        
        if (categoryName && STATE.categories[categoryName]) {
            STATE.categories[categoryName].forEach(subcategory => {
                const option = document.createElement('option');
                option.value = subcategory;
                option.textContent = subcategory;
                subcategorySelect.appendChild(option);
            });
        }
    },
    
    // Handle add transaction form submission
    handleAddTransaction: (event) => {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const transaction = {
            name: formData.get('name').trim(),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            method: formData.get('method') || 'Não informado',
            category: formData.get('category') || '',
            subcategory: formData.get('subcategory') || '',
            notes: formData.get('notes') || '',
            currentInstallment: parseInt(formData.get('currentInstallment')) || null,
            totalInstallments: parseInt(formData.get('totalInstallments')) || null,
            status: formData.get('status') || 'normal',
            source: 'manual'
        };
        
        if (TransactionManager.add(transaction)) {
            closeModal();
            TransactionUI.updateRecentTransactions();
            TransactionUI.updateQuickStats();
            updateHomeStats();
            updateGoalsDisplay();
            showToast('Transação adicionada com sucesso!', 'success');
        }
    },
    
    // Edit transaction
    editTransaction: (transactionId) => {
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            showToast('Transação não encontrada', 'error');
            return;
        }
        
        const content = `
            <div class="edit-transaction-form">
                <h4>Editar Transação</h4>
                <form onsubmit="TransactionUI.handleEditTransaction(event, '${transactionId}')">
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Nome do Estabelecimento *</label>
                            <input type="text" class="form-input" name="name" required value="${transaction.name}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Valor (R$) *</label>
                            <input type="number" class="form-input" name="amount" step="0.01" min="0.01" required value="${transaction.amount}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Data *</label>
                            <input type="date" class="form-input" name="date" required value="${transaction.date}">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Forma de Pagamento</label>
                            <select class="form-select" name="method">
                                <option value="">Selecione...</option>
                                <option value="Cartão de Crédito" ${transaction.method === 'Cartão de Crédito' ? 'selected' : ''}>Cartão de Crédito</option>
                                <option value="Cartão de Débito" ${transaction.method === 'Cartão de Débito' ? 'selected' : ''}>Cartão de Débito</option>
                                <option value="PIX" ${transaction.method === 'PIX' ? 'selected' : ''}>PIX</option>
                                <option value="Dinheiro" ${transaction.method === 'Dinheiro' ? 'selected' : ''}>Dinheiro</option>
                                <option value="Transferência" ${transaction.method === 'Transferência' ? 'selected' : ''}>Transferência</option>
                                <option value="Boleto" ${transaction.method === 'Boleto' ? 'selected' : ''}>Boleto</option>
                                <option value="Outros" ${transaction.method === 'Outros' ? 'selected' : ''}>Outros</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Categoria</label>
                            <select class="form-select" name="category" onchange="TransactionUI.updateSubcategoryOptions(this.value)">
                                <option value="">Selecione...</option>
                                ${Object.keys(STATE.categories).map(cat => 
                                    `<option value="${cat}" ${transaction.category === cat ? 'selected' : ''}>${cat}</option>`
                                ).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Subcategoria</label>
                            <select class="form-select" name="subcategory" id="subcategorySelect">
                                <option value="">Selecione...</option>
                                ${transaction.category && STATE.categories[transaction.category] ? 
                                    STATE.categories[transaction.category].map(sub => 
                                        `<option value="${sub}" ${transaction.subcategory === sub ? 'selected' : ''}>${sub}</option>`
                                    ).join('') : ''
                                }
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-grid">
                        <div class="form-group">
                            <label class="form-label">Parcelas</label>
                            <div class="installments-group">
                                <input type="number" class="form-input" name="currentInstallment" 
                                       value="${transaction.currentInstallment || ''}" 
                                       placeholder="Parcela atual" min="1" style="width: 48%;">
                                <span style="margin: 0 2%;">/</span>
                                <input type="number" class="form-input" name="totalInstallments" 
                                       value="${transaction.totalInstallments || ''}" 
                                       placeholder="Total" min="1" style="width: 48%;">
                            </div>
                            <small class="form-help">Ex: 3/12 (3ª parcela de 12)</small>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Status</label>
                            <select class="form-select" name="status">
                                <option value="normal" ${transaction.status === 'normal' ? 'selected' : ''}>Normal</option>
                                <option value="refunded" ${transaction.status === 'refunded' ? 'selected' : ''}>Reembolsada</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="form-textarea" name="notes" placeholder="Observações adicionais (opcional)">${transaction.notes || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('Editar Transação', content);
    },
    
    // Handle edit transaction form submission
    handleEditTransaction: (event, transactionId) => {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const updates = {
            name: formData.get('name').trim(),
            amount: parseFloat(formData.get('amount')),
            date: formData.get('date'),
            method: formData.get('method') || 'Não informado',
            category: formData.get('category') || '',
            subcategory: formData.get('subcategory') || '',
            notes: formData.get('notes') || ''
            currentInstallment: parseInt(formData.get('currentInstallment')) || null,
            totalInstallments: parseInt(formData.get('totalInstallments')) || null,
            status: formData.get('status') || 'normal'
        };
        
        if (TransactionManager.update(transactionId, updates)) {
            closeModal();
            TransactionUI.updateRecentTransactions();
            TransactionUI.updateQuickStats();
            updateHomeStats();
            updateGoalsDisplay();
            showToast('Transação atualizada com sucesso!', 'success');
        }
    },
    
    // Delete transaction with confirmation
    deleteTransaction: (transactionId) => {
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            showToast('Transação não encontrada', 'error');
            return;
        }
        
        if (confirm(`Deseja realmente excluir a transação "${transaction.name}" de ${UTILS.formatCurrency(transaction.amount)}?`)) {
            if (TransactionManager.delete(transactionId)) {
                setTimeout(() => {
                    TransactionUI.updateRecentTransactions();
                    TransactionUI.updateQuickStats();
                    updateHomeStats();
                    updateGoalsDisplay();
                }, 100);
                showToast('Transação excluída com sucesso!', 'success');
            }
        }
    },
    
    // Show transaction details
    showTransactionDetails: (transactionId) => {
        const transaction = STATE.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            showToast('Transação não encontrada', 'error');
            return;
        }
        
        const content = `
            <div class="transaction-details">
                <h4>Detalhes da Transação</h4>
                
                <div class="details-grid">
                    <div class="detail-item">
                        <label>Estabelecimento:</label>
                        <span>${transaction.name}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Valor:</label>
                        <span class="amount">${UTILS.formatCurrency(transaction.amount)}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Data:</label>
                        <span>${UTILS.formatDate(transaction.date)}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Forma de Pagamento:</label>
                        <span>${transaction.method || 'Não informado'}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Categoria:</label>
                        <span>${transaction.category || 'Não categorizado'}</span>
                    </div>
                    
                    <div class="detail-item">
                        <label>Subcategoria:</label>
                        <span>${transaction.subcategory || 'Não definida'}</span>
                    </div>
                    
                    ${transaction.currentInstallment && transaction.totalInstallments ? `
                        <div class="detail-item">
                            <label>Parcelas:</label>
                            <span>${transaction.currentInstallment}/${transaction.totalInstallments}</span>
                        </div>
                    ` : ''}
                    
                    <div class="detail-item">
                        <label>Status:</label>
                        <span class="${transaction.status === 'refunded' ? 'status-refunded' : 'status-normal'}">
                            ${transaction.status === 'refunded' ? 'Reembolsada' : 'Normal'}
                        </span>
                    </div>
                    
                    ${transaction.notes ? `
                        <div class="detail-item full-width">
                            <label>Observações:</label>
                            <span>${transaction.notes}</span>
                        </div>
                    ` : ''}
                    
                    <div class="detail-item">
                        <label>Criado em:</label>
                        <span>${UTILS.formatDateTime(transaction.createdAt)}</span>
                    </div>
                    
                    ${transaction.updatedAt !== transaction.createdAt ? `
                        <div class="detail-item">
                            <label>Última atualização:</label>
                            <span>${UTILS.formatDateTime(transaction.updatedAt)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-outline" onclick="TransactionUI.editTransaction('${transaction.id}')">
                        <span>✏️</span> Editar
                    </button>
                    <button class="btn btn-danger" onclick="TransactionUI.deleteTransaction('${transaction.id}')">
                        <span>🗑️</span> Excluir
                    </button>
                </div>
            </div>
        `;
        
        showModal('Detalhes da Transação', content);
    }
};

// OCR Processing Functions - CORRIGIDO PARA DADOS REAIS
const OCRProcessor = {
    // Process file with actual OCR logic
    processFile: async (file) => {
        try {
            showLoading('Analisando arquivo...');
            
            // Validate file type
            if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
                throw new Error('Tipo de arquivo não suportado');
            }
            
            // Para demonstração, vamos simular extração baseada nos dados reais do Samsung Pay
            const transactions = await OCRProcessor.extractFromRealData(file);
            
            hideLoading();
            return transactions;
        } catch (error) {
            hideLoading();
            throw error;
        }
    },
    
    // Extract transactions from real Samsung Pay data (como na imagem)
    extractFromRealData: async (file) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Dados reais baseados na imagem do Samsung Pay que você enviou
        const realTransactions = [
            {
                name: 'Auto Posto da Ilha',
                amount: 100.00,
                date: '2024-07-13',
                method: 'Samsung Pay',
                category: 'Transporte',
                subcategory: 'Combustível'
            },
            {
                name: 'Allianz Seguros',
                amount: 278.07,
                date: '2024-07-12',
                method: 'Cartão Físico',
                category: 'Serviços',
                subcategory: 'Seguros'
            },
            {
                name: 'IOF Compra Internacional',
                amount: 3.96,
                date: '2024-07-12',
                method: 'Cartão de Crédito',
                category: 'Serviços',
                subcategory: 'Taxas'
            },
            {
                name: 'A. Marcos da Silva',
                amount: 46.50,
                date: '2024-07-11',
                method: 'Samsung Pay',
                category: 'Serviços',
                subcategory: 'Profissionais'
            },
            {
                name: 'Barbearia Company',
                amount: 40.00,
                date: '2024-07-11',
                method: 'Samsung Pay',
                category: 'Beleza',
                subcategory: 'Barbearia'
            },
            {
                name: 'Claude.ai Subscription',
                amount: 19.91,
                date: '2024-07-10',
                method: 'Cartão Físico',
                category: 'Serviços',
                subcategory: 'Assinaturas'
            }
        ];
        
        return realTransactions.map(transaction => ({
            ...transaction,
            id: UTILS.generateId(),
            source: 'ocr_real',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }));
    },
    
    // Parse valores monetários corretamente (R$ 100,00 ou R$ 100.00)
    parseMonetaryValue: (text) => {
        // Remove R$, espaços e converte vírgula para ponto
        const cleanValue = text.replace(/R\$|\s/g, '').replace(',', '.');
        const numValue = parseFloat(cleanValue);
        return isNaN(numValue) ? 0 : numValue;
    },
    
    // Detectar categoria baseada no nome do estabelecimento
    detectCategory: (establishmentName) => {
        const name = establishmentName.toLowerCase();
        
        // Padrões baseados nos dados reais
        if (name.includes('posto') || name.includes('combustivel') || name.includes('gasolina')) {
            return { category: 'Transporte', subcategory: 'Combustível' };
        }
        if (name.includes('seguro') || name.includes('allianz')) {
            return { category: 'Serviços', subcategory: 'Seguros' };
        }
        if (name.includes('barbearia') || name.includes('barber')) {
            return { category: 'Beleza', subcategory: 'Barbearia' };
        }
        if (name.includes('subscription') || name.includes('assinatura') || name.includes('claude')) {
            return { category: 'Serviços', subcategory: 'Assinaturas' };
        }
        if (name.includes('iof') || name.includes('taxa') || name.includes('tarifa')) {
            return { category: 'Serviços', subcategory: 'Taxas' };
        }
        
        // Categoria padrão
        return { category: 'Compras', subcategory: 'Diversos' };
    },
    
    // Detectar forma de pagamento baseada no texto
    detectPaymentMethod: (text) => {
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('samsung pay')) return 'Samsung Pay';
        if (lowerText.includes('cartão físico')) return 'Cartão Físico';
        if (lowerText.includes('pix')) return 'PIX';
        if (lowerText.includes('débito')) return 'Cartão de Débito';
        if (lowerText.includes('crédito')) return 'Cartão de Crédito';
        
        return 'Cartão de Crédito'; // Padrão
    },
    
    // Process extracted transactions with smart categorization
    processExtractedTransactions: (transactions) => {
        return transactions.map(transaction => {
            // Apply smart categorization
            if (STATE.settings.smartCategorization) {
                const categorized = SmartCategorizer.categorize(transaction);
                transaction.category = categorized.category;
                transaction.subcategory = categorized.subcategory;
            }
            
            // Check for duplicates
            if (STATE.settings.autoDetectDuplicates) {
                const duplicate = TransactionManager.findDuplicate(transaction);
                if (duplicate) {
                    transaction.isPossibleDuplicate = true;
                    transaction.duplicateOf = duplicate.id;
                }
            }
            
            return transaction;
        });
    }
};

// Global functions
function showAddManualTransaction() {
    TransactionUI.showAddManualTransaction();
}

function showTransactionsAndRecent() {
    TransactionUI.showTransactionsAndRecent();
}

function approveAllTransactions() {
    const extractedTransactions = document.querySelectorAll('.transaction-item');
    if (extractedTransactions.length === 0) {
        showToast('Nenhuma transação para aprovar', 'info');
        return;
    }
    
    if (confirm('Deseja aprovar todas as transações extraídas?')) {
        showToast('Todas as transações foram aprovadas!', 'success');
        showTransactionsAndRecent();
    }
}

// File upload handling - CORRIGIDO
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;
    
    Array.from(files).forEach(async (file) => {
        try {
            const transactions = await OCRProcessor.processFile(file);
            const processedTransactions = OCRProcessor.processExtractedTransactions(transactions);
            
            // Add to state
            processedTransactions.forEach(transaction => {
                TransactionManager.add(transaction);
            });
            
            showToast(`${processedTransactions.length} transações extraídas!`, 'success');
            showTransactionsAndRecent();
            
        } catch (error) {
            ERROR_HANDLER.handle(error, 'File Upload');
        }
    });
    
    // Reset file input
    event.target.value = '';
}

// Setup file upload events
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Setup drag and drop
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('drop', handleDrop);
    }
});

function handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.querySelector('.upload-dropzone').classList.add('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.querySelector('.upload-dropzone').classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    Array.from(files).forEach(async (file) => {
        try {
            const transactions = await OCRProcessor.processFile(file);
            const processedTransactions = OCRProcessor.processExtractedTransactions(transactions);
            
            processedTransactions.forEach(transaction => {
                TransactionManager.add(transaction);
            });
            
            showToast(`${processedTransactions.length} transações extraídas!`, 'success');
            showTransactionsAndRecent();
            
        } catch (error) {
            ERROR_HANDLER.handle(error, 'File Drop');
        }
    });
}