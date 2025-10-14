// Inicializar cliente Supabase (usando configurações do auth.js)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// View Modal
let currentViewItemId = null;

function openViewModal(itemId) {
    console.log('🔍 Redirecionando para página de visualização do item:', itemId);
    
    // Redirecionar para a página de visualização com o ID do item
    window.location.href = `view-item.html?id=${itemId}`;
}

// Edit Modal
function openEditModal(itemId) {
    console.log('🔧 Redirecionando para página de edição do item:', itemId);
    
    // Redirecionar para a página de edição com o ID do item
    window.location.href = `edit-item.html?id=${itemId}`;
}

// Sistema de Navegação entre Abas
const TabSystem = {
    currentTab: 'dashboard',
    
    init() {
        this.setupEventListeners();
        this.showTab(this.currentTab);
    },
    
    setupEventListeners() {
        // Adicionar event listeners para os botões de navegação
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    },
    
    switchTab(tabName) {
        console.log('🔄 Mudando para aba:', tabName);
        
        // Remover classe active de todos os botões
        const navTabs = document.querySelectorAll('.nav-tab');
        navTabs.forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Esconder todos os conteúdos das abas
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Ativar o botão da aba atual
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // Mostrar o conteúdo da aba atual
        const activeContent = document.getElementById(tabName);
        if (activeContent) {
            activeContent.classList.add('active');
        }
        
        // Atualizar aba atual
        this.currentTab = tabName;
        
        // Executar ações específicas da aba
        this.onTabChange(tabName);
    },
    
    showTab(tabName) {
        this.switchTab(tabName);
    },
    
    onTabChange(tabName) {
        // Ações específicas quando uma aba é ativada
        switch(tabName) {
            case 'dashboard':
                // Recarregar dados do dashboard se necessário
                if (window.AdvancedSearch && typeof window.AdvancedSearch.loadItems === 'function') {
                    window.AdvancedSearch.loadItems();
                }
                break;
            case 'inventory':
                // Recarregar inventário se necessário
                if (window.AdvancedSearch && typeof window.AdvancedSearch.loadItems === 'function') {
                    window.AdvancedSearch.loadItems();
                }
                break;
            case 'add-item':
                // Carregar categorias e colaboradores nos dropdowns
                this.loadAddItemDropdowns();
                
                // Focar no primeiro campo do formulário
                const firstInput = document.querySelector('#add-item input, #add-item select');
                if (firstInput) {
                    setTimeout(() => firstInput.focus(), 100);
                }
                break;
        }
    },

    async loadAddItemDropdowns() {
        try {
            console.log('📋 Carregando dropdowns da aba adicionar item...');
            const dropdownData = await loadDropdownData();
            
            // Popular dropdowns
            populateCategoriesDropdown(dropdownData.categories, 'itemCategory');
            populateCollaboratorsDropdown(dropdownData.collaborators, 'itemCollaborator');
            
            // Configurar event listeners se ainda não foram configurados
            setupDropdownEventListeners();
            
            console.log('✅ Dropdowns carregados com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao carregar dropdowns:', error);
        }
    }
};

// Função global para compatibilidade
function switchTab(tabName) {
    TabSystem.switchTab(tabName);
}

// Exportar para uso global
window.TabSystem = TabSystem;
window.switchTab = switchTab;

/**
 * Função para editar item - alias para openEditModal
 */
function editItem(itemId) {
    openEditModal(itemId);
}

// Event listener para o formulário de adicionar item
document.addEventListener('DOMContentLoaded', () => {
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const formData = new FormData(addItemForm);
                
                // Verificar se há uma imagem selecionada
                const imageFile = document.getElementById('itemImage')?.files[0];
                
                if (imageFile) {
                    // Mostrar progresso do upload da imagem
                    const imageUploadProgress = document.getElementById('imageUploadProgress');
                    const imagePreview = document.getElementById('imagePreview');
                    
                    if (imagePreview) imagePreview.classList.add('hidden');
                    if (imageUploadProgress) imageUploadProgress.classList.remove('hidden');
                    
                    updateImageProgressBar(0, 'Iniciando upload da imagem...');
                    
                    // Upload da imagem para o Supabase Storage
                    const imageFileName = `${Date.now()}_${imageFile.name}`;
                    
                    updateImageProgressBar(25, 'Enviando imagem...');
                    
                    const { data: imageUploadData, error: imageUploadError } = await supabase.storage
                        .from('item-images')
                        .upload(imageFileName, imageFile);
                    
                    if (imageUploadError) {
                        if (imageUploadProgress) imageUploadProgress.classList.add('hidden');
                        if (imagePreview) imagePreview.classList.remove('hidden');
                        throw new Error('Erro ao fazer upload da imagem: ' + imageUploadError.message);
                    }
                    
                    updateImageProgressBar(75, 'Upload da imagem concluído!');
                    
                    // Adicionar o caminho da imagem ao FormData
                    formData.append('image_path', imageFileName);
                    
                    updateImageProgressBar(100, 'Processando imagem...');
                }
                
                // Verificar se há um PDF selecionado
                const pdfFile = document.getElementById('itemPdf')?.files[0];
                
                if (pdfFile) {
                    // Mostrar progresso do upload
                    const pdfUploadProgress = document.getElementById('pdfUploadProgress');
                    const pdfPreview = document.getElementById('pdfPreview');
                    
                    if (pdfPreview) pdfPreview.classList.add('hidden');
                    if (pdfUploadProgress) pdfUploadProgress.classList.remove('hidden');
                    
                    updateProgressBar(0, 'Iniciando upload...');
                    
                    // Upload do PDF para o Supabase Storage
                    const fileName = `${Date.now()}_${pdfFile.name}`;
                    
                    updateProgressBar(25, 'Enviando arquivo...');
                    
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('item-pdfs')
                        .upload(fileName, pdfFile);
                    
                    if (uploadError) {
                        if (pdfUploadProgress) pdfUploadProgress.classList.add('hidden');
                        if (pdfPreview) pdfPreview.classList.remove('hidden');
                        throw new Error('Erro ao fazer upload do PDF: ' + uploadError.message);
                    }
                    
                    updateProgressBar(75, 'Upload concluído!');
                    
                    // Adicionar o caminho do PDF ao FormData
                    formData.append('pdf_path', fileName);
                    
                    updateProgressBar(100, 'Processando...');
                }
                
                // Enviar dados do item
                const response = await fetch('/api/items', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (result.success) {
                    ToastSystem.success('✅ Item criado com sucesso!');
                    addItemForm.reset();
                    
                    // Limpar preview da imagem e barra de progresso
                    const imagePreview = document.getElementById('imagePreview');
                    const imageButtonText = document.getElementById('imageButtonText');
                    const imageUploadProgress = document.getElementById('imageUploadProgress');
                    
                    if (imagePreview) imagePreview.classList.add('hidden');
                    if (imageUploadProgress) imageUploadProgress.classList.add('hidden');
                    if (imageButtonText) imageButtonText.textContent = 'Selecionar Imagem';
                    
                    // Limpar preview do PDF e barra de progresso
                    const pdfPreview = document.getElementById('pdfPreview');
                    const pdfButtonText = document.getElementById('pdfButtonText');
                    const pdfUploadProgress = document.getElementById('pdfUploadProgress');
                    
                    if (pdfPreview) pdfPreview.classList.add('hidden');
                    if (pdfUploadProgress) pdfUploadProgress.classList.add('hidden');
                    if (pdfButtonText) pdfButtonText.textContent = 'Selecionar PDF';
                    
                    // Recarregar itens se disponível
                    if (window.AdvancedSearch && typeof window.AdvancedSearch.loadItems === 'function') {
                        await window.AdvancedSearch.loadItems();
                    }
                } else {
                    // Em caso de erro, esconder progresso e mostrar preview novamente
                    const imageUploadProgress = document.getElementById('imageUploadProgress');
                    const imagePreview = document.getElementById('imagePreview');
                    const pdfUploadProgress = document.getElementById('pdfUploadProgress');
                    const pdfPreview = document.getElementById('pdfPreview');
                    
                    if (imageUploadProgress) imageUploadProgress.classList.add('hidden');
                    if (imagePreview && imageFile) imagePreview.classList.remove('hidden');
                    if (pdfUploadProgress) pdfUploadProgress.classList.add('hidden');
                    if (pdfPreview && pdfFile) pdfPreview.classList.remove('hidden');
                    
                    throw new Error(result.message || 'Erro ao criar item');
                }
            } catch (error) {
                console.error('Erro ao criar item:', error);
                ToastSystem.error('❌ Erro ao criar item: ' + error.message);
            }
        });
    }
});
function handleEditItem(itemId) {
    console.log('🔧 Editando item:', itemId);
    openEditModal(itemId);
}



// Utility Functions
function formatCategory(category) {
    const categories = {
        'geral': 'Geral',
        'veiculos': 'Veículos',
        'computadores': 'Computadores',
        'moveis': 'Móveis'
    };
    return categories[category] || category;
}

function formatStatus(status) {
    const statuses = {
        'ativo': 'Ativo',
        'manutencao': 'Manutenção',
        'inativo': 'Inativo'
    };
    return statuses[status] || status;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Utilitário para manipulação de elementos DOM
 */
const DOMElements = {
    /**
     * Obtém um elemento DOM por seletor
     */
    get(selector) {
        return document.querySelector(selector);
    },

    /**
     * Obtém todos os elementos DOM por seletor
     */
    getAll(selector) {
        return document.querySelectorAll(selector);
    },

    /**
     * Verifica se um elemento existe
     */
    exists(selector) {
        return document.querySelector(selector) !== null;
    },

    /**
     * Cria um elemento DOM
     */
    create(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        Object.keys(attributes).forEach(key => {
            if (key === 'className') {
                element.className = attributes[key];
            } else if (key === 'innerHTML') {
                element.innerHTML = attributes[key];
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }
};

function showLoading(show) {
    if (DOMElements.get('loading')) {
        DOMElements.get('loading').style.display = show ? 'flex' : 'none';
    }
}

/**
 * Sistema de notificações toast modernas
 */
const ToastSystem = {
    container: null,
    toasts: new Map(),
    
    /**
     * Inicializa o sistema de toast
     */
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
            document.body.appendChild(this.container);
        }
    },
    
    /**
     * Mostra uma notificação toast
     */
    show(message, type = 'info', duration = 4000, options = {}) {
        this.init();
        
        const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const toast = this.createToast(toastId, message, type, options);
        
        // Adicionar ao container com animação
        this.container.appendChild(toast);
        this.toasts.set(toastId, toast);
        
        // Animar entrada
        requestAnimationFrame(() => {
            toast.classList.remove('translate-x-full', 'opacity-0');
            toast.classList.add('translate-x-0', 'opacity-100');
        });
        
        // Auto-remover após duração especificada
        if (duration > 0) {
            setTimeout(() => this.hide(toastId), duration);
        }
        
        return toastId;
    },
    
    /**
     * Cria elemento toast
     */
    createToast(id, message, type, options) {
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `
            transform translate-x-full opacity-0 transition-all duration-300 ease-out
            bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
            p-4 flex items-start space-x-3 max-w-sm backdrop-blur-sm
            ${this.getTypeClasses(type)}
        `.trim().replace(/\s+/g, ' ');
        
        const icon = this.getTypeIcon(type);
        const iconColor = this.getTypeIconColor(type);
        
        toast.innerHTML = `
            <div class="flex-shrink-0">
                <div class="w-6 h-6 rounded-full flex items-center justify-center ${iconColor}">
                    <i class="fas ${icon} text-sm text-white"></i>
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                    ${message}
                </p>
                ${options.description ? `
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        ${options.description}
                    </p>
                ` : ''}
            </div>
            <button class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                    data-action="close-toast" data-toast-id="${id}">
                <i class="fas fa-times text-sm"></i>
            </button>
        `;
        
        // Adicionar evento de clique se especificado
        if (options.onClick) {
            toast.style.cursor = 'pointer';
            toast.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    options.onClick();
                    this.hide(id);
                }
            });
        }
        
        return toast;
    },
    
    /**
     * Esconde uma notificação toast
     */
    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;
        
        // Animar saída
        toast.classList.remove('translate-x-0', 'opacity-100');
        toast.classList.add('translate-x-full', 'opacity-0');
        
        // Remover após animação
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            this.toasts.delete(toastId);
        }, 300);
    },
    
    /**
     * Remove todas as notificações
     */
    clear() {
        this.toasts.forEach((_, id) => this.hide(id));
    },
    
    /**
     * Retorna classes CSS para cada tipo
     */
    getTypeClasses(type) {
        const classes = {
            success: 'border-l-4 border-green-500',
            error: 'border-l-4 border-red-500',
            warning: 'border-l-4 border-yellow-500',
            info: 'border-l-4 border-blue-500'
        };
        return classes[type] || classes.info;
    },
    
    /**
     * Retorna ícone para cada tipo
     */
    getTypeIcon(type) {
        const icons = {
            success: 'fa-check',
            error: 'fa-exclamation-triangle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    },
    
    /**
     * Retorna cor do ícone para cada tipo
     */
    getTypeIconColor(type) {
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        return colors[type] || colors.info;
    },
    
    // Métodos de conveniência
    success(message, options = {}) {
        return this.show(message, 'success', 4000, options);
    },
    
    error(message, options = {}) {
        return this.show(message, 'error', 6000, options);
    },
    
    warning(message, options = {}) {
        return this.show(message, 'warning', 5000, options);
    },
    
    info(message, options = {}) {
        return this.show(message, 'info', 4000, options);
    }
};

/**
 * Função de compatibilidade com o sistema antigo
 */
function showNotification(message, type = 'info', duration = 4000) {
    return ToastSystem.show(message, type, duration);
}

// Sistema de Drag & Drop para reorganização de itens
const DragDropSystem = {
    draggedItem: null,
    draggedElement: null,
    dropZones: [],
    
    init() {
        this.setupDragAndDrop();
        console.log('🎯 Sistema Drag & Drop inicializado');
    },
    
    setupDragAndDrop() {
        // Configurar drag & drop no grid de inventário
        const inventoryGrid = DOMElements.get('#inventoryGrid');
        if (inventoryGrid) {
            inventoryGrid.addEventListener('dragstart', this.handleDragStart.bind(this));
            inventoryGrid.addEventListener('dragover', this.handleDragOver.bind(this));
            inventoryGrid.addEventListener('drop', this.handleDrop.bind(this));
            inventoryGrid.addEventListener('dragend', this.handleDragEnd.bind(this));
        }
    },
    
    makeDraggable(itemCard, item) {
        itemCard.draggable = true;
        itemCard.dataset.itemId = item.id;
        itemCard.classList.add('cursor-move', 'transition-all', 'duration-200');
        
        // Adicionar indicador visual de drag
        const dragHandle = document.createElement('div');
        dragHandle.className = 'absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200';
        dragHandle.innerHTML = `
            <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
            </svg>
        `;
        itemCard.appendChild(dragHandle);
        
        return itemCard;
    },
    
    handleDragStart(e) {
        if (!e.target.closest('.inventory-item-card')) return;
        
        const itemCard = e.target.closest('.inventory-item-card');
        const itemId = itemCard.dataset.itemId;
        const item = AppState.currentItems.find(item => item.id === itemId);
        
        if (!item) return;
        
        this.draggedItem = item;
        this.draggedElement = itemCard;
        
        // Adicionar classe visual de drag
        itemCard.classList.add('opacity-50', 'scale-95', 'rotate-2');
        
        // Configurar dados de transferência
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', itemCard.outerHTML);
        e.dataTransfer.setData('application/json', JSON.stringify(item));
        
        // Destacar zonas de drop
        this.highlightDropZones();
        
        console.log('🎯 Drag iniciado:', item.name);
    },
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const targetCard = e.target.closest('.inventory-item-card');
        if (targetCard && targetCard !== this.draggedElement) {
            // Remover highlight anterior
            this.removeDropHighlight();
            
            // Adicionar highlight na zona de drop
            targetCard.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-50', 'bg-blue-50', 'dark:bg-blue-900/20');
            
            // Determinar posição de inserção
            const rect = targetCard.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const isAfter = e.clientY > midY;
            
            // Adicionar indicador de posição
            this.showInsertionIndicator(targetCard, isAfter);
        }
    },
    
    handleDrop(e) {
        e.preventDefault();
        
        const targetCard = e.target.closest('.inventory-item-card');
        if (!targetCard || targetCard === this.draggedElement || !this.draggedItem) {
            return;
        }
        
        const targetItemId = targetCard.dataset.itemId;
        const targetItem = AppState.currentItems.find(item => item.id === targetItemId);
        
        if (!targetItem) return;
        
        // Determinar nova posição
        const rect = targetCard.getBoundingClientRect();
        const isAfter = e.clientY > rect.top + rect.height / 2;
        
        // Reorganizar itens
        this.reorderItems(this.draggedItem, targetItem, isAfter);
        
        console.log('🎯 Item movido:', this.draggedItem.name, 'para posição de', targetItem.name);
        
        // Mostrar feedback
        ToastSystem.success(`📦 ${this.draggedItem.name} reorganizado com sucesso!`);
    },
    
    handleDragEnd(e) {
        // Remover classes visuais
        if (this.draggedElement) {
            this.draggedElement.classList.remove('opacity-50', 'scale-95', 'rotate-2');
        }
        
        // Limpar highlights
        this.removeDropHighlight();
        this.removeInsertionIndicator();
        this.removeDropZoneHighlight();
        
        // Reset
        this.draggedItem = null;
        this.draggedElement = null;
        
        console.log('🎯 Drag finalizado');
    },
    
    highlightDropZones() {
        const itemCards = DOMElements.getAll('.inventory-item-card');
        itemCards.forEach(card => {
            if (card !== this.draggedElement) {
                card.classList.add('ring-1', 'ring-gray-300', 'dark:ring-gray-600', 'transition-all', 'duration-200');
            }
        });
    },
    
    removeDropZoneHighlight() {
        const itemCards = DOMElements.getAll('.inventory-item-card');
        itemCards.forEach(card => {
            card.classList.remove('ring-1', 'ring-gray-300', 'dark:ring-gray-600');
        });
    },
    
    removeDropHighlight() {
        const itemCards = DOMElements.getAll('.inventory-item-card');
        itemCards.forEach(card => {
            card.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-50', 'bg-blue-50', 'dark:bg-blue-900/20');
        });
    },
    
    showInsertionIndicator(targetCard, isAfter) {
        this.removeInsertionIndicator();
        
        const indicator = document.createElement('div');
        indicator.className = 'insertion-indicator absolute w-full h-1 bg-blue-500 rounded-full z-10 transition-all duration-200';
        indicator.style.left = '0';
        
        if (isAfter) {
            indicator.style.bottom = '-4px';
        } else {
            indicator.style.top = '-4px';
        }
        
        targetCard.style.position = 'relative';
        targetCard.appendChild(indicator);
    },
    
    removeInsertionIndicator() {
        const indicators = DOMElements.getAll('.insertion-indicator');
        if (indicators && indicators.length > 0) {
            indicators.forEach(indicator => {
                if (indicator && indicator.remove) {
                    indicator.remove();
                }
            });
        }
    },
    
    reorderItems(draggedItem, targetItem, insertAfter) {
        const currentItems = [...AppState.currentItems];
        const draggedIndex = currentItems.findIndex(item => item.id === draggedItem.id);
        const targetIndex = currentItems.findIndex(item => item.id === targetItem.id);
        
        if (draggedIndex === -1 || targetIndex === -1) return;
        
        // Remover item da posição atual
        currentItems.splice(draggedIndex, 1);
        
        // Calcular nova posição
        let newIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            newIndex = insertAfter ? targetIndex : targetIndex - 1;
        } else {
            newIndex = insertAfter ? targetIndex + 1 : targetIndex;
        }
        
        // Inserir na nova posição
        currentItems.splice(newIndex, 0, draggedItem);
        
        // Atualizar estado e interface
        AppState.currentItems = currentItems;
        
        // Animar reorganização
        this.animateReorder();
        
        // Atualizar display com animação
        setTimeout(() => {
            if (AdvancedSearch && AdvancedSearch.updateDisplay) {
                AdvancedSearch.updateDisplay();
            } else {
                updateInventoryDisplay();
            }
        }, 150);
    },
    
    animateReorder() {
        const inventoryGrid = DOMElements.get('#inventoryGrid');
        if (inventoryGrid) {
            inventoryGrid.style.transform = 'scale(0.98)';
            inventoryGrid.style.transition = 'transform 0.2s ease-out';
            
            setTimeout(() => {
                inventoryGrid.style.transform = 'scale(1)';
                setTimeout(() => {
                    inventoryGrid.style.transition = '';
                }, 200);
            }, 100);
        }
    }
};

// Global functions for onclick handlers
// Image handling functions
function handleImagePreview(input) {
    const file = input.files && input.files[0];
    
    if (file) {
        // Mostrar barra de progresso
        const progressDiv = document.getElementById('imageUploadProgress');
        const preview = document.getElementById('imagePreview');
        const buttonText = document.getElementById('imageButtonText');
        
        // Esconder preview e mostrar progresso
        if (preview) preview.classList.add('hidden');
        if (progressDiv) progressDiv.classList.remove('hidden');
        if (buttonText) buttonText.textContent = 'Processando...';
        
        // Simular progresso de carregamento
        updateImageProgressBar(0, 'Arquivo selecionado...');
        
        setTimeout(() => {
            updateImageProgressBar(30, 'Validando imagem...');
            
            setTimeout(() => {
                updateImageProgressBar(60, 'Processando imagem...');
                
                setTimeout(() => {
                    updateImageProgressBar(100, 'Pronto para upload!');
                    
                    // Após completar o progresso, mostrar o preview
                    setTimeout(() => {
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const previewImg = document.getElementById('previewImg');
                            const imageFileName = document.getElementById('imageFileName');
                            
                            if (previewImg) previewImg.src = e.target.result;
                            if (imageFileName) imageFileName.textContent = file.name;
                            if (preview) preview.classList.remove('hidden');
                            if (progressDiv) progressDiv.classList.add('hidden');
                            if (buttonText) buttonText.textContent = file.name;
                        };
                        reader.readAsDataURL(file);
                    }, 500);
                }, 800);
            }, 600);
        }, 400);
    }
}

function updateImageProgressBar(percent, text) {
    const progressBar = document.getElementById('imageProgressBar');
    const progressText = document.getElementById('imageProgressText');
    const progressPercent = document.getElementById('imageProgressPercent');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = text;
    if (progressPercent) progressPercent.textContent = percent + '%';
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const buttonText = document.getElementById('imageButtonText');
    const fileInput = document.getElementById('itemImage');
    const progressDiv = document.getElementById('imageUploadProgress');
    const imageFileName = document.getElementById('imageFileName');
    
    if (preview) preview.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (buttonText) buttonText.textContent = 'Selecionar Imagem';
    if (fileInput) fileInput.value = '';
    if (progressDiv) progressDiv.classList.add('hidden');
    if (imageFileName) imageFileName.textContent = '';
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

/**
 * Deleta um item do inventário
 */
async function deleteItem(itemId) {
    if (!itemId) {
        ToastSystem.error('ID do item não fornecido');
        return;
    }

    // Confirmar exclusão
    const confirmed = confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.');
    if (!confirmed) {
        return;
    }

    try {
        showLoading(true);
        
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Erro ao excluir item');
        }

        ToastSystem.success('Item excluído com sucesso!');
        
        // Recarregar a lista de itens
        if (AdvancedSearch && AdvancedSearch.loadItems) {
            await AdvancedSearch.loadItems();
        }

    } catch (error) {
        console.error('Erro ao excluir item:', error);
        ToastSystem.error(`Erro ao excluir item: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Make functions globally available
window.handleImagePreview = handleImagePreview;
window.removeImagePreview = removeImagePreview;
window.openEditModal = openEditModal;
window.openViewModal = openViewModal;
window.deleteItem = deleteItem;
// Sistema de busca avançada e exibição de itens
const AdvancedSearch = {
    currentItems: [],
    filteredItems: [],
    currentPage: 1,
    itemsPerPage: 20,
    filters: {
        search: '',
        category: '',
        collaborator: '',
        status: '',
        company: ''
    },

    /**
     * Inicializa o sistema de busca avançada
     */
    init() {
        this.setupEventListeners();
        this.loadItems();
        console.log('🔍 Sistema de busca avançada inicializado');
    },

    /**
     * Configura os event listeners para busca e filtros
     */
    setupEventListeners() {
        // Busca principal
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }

        // Filtros de categoria
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }

        // Filtros de colaborador
        const collaboratorFilter = document.getElementById('collaboratorFilter');
        if (collaboratorFilter) {
            collaboratorFilter.addEventListener('change', (e) => {
                this.filters.collaborator = e.target.value;
                this.applyFilters();
            });
        }

        // Filtros de status
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.applyFilters();
            });
        }

        // Itens por página
        const itemsPerPageSelect = document.getElementById('itemsPerPage');
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1;
                this.updateDisplay();
            });
        }

        // Botões de paginação
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.updateDisplay();
                }
            });
        }

        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.updateDisplay();
                }
            });
        }
    },

    /**
     * Carrega os itens do Supabase
     */
    async loadItems() {
        try {
            showLoading(true);
            
            const response = await fetch('/api/items');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                console.error('Erro ao carregar itens:', result.error);
                ToastSystem.error('Erro ao carregar itens do inventário');
                return;
            }

            // Processar os dados dos itens
            this.currentItems = result.data.map(item => {
                const moduleData = item.module_data || {};
                
                return {
                    ...item,
                    category: item.category || null,
                    collaborator: item.collaborator || null,
                    company: moduleData.company || null
                };
            });

            this.filteredItems = [...this.currentItems];
            this.updateDisplay();
            this.updateStats();
            this.updateRecentItems();

        } catch (error) {
            console.error('Erro ao carregar itens:', error);
            ToastSystem.error(`Erro ao carregar itens: ${error.message}`);
        } finally {
            showLoading(false);
        }
    },

    /**
     * Aplica os filtros aos itens
     */
    applyFilters() {
        this.filteredItems = this.currentItems.filter(item => {
            const moduleData = item.module_data || {};
            
            // Filtro de busca
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const searchableText = [
                    item.name,
                    item.category,
                    item.collaborator,
                    moduleData.company,
                    moduleData.location,
                    moduleData.brand,
                    moduleData.model,
                    item.status
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Filtro de categoria
            if (this.filters.category && item.categoria_id !== this.filters.category) {
                return false;
            }

            // Filtro de colaborador
            if (this.filters.collaborator && item.colaborador_id !== this.filters.collaborator) {
                return false;
            }

            // Filtro de status
            if (this.filters.status && item.status !== this.filters.status) {
                return false;
            }

            return true;
        });

        this.currentPage = 1;
        this.updateDisplay();
        this.updateFilterTags();
    },

    /**
     * Atualiza a exibição dos itens
     */
    updateDisplay() {
        const inventoryGrid = document.getElementById('inventoryGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (!inventoryGrid) return;

        // Calcular itens da página atual
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageItems = this.filteredItems.slice(startIndex, endIndex);

        // Limpar grid
        inventoryGrid.innerHTML = '';

        if (pageItems.length === 0) {
            // Mostrar estado vazio
            if (emptyState) {
                emptyState.classList.remove('hidden');
            }
            inventoryGrid.classList.add('hidden');
        } else {
            // Ocultar estado vazio
            if (emptyState) {
                emptyState.classList.add('hidden');
            }
            inventoryGrid.classList.remove('hidden');

            // Renderizar itens
            pageItems.forEach(item => {
                const itemCard = this.createItemCard(item);
                inventoryGrid.appendChild(itemCard);
            });

            // Configurar drag & drop
            if (DragDropSystem) {
                pageItems.forEach(item => {
                    const itemCard = inventoryGrid.querySelector(`[data-item-id="${item.id}"]`);
                    if (itemCard) {
                        DragDropSystem.makeDraggable(itemCard, item);
                    }
                });
            }
        }

        this.updatePagination();
    },

    /**
     * Cria um card de item para o inventário
     */
    createItemCard(item) {
        const moduleData = item.module_data || {};
        const card = document.createElement('div');
        card.className = 'inventory-item-card bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/20 p-6 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] group relative';
        card.dataset.itemId = item.id;

        // Status badge color
        const statusColors = {
            'ativo': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            'manutencao': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            'inativo': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        };

        card.innerHTML = `
            <div class="flex flex-col h-full">
                <!-- Header com nome e categoria -->
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                        ${item.name || 'Item sem nome'}
                    </h3>
                    <div class="flex items-center justify-between">
                        <span class="px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300">
                            ${item.category || 'Sem categoria'}
                        </span>
                        <span class="px-3 py-1 rounded-full text-sm font-medium ${statusColors[item.status] || statusColors['inativo']}">
                            ${formatStatus(item.status)}
                        </span>
                    </div>
                </div>

                <!-- Informações do item -->
                <div class="flex-1 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    ${moduleData.company ? `
                        <div class="flex items-center">
                            <i class="fas fa-building w-4 text-primary-600 dark:text-primary-400 mr-2"></i>
                            <span>${moduleData.company}</span>
                        </div>
                    ` : ''}
                    
                    ${item.collaborator ? `
                        <div class="flex items-center">
                            <i class="fas fa-user w-4 text-primary-600 dark:text-primary-400 mr-2"></i>
                            <span>${item.collaborator}</span>
                        </div>
                    ` : ''}
                    
                    ${moduleData.location ? `
                        <div class="flex items-center">
                            <i class="fas fa-map-marker-alt w-4 text-primary-600 dark:text-primary-400 mr-2"></i>
                            <span>${moduleData.location}</span>
                        </div>
                    ` : ''}
                    
                    ${moduleData.brand || moduleData.model ? `
                        <div class="flex items-center">
                            <i class="fas fa-tag w-4 text-primary-600 dark:text-primary-400 mr-2"></i>
                            <span>${[moduleData.brand, moduleData.model].filter(Boolean).join(' - ')}</span>
                        </div>
                    ` : ''}
                    
                    ${moduleData.value ? `
                        <div class="flex items-center">
                            <i class="fas fa-dollar-sign w-4 text-primary-600 dark:text-primary-400 mr-2"></i>
                            <span>€ ${parseFloat(moduleData.value).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Ações -->
                <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <!-- Primeira linha: Botão Visualizar -->
                    <div class="flex justify-center">
                        <button data-action="view" data-item-id="${item.id}" 
                            class="flex items-center justify-center w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                            title="Visualizar">
                            <i class="fas fa-eye text-sm mr-2"></i>
                            <span class="text-sm font-medium">Visualizar</span>
                        </button>
                    </div>
                    
                    <!-- Segunda linha: Botões Editar e Excluir dividindo a linha -->
                    <div class="grid grid-cols-2 gap-2">
                        <button data-action="edit" data-item-id="${item.id}" 
                            class="flex items-center justify-center py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                            title="Editar">
                            <i class="fas fa-edit text-sm mr-2"></i>
                            <span class="text-sm font-medium">Editar</span>
                        </button>
                        
                        <button data-action="delete" data-item-id="${item.id}" 
                            class="flex items-center justify-center py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                            title="Excluir">
                            <i class="fas fa-trash text-sm mr-2"></i>
                            <span class="text-sm font-medium">Excluir</span>
                        </button>
                    </div>
                    
                    <!-- QR Code button (se disponível) - linha separada -->
                    ${item.qr_code ? `
                        <div class="flex justify-center">
                            <button data-action="qr" data-item-id="${item.id}" 
                                class="flex items-center justify-center py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 hover:scale-105"
                                title="QR Code">
                                <i class="fas fa-qrcode text-sm mr-2"></i>
                                <span class="text-sm font-medium">QR Code</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Adicionar event listeners aos botões
        this.setupCardEventListeners(card);

        return card;
 },

    /**
     * Configura event listeners para os botões dos cards
     */
    setupCardEventListeners(card) {
        const buttons = card.querySelectorAll('button[data-action]');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const action = button.dataset.action;
                const itemId = button.dataset.itemId;
                
                switch (action) {
                    case 'view':
                        openViewModal(itemId);
                        break;
                    case 'edit':
                        openEditModal(itemId);
                        break;
                    case 'delete':
                        deleteItem(itemId);
                        break;
                    case 'qr':
                        if (window.showQRCode) {
                            window.showQRCode(itemId);
                        }
                        break;
                }
            });
        });
    },

    /**
     * Atualiza as estatísticas
     */
    updateStats() {
        const totalItems = this.currentItems.length;
        const activeItems = this.currentItems.filter(item => item.status === 'ativo').length;
        const maintenanceItems = this.currentItems.filter(item => item.status === 'manutencao').length;
        const inactiveItems = this.currentItems.filter(item => item.status === 'inativo').length;

        // Atualizar elementos do desktop
        const totalElement = document.getElementById('totalItems');
        const activeElement = document.getElementById('activeItems');
        const maintenanceElement = document.getElementById('maintenanceItems');
        const inactiveElement = document.getElementById('inactiveItems');

        if (totalElement) totalElement.textContent = totalItems;
        if (activeElement) activeElement.textContent = activeItems;
        if (maintenanceElement) maintenanceElement.textContent = maintenanceItems;
        if (inactiveElement) inactiveElement.textContent = inactiveItems;

        // Atualizar elementos do mobile
        const mobileTotalElement = document.getElementById('mobileTotalItems');
        const mobileActiveElement = document.getElementById('mobileActiveItems');

        if (mobileTotalElement) mobileTotalElement.textContent = totalItems;
        if (mobileActiveElement) mobileActiveElement.textContent = activeItems;

        // Atualizar estatísticas por categoria
        this.updateCategoryStats();
        
        // Atualizar contadores por empresa
        this.updateCompanyCounters();
    },

    /**
     * Atualiza as estatísticas por categoria
     */
    updateCategoryStats() {
        const categoryStatsContainer = document.getElementById('categoryStats');
        if (!categoryStatsContainer) return;

        // Contar itens por categoria
        const categoryCount = {};
        this.currentItems.forEach(item => {
            const category = item.category || 'Sem categoria';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
        });

        // Ordenar categorias por quantidade (decrescente)
        const sortedCategories = Object.entries(categoryCount)
            .sort(([,a], [,b]) => b - a);

        if (sortedCategories.length === 0) {
            categoryStatsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-chart-pie text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhuma categoria encontrada</p>
                </div>
            `;
            return;
        }

        categoryStatsContainer.innerHTML = sortedCategories.map(([category, count]) => {
            const percentage = ((count / this.currentItems.length) * 100).toFixed(1);
            return `
                <div class="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
                    <div class="flex items-center space-x-3">
                        <div class="w-4 h-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-pulse-slow"></div>
                        <span class="text-gray-700 dark:text-gray-200 font-semibold">${category}</span>
                    </div>
                    <div class="text-right">
                        <div class="bg-gradient-to-r from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                            ${count} ${count === 1 ? 'item' : 'itens'}
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Atualiza os contadores por empresa
     */
    updateCompanyCounters() {
        // Contar itens por empresa
        const companyCount = {};
        this.currentItems.forEach(item => {
            const moduleData = item.module_data || {};
            const company = moduleData.company || 'Sem empresa';
            companyCount[company] = (companyCount[company] || 0) + 1;
        });

        // Lista de empresas conhecidas com suas cores
        const companies = [
            { name: 'Vespasian Ventures', color: 'purple' },
            { name: 'Instituto AreLuna', color: 'blue' },
            { name: 'ProStoral', color: 'indigo' },
            { name: 'Pinklegion', color: 'pink' },
            { name: 'Papagaio Fotogénico', color: 'yellow' },
            { name: 'Nuvens Autóctones', color: 'green' }
        ];

        // Atualizar cada empresa na interface
        companies.forEach(company => {
            const count = companyCount[company.name] || 0;
            const companyElement = document.querySelector(`[data-company="${company.name}"]`);
            if (companyElement) {
                const counterElement = companyElement.querySelector('.company-counter');
                if (counterElement) {
                    counterElement.textContent = `${count} ${count === 1 ? 'item' : 'itens'}`;
                }
            }
        });
    },

    /**
     * Atualiza os itens recentes no dashboard
     */
    updateRecentItems() {
        const recentItemsContainer = document.getElementById('recentItems');
        if (!recentItemsContainer) return;

        const recentItems = this.currentItems.slice(0, 5);

        if (recentItems.length === 0) {
            recentItemsContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum item recente</p>
                </div>
            `;
            return;
        }

        recentItemsContainer.innerHTML = recentItems.map(item => {
            const moduleData = item.module_data || {};
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                     data-action="view-item" data-item-id="${item.id}">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-800 dark:text-gray-200 text-sm mb-1">
                            ${item.name || 'Item sem nome'}
                        </h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                            ${item.category || 'Sem categoria'} ${moduleData.company ? `• ${moduleData.company}` : ''}
                        </p>
                    </div>
                    <div class="text-right">
                        <span class="text-xs px-2 py-1 rounded-full ${
                            item.status === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                            item.status === 'manutencao' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                            item.status === 'inativo' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
                        }">
                            ${formatStatus(item.status)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Atualiza a paginação
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredItems.length / this.itemsPerPage);
        const paginationContainer = document.getElementById('paginationContainer');
        const paginationInfo = document.getElementById('paginationInfo');
        const prevPageBtn = document.getElementById('prevPageBtn');
        const nextPageBtn = document.getElementById('nextPageBtn');
        const pageNumbers = document.getElementById('pageNumbers');

        if (!paginationContainer) return;

        if (totalPages <= 1) {
            paginationContainer.classList.add('hidden');
            return;
        }

        paginationContainer.classList.remove('hidden');

        // Atualizar informações
        const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, this.filteredItems.length);
        
        if (paginationInfo) {
            paginationInfo.textContent = `${startItem}-${endItem} de ${this.filteredItems.length}`;
        }

        // Atualizar botões
        if (prevPageBtn) {
            prevPageBtn.disabled = this.currentPage === 1;
        }
        
        if (nextPageBtn) {
            nextPageBtn.disabled = this.currentPage === totalPages;
        }

        // Atualizar números das páginas
        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            
            const maxVisiblePages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                pageBtn.className = `px-3 py-1 rounded-lg text-sm transition-all duration-200 ${
                    i === this.currentPage 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`;
                
                pageBtn.addEventListener('click', () => {
                    this.currentPage = i;
                    this.updateDisplay();
                });
                
                pageNumbers.appendChild(pageBtn);
            }
        }
    },

    /**
     * Atualiza as tags de filtros ativos
     */
    updateFilterTags() {
        const filterTags = document.getElementById('filterTags');
        if (!filterTags) return;

        filterTags.innerHTML = '';

        Object.entries(this.filters).forEach(([key, value]) => {
            if (value) {
                const tag = document.createElement('span');
                tag.className = 'inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-300 rounded-full text-sm';
                
                let displayValue = value;
                if (key === 'category' || key === 'collaborator') {
                    // Buscar nome real da categoria/colaborador
                    const select = document.getElementById(`${key}Filter`);
                    if (select) {
                        const option = select.querySelector(`option[value="${value}"]`);
                        if (option) displayValue = option.textContent;
                    }
                }

                tag.innerHTML = `
                    ${key}: ${displayValue}
                    <button data-action="remove-filter" data-filter-key="${key}" class="ml-1 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                `;
                
                filterTags.appendChild(tag);
            }
        });
    },

    /**
     * Remove um filtro específico
     */
    removeFilter(filterKey) {
        this.filters[filterKey] = '';
        
        // Limpar o campo correspondente
        const input = document.getElementById(`${filterKey}Filter`) || document.getElementById('searchInput');
        if (input) {
            input.value = '';
        }
        
        this.applyFilters();
    },

    /**
     * Limpa todos os filtros
     */
    clearAllFilters() {
        Object.keys(this.filters).forEach(key => {
            this.filters[key] = '';
        });
        
        // Limpar todos os campos
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const collaboratorFilter = document.getElementById('collaboratorFilter');
        const statusFilter = document.getElementById('statusFilter');
        
        if (searchInput) searchInput.value = '';
        if (categoryFilter) categoryFilter.value = '';
        if (collaboratorFilter) collaboratorFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        this.applyFilters();
    }
};

// Exportar para uso global
window.AdvancedSearch = AdvancedSearch;
window.DragDropSystem = DragDropSystem;
window.DOMElements = DOMElements;
window.handleEditItem = handleEditItem;
window.updateAllQRCodes = updateAllQRCodes;
window.loadDropdownData = loadDropdownData;
window.populateCategoriesDropdown = populateCategoriesDropdown;
window.populateCollaboratorsDropdown = populateCollaboratorsDropdown;
window.setupDropdownEventListeners = setupDropdownEventListeners;

// Inicializar o sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        ToastSystem.init();
        AdvancedSearch.init();
        DragDropSystem.init();
        TabSystem.init(); // Inicializar sistema de abas
        setupGlobalEventListeners(); // Configurar event listeners globais
    }
});

/**
 * Configura event listeners globais para elementos com data-action
 */
function setupGlobalEventListeners() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        
        switch (action) {
            case 'close-toast':
                const toastId = target.dataset.toastId;
                if (toastId) {
                    ToastSystem.hide(toastId);
                }
                break;
                
            case 'view-item':
                const itemId = target.dataset.itemId;
                if (itemId) {
                    openViewModal(itemId);
                }
                break;
                
            case 'remove-filter':
                const filterKey = target.dataset.filterKey;
                if (filterKey) {
                    AdvancedSearch.removeFilter(filterKey);
                }
                break;
                
            case 'update-qr-codes':
                updateAllQRCodes();
                break;
                
            case 'remove-image-preview':
                removeImagePreview();
                break;
                
            case 'switch-tab':
                const tab = target.dataset.tab;
                if (tab) {
                    switchTab(tab);
                }
                break;
        }
    });
}

/**
 * Função para atualizar dados dos dropdowns (categorias e colaboradores)
 */
async function loadDropdownData() {
    try {
        console.log('📋 Carregando dados dos dropdowns...');
        
        const [categoriesResponse, collaboratorsResponse] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/collaborators')
        ]);

        const categoriesData = await categoriesResponse.json();
        const collaboratorsData = await collaboratorsResponse.json();

        const result = {
            categories: categoriesData.success ? categoriesData.data : [],
            collaborators: collaboratorsData.success ? collaboratorsData.data : []
        };

        console.log('📋 Dados dos dropdowns carregados:', result);
        return result;
    } catch (error) {
        console.error('Erro ao carregar dados dos dropdowns:', error);
        return {
            categories: [],
            collaborators: []
        };
    }
}

/**
 * Função para atualizar todos os QR codes
 */
async function updateAllQRCodes() {
    try {
        console.log('🔄 Iniciando atualização de QR codes...');
        
        // Mostrar loading
        ToastSystem.info('🔄 Atualizando QR codes...');
        
        // Fazer requisição para atualizar QR codes
        const response = await fetch('/api/qr-codes/update-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            ToastSystem.success(`✅ ${result.updated || 0} QR codes atualizados com sucesso!`);
            
            // Recarregar itens se o AdvancedSearch estiver disponível
            if (window.AdvancedSearch && typeof window.AdvancedSearch.loadItems === 'function') {
                await window.AdvancedSearch.loadItems();
            }
        } else {
            throw new Error(result.message || 'Erro ao atualizar QR codes');
        }
    } catch (error) {
        console.error('Erro ao atualizar QR codes:', error);
        ToastSystem.error('❌ Erro ao atualizar QR codes: ' + error.message);
    }
}

/**
 * Função para editar item - alias para openEditModal
 */
/**
 * Função para popular dropdown de categorias
 */
function populateCategoriesDropdown(categories = [], selectId = 'itemCategory') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.nome;
        select.appendChild(option);
    });

    // Add "Create new" option
    const createOption = document.createElement('option');
    createOption.value = 'create_new';
    createOption.textContent = '+ Criar nova categoria';
    createOption.style.fontStyle = 'italic';
    createOption.style.color = '#3B82F6';
    select.appendChild(createOption);
}

/**
 * Função para popular dropdown de colaboradores
 */
function populateCollaboratorsDropdown(collaborators = [], selectId = 'itemCollaborator') {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um colaborador</option>';
    
    collaborators.forEach(collaborator => {
        const option = document.createElement('option');
        option.value = collaborator.id;
        option.textContent = collaborator.nome;
        select.appendChild(option);
    });

    // Add "Create new" option
    const createOption = document.createElement('option');
    createOption.value = 'create_new';
    createOption.textContent = '+ Criar novo colaborador';
    createOption.style.fontStyle = 'italic';
    createOption.style.color = '#3B82F6';
    select.appendChild(createOption);
}

/**
 * Função para configurar event listeners dos dropdowns
 */
function setupDropdownEventListeners() {
    // Category dropdown
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                const modal = document.getElementById('categoryModal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
                this.value = ''; // Reset selection
            }
        });
    }

    // Collaborator dropdown
    const collaboratorSelect = document.getElementById('itemCollaborator');
    if (collaboratorSelect) {
        collaboratorSelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                const modal = document.getElementById('collaboratorModal');
                if (modal) {
                    modal.classList.remove('hidden');
                }
                this.value = ''; // Reset selection
            }
        });
    }

    // Setup modal close event listeners
    setupModalEventListeners();
}

/**
 * Função para configurar event listeners dos modais
 */
function setupModalEventListeners() {
    // Category Modal - Close buttons
    const closeCategoryModal = document.getElementById('closeCategoryModal');
    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    const categoryModal = document.getElementById('categoryModal');

    if (closeCategoryModal && categoryModal) {
        closeCategoryModal.addEventListener('click', () => {
            categoryModal.classList.add('hidden');
        });
    }

    if (cancelCategoryBtn && categoryModal) {
        cancelCategoryBtn.addEventListener('click', () => {
            categoryModal.classList.add('hidden');
        });
    }

    // Collaborator Modal - Close buttons
    const closeCollaboratorModal = document.getElementById('closeCollaboratorModal');
    const cancelCollaboratorBtn = document.getElementById('cancelCollaboratorBtn');
    const collaboratorModal = document.getElementById('collaboratorModal');

    if (closeCollaboratorModal && collaboratorModal) {
        closeCollaboratorModal.addEventListener('click', () => {
            collaboratorModal.classList.add('hidden');
        });
    }

    if (cancelCollaboratorBtn && collaboratorModal) {
        cancelCollaboratorBtn.addEventListener('click', () => {
            collaboratorModal.classList.add('hidden');
        });
    }

    // Category Form submission
    const categoryForm = document.getElementById('categoryForm');
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const categoryData = {
                nome: formData.get('nome')
            };

            try {
                const response = await fetch('/api/categories', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(categoryData)
                });

                const result = await response.json();

                if (result.success) {
                    // Recarregar dropdowns
                    const dropdownData = await loadDropdownData();
                    populateCategoriesDropdown(dropdownData.categories, 'itemCategory');
                    
                    // Selecionar a nova categoria
                    const categorySelect = document.getElementById('itemCategory');
                    if (categorySelect) {
                        categorySelect.value = result.data.id;
                    }
                    
                    // Fechar modal e resetar form
                    categoryModal.classList.add('hidden');
                    categoryForm.reset();
                    
                    ToastSystem.success('✅ Categoria criada com sucesso!');
                } else {
                    ToastSystem.error('❌ Erro ao criar categoria: ' + result.message);
                }
            } catch (error) {
                console.error('Erro ao criar categoria:', error);
                ToastSystem.error('❌ Erro ao criar categoria');
            }
        });
    }

    // Collaborator Form submission
    const collaboratorForm = document.getElementById('collaboratorForm');
    if (collaboratorForm) {
        collaboratorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const collaboratorData = {
                nome: formData.get('nome'),
                email: formData.get('email'),
                cargo: formData.get('cargo')
            };

            try {
                const response = await fetch('/api/collaborators', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(collaboratorData)
                });

                const result = await response.json();

                if (result.success) {
                    // Recarregar dropdowns
                    const dropdownData = await loadDropdownData();
                    populateCollaboratorsDropdown(dropdownData.collaborators, 'itemCollaborator');
                    
                    // Selecionar o novo colaborador
                    const collaboratorSelect = document.getElementById('itemCollaborator');
                    if (collaboratorSelect) {
                        collaboratorSelect.value = result.data.id;
                    }
                    
                    // Fechar modal e resetar form
                    collaboratorModal.classList.add('hidden');
                    collaboratorForm.reset();
                    
                    ToastSystem.success('✅ Colaborador criado com sucesso!');
                } else {
                    ToastSystem.error('❌ Erro ao criar colaborador: ' + result.message);
                }
            } catch (error) {
                console.error('Erro ao criar colaborador:', error);
                ToastSystem.error('❌ Erro ao criar colaborador');
            }
        });
    }

    // Close modals when clicking outside
    if (categoryModal) {
        categoryModal.addEventListener('click', (e) => {
            if (e.target === categoryModal) {
                categoryModal.classList.add('hidden');
            }
        });
    }

    if (collaboratorModal) {
        collaboratorModal.addEventListener('click', (e) => {
            if (e.target === collaboratorModal) {
                collaboratorModal.classList.add('hidden');
            }
        });
    }
}

/**
 * Função para carregar dados dos dropdowns (categorias e colaboradores)
 */
async function loadDropdownData() {
    try {
        console.log('📋 Carregando dados dos dropdowns...');
        
        const [categoriesResponse, collaboratorsResponse] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/collaborators')
        ]);

        const categoriesData = await categoriesResponse.json();
        const collaboratorsData = await collaboratorsResponse.json();

        const result = {
            categories: categoriesData.success ? categoriesData.data : [],
            collaborators: collaboratorsData.success ? collaboratorsData.data : []
        };

        console.log('📋 Dados dos dropdowns carregados:', result);
        return result;
    } catch (error) {
        console.error('Erro ao carregar dados dos dropdowns:', error);
        return {
            categories: [],
            collaborators: []
        };
    }
}

/**
 * Função para atualizar todos os QR codes
 */
async function updateAllQRCodes() {
    try {
        console.log('🔄 Iniciando atualização de QR codes...');
        
        // Mostrar loading
        ToastSystem.info('🔄 Atualizando QR codes...');
        
        // Fazer requisição para atualizar QR codes
        const response = await fetch('/api/qr-codes/update-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            ToastSystem.success(`✅ ${result.updated || 0} QR codes atualizados com sucesso!`);
            
            // Recarregar itens se o AdvancedSearch estiver disponível
            if (window.AdvancedSearch && typeof window.AdvancedSearch.loadItems === 'function') {
                await window.AdvancedSearch.loadItems();
            }
        } else {
            throw new Error(result.message || 'Erro ao atualizar QR codes');
        }
    } catch (error) {
        console.error('Erro ao atualizar QR codes:', error);
        ToastSystem.error('❌ Erro ao atualizar QR codes: ' + error.message);
    }
}

/**
 * Função para editar item - alias para openEditModal
 */