// Charts Module - VERSÃO SIMPLIFICADA E CORRIGIDA
const ChartsManager = {
    charts: {},
    isInitialized: false,
    
    // Initialize charts
    init: () => {
        console.log('Inicializando ChartsManager...');
        
        if (typeof Chart === 'undefined') {
            console.error('Chart.js não está disponível');
            return false;
        }
        
        console.log('Chart.js disponível, configurando...');
        
        // Configurações básicas do Chart.js
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        
        ChartsManager.isInitialized = true;
        console.log('ChartsManager inicializado com sucesso');
        return true;
    },
    
    // Verificar se está funcionando
    isWorking: () => {
        return typeof Chart !== 'undefined' && ChartsManager.isInitialized;
    },
    
    // Gráfico de categorias (pizza simples)
    generateCategoryChart: () => {
        console.log('Gerando gráfico de categorias...');
        
        const canvas = document.getElementById('categoryChart');
        if (!canvas) {
            console.error('Canvas categoryChart não encontrado');
            return;
        }
        
        if (!ChartsManager.isWorking()) {
            console.error('ChartsManager não está funcionando');
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Chart.js não carregado');
            return;
        }
        
        // Destruir gráfico existente
        if (ChartsManager.charts.categoryChart) {
            ChartsManager.charts.categoryChart.destroy();
            delete ChartsManager.charts.categoryChart;
        }
        
        // Calcular totais por categoria
        const categoryTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.category && transaction.amount > 0) {
                const cat = transaction.category;
                categoryTotals[cat] = (categoryTotals[cat] || 0) + transaction.amount;
            }
        });
        
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);
        
        console.log('Categorias encontradas:', categories);
        console.log('Valores:', amounts);
        
        if (categories.length === 0) {
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Nenhuma categoria com gastos');
            return;
        }
        
        // Cores simples
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
        ];
        
        try {
            console.log('Criando gráfico de pizza...');
            ChartsManager.charts.categoryChart = new Chart(canvas, {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors.slice(0, categories.length),
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
            console.log('Gráfico de categorias criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico de categorias:', error);
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Erro ao criar gráfico');
        }
    },
    
    // Gráfico mensal (barras simples)
    generateMonthChart: () => {
        console.log('Gerando gráfico mensal...');
        
        const canvas = document.getElementById('monthChart');
        if (!canvas) {
            console.error('Canvas monthChart não encontrado');
            return;
        }
        
        if (!ChartsManager.isWorking()) {
            console.error('ChartsManager não está funcionando');
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Chart.js não carregado');
            return;
        }
        
        // Destruir gráfico existente
        if (ChartsManager.charts.monthChart) {
            ChartsManager.charts.monthChart.destroy();
            delete ChartsManager.charts.monthChart;
        }
        
        // Calcular totais mensais
        const monthlyTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const month = transaction.date.substring(0, 7); // YYYY-MM
                monthlyTotals[month] = (monthlyTotals[month] || 0) + transaction.amount;
            }
        });
        
        const months = Object.keys(monthlyTotals).sort();
        const amounts = months.map(month => monthlyTotals[month]);
        
        console.log('Meses encontrados:', months);
        console.log('Valores mensais:', amounts);
        
        if (months.length === 0) {
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Nenhum dado mensal');
            return;
        }
        
        // Converter meses para formato legível
        const monthLabels = months.map(month => {
            const date = new Date(month + '-01');
            return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        });
        
        try {
            console.log('Criando gráfico de barras...');
            ChartsManager.charts.monthChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [{
                        label: 'Gastos Mensais',
                        data: amounts,
                        backgroundColor: '#36A2EB',
                        borderColor: '#36A2EB',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Gráfico mensal criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico mensal:', error);
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Erro ao criar gráfico');
        }
    },
    
    // Gráfico de dias da semana (radar simples)
    generateWeekdayChart: () => {
        console.log('Gerando gráfico de dias da semana...');
        
        const canvas = document.getElementById('weekdayChart');
        if (!canvas) {
            console.error('Canvas weekdayChart não encontrado');
            return;
        }
        
        if (!ChartsManager.isWorking()) {
            console.error('ChartsManager não está funcionando');
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Chart.js não carregado');
            return;
        }
        
        // Destruir gráfico existente
        if (ChartsManager.charts.weekdayChart) {
            ChartsManager.charts.weekdayChart.destroy();
            delete ChartsManager.charts.weekdayChart;
        }
        
        // Calcular totais por dia da semana
        const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // Dom a Sab
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const date = new Date(transaction.date + 'T00:00:00');
                const day = date.getDay();
                weekdayTotals[day] += transaction.amount;
            }
        });
        
        console.log('Totais por dia da semana:', weekdayTotals);
        
        try {
            console.log('Criando gráfico radar...');
            ChartsManager.charts.weekdayChart = new Chart(canvas, {
                type: 'radar',
                data: {
                    labels: weekdayNames,
                    datasets: [{
                        label: 'Gastos por Dia',
                        data: weekdayTotals,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Gráfico de dias da semana criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico de dias da semana:', error);
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Erro ao criar gráfico');
        }
    },
    
    // Gráfico de estabelecimentos (barras horizontais)
    generateEstablishmentChart: () => {
        console.log('Gerando gráfico de estabelecimentos...');
        
        const canvas = document.getElementById('establishmentChart');
        if (!canvas) {
            console.error('Canvas establishmentChart não encontrado');
            return;
        }
        
        if (!ChartsManager.isWorking()) {
            console.error('ChartsManager não está funcionando');
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Chart.js não carregado');
            return;
        }
        
        // Destruir gráfico existente
        if (ChartsManager.charts.establishmentChart) {
            ChartsManager.charts.establishmentChart.destroy();
            delete ChartsManager.charts.establishmentChart;
        }
        
        // Calcular totais por estabelecimento
        const establishmentTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const name = transaction.name;
                establishmentTotals[name] = (establishmentTotals[name] || 0) + transaction.amount;
            }
        });
        
        // Top 10 estabelecimentos
        const topEstablishments = Object.entries(establishmentTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        console.log('Top estabelecimentos:', topEstablishments);
        
        if (topEstablishments.length === 0) {
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Nenhum estabelecimento');
            return;
        }
        
        const labels = topEstablishments.map(([name]) => 
            name.length > 20 ? name.substring(0, 20) + '...' : name
        );
        const amounts = topEstablishments.map(([_, amount]) => amount);
        
        try {
            console.log('Criando gráfico de estabelecimentos...');
            ChartsManager.charts.establishmentChart = new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos',
                        data: amounts,
                        backgroundColor: '#FFCE56',
                        borderColor: '#FFCE56',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true
                        }
                    }
                }
            });
            console.log('Gráfico de estabelecimentos criado com sucesso');
        } catch (error) {
            console.error('Erro ao criar gráfico de estabelecimentos:', error);
            ChartsManager.showNoDataMessage(canvas.getContext('2d'), 'Erro ao criar gráfico');
        }
    },
    
    // Mostrar mensagem quando não há dados
    showNoDataMessage: (ctx, message) => {
        const canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    },
    
    // Atualizar todos os gráficos
    refreshAll: () => {
        console.log('Atualizando todos os gráficos...');
        
        if (!ChartsManager.isWorking()) {
            console.error('ChartsManager não está funcionando - não é possível atualizar gráficos');
            return;
        }
        
        try {
            ChartsManager.generateCategoryChart();
            ChartsManager.generateMonthChart();
            ChartsManager.generateWeekdayChart();
            ChartsManager.generateEstablishmentChart();
            console.log('Todos os gráficos atualizados com sucesso');
        } catch (error) {
            console.error('Erro ao atualizar gráficos:', error);
        }
    }
};

// Aguardar Chart.js carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, verificando Chart.js...');
    
    // Tentar inicializar imediatamente
    if (typeof Chart !== 'undefined') {
        console.log('Chart.js já disponível');
        ChartsManager.init();
    } else {
        console.log('Aguardando Chart.js carregar...');
        
        // Verificar a cada 100ms por até 10 segundos
        let attempts = 0;
        const maxAttempts = 100;
        
        const checkChart = setInterval(() => {
            attempts++;
            
            if (typeof Chart !== 'undefined') {
                console.log('Chart.js carregado após', attempts * 100, 'ms');
                ChartsManager.init();
                clearInterval(checkChart);
            } else if (attempts >= maxAttempts) {
                console.error('Chart.js não carregou após 10 segundos');
                clearInterval(checkChart);
            }
        }, 100);
    }
});

// Função global para mostrar gráficos
window.showCharts = () => {
    console.log('showCharts chamado');
    
    hideAllScreens();
    document.getElementById('charts-area').classList.remove('hidden');
    
    // Aguardar um pouco para o DOM se ajustar
    setTimeout(() => {
        if (ChartsManager.isWorking()) {
            console.log('Atualizando gráficos...');
            ChartsManager.refreshAll();
        } else {
            console.error('ChartsManager não está funcionando');
            showToast('Chart.js não carregado. Recarregue a página.', 'error');
        }
    }, 300);
};

// Função global para atualizar gráficos
window.refreshCharts = () => {
    console.log('refreshCharts chamado');
    
    if (ChartsManager.isWorking()) {
        ChartsManager.refreshAll();
    } else {
        console.error('ChartsManager não está funcionando');
        showToast('Chart.js não está disponível', 'error');
    }
};

// Exportar para uso global
window.ChartsManager = ChartsManager;

console.log('Charts.js carregado');