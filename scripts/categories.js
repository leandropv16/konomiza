// Categories Management Module
const CategoriesManager = {
    // Get all categories
    getAll: () => {
        return STATE.categories;
    },
    
    // Add new category
    add: (name, subcategories = []) => {
        if (!name || typeof name !== 'string') {
            showToast('Nome da categoria é obrigatório', 'error');
            return false;
        }
        
        const categoryName = name.trim();
        
        if (STATE.categories[categoryName]) {
            showToast('Categoria já existe', 'warning');
            return false;
        }
        
        STATE.categories[categoryName] = Array.isArray(subcategories) ? subcategories : [];
        DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
        
        showToast(`Categoria "${categoryName}" adicionada`, 'success');
        eventEmitter.emit('categoryAdded', { name: categoryName, subcategories });
        
        return true;
    },
    
    // Update category
    update: (oldName, newName, subcategories = []) => {
        if (!STATE.categories[oldName]) {
            showToast('Categoria não encontrada', 'error');
            return false;
        }
        
        const newCategoryName = newName.trim();
        
        // If name changed, update all transactions
        if (oldName !== newCategoryName) {
            STATE.transactions.forEach(transaction => {
                if (transaction.category === oldName) {
                    transaction.category = newCategoryName;
                }
            });
            
            // Update learned categories
            Object.keys(STATE.learnedCategories).forEach(key => {
                if (STATE.learnedCategories[key].category === oldName) {
                    STATE.learnedCategories[key].category = newCategoryName;
                }
            });
            
            // Update custom colors
            if (STATE.customColors[oldName]) {
                STATE.customColors[newCategoryName] = STATE.customColors[oldName];
                delete STATE.customColors[oldName];
            }
            
            // Remove old category and add new one
            delete STATE.categories[oldName];
        }
        
        STATE.categories[newCategoryName] = Array.isArray(subcategories) ? subcategories : [];
        
        // Save all related data
        DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
        DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
        DataManager.save(CONFIG.STORAGE_KEYS.LEARNED_CATEGORIES, STATE.learnedCategories);
        DataManager.save(CONFIG.STORAGE_KEYS.CUSTOM_COLORS, STATE.customColors);
        
        showToast(`Categoria "${newCategoryName}" atualizada`, 'success');
        eventEmitter.emit('categoryUpdated', { oldName, newName: newCategoryName, subcategories });
        
        return true;
    },
    
    // Delete category
    delete: (name) => {
        if (!STATE.categories[name]) {
            showToast('Categoria não encontrada', 'error');
            return false;
        }
        
        // Count transactions using this category
        const transactionsCount = STATE.transactions.filter(t => t.category === name).length;
        
        if (transactionsCount > 0) {
            const confirmed = confirm(
                `Esta categoria tem ${transactionsCount} transações associadas. ` +
                `Deseja realmente removê-la? As transações ficarão sem categoria.`
            );
            
            if (!confirmed) return false;
        }
        
        // Remove category from transactions
        STATE.transactions.forEach(transaction => {
            if (transaction.category === name) {
                transaction.category = '';
                transaction.subcategory = '';
            }
        });
        
        // Remove from learned categories
        Object.keys(STATE.learnedCategories).forEach(key => {
            if (STATE.learnedCategories[key].category === name) {
                delete STATE.learnedCategories[key];
            }
        });
        
        // Remove custom color
        delete STATE.customColors[name];
        
        // Remove category
        delete STATE.categories[name];
        
        // Save all related data
        DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
        DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
        DataManager.save(CONFIG.STORAGE_KEYS.LEARNED_CATEGORIES, STATE.learnedCategories);
        DataManager.save(CONFIG.STORAGE_KEYS.CUSTOM_COLORS, STATE.customColors);
        
        showToast(`Categoria "${name}" removida`, 'success');
        eventEmitter.emit('categoryDeleted', { name });
        
        return true;
    },
    
    // Add subcategory
    addSubcategory: (categoryName, subcategoryName) => {
        if (!STATE.categories[categoryName]) {
            showToast('Categoria não encontrada', 'error');
            return false;
        }
        
        const subcategory = subcategoryName.trim();
        
        if (STATE.categories[categoryName].includes(subcategory)) {
            showToast('Subcategoria já existe', 'warning');
            return false;
        }
        
        STATE.categories[categoryName].push(subcategory);
        DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
        
        showToast(`Subcategoria "${subcategory}" adicionada`, 'success');
        eventEmitter.emit('subcategoryAdded', { categoryName, subcategoryName: subcategory });
        
        return true;
    },
    
    // Remove subcategory
    removeSubcategory: (categoryName, subcategoryName) => {
        if (!STATE.categories[categoryName]) {
            showToast('Categoria não encontrada', 'error');
            return false;
        }
        
        const index = STATE.categories[categoryName].indexOf(subcategoryName);
        if (index === -1) {
            showToast('Subcategoria não encontrada', 'error');
            return false;
        }
        
        // Remove from transactions
        STATE.transactions.forEach(transaction => {
            if (transaction.category === categoryName && transaction.subcategory === subcategoryName) {
                transaction.subcategory = '';
            }
        });
        
        // Remove from category
        STATE.categories[categoryName].splice(index, 1);
        
        // Save data
        DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
        DataManager.save(CONFIG.STORAGE_KEYS.TRANSACTIONS, STATE.transactions);
        
        showToast(`Subcategoria "${subcategoryName}" removida`, 'success');
        eventEmitter.emit('subcategoryRemoved', { categoryName, subcategoryName });
        
        return true;
    },
    
    // Get category usage statistics
    getUsageStats: () => {
        const stats = {};
        
        Object.keys(STATE.categories).forEach(category => {
            stats[category] = {
                count: 0,
                total: 0,
                subcategories: {}
            };
        });
        
        STATE.transactions.forEach(transaction => {
            if (transaction.category && stats[transaction.category]) {
                stats[transaction.category].count++;
                stats[transaction.category].total += transaction.amount;
                
                if (transaction.subcategory) {
                    if (!stats[transaction.category].subcategories[transaction.subcategory]) {
                        stats[transaction.category].subcategories[transaction.subcategory] = {
                            count: 0,
                            total: 0
                        };
                    }
                    stats[transaction.category].subcategories[transaction.subcategory].count++;
                    stats[transaction.category].subcategories[transaction.subcategory].total += transaction.amount;
                }
            }
        });
        
        return stats;
    },
    
    // Import categories from predefined sets
    importPredefined: (setName) => {
        const predefinedSets = {
            'default': CONFIG.DEFAULT_CATEGORIES,
            'business': {
                'Receitas': ['Vendas', 'Serviços', 'Juros', 'Outros'],
                'Despesas Operacionais': ['Fornecedores', 'Salários', 'Aluguel', 'Utilities'],
                'Marketing': ['Publicidade', 'Eventos', 'Material'],
                'Administração': ['Contabilidade', 'Jurídico', 'Seguros']
            },
            'personal': {
                'Essenciais': ['Alimentação', 'Moradia', 'Transporte', 'Saúde'],
                'Lifestyle': ['Lazer', 'Compras', 'Educação'],
                'Investimentos': ['Poupança', 'Ações', 'Fundos']
            }
        };
        
        const selectedSet = predefinedSets[setName];
        if (!selectedSet) {
            showToast('Conjunto de categorias não encontrado', 'error');
            return false;
        }
        
        let addedCount = 0;
        Object.entries(selectedSet).forEach(([category, subcategories]) => {
            if (!STATE.categories[category]) {
                STATE.categories[category] = Array.isArray(subcategories) ? subcategories : subcategories.subcategories || [];
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            DataManager.save(CONFIG.STORAGE_KEYS.CATEGORIES, STATE.categories);
            showToast(`${addedCount} categorias importadas`, 'success');
            eventEmitter.emit('categoriesImported', { setName, count: addedCount });
        } else {
            showToast('Nenhuma categoria nova foi importada', 'info');
        }
        
        return true;
    }
};

// Category Colors Management
const CategoryColors = {
    // Get color for category
    get: (categoryName) => {
        return STATE.customColors[categoryName] || 
               CONFIG.CHART_COLORS[Object.keys(STATE.categories).indexOf(categoryName) % CONFIG.CHART_COLORS.length];
    },
    
    // Set color for category
    set: (categoryName, color) => {
        if (!STATE.categories[categoryName]) {
            showToast('Categoria não encontrada', 'error');
            return false;
        }
        
        STATE.customColors[categoryName] = color;
        DataManager.save(CONFIG.STORAGE_KEYS.CUSTOM_COLORS, STATE.customColors);
        
        eventEmitter.emit('categoryColorChanged', { categoryName, color });
        return true;
    },
    
    // Reset to default colors
    reset: () => {
        STATE.customColors = {};
        DataManager.save(CONFIG.STORAGE_KEYS.CUSTOM_COLORS, STATE.customColors);
        
        showToast('Cores resetadas para padrão', 'success');
        eventEmitter.emit('categoryColorsReset');
    },
    
    // Generate color palette
    generatePalette: () => {
        const categories = Object.keys(STATE.categories);
        const palette = {};
        
        categories.forEach((category, index) => {
            palette[category] = CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length];
        });
        
        return palette;
    }
};

// Category UI Management
const CategoryUI = {
    // Show categories management modal
    show: () => {
        const stats = CategoriesManager.getUsageStats();
        
        let content = `
            <div class="categories-manager">
                <div class="categories-header">
                    <h3>Gerenciar Categorias</h3>
                    <div class="categories-actions">
                        <button class="btn btn-primary" onclick="CategoryUI.showAddForm()">
                            <span>➕</span> Nova Categoria
                        </button>
                        <button class="btn btn-outline" onclick="CategoryUI.showImportOptions()">
                            <span>📥</span> Importar
                        </button>
                    </div>
                </div>
                
                <div class="categories-list">
        `;
        
        Object.entries(STATE.categories).forEach(([category, subcategories]) => {
            const stat = stats[category] || { count: 0, total: 0 };
            
            content += `
                <div class="category-item" data-category="${category}">
                    <div class="category-header">
                        <div class="category-info">
                            <div class="category-name">${category}</div>
                            <div class="category-stats">
                                ${stat.count} transações • ${UTILS.formatCurrency(stat.total)}
                            </div>
                        </div>
                        <div class="category-actions">
                            <input type="color" value="${CategoryColors.get(category)}" 
                                   onchange="CategoryColors.set('${category}', this.value)" 
                                   title="Alterar cor">
                            <button class="btn btn-sm btn-outline" onclick="CategoryUI.editCategory('${category}')">
                                <span>✏️</span>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="CategoryUI.deleteCategory('${category}')">
                                <span>🗑️</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="subcategories-list">
                        ${subcategories.map(sub => `
                            <div class="subcategory-item">
                                <span class="subcategory-name">${sub}</span>
                                <button class="btn btn-sm btn-outline" onclick="CategoryUI.removeSubcategory('${category}', '${sub}')">
                                    <span>✕</span>
                                </button>
                            </div>
                        `).join('')}
                        
                        <div class="add-subcategory">
                            <input type="text" placeholder="Nova subcategoria" 
                                   onkeypress="if(event.key==='Enter') CategoryUI.addSubcategory('${category}', this.value, this)">
                            <button class="btn btn-sm btn-outline" onclick="CategoryUI.addSubcategory('${category}', this.previousElementSibling.value, this.previousElementSibling)">
                                <span>➕</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        content += `
                </div>
            </div>
        `;
        
        showModal('Gerenciar Categorias', content);
    },
    
    // Show add category form
    showAddForm: () => {
        const content = `
            <div class="add-category-form">
                <h4>Nova Categoria</h4>
                <form onsubmit="CategoryUI.handleAddCategory(event)">
                    <div class="form-group">
                        <label class="form-label">Nome da Categoria</label>
                        <input type="text" class="form-input" name="categoryName" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Subcategorias (uma por linha)</label>
                        <textarea class="form-textarea" name="subcategories" 
                                  placeholder="Ex:&#10;Subcategoria 1&#10;Subcategoria 2"></textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Adicionar</button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('Nova Categoria', content);
    },
    
    // Handle add category form submission
    handleAddCategory: (event) => {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const categoryName = formData.get('categoryName').trim();
        const subcategoriesText = formData.get('subcategories').trim();
        
        const subcategories = subcategoriesText
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (CategoriesManager.add(categoryName, subcategories)) {
            closeModal();
            CategoryUI.show(); // Refresh the categories list
        }
    },
    
    // Edit category
    editCategory: (categoryName) => {
        const subcategories = STATE.categories[categoryName] || [];
        
        const content = `
            <div class="edit-category-form">
                <h4>Editar Categoria</h4>
                <form onsubmit="CategoryUI.handleEditCategory(event, '${categoryName}')">
                    <div class="form-group">
                        <label class="form-label">Nome da Categoria</label>
                        <input type="text" class="form-input" name="categoryName" value="${categoryName}" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Subcategorias (uma por linha)</label>
                        <textarea class="form-textarea" name="subcategories">${subcategories.join('\n')}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Salvar</button>
                    </div>
                </form>
            </div>
        `;
        
        showModal('Editar Categoria', content);
    },
    
    // Handle edit category form submission
    handleEditCategory: (event, oldName) => {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const newName = formData.get('categoryName').trim();
        const subcategoriesText = formData.get('subcategories').trim();
        
        const subcategories = subcategoriesText
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        
        if (CategoriesManager.update(oldName, newName, subcategories)) {
            closeModal();
            CategoryUI.show(); // Refresh the categories list
        }
    },
    
    // Delete category with confirmation
    deleteCategory: (categoryName) => {
        if (CategoriesManager.delete(categoryName)) {
            CategoryUI.show(); // Refresh the categories list
        }
    },
    
    // Add subcategory
    addSubcategory: (categoryName, subcategoryName, inputElement) => {
        if (!subcategoryName.trim()) {
            showToast('Nome da subcategoria é obrigatório', 'error');
            return;
        }
        
        if (CategoriesManager.addSubcategory(categoryName, subcategoryName)) {
            inputElement.value = '';
            CategoryUI.show(); // Refresh the categories list
        }
    },
    
    // Remove subcategory
    removeSubcategory: (categoryName, subcategoryName) => {
        if (CategoriesManager.removeSubcategory(categoryName, subcategoryName)) {
            CategoryUI.show(); // Refresh the categories list
        }
    },
    
    // Show import options
    showImportOptions: () => {
        const content = `
            <div class="import-options">
                <h4>Importar Categorias</h4>
                <p>Escolha um conjunto de categorias para importar:</p>
                
                <div class="import-sets">
                    <div class="import-set">
                        <h5>Padrão</h5>
                        <p>Categorias básicas para uso pessoal</p>
                        <button class="btn btn-primary" onclick="CategoryUI.importSet('default')">
                            Importar Padrão
                        </button>
                    </div>
                    
                    <div class="import-set">
                        <h5>Empresarial</h5>
                        <p>Categorias para controle empresarial</p>
                        <button class="btn btn-primary" onclick="CategoryUI.importSet('business')">
                            Importar Empresarial
                        </button>
                    </div>
                    
                    <div class="import-set">
                        <h5>Pessoal Simplificado</h5>
                        <p>Categorias essenciais para finanças pessoais</p>
                        <button class="btn btn-primary" onclick="CategoryUI.importSet('personal')">
                            Importar Pessoal
                        </button>
                    </div>
                </div>
                
                <div class="import-actions">
                    <button class="btn btn-outline" onclick="closeModal()">Cancelar</button>
                </div>
            </div>
        `;
        
        showModal('Importar Categorias', content);
    },
    
    // Import category set
    importSet: (setName) => {
        if (CategoriesManager.importPredefined(setName)) {
            closeModal();
            CategoryUI.show(); // Refresh the categories list
        }
    }
};

// Global functions for UI
function showCategories() {
    CategoryUI.show();
}

function showColors() {
    CategoryUI.show();
}

// Listen for category changes to update UI
eventEmitter.on('categoryAdded', () => {
    updateHomeStats();
});

eventEmitter.on('categoryDeleted', () => {
    updateHomeStats();
});

eventEmitter.on('categoryColorChanged', () => {
    if (!document.getElementById('charts-area').classList.contains('hidden')) {
        ChartsManager.refreshAll();
    }
});