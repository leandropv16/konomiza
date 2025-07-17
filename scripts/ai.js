// AI Assistant Module
const AIAssistant = {
    // Query AI with Gemini
    query: async (question, context = '') => {
        try {
            if (!question.trim()) {
                return 'Por favor, faça uma pergunta.';
            }
            
            // Prepare context with user's financial data
            const financialContext = AIAssistant.prepareFinancialContext();
            const fullContext = `${financialContext}\n\n${context}`;
            
            const response = await fetch(`${CONFIG.GEMINI_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `Você é um assistente financeiro pessoal inteligente do sistema ${CONFIG.APP_NAME}. 
                            
                            Suas funções principais:
                            1. Responder perguntas sobre os gastos e finanças do usuário
                            2. Fornecer insights e análises financeiras
                            3. Dar conselhos sobre gestão financeira
                            4. Responder perguntas gerais quando solicitado
                            5. Ajudar com funcionalidades do sistema
                            6. Adicionar transações quando o usuário disser algo como "gastei X reais em Y"
                            
                            Contexto financeiro do usuário:
                            ${fullContext}
                            
                            Responda sempre em português brasileiro, seja claro, útil e amigável. 
                            Use formatação simples quando necessário.
                            Para valores monetários, use o formato R$ X,XX.
                            
                            Se a pergunta não for sobre finanças, responda de forma útil e educativa.
                            
                            Pergunta do usuário: ${question}`
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 800
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            
            const data = await response.json();
            const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível obter resposta.';
            
            // Save to history
            AIAssistant.saveToHistory(question, aiResponse);
            
            return aiResponse;
            
        } catch (error) {
            console.error('Erro na consulta AI:', error);
            // Fallback to local AI
            return AIAssistant.getLocalResponse(question);
        }
    },
    
    // Prepare financial context for AI
    prepareFinancialContext: () => {
        const stats = TransactionManager.getStatistics();
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        const recentTransactions = STATE.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        const topCategories = Object.entries(stats.categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        return `
DADOS FINANCEIROS DO USUÁRIO:

Meta Mensal: ${UTILS.formatCurrency(STATE.monthlyGoals.goal)}
Gasto Atual do Mês: ${UTILS.formatCurrency(monthlyTotal)}
Gasto Total Registrado: ${UTILS.formatCurrency(stats.total)}
Total de Transações: ${stats.count}
Média por Transação: ${UTILS.formatCurrency(stats.average)}
Maior Gasto: ${UTILS.formatCurrency(stats.largestExpense)}
Menor Gasto: ${UTILS.formatCurrency(stats.smallestExpense)}

Dias para Fechamento: ${AIAssistant.calculateDaysToClose()}
Melhor Dia para Compras: ${STATE.monthlyGoals.bestBuyDate}

Top 5 Categorias:
${topCategories.map(([cat, amount]) => `- ${cat}: ${UTILS.formatCurrency(amount)}`).join('\n')}

Transações Recentes:
${recentTransactions.map(t => `- ${UTILS.formatDate(t.date)}: ${t.name} - ${UTILS.formatCurrency(t.amount)} (${t.category || 'Sem categoria'})`).join('\n')}

Categorias Disponíveis: ${Object.keys(STATE.categories).join(', ')}
        `.trim();
    },
    
    // Calculate days to close
    calculateDaysToClose: () => {
        const today = new Date();
        const currentDay = today.getDate();
        const dueDate = STATE.monthlyGoals.dueDate;
        
        if (currentDay <= dueDate) {
            return dueDate - currentDay;
        } else {
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDate);
            return Math.ceil((nextMonth - today) / (1000 * 60 * 60 * 24));
        }
    },
    
    // Local AI fallback responses
    getLocalResponse: (question) => {
        const query = question.toLowerCase();
        const stats = TransactionManager.getStatistics();
        
        // Handle expense input like "gastei 50 reais no bar"
        const expenseMatch = query.match(/gastei\s+(\d+(?:,\d+)?)\s*reais?\s+(?:no?|na|em)\s+(.+)/);
        if (expenseMatch) {
            const amount = parseFloat(expenseMatch[1].replace(',', '.'));
            const place = expenseMatch[2].trim();
            
            // Auto-categorize common places
            let category = 'Outros';
            if (place.includes('bar') || place.includes('restaurante') || place.includes('lanchonete')) {
                category = 'Alimentação';
            } else if (place.includes('posto') || place.includes('combustível')) {
                category = 'Transporte';
            } else if (place.includes('cinema') || place.includes('show') || place.includes('festa')) {
                category = 'Lazer';
            } else if (place.includes('farmácia') || place.includes('médico')) {
                category = 'Saúde';
            }
            
            // Add transaction
            const transaction = {
                name: place,
                amount: amount,
                date: new Date().toISOString().split('T')[0],
                category: category,
                source: 'ai-chat'
            };
            
            if (typeof TransactionManager !== 'undefined') {
                TransactionManager.add(transaction);
                return `Transação adicionada: ${UTILS.formatCurrency(amount)} em "${place}" na categoria ${category}. ✅`;
            }
        }
        
        // Spending patterns
        if (query.includes('gastei') || query.includes('gasto')) {
            if (query.includes('mês') || query.includes('mensal')) {
                const currentMonth = new Date().toISOString().substring(0, 7);
                const monthlyTransactions = TransactionManager.getByDateRange(
                    `${currentMonth}-01`, 
                    `${currentMonth}-31`
                );
                const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
                return `Este mês você gastou ${UTILS.formatCurrency(monthlyTotal)} em ${monthlyTransactions.length} transações.`;
            }
            
            // Category-specific spending
            if (query.includes('lazer')) {
                const currentMonth = new Date().toISOString().substring(0, 7);
                const monthlyTransactions = TransactionManager.getByDateRange(
                    `${currentMonth}-01`, 
                    `${currentMonth}-31`
                );
                const lazerTotal = monthlyTransactions
                    .filter(t => t.category === 'Lazer')
                    .reduce((sum, t) => sum + t.amount, 0);
                return `Este mês você gastou ${UTILS.formatCurrency(lazerTotal)} com lazer.`;
            }
            
            if (query.includes('alimentação') || query.includes('comida') || query.includes('restaurante')) {
                const currentMonth = new Date().toISOString().substring(0, 7);
                const monthlyTransactions = TransactionManager.getByDateRange(
                    `${currentMonth}-01`, 
                    `${currentMonth}-31`
                );
                const alimentacaoTotal = monthlyTransactions
                    .filter(t => t.category === 'Alimentação')
                    .reduce((sum, t) => sum + t.amount, 0);
                return `Este mês você gastou ${UTILS.formatCurrency(alimentacaoTotal)} com alimentação.`;
            }
            
            // Specific establishment
            for (const transaction of STATE.transactions) {
                if (query.includes(transaction.name.toLowerCase())) {
                    const establishmentTotal = STATE.transactions
                        .filter(t => t.name.toLowerCase().includes(transaction.name.toLowerCase()))
                        .reduce((sum, t) => sum + t.amount, 0);
                    return `Você gastou ${UTILS.formatCurrency(establishmentTotal)} no ${transaction.name}.`;
                }
            }
            
            return `Seu gasto total é ${UTILS.formatCurrency(stats.total)} em ${stats.count} transações.`;
        }
        
        // Categories
        if (query.includes('categoria')) {
            const categories = Object.entries(stats.categoryTotals)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            if (categories.length === 0) {
                return 'Você ainda não tem gastos categorizados.';
            }
            
            return `Suas principais categorias são:<br>${categories.map(([cat, amount]) => 
                `• ${cat}: ${UTILS.formatCurrency(amount)}`
            ).join('<br>')}`;
        }
        
        // Goals
        if (query.includes('meta') || query.includes('objetivo')) {
            const currentMonth = new Date().toISOString().substring(0, 7);
            const monthlyTransactions = TransactionManager.getByDateRange(
                `${currentMonth}-01`, 
                `${currentMonth}-31`
            );
            const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
            const remaining = Math.max(0, STATE.monthlyGoals.goal - monthlyTotal);
            const progress = STATE.monthlyGoals.goal > 0 ? (monthlyTotal / STATE.monthlyGoals.goal) * 100 : 0;
            
            return `Sua meta mensal é ${UTILS.formatCurrency(STATE.monthlyGoals.goal)}. 
                    Você já gastou ${UTILS.formatCurrency(monthlyTotal)} (${progress.toFixed(1)}%). 
                    Ainda pode gastar ${UTILS.formatCurrency(remaining)}.`;
        }
        
        // Time-based questions
        if (query.includes('hoje') || query.includes('ontem')) {
            const today = new Date().toISOString().substring(0, 10);
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
            const targetDate = query.includes('hoje') ? today : yesterday;
            
            const dayTransactions = STATE.transactions.filter(t => t.date.startsWith(targetDate));
            const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            if (dayTransactions.length === 0) {
                return `Nenhum gasto registrado ${query.includes('hoje') ? 'hoje' : 'ontem'}.`;
            }
            
            return `${query.includes('hoje') ? 'Hoje' : 'Ontem'} você gastou ${UTILS.formatCurrency(dayTotal)} em ${dayTransactions.length} transações.`;
        }
        
        // General help
        if (query.includes('ajuda') || query.includes('help')) {
            return `Posso ajudar você com:<br>
                    • Análise de gastos e categorias<br>
                    • Acompanhamento de metas<br>
                    • Relatórios financeiros<br>
                    • Dicas de economia<br>
                    • Funcionalidades do sistema<br><br>
                    Pergunte algo como "quanto gastei este mês?" ou "qual minha categoria que mais gasto?"`;
        }
        
        // Weather (example of general question)
        if (query.includes('tempo') || query.includes('clima')) {
            return `Não tenho acesso a informações meteorológicas, mas posso ajudar com suas finanças! 
                    Que tal verificar seus gastos recentes ou definir uma meta de economia?`;
        }
        
        // Default response
        return `Desculpe, não entendi sua pergunta. Posso ajudar com informações sobre seus gastos, 
                categorias, metas e análises financeiras. Tente perguntar sobre um estabelecimento específico 
                ou categoria de gastos.`;
    },
    
    // Save AI interaction to history
    saveToHistory: (question, answer) => {
        const interaction = {
            id: UTILS.generateId(),
            question: question.trim(),
            answer: answer.trim(),
            timestamp: new Date().toISOString(),
            context: 'financial'
        };
        
        STATE.aiHistory.unshift(interaction);
        
        // Keep only last 20 interactions
        if (STATE.aiHistory.length > CONFIG.MAX_AI_HISTORY) {
            STATE.aiHistory = STATE.aiHistory.slice(0, CONFIG.MAX_AI_HISTORY);
        }
        
        DataManager.save(CONFIG.STORAGE_KEYS.AI_HISTORY, STATE.aiHistory);
    },
    
    // Get AI history
    getHistory: () => {
        return STATE.aiHistory;
    },
    
    // Clear AI history
    clearHistory: () => {
        STATE.aiHistory = [];
        DataManager.save(CONFIG.STORAGE_KEYS.AI_HISTORY, STATE.aiHistory);
        showToast('Histórico da IA limpo', 'success');
    },
    
    // Get AI suggestions based on transaction patterns
    getSuggestions: () => {
        const suggestions = [];
        const stats = TransactionManager.getStatistics();
        
        // High spending category
        const topCategory = Object.entries(stats.categoryTotals)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topCategory) {
            suggestions.push({
                type: 'warning',
                title: 'Categoria com Maior Gasto',
                message: `Você gastou ${UTILS.formatCurrency(topCategory[1])} em ${topCategory[0]}. Considere revisar esses gastos.`
            });
        }
        
        // Goal progress
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        const monthlyTotal = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
        const progress = STATE.monthlyGoals.goal > 0 ? (monthlyTotal / STATE.monthlyGoals.goal) * 100 : 0;
        
        if (progress > 80) {
            suggestions.push({
                type: 'danger',
                title: 'Meta Quase Atingida',
                message: `Você já gastou ${progress.toFixed(1)}% da sua meta mensal. Cuidado com os próximos gastos.`
            });
        } else if (progress > 50) {
            suggestions.push({
                type: 'info',
                title: 'Meta em Andamento',
                message: `Você está no meio do caminho da sua meta mensal (${progress.toFixed(1)}%).`
            });
        }
        
        // Frequent transactions
        const transactionCounts = {};
        STATE.transactions.forEach(t => {
            transactionCounts[t.name] = (transactionCounts[t.name] || 0) + 1;
        });
        
        const frequentTransaction = Object.entries(transactionCounts)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (frequentTransaction && frequentTransaction[1] > 3) {
            suggestions.push({
                type: 'info',
                title: 'Transação Frequente',
                message: `Você tem ${frequentTransaction[1]} transações em "${frequentTransaction[0]}". Considere criar uma categoria específica.`
            });
        }
        
        return suggestions;
    }
};

// Voice Recognition for AI
const VoiceRecognition = {
    recognition: null,
    isListening: false,
    
    // Initialize voice recognition
    init: () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            VoiceRecognition.recognition = new SpeechRecognition();
            
            VoiceRecognition.recognition.continuous = false;
            VoiceRecognition.recognition.interimResults = false;
            VoiceRecognition.recognition.lang = 'pt-BR';
            
            VoiceRecognition.recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                document.getElementById('aiQuery').value = result;
                VoiceRecognition.stop();
                
                // Auto-query if result is clear
                if (result.length > 5) {
                    setTimeout(() => queryAI(), 500);
                }
            };
            
            VoiceRecognition.recognition.onerror = (event) => {
                console.error('Voice recognition error:', event.error);
                VoiceRecognition.stop();
                showToast('Erro no reconhecimento de voz', 'error');
            };
            
            VoiceRecognition.recognition.onend = () => {
                VoiceRecognition.stop();
            };
            
            return true;
        }
        
        return false;
    },
    
    // Start voice recognition
    start: () => {
        if (!VoiceRecognition.recognition) {
            showToast('Reconhecimento de voz não disponível', 'error');
            return;
        }
        
        if (VoiceRecognition.isListening) {
            VoiceRecognition.stop();
            return;
        }
        
        VoiceRecognition.isListening = true;
        VoiceRecognition.recognition.start();
        
        // Update UI
        const micBtn = document.querySelector('#micIcon');
        const micButton = document.querySelector('.mic-btn');
        if (micBtn) micBtn.textContent = '🔴';
        if (micButton) micButton.classList.add('recording');
        
        showToast('Fale agora...', 'info', 1000);
    },
    
    // Stop voice recognition
    stop: () => {
        VoiceRecognition.isListening = false;
        
        // Update UI
        const micBtn = document.querySelector('#micIcon');
        const micButton = document.querySelector('.mic-btn');
        if (micBtn) micBtn.textContent = '🎤';
        if (micButton) micButton.classList.remove('recording');
    }
};

// Auto-suggestions based on AI analysis
const AutoSuggestions = {
    // Get suggestions for transaction categorization
    getCategorysuggestion: (transactionName) => {
        const name = transactionName.toLowerCase();
        
        // Check learned categories
        if (STATE.learnedCategories[name]) {
            return STATE.learnedCategories[name];
        }
        
        // Check patterns
        for (const [category, data] of Object.entries(CONFIG.DEFAULT_CATEGORIES)) {
            if (data.patterns) {
                for (const pattern of data.patterns) {
                    if (name.includes(pattern)) {
                        return {
                            category,
                            confidence: 0.8,
                            reason: `Padrão detectado: "${pattern}"`
                        };
                    }
                }
            }
        }
        
        return null;
    },
    
    // Get spending insights
    getSpendingInsights: () => {
        const insights = [];
        const stats = TransactionManager.getStatistics();
        
        // Day of week analysis
        const dayTotals = {};
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        STATE.transactions.forEach(t => {
            const day = new Date(t.date).getDay();
            dayTotals[day] = (dayTotals[day] || 0) + t.amount;
        });
        
        const topDay = Object.entries(dayTotals)
            .sort((a, b) => b[1] - a[1])[0];
        
        if (topDay) {
            insights.push({
                type: 'dayOfWeek',
                title: 'Dia da Semana com Mais Gastos',
                message: `Você gasta mais às ${dayNames[topDay[0]]}s: ${UTILS.formatCurrency(topDay[1])}`
            });
        }
        
        // Monthly trend
        const monthlyTotals = {};
        STATE.transactions.forEach(t => {
            const month = t.date.substring(0, 7);
            monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount;
        });
        
        const months = Object.keys(monthlyTotals).sort();
        if (months.length >= 2) {
            const current = monthlyTotals[months[months.length - 1]];
            const previous = monthlyTotals[months[months.length - 2]];
            const change = ((current - previous) / previous) * 100;
            
            insights.push({
                type: 'trend',
                title: 'Tendência Mensal',
                message: `Seus gastos ${change > 0 ? 'aumentaram' : 'diminuíram'} ${Math.abs(change).toFixed(1)}% em relação ao mês anterior`
            });
        }
        
        return insights;
    }
};

// Initialize voice recognition when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (STATE.settings.voiceEnabled) {
        VoiceRecognition.init();
    }
});