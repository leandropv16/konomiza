// Utility Functions Module - CORRIGIDO
const UtilsExtended = {
    // Loading overlay functions
    showLoading: (message = 'Carregando...') => {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) {
            overlay.classList.remove('hidden');
            if (loadingText) {
                loadingText.textContent = message;
            }
        }
    },
    
    hideLoading: () => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },
    
    // Modal functions
    showModal: (title, content) => {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        
        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = title;
            modalBody.innerHTML = content;
            modal.classList.add('active');
            
            // Adjust for mobile
            if (typeof MobileManager !== 'undefined' && MobileManager.isMobile()) {
                MobileManager.adjustModalForMobile();
            }
        }
    },
    
    closeModal: () => {
        const modal = document.getElementById('modal');
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    // Navigation functions
    hideAllScreens: () => {
        const screens = [
            'home-screen', 'upload-area', 'transaction-list', 
            'charts-area', 'goals-screen', 'transactions-recent-screen'
        ];
        
        screens.forEach(screenId => {
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.classList.add('hidden');
            }
        });
    },
    
    showHome: () => {
        UtilsExtended.hideAllScreens();
        const homeScreen = document.getElementById('home-screen');
        if (homeScreen) {
            homeScreen.classList.remove('hidden');
            updateHomeStats();
        }
    },
    
    showUploadArea: () => {
        UtilsExtended.hideAllScreens();
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.classList.remove('hidden');
        }
    },
    
    // Theme functions
    toggleTheme: () => {
        STATE.currentTheme = STATE.currentTheme === 'light' ? 'dark' : 'light';
        document.body.setAttribute('data-theme', STATE.currentTheme);
        
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.textContent = STATE.currentTheme === 'light' ? '🌙' : '☀️';
        }
        
        DataManager.save(CONFIG.STORAGE_KEYS.THEME, STATE.currentTheme);
        eventEmitter.emit('themeChanged', STATE.currentTheme);
    },
    
    // Ribbon functions
    showRibbonTab: (tabName) => {
        // Remove active class from all tabs
        document.querySelectorAll('.ribbon-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all content
        document.querySelectorAll('.ribbon-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Activate selected tab and content
        const selectedTab = document.querySelector(`[onclick="showRibbonTab('${tabName}')"]`);
        const selectedContent = document.getElementById(`ribbon-${tabName}`);
        
        if (selectedTab) selectedTab.classList.add('active');
        if (selectedContent) selectedContent.classList.add('active');
    },
    
    // Search functions
    toggleSearchPopup: () => {
        STATE.searchPopupOpen = !STATE.searchPopupOpen;
        const popup = document.getElementById('searchPopup');
        
        if (popup) {
            if (STATE.searchPopupOpen) {
                popup.classList.add('active');
                const queryInput = document.getElementById('aiQuery');
                if (queryInput) {
                    setTimeout(() => queryInput.focus(), 300);
                }
            } else {
                popup.classList.remove('active');
            }
        }
    },
    
    closeSearchPopup: () => {
        STATE.searchPopupOpen = false;
        const popup = document.getElementById('searchPopup');
        if (popup) {
            popup.classList.remove('active');
        }
    },
    
    // AI functions
    queryAI: async () => {
        const query = document.getElementById('aiQuery').value.trim();
        const responseDiv = document.getElementById('aiResponse');
        
        if (!query) {
            responseDiv.innerHTML = '<div class="search-result">Por favor, digite sua pergunta.</div>';
            return;
        }
        
        responseDiv.innerHTML = '<div class="search-result">🤔 Analisando seus dados...</div>';
        
        try {
            if (typeof AIAssistant !== 'undefined') {
                const response = await AIAssistant.query(query);
                responseDiv.innerHTML = `<div class="search-result"><strong>💡 Resposta:</strong><br>${response}</div>`;
            } else {
                responseDiv.innerHTML = '<div class="search-result">❌ Assistente IA não disponível.</div>';
            }
        } catch (error) {
            responseDiv.innerHTML = '<div class="search-result">❌ Erro ao consultar IA.</div>';
            if (typeof ERROR_HANDLER !== 'undefined') {
                ERROR_HANDLER.handle(error, 'AI Query');
            }
        }
    },
    
    startVoiceRecognition: () => {
        if (typeof VoiceRecognition !== 'undefined') {
            VoiceRecognition.start();
        } else {
            showToast('Reconhecimento de voz não disponível', 'error');
        }
    },
    
    // Statistics functions
    updateHomeStats: () => {
        if (typeof TransactionManager !== 'undefined') {
            const stats = TransactionManager.getStatistics();
            
            const elements = {
                totalTransactions: stats.count,
                totalSpentHome: UTILS.formatCurrency(stats.total),
                categoriesCount: Object.keys(STATE.categories).length
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }
    },
    
    // Duplicate detection functions
    showDuplicateChecker: () => {
        if (typeof DuplicateManager !== 'undefined') {
            DuplicateManager.showDuplicateManager();
        } else {
            showToast('Sistema de duplicatas não disponível', 'error');
        }
    },
    
    removeAllDuplicates: () => {
        if (!confirm('Tem certeza que deseja remover todas as duplicatas? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        const duplicates = [];
        const processedIds = new Set();
        
        STATE.transactions.forEach(transaction => {
            if (processedIds.has(transaction.id)) return;
            
            const similarTransactions = STATE.transactions.filter(t => 
                t.id !== transaction.id && 
                !processedIds.has(t.id) &&
                t.name.toLowerCase().trim() === transaction.name.toLowerCase().trim() &&
                Math.abs(t.amount - transaction.amount) < 0.01 &&
                Math.abs(new Date(t.date) - new Date(transaction.date)) < 24 * 60 * 60 * 1000
            );
            
            if (similarTransactions.length > 0) {
                duplicates.push(...similarTransactions);
                processedIds.add(transaction.id);
                similarTransactions.forEach(t => processedIds.add(t.id));
            }
        });
        
        let removedCount = 0;
        duplicates.forEach(duplicate => {
            if (typeof TransactionManager !== 'undefined' && TransactionManager.delete(duplicate.id)) {
                removedCount++;
            }
        });
        
        showToast(`${removedCount} duplicatas removidas!`, 'success');
        UtilsExtended.updateHomeStats();
        if (typeof updateGoalsDisplay !== 'undefined') {
            updateGoalsDisplay();
        }
    },
    
    // AI History functions
    showAIHistory: () => {
        if (typeof AIAssistant === 'undefined') {
            showToast('Histórico de IA não disponível', 'error');
            return;
        }
        
        const history = AIAssistant.getHistory();
        
        if (history.length === 0) {
            showToast('Nenhum histórico de IA disponível', 'info');
            return;
        }
        
        let content = `
            <div class="ai-history">
                <div class="ai-history-header">
                    <h4>Histórico de Conversas com IA</h4>
                    <button class="btn btn-sm btn-outline" onclick="AIAssistant.clearHistory(); closeModal();">
                        Limpar Histórico
                    </button>
                </div>
                <div class="ai-history-list">
        `;
        
        history.forEach(interaction => {
            content += `
                <div class="ai-history-item">
                    <div class="ai-question">
                        <strong>Pergunta:</strong> ${interaction.question}
                    </div>
                    <div class="ai-answer">
                        <strong>Resposta:</strong> ${interaction.answer}
                    </div>
                    <div class="ai-timestamp">
                        ${UTILS.formatDateTime(interaction.timestamp)}
                    </div>
                </div>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
        
        UtilsExtended.showModal('Histórico da IA', content);
    },
    
    // Settings functions
    showAISettings: () => {
        const content = `
            <div class="ai-settings">
                <h4>Configurações de IA</h4>
                
                <div class="settings-group">
                    <h5>Categorização Inteligente</h5>
                    <label class="settings-toggle">
                        <input type="checkbox" ${STATE.settings.smartCategorization ? 'checked' : ''} 
                               onchange="UtilsExtended.updateSetting('smartCategorization', this.checked)">
                        <span>Ativar categorização automática</span>
                    </label>
                    <p class="settings-description">
                        A IA tentará categorizar automaticamente novas transações com base em padrões aprendidos.
                    </p>
                </div>
                
                <div class="settings-group">
                    <h5>Detecção de Duplicatas</h5>
                    <label class="settings-toggle">
                        <input type="checkbox" ${STATE.settings.autoDetectDuplicates ? 'checked' : ''} 
                               onchange="UtilsExtended.updateSetting('autoDetectDuplicates', this.checked)">
                        <span>Detectar duplicatas automaticamente</span>
                    </label>
                    <p class="settings-description">
                        O sistema verificará automaticamente por transações duplicadas ao adicionar novas entradas.
                    </p>
                </div>
                
                <div class="settings-group">
                    <h5>Reconhecimento de Voz</h5>
                    <label class="settings-toggle">
                        <input type="checkbox" ${STATE.settings.voiceEnabled ? 'checked' : ''} 
                               onchange="UtilsExtended.updateSetting('voiceEnabled', this.checked)">
                        <span>Ativar reconhecimento de voz</span>
                    </label>
                    <p class="settings-description">
                        Permite usar comandos de voz para fazer perguntas à IA.
                    </p>
                </div>
                
                <div class="settings-group">
                    <h5>Notificações</h5>
                    <label class="settings-toggle">
                        <input type="checkbox" ${STATE.settings.notifications ? 'checked' : ''} 
                               onchange="UtilsExtended.updateSetting('notifications', this.checked)">
                        <span>Ativar notificações</span>
                    </label>
                    <p class="settings-description">
                        Receba alertas sobre metas, gastos e outras informações importantes.
                    </p>
                </div>
                
                <div class="settings-actions">
                    <button class="btn btn-outline" onclick="UtilsExtended.resetSettings()">
                        Restaurar Padrões
                    </button>
                </div>
            </div>
        `;
        
        UtilsExtended.showModal('Configurações de IA', content);
    },
    
    updateSetting: (key, value) => {
        STATE.settings[key] = value;
        if (typeof DataManager !== 'undefined') {
            DataManager.save(CONFIG.STORAGE_KEYS.SETTINGS, STATE.settings);
        }
        
        // Apply setting changes
        if (key === 'voiceEnabled') {
            if (value && typeof VoiceRecognition !== 'undefined') {
                VoiceRecognition.init();
            }
        }
        
        showToast('Configuração atualizada!', 'success');
    },
    
    resetSettings: () => {
        if (confirm('Deseja restaurar todas as configurações para os valores padrão?')) {
            STATE.settings = {
                autoDetectDuplicates: true,
                smartCategorization: true,
                voiceEnabled: true,
                notifications: true
            };
            
            if (typeof DataManager !== 'undefined') {
                DataManager.save(CONFIG.STORAGE_KEYS.SETTINGS, STATE.settings);
            }
            showToast('Configurações restauradas!', 'success');
            UtilsExtended.closeModal();
        }
    },
    
    showDuplicateSettings: () => {
        UtilsExtended.showDuplicateChecker();
    }
};

// Global function assignments
window.showLoading = UtilsExtended.showLoading;
window.hideLoading = UtilsExtended.hideLoading;
window.showModal = UtilsExtended.showModal;
window.closeModal = UtilsExtended.closeModal;
window.hideAllScreens = UtilsExtended.hideAllScreens;
window.showHome = UtilsExtended.showHome;
window.showUploadArea = UtilsExtended.showUploadArea;
// showCharts e showGoals são definidos no index.html após carregamento
window.toggleTheme = UtilsExtended.toggleTheme;
window.showRibbonTab = UtilsExtended.showRibbonTab;
window.toggleSearchPopup = UtilsExtended.toggleSearchPopup;
window.closeSearchPopup = UtilsExtended.closeSearchPopup;
window.queryAI = UtilsExtended.queryAI;
window.startVoiceRecognition = UtilsExtended.startVoiceRecognition;
window.updateHomeStats = UtilsExtended.updateHomeStats;
window.showDuplicateChecker = UtilsExtended.showDuplicateChecker;
window.showAIHistory = UtilsExtended.showAIHistory;
window.showAISettings = UtilsExtended.showAISettings;
window.showDuplicateSettings = UtilsExtended.showDuplicateSettings;

// Funções básicas que podem ser usadas imediatamente
window.showCategories = () => {
    if (typeof CategoryUI !== 'undefined') {
        CategoryUI.show();
    } else {
        showToast('Sistema de categorias não disponível', 'error');
    }
};

window.showColors = () => {
    if (typeof CategoryUI !== 'undefined') {
        CategoryUI.show();
    } else {
        showToast('Sistema de cores não disponível', 'error');
    }
};

window.refreshCharts = () => {
    if (typeof ChartsManager !== 'undefined' && ChartsManager.refreshAll) {
        ChartsManager.refreshAll();
    }
};

// Função para mostrar relatórios
window.showReports = () => {
    showToast('Funcionalidade de relatórios em desenvolvimento', 'info');
};

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modal');
    if (e.target === modal) {
        UtilsExtended.closeModal();
    }
});

// Close search popup when clicking outside
document.addEventListener('click', (e) => {
    const searchPopup = document.getElementById('searchPopup');
    const floatingSearch = document.querySelector('.floating-search');
    
    if (STATE.searchPopupOpen && 
        !searchPopup.contains(e.target) && 
        !floatingSearch.contains(e.target)) {
        UtilsExtended.closeSearchPopup();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // ESC to close modal or search popup
    if (e.key === 'Escape') {
        if (document.getElementById('modal').classList.contains('active')) {
            UtilsExtended.closeModal();
        } else if (STATE.searchPopupOpen) {
            UtilsExtended.closeSearchPopup();
        }
    }
    
    // Ctrl/Cmd + K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        UtilsExtended.toggleSearchPopup();
    }
    
    // Enter in search input
    if (e.key === 'Enter' && e.target.id === 'aiQuery') {
        UtilsExtended.queryAI();
    }
});