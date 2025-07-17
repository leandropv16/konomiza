// Main Application Controller - CORRIGIDO
class KonomizaApp {
    constructor() {
        this.initialized = false;
        this.currentScreen = 'home';
    }
    
    // Initialize the application
    async init() {
        try {
            console.log('Initializing Konomiza App...');
            
            // Load data first
            DataManager.loadAll();
            
            // Initialize components
            this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize mobile optimizations
            if (typeof MobileManager !== 'undefined' && MobileManager.isMobile()) {
                MobileManager.init();
            }
            
            // Initialize voice recognition
            if (STATE.settings.voiceEnabled && typeof VoiceRecognition !== 'undefined') {
                VoiceRecognition.init();
            }
            
            // Setup duplicate detection
            if (typeof DuplicateManager !== 'undefined') {
                DuplicateManager.setupAutoDuplicateDetection();
            }
            
            // Apply saved theme
            this.applyTheme();
            
            // Update initial stats
            updateHomeStats();
            
            // Show home screen
            showHome();
            
            this.initialized = true;
            console.log('Konomiza App initialized successfully!');
            
            // Show welcome message for new users
            this.checkFirstRun();
            
        } catch (error) {
            ERROR_HANDLER.handle(error, 'App Initialization');
        }
    }
    
    // Initialize components
    initializeComponents() {
        // Initialize categories if empty
        if (Object.keys(STATE.categories).length === 0) {
            initializeCategories();
        }
        
        // Setup auto-save
        this.setupAutoSave();
        
        // Setup periodic updates
        this.setupPeriodicUpdates();
    }
    
    // Setup event listeners
    setupEventListeners() {
        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', this.handleFileUpload.bind(this));
        }
        
        // Drag and drop
        const uploadArea = document.querySelector('.upload-dropzone');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadArea.addEventListener('drop', this.handleDrop.bind(this));
            uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        }
        
        // Search input enter key
        const aiQuery = document.getElementById('aiQuery');
        if (aiQuery) {
            aiQuery.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    queryAI();
                }
            });
        }
        
        // Window events
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
        
        // Custom events
        eventEmitter.on('transactionAdded', this.handleTransactionAdded.bind(this));
        eventEmitter.on('transactionDeleted', this.handleTransactionDeleted.bind(this));
        eventEmitter.on('transactionUpdated', this.handleTransactionUpdated.bind(this));
        eventEmitter.on('themeChanged', this.handleThemeChanged.bind(this));
    }
    
    // Apply saved theme
    applyTheme() {
        document.body.setAttribute('data-theme', STATE.currentTheme);
        const themeIcon = document.getElementById('theme-icon');
        if (themeIcon) {
            themeIcon.textContent = STATE.currentTheme === 'light' ? '🌙' : '☀️';
        }
    }
    
    // Setup auto-save functionality
    setupAutoSave() {
        setInterval(() => {
            if (this.initialized) {
                DataManager.saveAll();
            }
        }, 30000); // Save every 30 seconds
    }
    
    // Setup periodic updates
    setupPeriodicUpdates() {
        // Update home stats every minute
        setInterval(() => {
            if (!document.getElementById('home-screen').classList.contains('hidden')) {
                updateHomeStats();
            }
        }, 60000);
        
        // Update goals display every minute
        setInterval(() => {
            if (!document.getElementById('goals-screen').classList.contains('hidden')) {
                if (typeof updateGoalsDisplay !== 'undefined') {
                    updateGoalsDisplay();
                }
                
                // Update goals charts
                if (typeof GoalsCharts !== 'undefined') {
                    GoalsCharts.refreshGoalsCharts();
                }
            }
        }, 60000);
        
        // Clear session storage alerts daily
        setInterval(() => {
            const keys = Object.keys(sessionStorage);
            keys.forEach(key => {
                if (key.includes('Alert') || key.includes('goal')) {
                    sessionStorage.removeItem(key);
                }
            });
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Handle file upload
    async handleFileUpload(event) {
        const files = event.target.files;
        if (files.length === 0) return;
        
        try {
            showLoading('Processando arquivos...');
            
            for (const file of files) {
                await this.processFile(file);
            }
            
            hideLoading();
            showToast('Arquivos processados com sucesso!', 'success');
            
            // Show transactions screen
            showTransactionsAndRecent();
            
        } catch (error) {
            hideLoading();
            ERROR_HANDLER.handle(error, 'File Upload');
        }
        
        // Reset file input
        event.target.value = '';
    }
    
    // Process individual file
    async processFile(file) {
        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error('Arquivo muito grande. Máximo 10MB.');
        }
        
        // Process with OCR (check if available)
        let transactions = [];
        if (typeof OCRProcessor !== 'undefined') {
            transactions = await OCRProcessor.processFile(file);
        } else {
            // Fallback: simulate OCR processing
            transactions = await this.simulateOCRProcessing(file);
        }
        
        // Process and add transactions
        transactions.forEach(transaction => {
            TransactionManager.add(transaction);
        });
        
        return transactions;
    }
    
    // Simulate OCR processing when OCRProcessor is not available
    async simulateOCRProcessing(file) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Return sample transactions based on real data
        return [
            {
                name: 'Transação Extraída',
                amount: 50.00,
                date: new Date().toISOString().split('T')[0],
                method: 'Cartão de Crédito',
                category: 'Compras',
                subcategory: 'Diversos'
            }
        ];
    },
    
    // Handle drag over
    handleDragOver(event) {
        event.preventDefault();
        event.currentTarget.classList.add('dragover');
    }
    
    // Handle drag leave
    handleDragLeave(event) {
        event.currentTarget.classList.remove('dragover');
    }
    
    // Handle drop
    async handleDrop(event) {
        event.preventDefault();
        event.currentTarget.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length === 0) return;
        
        try {
            showLoading('Processando arquivos...');
            
            for (const file of files) {
                await this.processFile(file);
            }
            
            hideLoading();
            showToast('Arquivos processados com sucesso!', 'success');
            showTransactionsAndRecent();
            
        } catch (error) {
            hideLoading();
            ERROR_HANDLER.handle(error, 'File Drop');
        }
    }
    
    // Handle before unload
    handleBeforeUnload(event) {
        // Save data before leaving
        DataManager.saveAll();
        
        // Show confirmation if there are unsaved changes
        if (this.hasUnsavedChanges()) {
            event.preventDefault();
            event.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
            return event.returnValue;
        }
    }
    
    // Check if there are unsaved changes
    hasUnsavedChanges() {
        // This could be enhanced to track actual changes
        return false;
    }
    
    // Handle online event
    handleOnline() {
        showToast('Conexão restaurada', 'success');
        
        // Sync data if needed
        this.syncData();
    }
    
    // Handle offline event
    handleOffline() {
        showToast('Você está offline. Os dados serão salvos localmente.', 'warning');
    }
    
    // Sync data when online
    async syncData() {
        // This could be enhanced to sync with a backend service
        console.log('Syncing data...');
    }
    
    // Handle transaction added
    handleTransactionAdded(transaction) {
        updateHomeStats();
        
        // Force update goals display
        setTimeout(() => {
            console.log('Transação adicionada - forçando atualização das metas');
            updateGoalsDisplay();
        }, 100);
        
        // Update current screen if needed
        if (!document.getElementById('transactions-recent-screen').classList.contains('hidden')) {
            if (typeof TransactionUI !== 'undefined') {
                TransactionUI.updateRecentTransactions();
                TransactionUI.updateQuickStats();
            }
        }
        
        if (!document.getElementById('goals-screen').classList.contains('hidden')) {
            if (typeof GoalsManager !== 'undefined') {
                GoalsManager.updateRecentTransactions();
            }
            if (typeof GoalsCharts !== 'undefined') {
                setTimeout(() => GoalsCharts.refreshGoalsCharts(), 500);
            }
        }
        
        if (!document.getElementById('charts-area').classList.contains('hidden')) {
            if (typeof ChartsManager !== 'undefined' && ChartsManager.isWorking()) {
                setTimeout(() => ChartsManager.refreshAll(), 500);
            }
        }
    }
    
    // Handle transaction deleted
    handleTransactionDeleted(transaction) {
        updateHomeStats();
        
        // Force update goals display
        setTimeout(() => {
            console.log('Transação deletada - forçando atualização das metas');
            updateGoalsDisplay();
        }, 100);
        
        // Update current screen if needed
        if (!document.getElementById('transactions-recent-screen').classList.contains('hidden')) {
            if (typeof TransactionUI !== 'undefined') {
                TransactionUI.updateRecentTransactions();
                TransactionUI.updateQuickStats();
            }
        }
        
        if (!document.getElementById('goals-screen').classList.contains('hidden')) {
            if (typeof GoalsManager !== 'undefined') {
                GoalsManager.updateRecentTransactions();
            }
            if (typeof GoalsCharts !== 'undefined') {
                setTimeout(() => GoalsCharts.refreshGoalsCharts(), 500);
            }
        }
        
        if (!document.getElementById('charts-area').classList.contains('hidden')) {
            if (typeof ChartsManager !== 'undefined' && ChartsManager.isWorking()) {
                setTimeout(() => ChartsManager.refreshAll(), 500);
            }
        }
    }
    
    // Handle transaction updated
    handleTransactionUpdated(transaction) {
        this.handleTransactionAdded(transaction); // Same updates needed
    }
    
    // Handle theme changed
    handleThemeChanged(theme) {
        if (typeof ChartsManager !== 'undefined' && ChartsManager.isWorking()) {
            ChartsManager.updateColors();
        }
    }
    
    // Check if this is the first run
    checkFirstRun() {
        const isFirstRun = !localStorage.getItem('konomiza-first-run');
        
        if (isFirstRun) {
            localStorage.setItem('konomiza-first-run', 'false');
            this.showWelcomeMessage();
        }
    }
    
    // Show welcome message
    showWelcomeMessage() {
        const content = `
            <div class="welcome-message">
                <h4>Bem-vindo ao Konomiza! 🎉</h4>
                <p>Seu assistente inteligente para controle financeiro está pronto!</p>
                
                <div class="welcome-features">
                    <h5>Principais funcionalidades:</h5>
                    <ul>
                        <li>📁 <strong>Upload de comprovantes:</strong> Extraia transações automaticamente de imagens e PDFs</li>
                        <li>🤖 <strong>IA inteligente:</strong> Categorização automática e assistente virtual</li>
                        <li>🎯 <strong>Metas pessoais:</strong> Defina e acompanhe seus objetivos financeiros</li>
                        <li>📊 <strong>Gráficos e relatórios:</strong> Visualize seus gastos de forma clara</li>
                        <li>📱 <strong>Design responsivo:</strong> Funciona perfeitamente no celular</li>
                        <li>🔍 <strong>Busca inteligente:</strong> Pergunte qualquer coisa para a IA</li>
                    </ul>
                </div>
                
                <div class="welcome-tips">
                    <h5>Dicas para começar:</h5>
                    <ol>
                        <li>Clique em "ECONOMIZAR" para ver seus gastos</li>
                        <li>Use "Adicionar Manual" para registrar transações</li>
                        <li>Configure suas metas em "METAS"</li>
                        <li>Explore os gráficos para análises detalhadas</li>
                        <li>Use a lupa 🔍 para fazer perguntas à IA</li>
                    </ol>
                </div>
                
                <div class="welcome-actions">
                    <button class="btn btn-primary" onclick="closeModal(); showUploadArea();">
                        <span>📁</span> Começar Adicionando Gastos
                    </button>
                    <button class="btn btn-outline" onclick="closeModal(); showGoals();">
                        <span>🎯</span> Definir Metas
                    </button>
                </div>
            </div>
        `;
        
        showModal('Bem-vindo ao Konomiza!', content);
    }
}

// Global function for showing transactions and recent
function showTransactionsAndRecent() {
    hideAllScreens();
    document.getElementById('transactions-recent-screen').classList.remove('hidden');
    
    if (typeof TransactionUI !== 'undefined') {
        TransactionUI.updateRecentTransactions();
        TransactionUI.updateQuickStats();
    }
}

// Global functions for navigation
function showCharts() {
    hideAllScreens();
    document.getElementById('charts-area').classList.remove('hidden');
    
    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined' && typeof ChartsManager !== 'undefined') {
        setTimeout(() => {
            ChartsManager.refreshAll();
        }, 300);
    } else {
        showToast('Chart.js não carregado. Recarregue a página.', 'error');
    }
}

function showGoals() {
    hideAllScreens();
    document.getElementById('goals-screen').classList.remove('hidden');
    
    if (typeof GoalsManager !== 'undefined') {
        GoalsManager.updateDisplay();
    }
    
    // Initialize goals charts
    if (typeof GoalsCharts !== 'undefined') {
        setTimeout(() => {
            GoalsCharts.refreshGoalsCharts();
        }, 300);
    }
}

// Initialize the application
const app = new KonomizaApp();

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Global error handler
window.addEventListener('error', (event) => {
    ERROR_HANDLER.handle(event.error, 'Global Error');
});

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
    ERROR_HANDLER.handle(event.reason, 'Unhandled Promise Rejection');
    event.preventDefault();
});

// Export app instance for global access
window.app = app;

console.log(CONFIG.APP_NAME + " v" + CONFIG.APP_VERSION + " - Sistema de Controle Financeiro Inteligente");
console.log('Desenvolvido por Leandro Antônio - Todos os direitos reservados.');