// Export Module for PDF and Excel
const ExportManager = {
    // Export to PDF using jsPDF
    exportToPDF: async (reportType = 'monthly') => {
        try {
            showLoading('Gerando relatório PDF...');
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Get data based on report type
            const data = ExportManager.getReportData(reportType);
            
            // Add title
            doc.setFontSize(20);
            doc.text('Relatório Konomiza', 20, 20);
            
            // Add subtitle
            doc.setFontSize(12);
            doc.text(`Período: ${data.period}`, 20, 30);
            doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 40);
            
            // Add summary
            let yPosition = 60;
            doc.setFontSize(16);
            doc.text('Resumo', 20, yPosition);
            yPosition += 10;
            
            doc.setFontSize(12);
            doc.text(`Total de transações: ${data.transactions.length}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Valor total: ${UTILS.formatCurrency(data.totalAmount)}`, 20, yPosition);
            yPosition += 10;
            doc.text(`Valor médio: ${UTILS.formatCurrency(data.averageAmount)}`, 20, yPosition);
            yPosition += 20;
            
            // Add category breakdown
            if (Object.keys(data.categoryTotals).length > 0) {
                doc.setFontSize(16);
                doc.text('Gastos por Categoria', 20, yPosition);
                yPosition += 10;
                
                doc.setFontSize(12);
                Object.entries(data.categoryTotals).forEach(([category, amount]) => {
                    if (yPosition > 270) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(`${category}: ${UTILS.formatCurrency(amount)}`, 20, yPosition);
                    yPosition += 10;
                });
                yPosition += 10;
            }
            
            // Add transactions table
            doc.setFontSize(16);
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
            doc.text('Detalhamento de Transações', 20, yPosition);
            yPosition += 10;
            
            // Table header
            doc.setFontSize(10);
            doc.text('Data', 20, yPosition);
            doc.text('Estabelecimento', 50, yPosition);
            doc.text('Categoria', 120, yPosition);
            doc.text('Valor', 160, yPosition);
            yPosition += 10;
            
            // Table content
            data.transactions.forEach(transaction => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.text(UTILS.formatDate(transaction.date), 20, yPosition);
                doc.text(transaction.name.substring(0, 25), 50, yPosition);
                doc.text(transaction.category || 'Sem categoria', 120, yPosition);
                doc.text(UTILS.formatCurrency(transaction.amount), 160, yPosition);
                yPosition += 8;
            });
            
            // Add footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(`Sistema desenvolvido por Leandro Antônio - Página ${i} de ${pageCount}`, 20, 290);
            }
            
            hideLoading();
            
            // Download the PDF
            doc.save(`konomiza_relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
            
            showToast('Relatório PDF gerado com sucesso!', 'success');
            
        } catch (error) {
            hideLoading();
            ERROR_HANDLER.handle(error, 'Export to PDF');
        }
    },
    
    // Export to Excel using SheetJS
    exportToExcel: async (reportType = 'monthly') => {
        try {
            showLoading('Gerando planilha Excel...');
            
            const data = ExportManager.getReportData(reportType);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Summary sheet
            const summaryData = [
                ['RELATÓRIO KONOMIZA'],
                [''],
                ['Período:', data.period],
                ['Gerado em:', new Date().toLocaleDateString('pt-BR')],
                [''],
                ['RESUMO'],
                ['Total de transações:', data.transactions.length],
                ['Valor total:', data.totalAmount],
                ['Valor médio:', data.averageAmount],
                [''],
                ['GASTOS POR CATEGORIA'],
                ...Object.entries(data.categoryTotals).map(([category, amount]) => [category, amount])
            ];
            
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');
            
            // Transactions sheet
            const transactionsData = [
                ['Data', 'Estabelecimento', 'Valor', 'Categoria', 'Subcategoria', 'Forma de Pagamento', 'Observações'],
                ...data.transactions.map(t => [
                    t.date,
                    t.name,
                    t.amount,
                    t.category || '',
                    t.subcategory || '',
                    t.method || '',
                    t.notes || ''
                ])
            ];
            
            const transactionsSheet = XLSX.utils.aoa_to_sheet(transactionsData);
            XLSX.utils.book_append_sheet(wb, transactionsSheet, 'Transações');
            
            // Category analysis sheet
            if (Object.keys(data.categoryTotals).length > 0) {
                const categoryData = [
                    ['Categoria', 'Valor Total', 'Quantidade', 'Valor Médio', 'Porcentagem'],
                    ...Object.entries(data.categoryTotals).map(([category, amount]) => {
                        const categoryTransactions = data.transactions.filter(t => t.category === category);
                        const count = categoryTransactions.length;
                        const average = count > 0 ? amount / count : 0;
                        const percentage = (amount / data.totalAmount) * 100;
                        
                        return [category, amount, count, average, percentage.toFixed(2) + '%'];
                    })
                ];
                
                const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
                XLSX.utils.book_append_sheet(wb, categorySheet, 'Análise por Categoria');
            }
            
            // Monthly analysis sheet (if data spans multiple months)
            const monthlyData = {};
            data.transactions.forEach(t => {
                const month = t.date.substring(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { total: 0, count: 0 };
                }
                monthlyData[month].total += t.amount;
                monthlyData[month].count++;
            });
            
            if (Object.keys(monthlyData).length > 1) {
                const monthlyAnalysis = [
                    ['Mês', 'Valor Total', 'Quantidade', 'Valor Médio'],
                    ...Object.entries(monthlyData).map(([month, data]) => [
                        new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
                        data.total,
                        data.count,
                        data.total / data.count
                    ])
                ];
                
                const monthlySheet = XLSX.utils.aoa_to_sheet(monthlyAnalysis);
                XLSX.utils.book_append_sheet(wb, monthlySheet, 'Análise Mensal');
            }
            
            hideLoading();
            
            // Download the Excel file
            XLSX.writeFile(wb, `konomiza_relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            showToast('Planilha Excel gerada com sucesso!', 'success');
            
        } catch (error) {
            hideLoading();
            ERROR_HANDLER.handle(error, 'Export to Excel');
        }
    },
    
    // Get report data based on type
    getReportData: (reportType) => {
        let transactions = [];
        let period = '';
        
        const today = new Date();
        
        switch (reportType) {
            case 'weekly':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                transactions = TransactionManager.getByDateRange(
                    weekAgo.toISOString().split('T')[0],
                    today.toISOString().split('T')[0]
                );
                period = `${weekAgo.toLocaleDateString('pt-BR')} a ${today.toLocaleDateString('pt-BR')}`;
                break;
                
            case 'monthly':
                const currentMonth = today.toISOString().substring(0, 7);
                transactions = TransactionManager.getByDateRange(
                    `${currentMonth}-01`,
                    `${currentMonth}-31`
                );
                period = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                break;
                
            case 'yearly':
                const currentYear = today.getFullYear();
                transactions = TransactionManager.getByDateRange(
                    `${currentYear}-01-01`,
                    `${currentYear}-12-31`
                );
                period = currentYear.toString();
                break;
                
            case 'all':
                transactions = [...STATE.transactions];
                period = 'Todos os registros';
                break;
                
            default:
                transactions = [...STATE.transactions];
                period = 'Período personalizado';
        }
        
        // Calculate totals
        const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const averageAmount = transactions.length > 0 ? totalAmount / transactions.length : 0;
        
        // Calculate category totals
        const categoryTotals = {};
        transactions.forEach(t => {
            if (t.category) {
                categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            }
        });
        
        return {
            transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
            totalAmount,
            averageAmount,
            categoryTotals,
            period
        };
    },
    
    // Export backup as JSON
    exportBackup: () => {
        try {
            const backupData = DataManager.exportData();
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `konomiza_backup_${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            showToast('Backup exportado com sucesso!', 'success');
            
        } catch (error) {
            ERROR_HANDLER.handle(error, 'Export Backup');
        }
    },
    
    // Import backup from JSON
    importBackup: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    if (DataManager.importData(backupData)) {
                        // Refresh UI
                        updateHomeStats();
                        updateGoalsDisplay();
                        
                        if (!document.getElementById('transactions-recent-screen').classList.contains('hidden')) {
                            TransactionUI.updateRecentTransactions();
                        }
                        
                        showToast('Backup importado com sucesso!', 'success');
                    }
                } catch (error) {
                    ERROR_HANDLER.handle(error, 'Import Backup');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }
};

// Report Generation Functions
const ReportGenerator = {
    // Generate custom period report
    generateCustomReport: (startDate, endDate) => {
        if (!startDate || !endDate) {
            showToast('Por favor, selecione as datas', 'error');
            return;
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            showToast('Data inicial deve ser anterior à data final', 'error');
            return;
        }
        
        const transactions = TransactionManager.getByDateRange(startDate, endDate);
        
        if (transactions.length === 0) {
            showToast('Nenhuma transação encontrada no período selecionado', 'warning');
            return;
        }
        
        const reportData = {
            transactions,
            totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
            averageAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
            categoryTotals: {},
            period: `${UTILS.formatDate(startDate)} a ${UTILS.formatDate(endDate)}`
        };
        
        transactions.forEach(t => {
            if (t.category) {
                reportData.categoryTotals[t.category] = (reportData.categoryTotals[t.category] || 0) + t.amount;
            }
        });
        
        ReportGenerator.showReportPreview(reportData);
    },
    
    // Show report preview
    showReportPreview: (reportData) => {
        const content = `
            <div class="report-preview">
                <h4>Prévia do Relatório</h4>
                <div class="report-summary">
                    <p><strong>Período:</strong> ${reportData.period}</p>
                    <p><strong>Total de transações:</strong> ${reportData.transactions.length}</p>
                    <p><strong>Valor total:</strong> ${UTILS.formatCurrency(reportData.totalAmount)}</p>
                    <p><strong>Valor médio:</strong> ${UTILS.formatCurrency(reportData.averageAmount)}</p>
                </div>
                
                ${Object.keys(reportData.categoryTotals).length > 0 ? `
                    <div class="report-categories">
                        <h5>Gastos por Categoria</h5>
                        ${Object.entries(reportData.categoryTotals)
                            .sort((a, b) => b[1] - a[1])
                            .map(([category, amount]) => `
                                <div class="category-item">
                                    <span>${category}</span>
                                    <span>${UTILS.formatCurrency(amount)}</span>
                                </div>
                            `).join('')}
                    </div>
                ` : ''}
                
                <div class="report-actions">
                    <button class="btn btn-primary" onclick="ExportManager.exportToPDF('custom')">
                        <span>📄</span> Exportar PDF
                    </button>
                    <button class="btn btn-success" onclick="ExportManager.exportToExcel('custom')">
                        <span>📊</span> Exportar Excel
                    </button>
                </div>
            </div>
        `;
        
        showModal('Relatório Personalizado', content);
    }
};

// Global functions
function exportToExcel() {
    ExportManager.exportToExcel('monthly');
}

function exportToPDF() {
    ExportManager.exportToPDF('monthly');
}

function exportToJSON() {
    ExportManager.exportBackup();
}

function generateReport(type) {
    switch (type) {
        case 'weekly':
            ExportManager.exportToPDF('weekly');
            break;
        case 'monthly':
            ExportManager.exportToPDF('monthly');
            break;
        case 'yearly':
            ExportManager.exportToPDF('yearly');
            break;
        default:
            ExportManager.exportToPDF('monthly');
    }
}

function showCustomPeriod() {
    const content = `
        <div class="custom-period-form">
            <h4>Relatório de Período Personalizado</h4>
            <form onsubmit="handleCustomPeriod(event)">
                <div class="form-group">
                    <label class="form-label">Data Inicial</label>
                    <input type="date" class="form-input" name="startDate" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Data Final</label>
                    <input type="date" class="form-input" name="endDate" required>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Gerar Relatório</button>
                </div>
            </form>
        </div>
    `;
    
    showModal('Período Personalizado', content);
}

function handleCustomPeriod(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    
    closeModal();
    ReportGenerator.generateCustomReport(startDate, endDate);
}

function importBackup() {
    ExportManager.importBackup();
}

// Initialize export functionality
document.addEventListener('DOMContentLoaded', () => {
    // Check if required libraries are loaded
    if (typeof window.jspdf === 'undefined') {
        console.warn('jsPDF not loaded - PDF export will not work');
    }
    
    if (typeof XLSX === 'undefined') {
        console.warn('SheetJS not loaded - Excel export will not work');
    }
});