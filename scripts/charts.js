// Charts Module using Chart.js - CORRIGIDO
const ChartsManager = {
    charts: {},
    
    // Initialize charts
    init: () => {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded - Charts will not work');
            return false;
        }
        
        // Set default chart options
        Chart.defaults.responsive = true;
        Chart.defaults.maintainAspectRatio = false;
        Chart.defaults.plugins.legend.position = 'bottom';
        Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        Chart.defaults.plugins.tooltip.titleColor = '#ffffff';
        Chart.defaults.plugins.tooltip.bodyColor = '#ffffff';
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
        
        // Apply theme colors
        ChartsManager.updateColors();
        
        return true;
    },
    
    // Generate category pie chart
    generateCategoryChart: () => {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) {
            console.warn('Category chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.categoryChart) {
            ChartsManager.charts.categoryChart.destroy();
            delete ChartsManager.charts.categoryChart;
        }
        
        // Calculate category totals
        const categoryTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.category && transaction.amount > 0) {
                categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
            }
        });
        
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);
        
        if (categories.length === 0) {
            ChartsManager.showNoDataMessage(ctx, 'Nenhuma categoria com gastos');
            return;
        }
        
        // Generate colors
        const colors = categories.map((category, index) => {
            return STATE.customColors[category] || CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length];
        });
        
        try {
            ChartsManager.charts.categoryChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors,
                        borderColor: colors.map(color => color + '80'),
                        borderWidth: 2,
                        hoverBorderWidth: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = UTILS.formatCurrency(context.parsed);
                                    const percentage = ((context.parsed / amounts.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            const category = categories[index];
                            ChartsManager.showCategoryDetails(category);
                        }
                    },
                    onHover: (event, elements) => {
                        canvas.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                    }
                }
            });
        } catch (error) {
            console.error('Error creating category chart:', error);
            ChartsManager.showNoDataMessage(ctx, 'Erro ao carregar gráfico');
        }
    },
    
    // Generate monthly spending chart
    generateMonthChart: () => {
        const canvas = document.getElementById('monthChart');
        if (!canvas) {
            console.warn('Month chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.monthChart) {
            ChartsManager.charts.monthChart.destroy();
            delete ChartsManager.charts.monthChart;
        }
        
        // Calculate monthly totals
        const monthlyTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const month = transaction.date.substring(0, 7);
                monthlyTotals[month] = (monthlyTotals[month] || 0) + transaction.amount;
            }
        });
        
        const months = Object.keys(monthlyTotals).sort();
        const amounts = months.map(month => monthlyTotals[month]);
        
        if (months.length === 0) {
            ChartsManager.showNoDataMessage(ctx, 'Nenhum dado mensal disponível');
            return;
        }
        
        try {
            ChartsManager.charts.monthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: months.map(month => {
                        const date = new Date(month + '-01');
                        return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
                    }),
                    datasets: [{
                        label: 'Gastos Mensais',
                        data: amounts,
                        backgroundColor: CONFIG.CHART_COLORS[0] + '80',
                        borderColor: CONFIG.CHART_COLORS[0],
                        borderWidth: 2,
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Gasto: ${UTILS.formatCurrency(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => UTILS.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating month chart:', error);
            ChartsManager.showNoDataMessage(ctx, 'Erro ao carregar gráfico');
        }
    },
    
    // Generate weekday spending chart
    generateWeekdayChart: () => {
        const canvas = document.getElementById('weekdayChart');
        if (!canvas) {
            console.warn('Weekday chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.weekdayChart) {
            ChartsManager.charts.weekdayChart.destroy();
            delete ChartsManager.charts.weekdayChart;
        }
        
        // Calculate weekday totals
        const weekdayTotals = [0, 0, 0, 0, 0, 0, 0]; // Sunday to Saturday
        const weekdayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const day = new Date(transaction.date + 'T00:00:00').getDay();
                weekdayTotals[day] += transaction.amount;
            }
        });
        
        try {
            ChartsManager.charts.weekdayChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: weekdayNames,
                    datasets: [{
                        label: 'Gastos por Dia da Semana',
                        data: weekdayTotals,
                        backgroundColor: CONFIG.CHART_COLORS[2] + '40',
                        borderColor: CONFIG.CHART_COLORS[2],
                        borderWidth: 2,
                        pointBackgroundColor: CONFIG.CHART_COLORS[2],
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: CONFIG.CHART_COLORS[2]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `${context.label}: ${UTILS.formatCurrency(context.parsed.r)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        r: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => UTILS.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating weekday chart:', error);
            ChartsManager.showNoDataMessage(ctx, 'Erro ao carregar gráfico');
        }
    },
    
    // Generate top establishments chart
    generateEstablishmentChart: () => {
        const canvas = document.getElementById('establishmentChart');
        if (!canvas) {
            console.warn('Establishment chart canvas not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.establishmentChart) {
            ChartsManager.charts.establishmentChart.destroy();
            delete ChartsManager.charts.establishmentChart;
        }
        
        // Calculate establishment totals
        const establishmentTotals = {};
        STATE.transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                establishmentTotals[transaction.name] = (establishmentTotals[transaction.name] || 0) + transaction.amount;
            }
        });
        
        // Get top 10 establishments
        const topEstablishments = Object.entries(establishmentTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (topEstablishments.length === 0) {
            ChartsManager.showNoDataMessage(ctx, 'Nenhuma transação disponível');
            return;
        }
        
        const labels = topEstablishments.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name);
        const amounts = topEstablishments.map(([_, amount]) => amount);
        
        try {
            ChartsManager.charts.establishmentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos por Estabelecimento',
                        data: amounts,
                        backgroundColor: CONFIG.CHART_COLORS[3] + '80',
                        borderColor: CONFIG.CHART_COLORS[3],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Gasto: ${UTILS.formatCurrency(context.parsed.x)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => UTILS.formatCurrency(value)
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating establishment chart:', error);
            ChartsManager.showNoDataMessage(ctx, 'Erro ao carregar gráfico');
        }
    },
    
    // Show category details modal
    showCategoryDetails: (category) => {
        const categoryTransactions = STATE.transactions.filter(t => 
            t.category === category
        );
        
        // Group by month
        const monthlyData = {};
        categoryTransactions.forEach(t => {
            const month = t.date.substring(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = [];
            }
            monthlyData[month].push(t);
        });
        
        let content = `
            <div class="category-details-header">
                <h3>${category}</h3>
                <p>Total de transações: ${categoryTransactions.length}</p>
                <p>Valor total: ${UTILS.formatCurrency(categoryTransactions.reduce((sum, t) => sum + t.amount, 0))}</p>
            </div>
        `;
        
        // Show monthly breakdown
        const sortedMonths = Object.keys(monthlyData).sort().reverse();
        
        sortedMonths.forEach(month => {
            const monthTransactions = monthlyData[month];
            const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            content += `
                <div class="month-section">
                    <h4>${new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h4>
                    <p class="month-total">${UTILS.formatCurrency(monthTotal)}</p>
                    <div class="month-transactions">
                        ${monthTransactions.map(t => `
                            <div class="transaction-detail">
                                <span class="transaction-name">${t.name}</span>
                                <span class="transaction-date">${UTILS.formatDate(t.date)}</span>
                                <span class="transaction-amount">${UTILS.formatCurrency(t.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        showModal(`Detalhes da Categoria: ${category}`, content);
    },
    
    // Show no data message on canvas
    showNoDataMessage: (ctx, message) => {
        const canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#666';
        ctx.font = '16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    },
    
    // Refresh all charts
    refreshAll: () => {
        // Only refresh if Chart.js is available
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not available - cannot refresh charts');
            return;
        }
        
        try {
            ChartsManager.generateCategoryChart();
            ChartsManager.generateMonthChart();
            ChartsManager.generateWeekdayChart();
            ChartsManager.generateEstablishmentChart();
        } catch (error) {
            console.error('Error refreshing charts:', error);
        }
    },
    
    // Update chart colors based on theme
    updateColors: () => {
        if (typeof Chart === 'undefined') return;
        
        const isDark = STATE.currentTheme === 'dark';
        const textColor = isDark ? '#f1f5f9' : '#1e293b';
        const borderColor = isDark ? '#334155' : '#e2e8f0';
        
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = borderColor;
        
        // Update existing charts
        Object.values(ChartsManager.charts).forEach(chart => {
            if (chart && chart.options && chart.options.plugins && chart.options.plugins.legend) {
                if (chart.options.plugins.legend.labels) {
                    chart.options.plugins.legend.labels.color = textColor;
                }
                chart.update('none'); // Update without animation
            }
        });
    },
    
    // Export chart as image
    exportChart: (chartId, filename) => {
        const canvas = document.getElementById(chartId);
        if (!canvas) {
            showToast('Gráfico não encontrado', 'error');
            return;
        }
        
        try {
            // Create download link
            const link = document.createElement('a');
            link.download = filename || `${chartId}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            
            showToast('Gráfico exportado com sucesso!', 'success');
        } catch (error) {
            console.error('Error exporting chart:', error);
            showToast('Erro ao exportar gráfico', 'error');
        }
    },
    
    // Check if charts are working
    isWorking: () => {
        return typeof Chart !== 'undefined';
    }
};

// Chart utilities
const ChartUtils = {
    // Get chart data for export
    getChartData: (chartType) => {
        switch (chartType) {
            case 'category':
                return ChartsManager.getCategoryData();
            case 'monthly':
                return ChartsManager.getMonthlyData();
            case 'weekday':
                return ChartsManager.getWeekdayData();
            case 'establishment':
                return ChartsManager.getEstablishmentData();
            default:
                return null;
        }
    },
    
    // Generate chart configuration for export
    getChartConfig: (type, data) => {
        const configs = {
            category: {
                type: 'pie',
                data: data,
                options: {
                    responsive: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            },
            monthly: {
                type: 'bar',
                data: data,
                options: {
                    responsive: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            }
        };
        
        return configs[type] || null;
    }
};

// Initialize charts when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        if (ChartsManager.init()) {
            console.log('Charts initialized successfully');
        } else {
            console.warn('Charts initialization failed - Chart.js may not be loaded');
        }
    }, 1000);
});

// Listen for theme changes
eventEmitter.on('themeChanged', () => {
    if (ChartsManager.isWorking()) {
        ChartsManager.updateColors();
    }
});

// Listen for data changes
eventEmitter.on('transactionAdded', () => {
    if (!document.getElementById('charts-area').classList.contains('hidden') && ChartsManager.isWorking()) {
        setTimeout(() => ChartsManager.refreshAll(), 500);
    }
});

eventEmitter.on('transactionDeleted', () => {
    if (!document.getElementById('charts-area').classList.contains('hidden') && ChartsManager.isWorking()) {
        setTimeout(() => ChartsManager.refreshAll(), 500);
    }
});

eventEmitter.on('transactionUpdated', () => {
    if (!document.getElementById('charts-area').classList.contains('hidden') && ChartsManager.isWorking()) {
        setTimeout(() => ChartsManager.refreshAll(), 500);
    }
});

// Goals charts (smaller versions for goals screen)
const GoalsCharts = {
    // Generate category chart for goals screen
    generateGoalsCategoryChart: () => {
        const canvas = document.getElementById('goalsCategoryChart');
        if (!canvas || !ChartsManager.isWorking()) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.goalsCategoryChart) {
            ChartsManager.charts.goalsCategoryChart.destroy();
            delete ChartsManager.charts.goalsCategoryChart;
        }
        
        // Get current month data
        const currentMonth = new Date().toISOString().substring(0, 7);
        const monthlyTransactions = TransactionManager.getByDateRange(
            `${currentMonth}-01`, 
            `${currentMonth}-31`
        );
        
        const categoryTotals = {};
        monthlyTransactions.forEach(transaction => {
            if (transaction.category && transaction.amount > 0) {
                categoryTotals[transaction.category] = (categoryTotals[transaction.category] || 0) + transaction.amount;
            }
        });
        
        const categories = Object.keys(categoryTotals);
        const amounts = Object.values(categoryTotals);
        
        if (categories.length === 0) {
            ChartsManager.showNoDataMessage(ctx, 'Sem gastos este mês');
            return;
        }
        
        const colors = categories.map((category, index) => {
            return STATE.customColors[category] || CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length];
        });
        
        try {
            ChartsManager.charts.goalsCategoryChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: amounts,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: { size: 10 }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = UTILS.formatCurrency(context.parsed);
                                    return `${label}: ${value}`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating goals category chart:', error);
        }
    },
    
    // Generate spending chart for goals screen (last 7 days)
    generateGoalsSpendingChart: () => {
        const canvas = document.getElementById('goalsSpendingChart');
        if (!canvas || !ChartsManager.isWorking()) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (ChartsManager.charts.goalsSpendingChart) {
            ChartsManager.charts.goalsSpendingChart.destroy();
            delete ChartsManager.charts.goalsSpendingChart;
        }
        
        // Get last 7 days data
        const today = new Date();
        const dailyTotals = [];
        const labels = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            const dayTransactions = STATE.transactions.filter(t => 
                t.date === dateStr && t.amount > 0
            );
            const dayTotal = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            dailyTotals.push(dayTotal);
            labels.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
        }
        
        try {
            ChartsManager.charts.goalsSpendingChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos Diários',
                        data: dailyTotals,
                        borderColor: CONFIG.CHART_COLORS[1],
                        backgroundColor: CONFIG.CHART_COLORS[1] + '20',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    return `Gasto: ${UTILS.formatCurrency(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: (value) => UTILS.formatCurrency(value),
                                font: { size: 10 }
                            }
                        },
                        x: {
                            ticks: {
                                font: { size: 10 }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating goals spending chart:', error);
        }
    },
    
    // Refresh goals charts
    refreshGoalsCharts: () => {
        if (ChartsManager.isWorking()) {
            GoalsCharts.generateGoalsCategoryChart();
            GoalsCharts.generateGoalsSpendingChart();
        }
    }
};

// Export goals charts functionality
window.GoalsCharts = GoalsCharts;