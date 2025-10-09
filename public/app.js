// ===== CONFIGURAÇÃO GLOBAL E ESTADO DA APLICAÇÃO =====
const APP_CONFIG = {
    API_BASE_URL: '',
    VERSION: '2.0.0',
    THEME_KEY: 'inventory-theme',
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_DURATION: 5000
};

// Estado global da aplicação
const AppState = {
    currentItems: [],
    currentTab: 'dashboard',
    isLoading: false,
    isDarkMode: localStorage.getItem(APP_CONFIG.THEME_KEY) === 'dark',
    filters: {
        search: '',
        category: '',
        company: '',
        status: ''
    },
    stats: null,
    categories: [],
    collaborators: []
};

// Cache de elementos DOM para melhor performance
const DOMElements = {
    // Inicialização lazy dos elementos
    _cache: new Map(),
    
    get(selector) {
        if (!this._cache.has(selector)) {
            this._cache.set(selector, document.querySelector(selector));
        }
        return this._cache.get(selector);
    },
    
    getAll(selector) {
        const cacheKey = `all:${selector}`;
        if (!this._cache.has(cacheKey)) {
            this._cache.set(cacheKey, document.querySelectorAll(selector));
        }
        return this._cache.get(cacheKey);
    },
    
    // Elementos principais
    get tabButtons() { return this.getAll('.nav-tab'); },
    get tabContents() { return this.getAll('.tab-content'); },
    get totalItems() { return this.get('#totalItems'); },
    get activeItems() { return this.get('#activeItems'); },
    get categoryStats() { return this.get('#categoryStats'); },
    get recentItems() { return this.get('#recentItems'); },
    get addItemForm() { return this.get('#addItemForm'); },
    get editItemForm() { return this.get('#editItemForm'); },
    get searchInput() { return this.get('#searchInput'); },
    get filterCategory() { return this.get('#filterCategory'); },
    get filterCompany() { return this.get('#filterCompany'); },
    get filterStatus() { return this.get('#filterStatus'); },
    get inventoryGrid() { return this.get('#inventoryGrid'); },

    get loading() { return this.get('#loading'); },
    get darkModeToggle() { return this.get('#darkModeToggle'); },
    get themeIcon() { return this.get('#themeIcon'); }
};

// ===== INICIALIZAÇÃO DA APLICAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

/**
 * Inicializa a aplicação com todas as funcionalidades modernas
 */
async function initializeApp() {
    try {
        console.log('🚀 Iniciando aplicação...');
        showLoading(true);
        
        // Inicializar tema
        console.log('🎨 Inicializando tema...');
        initializeTheme();
        
        // Configurar event listeners
        console.log('👂 Configurando event listeners...');
        setupEventListeners();
        
        // Inicializar sistema de busca avançada
        console.log('🔍 Inicializando busca avançada...');
        AdvancedSearch.init();
        
        // Inicializar sistema de drag & drop
        console.log('🖱️ Inicializando drag & drop...');
        DragDropSystem.init();
        
        // Carregar dados iniciais
        console.log('📊 Carregando dados iniciais...');
        await loadItems();
        await loadStats();
        
        // Carregar dados dos dropdowns
        console.log('📋 Carregando dados dos dropdowns...');
        await loadDropdownData();
        
        // Definir aba padrão
        console.log('📋 Definindo aba padrão...');
        switchTab('dashboard');
        
        // Atualizar interface
        console.log('🖼️ Atualizando interface...');
        updateDashboard();
        updateInventoryDisplay();
        
        // Animação de entrada
        console.log('✨ Aplicando animações...');
        animateAppEntry();
        
        showLoading(false);
        ToastSystem.success('✅ Sistema inicializado com sucesso!');
        console.log('🎉 Sistema de Inventário v2.0 - Inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        ToastSystem.error('Erro ao inicializar o sistema');
        showLoading(false);
    }
}

/**
 * Inicializa o sistema de tema (dark/light mode)
 */
function initializeTheme() {
    const html = document.documentElement;
    
    if (AppState.isDarkMode) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeIcon();
}

/**
 * Atualiza o ícone do tema
 */
function updateThemeIcon() {
    const themeIcon = DOMElements.themeIcon;
    if (themeIcon) {
        themeIcon.className = AppState.isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
}

/**
 * Alterna entre tema claro e escuro
 */
function toggleTheme() {
    AppState.isDarkMode = !AppState.isDarkMode;
    localStorage.setItem(APP_CONFIG.THEME_KEY, AppState.isDarkMode ? 'dark' : 'light');
    
    const html = document.documentElement;
    html.classList.toggle('dark', AppState.isDarkMode);
    
    updateThemeIcon();
    
    // Animação suave de transição
    html.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    setTimeout(() => {
        html.style.transition = '';
    }, 300);
    
    ToastSystem.info(
        AppState.isDarkMode ? '🌙 Tema escuro ativado' : '☀️ Tema claro ativado'
    );
}

/**
 * Animação de entrada da aplicação
 */
function animateAppEntry() {
    const elements = document.querySelectorAll('.animate-fade-in, .animate-slide-up, .animate-bounce-in');
    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * 0.1}s`;
    });
}

/**
 * Configura todos os event listeners da aplicação
 */
function setupEventListeners() {
    // Tab navigation com animações suaves
    DOMElements.tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = btn.dataset.tab;
            if (tabName && tabName !== AppState.currentTab) {
                switchTab(tabName);
            }
        });
    });
    
    // Dark mode toggle
    const darkModeToggle = DOMElements.darkModeToggle;
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleTheme);
    }
    
    // Forms com validação moderna
    const addItemForm = DOMElements.addItemForm;
    if (addItemForm) {
        addItemForm.addEventListener('submit', handleAddItem);
        setupFormValidation(addItemForm);
    }
    
    const editItemForm = DOMElements.editItemForm;
    if (editItemForm) {
        editItemForm.addEventListener('submit', handleEditItem);
        setupFormValidation(editItemForm);
    }
    
    // Search e filters com debounce otimizado
    const searchInput = DOMElements.searchInput;
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, APP_CONFIG.DEBOUNCE_DELAY));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
    
    // Filtros com feedback visual
    [DOMElements.filterCategory, DOMElements.filterCompany, DOMElements.filterStatus].forEach(filter => {
        if (filter) {
            filter.addEventListener('change', (e) => {
                addFilterAnimation(e.target);
                handleSearch();
            });
        }
    });
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Scroll animations
    setupScrollAnimations();
    
    // Image selection button
    const selectImageBtn = document.getElementById('selectImageBtn');
    if (selectImageBtn) {
        selectImageBtn.addEventListener('click', function() {
            const fileInput = document.getElementById('itemImage');
            if (fileInput) {
                fileInput.click();
            }
        });
    }

    // Setup dropdown event listeners
    setupDropdownEventListeners();
}

/**
 * Configura validação de formulários em tempo real
 */
function setupFormValidation(form) {
    const inputs = form.querySelectorAll('input[required], select[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
}

/**
 * Valida um campo individual
 */
function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    
    if (field.hasAttribute('required') && !value) {
        showFieldError(field, 'Este campo é obrigatório');
        return false;
    }
    
    if (field.type === 'email' && value && !isValidEmail(value)) {
        showFieldError(field, 'Email inválido');
        return false;
    }
    
    if (field.type === 'number' && value && isNaN(value)) {
        showFieldError(field, 'Valor numérico inválido');
        return false;
    }
    
    clearFieldError(field);
    return true;
}

/**
 * Mostra erro em um campo
 */
function showFieldError(field, message) {
    clearFieldError(field);
    
    field.classList.add('error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error text-red-500 text-sm mt-1 animate-fade-in';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

/**
 * Remove erro de um campo
 */
function clearFieldError(field) {
    if (field) {
        field.classList.remove('error');
        const errorDiv = field.parentNode?.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

/**
 * Adiciona animação aos filtros
 */
function addFilterAnimation(element) {
    element.classList.add('animate-pulse');
    setTimeout(() => {
        element.classList.remove('animate-pulse');
    }, 300);
}

/**
 * Configura animações de scroll
 */
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observar elementos que devem animar no scroll
    document.querySelectorAll('.inventory-item, .dashboard-card').forEach(el => {
        observer.observe(el);
    });
}

/**
 * Manipula atalhos de teclado
 */
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + K para busca
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = DOMElements.searchInput;
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Ctrl/Cmd + N para novo item
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        switchTab('add-item');
    }
    
    // Ctrl/Cmd + D para dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        switchTab('dashboard');
    }
}

/**
 * Valida email
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Tab Management
/**
 * Troca entre abas com animações suaves
 */
function switchTab(tabName) {
    if (!tabName || tabName === AppState.currentTab) return;
    
    // Mostrar loading se necessário
    if (tabName === 'dashboard' || tabName === 'inventory') {
        showLoading(true);
    }
    
    // Atualizar estado
    const previousTab = AppState.currentTab;
    AppState.currentTab = tabName;
    
    // Atualizar navegação com animação
    DOMElements.tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
        
        // Adicionar animação de clique
        if (isActive) {
            btn.classList.add('animate-bounce-in');
            setTimeout(() => btn.classList.remove('animate-bounce-in'), 300);
        }
    });
    
    // Animação de saída do conteúdo anterior
    const previousContent = document.getElementById(previousTab);
    if (previousContent && previousContent.classList.contains('active')) {
        previousContent.classList.add('animate-slide-out');
        setTimeout(() => {
            previousContent.classList.remove('active');
            previousContent.classList.remove('animate-slide-out');
        }, 200);
    }
    
    // Animação de entrada do novo conteúdo
    setTimeout(() => {
        DOMElements.tabContents.forEach(content => {
            const isActive = content.id === tabName;
            
            if (isActive) {
                content.classList.add('active');
                content.classList.add('animate-slide-in');
                setTimeout(() => content.classList.remove('animate-slide-in'), 300);
            } else {
                content.classList.remove('active');
            }
        });
        
        // Ações específicas por aba
        handleTabSpecificActions(tabName);
    }, 200);
}

/**
 * Executa ações específicas para cada aba
 */
function handleTabSpecificActions(tabName) {
    switch (tabName) {
        case 'dashboard':
            updateDashboard().then(() => {
                showLoading(false);
                animateDashboardCards();
            });
            break;
        case 'inventory':
            updateInventoryDisplay();
            showLoading(false);
            animateInventoryItems();
            break;
        case 'add-item':
            resetAddItemForm();
            focusFirstInput();
            break;
    }
}

/**
 * Anima os cards do dashboard
 */
function animateDashboardCards() {
    const cards = document.querySelectorAll('.dashboard-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-slide-up');
        }, index * 100);
    });
}

/**
 * Anima os itens do inventário
 */
function animateInventoryItems() {
    const items = document.querySelectorAll('.inventory-item');
    items.forEach((item, index) => {
        setTimeout(() => {
            item.classList.add('animate-fade-in');
        }, index * 50);
    });
}

/**
 * Foca no primeiro input do formulário
 */
function focusFirstInput() {
    setTimeout(() => {
        const firstInput = document.querySelector('#add-item input:not([type="hidden"])');
        if (firstInput) {
            firstInput.focus();
        }
    }, 300);
}

/**
 * Reseta o formulário de adicionar item
 */
function resetAddItemForm() {
    const form = DOMElements.addItemForm;
    if (form) {
        form.reset();
        // Limpar erros de validação
        const fieldErrors = form.querySelectorAll('.field-error');
        if (fieldErrors) {
            fieldErrors.forEach(error => {
                if (error && error.remove) {
                    error.remove();
                }
            });
        }
        const errorFields = form.querySelectorAll('.error');
        if (errorFields) {
            errorFields.forEach(field => {
                if (field && field.classList) {
                    field.classList.remove('error');
                }
            });
        }
    }
}



// API Functions
async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${APP_CONFIG.API_BASE_URL}/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }
        
        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
}

async function loadItems() {
    try {
        console.log('🔄 Iniciando carregamento de itens...');
        const response = await apiRequest('/items');
        console.log('📡 Resposta da API recebida:', response);
        
        // A API retorna um objeto com 'data' e 'count'
        AppState.currentItems = response.data || [];
        console.log('✅ Itens carregados no AppState:', AppState.currentItems.length);
        console.log('📋 Primeiros 3 itens:', AppState.currentItems.slice(0, 3));
        
        return AppState.currentItems;
    } catch (error) {
        console.error('❌ Erro ao carregar itens:', error);
        showNotification('Erro ao carregar itens', 'error');
        return [];
    }
}

async function loadStats() {
    try {
        const response = await apiRequest('/stats');
        return response.data;
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return null;
    }
}

async function searchItems(query = '', category = '', company = '', status = '') {
    try {
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (category) params.append('category', category);
        if (company) params.append('company', company);
        if (status) params.append('status', status);
        
        const response = await apiRequest(`/search?${params.toString()}`);
        return response.data || [];
    } catch (error) {
        console.error('Erro na busca:', error);
        showNotification('Erro na busca', 'error');
        return [];
    }
}

// Item Management
async function handleAddItem(e) {
    e.preventDefault();
    
    // Prevent multiple submissions
    const submitButton = e.target.querySelector('button[type="submit"]');
    if (submitButton.disabled) return;
    
    submitButton.disabled = true;
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Adicionando...';
    
    try {
        showLoading(true);
        
        const formData = new FormData(e.target);
        
        // Não converter imagem para base64, enviar como FormData para o servidor
        const response = await fetch('/api/items', {
            method: 'POST',
            body: formData // Enviar FormData diretamente
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao adicionar item');
        }
        
        showNotification('Item adicionado com sucesso!', 'success');
        e.target.reset();
        removeImagePreview();
        
        // Recarregar dados
        await loadItems();
        await loadStats();
        updateDashboard();
        updateInventoryDisplay();
        
    } catch (error) {
        console.error('Erro ao adicionar item:', error);
        showNotification(error.message || 'Erro ao adicionar item', 'error');
    } finally {
        showLoading(false);
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

async function handleEditItem(e) {
    e.preventDefault();
    
    try {
        showLoading(true);
        
        const itemId = document.getElementById('editItemId').value;
        console.log('📝 Editando item ID:', itemId);
        
        // Coletar dados do formulário manualmente
        const formData = {
            name: document.getElementById('editItemName').value,
            description: document.getElementById('editItemDescription').value,
            company: document.getElementById('editItemCompany').value,
            category: document.getElementById('editItemCategory').value,
            location: document.getElementById('editItemLocation').value,
            status: document.getElementById('editItemStatus').value,
            serial_number: document.getElementById('editItemSerial').value
        };
        
        console.log('📋 Dados do formulário:', formData);
        
        // Verificar se há imagem para upload
        const imageInput = document.getElementById('editItemImage');
        const hasNewImage = imageInput && imageInput.files && imageInput.files.length > 0;
        
        let requestData;
        if (hasNewImage) {
            // Se há nova imagem, usar FormData
            requestData = new FormData();
            Object.keys(formData).forEach(key => {
                requestData.append(key, formData[key]);
            });
            requestData.append('image', imageInput.files[0]);
        } else {
            // Se não há nova imagem, usar JSON
            requestData = JSON.stringify(formData);
        }
        
        const response = await fetch(`/api/items/${itemId}`, {
            method: 'PUT',
            headers: hasNewImage ? {} : {
                'Content-Type': 'application/json'
            },
            body: requestData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao atualizar item');
        }
        
        showNotification('Item atualizado com sucesso!', 'success');
        
        // Recarregar dados
        await loadItems();
        await loadStats();
        updateDashboard();
        updateInventoryDisplay();
        
    } catch (error) {
        console.error('Erro ao editar item:', error);
        showNotification(error.message || 'Erro ao editar item', 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteItem(itemId) {
    console.log('🗑️ deleteItem chamada com ID:', itemId);
    if (!confirm('Tem certeza que deseja excluir este item?')) {
        console.log('❌ Exclusão cancelada pelo usuário');
        return;
    }
    
    try {
        showLoading(true);
        
        await apiRequest(`/items/${itemId}`, {
            method: 'DELETE'
        });
        
        showNotification('Item excluído com sucesso!', 'success');
        
        // Recarregar dados
        await loadItems();
        await loadStats();
        updateDashboard();
        updateInventoryDisplay();
        
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        showNotification(error.message || 'Erro ao excluir item', 'error');
    } finally {
        showLoading(false);
    }
}

// Advanced Search and Filter System
const AdvancedSearch = {
    filters: {
        search: '',
        category: '',
        status: '',
        priceMin: '',
        priceMax: '',
        stock: '',
        sortBy: 'created_at',
        sortOrder: 'desc'
    },
    
    pagination: {
        currentPage: 1,
        itemsPerPage: 20,
        totalPages: 1,
        totalItems: 0
    },
    
    items: [],
    
    init() {
        this.setupEventListeners();
        this.loadItems();
    },
    
    setupEventListeners() {
        // Search input with debounce
        const searchInput = DOMElements.get('searchInput');
        const clearSearch = DOMElements.get('clearSearch');
        
        let searchTimeout;
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value.toLowerCase();
                this.pagination.currentPage = 1; // Reset to first page
                this.updateClearButton();
                this.loadItems();
            }, 300);
        });
        
        clearSearch?.addEventListener('click', () => {
            searchInput.value = '';
            this.filters.search = '';
            this.pagination.currentPage = 1;
            this.updateClearButton();
            this.loadItems();
        });
        
        // Advanced filters toggle
        const toggleBtn = document.getElementById('toggleAdvancedFilters');
        const panel = document.getElementById('advancedFiltersPanel');
        const icon = document.getElementById('filterToggleIcon');
        
        // Initially hide the panel properly
        if (panel) {
            panel.classList.add('hidden');
            panel.style.maxHeight = '0px';
            panel.style.opacity = '0';
            panel.style.overflow = 'hidden';
            panel.style.transition = 'all 0.3s ease-out';
        }
        
        if (toggleBtn && panel && icon) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const isHidden = panel.classList.contains('hidden');
                
                if (isHidden) {
                    // Show panel
                    panel.classList.remove('hidden');
                    requestAnimationFrame(() => {
                        panel.style.maxHeight = '500px';
                        panel.style.opacity = '1';
                        icon.style.transform = 'rotate(180deg)';
                    });
                } else {
                    // Hide panel
                    panel.style.maxHeight = '0px';
                    panel.style.opacity = '0';
                    icon.style.transform = 'rotate(0deg)';
                    
                    setTimeout(() => {
                        panel.classList.add('hidden');
                    }, 300);
                }
            });
        }
        
        // Filter controls
        const filterElements = [
            'categoryFilter', 'statusFilter', 'priceRangeFilter', 
            'stockFilter', 'sortBy'
        ];
        
        filterElements.forEach(id => {
            const element = DOMElements.get(id);
            element?.addEventListener('change', (e) => {
                const filterKey = id.replace('Filter', '').replace('sortBy', 'sortBy');
                
                if (id === 'priceRangeFilter') {
                    const [min, max] = e.target.value.split('-');
                    this.filters.priceMin = min || '';
                    this.filters.priceMax = max === '+' ? '' : max || '';
                } else if (id === 'sortBy') {
                    const [field, order] = e.target.value.includes('-desc') 
                        ? [e.target.value.replace('-desc', ''), 'desc']
                        : [e.target.value, 'asc'];
                    this.filters.sortBy = field;
                    this.filters.sortOrder = order;
                } else {
                    this.filters[filterKey] = e.target.value;
                }
                
                this.pagination.currentPage = 1; // Reset to first page
                this.loadItems();
            });
        });
        
        // Clear all filters
        const clearAllBtn = DOMElements.get('clearAllFilters');
        clearAllBtn?.addEventListener('click', () => {
            this.clearAllFilters();
        });
        
        // Pagination controls
        const prevBtn = DOMElements.get('prevPageBtn');
        const nextBtn = DOMElements.get('nextPageBtn');
        const itemsPerPageSelect = DOMElements.get('itemsPerPage');
        
        prevBtn?.addEventListener('click', () => {
            if (this.pagination.currentPage > 1) {
                this.pagination.currentPage--;
                this.loadItems();
            }
        });
        
        nextBtn?.addEventListener('click', () => {
            if (this.pagination.currentPage < this.pagination.totalPages) {
                this.pagination.currentPage++;
                this.loadItems();
            }
        });
        
        itemsPerPageSelect?.addEventListener('change', (e) => {
            this.pagination.itemsPerPage = parseInt(e.target.value);
            this.pagination.currentPage = 1;
            this.loadItems();
        });
        
        // Action buttons event listener
        const grid = DOMElements.get('inventoryGrid');
        grid?.addEventListener('click', (e) => {
            const button = e.target.closest('button[data-action]');
            if (button) {
                const action = button.dataset.action;
                const itemId = button.dataset.itemId;
                
                if (action === 'view') {
                    openViewModal(itemId);
                } else if (action === 'edit') {
                    openEditModal(itemId);
                } else if (action === 'delete') {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteItem(itemId);
                }
            }
        });
        
        // Page number clicks
        const pageNumbersContainer = DOMElements.get('pageNumbers');
        pageNumbersContainer?.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('[data-page]');
            if (pageBtn) {
                const page = parseInt(pageBtn.dataset.page);
                if (page !== this.pagination.currentPage) {
                    this.pagination.currentPage = page;
                    this.loadItems();
                }
            }
        });
    },
    
    updateClearButton() {
        const clearBtn = DOMElements.get('clearSearch');
        const searchInput = DOMElements.get('searchInput');
        
        if (searchInput?.value.trim()) {
            clearBtn?.classList.remove('hidden');
        } else {
            clearBtn?.classList.add('hidden');
        }
    },
    
    async loadItems() {
        try {
            showLoading(true);
            
            // Construir parâmetros da query
            const params = new URLSearchParams({
                page: this.pagination.currentPage,
                limit: this.pagination.itemsPerPage,
                sortBy: this.filters.sortBy,
                sortOrder: this.filters.sortOrder
            });
            
            // Adicionar filtros não vazios
            if (this.filters.search) params.append('search', this.filters.search);
            if (this.filters.category) params.append('category', this.filters.category);
            if (this.filters.status) params.append('status', this.filters.status);
            if (this.filters.priceMin) params.append('priceMin', this.filters.priceMin);
            if (this.filters.priceMax) params.append('priceMax', this.filters.priceMax);
            if (this.filters.stock) params.append('stock', this.filters.stock);
            
            const response = await fetch(`/api/items?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                this.items = data.data || [];
                this.pagination = {
                    ...this.pagination,
                    ...data.pagination
                };
                this.updateDisplay();
                this.updatePaginationControls();
                this.updateActiveFilters();
            } else {
                throw new Error('Erro ao carregar itens');
            }
        } catch (error) {
            console.error('Erro ao carregar itens:', error);
            ToastSystem.show('Erro ao carregar itens', 'error');
        } finally {
            showLoading(false);
        }
    },
    
    updateDisplay() {
        const grid = DOMElements.get('inventoryGrid');
        const emptyState = DOMElements.get('emptyState');
        const itemCount = DOMElements.get('itemCount');
        const paginationContainer = DOMElements.get('paginationContainer');
        
        // Update count
        if (itemCount) {
            itemCount.textContent = this.pagination.totalItems;
        }
        
        if (this.items.length === 0) {
            grid?.classList.add('hidden');
            emptyState?.classList.remove('hidden');
            paginationContainer?.classList.add('hidden');
        } else {
            grid?.classList.remove('hidden');
            emptyState?.classList.add('hidden');
            paginationContainer?.classList.remove('hidden');
            this.renderItems();
        }
    },
    
    updatePaginationControls() {
        const prevBtn = DOMElements.get('prevPageBtn');
        const nextBtn = DOMElements.get('nextPageBtn');
        const paginationInfo = DOMElements.get('paginationInfo');
        const pageNumbers = DOMElements.get('pageNumbers');
        
        // Update navigation buttons
        if (prevBtn) {
            prevBtn.disabled = this.pagination.currentPage <= 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.pagination.currentPage >= this.pagination.totalPages;
        }
        
        // Update pagination info
        if (paginationInfo) {
            const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
            const end = Math.min(start + this.items.length - 1, this.pagination.totalItems);
            paginationInfo.textContent = `${start}-${end} de ${this.pagination.totalItems}`;
        }
        
        // Update page numbers
        if (pageNumbers) {
            pageNumbers.innerHTML = this.generatePageNumbers();
        }
    },
    
    generatePageNumbers() {
        const { currentPage, totalPages } = this.pagination;
        const pages = [];
        
        // Always show first page
        if (totalPages > 0) {
            pages.push(1);
        }
        
        // Calculate range around current page
        const start = Math.max(2, currentPage - 2);
        const end = Math.min(totalPages - 1, currentPage + 2);
        
        // Add ellipsis if needed
        if (start > 2) {
            pages.push('...');
        }
        
        // Add pages around current
        for (let i = start; i <= end; i++) {
            if (i !== 1 && i !== totalPages) {
                pages.push(i);
            }
        }
        
        // Add ellipsis if needed
        if (end < totalPages - 1) {
            pages.push('...');
        }
        
        // Always show last page
        if (totalPages > 1) {
            pages.push(totalPages);
        }
        
        return pages.map(page => {
            if (page === '...') {
                return '<span class="px-2 py-1 text-gray-400">...</span>';
            }
            
            const isActive = page === currentPage;
            const classes = isActive 
                ? 'px-3 py-1 bg-primary-600 text-white rounded-lg font-medium'
                : 'px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer';
            
            return `<button class="${classes}" data-page="${page}">${page}</button>`;
        }).join('');
    },
    
    renderItems() {
        const grid = DOMElements.get('inventoryGrid');
        if (!grid) return;
        
        grid.innerHTML = this.items.map(item => this.createItemCard(item)).join('');
        
        // Tornar os cards arrastáveis após renderização
        const cards = grid.querySelectorAll('.inventory-item');
        cards.forEach((card, index) => {
            const item = this.items[index];
            if (item) {
                DragDropSystem.makeDraggable(card, item);
            }
            
            // Add stagger animation
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'all 0.3s ease-out';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 50);
        });
    },
    
    createItemCard(item) {
        const statusColors = {
            active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            inactive: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
            maintenance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
        };
        
        const stockLevel = parseInt(item.quantity) || 0;
        const stockColor = stockLevel === 0 ? 'text-red-500' : 
                          stockLevel <= 10 ? 'text-yellow-500' : 'text-green-500';
        
        // Verificar se o item tem QR code
        const hasQRCode = item.module_data && item.module_data.qr_code && item.module_data.qr_code_image;
        
        return `
            <div class="inventory-item bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl border border-white/20 dark:border-gray-700/20 p-6 transition-all duration-300 hover:scale-105">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">${item.name || 'Sem nome'}</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">${item.description || 'Sem descrição'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        ${hasQRCode ? `
                            <button data-action="view-qr" data-item-id="${item.id}" 
                                class="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-300 hover:scale-105" 
                                title="Ver QR Code">
                                <i class="fas fa-qrcode"></i>
                            </button>
                        ` : ''}
                        <span class="px-3 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || statusColors.active}">
                            ${item.status === 'active' ? '✅ Ativo' : 
                              item.status === 'inactive' ? '❌ Inativo' : 
                              item.status === 'maintenance' ? '🔧 Manutenção' : '✅ Ativo'}
                        </span>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 dark:text-gray-400">📂 Categoria:</span>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">${item.category || 'N/A'}</span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 dark:text-gray-400">💰 Preço:</span>
                        <span class="text-sm font-bold text-primary-600 dark:text-primary-400">
                            € ${parseFloat(item.price || 0).toFixed(2)}
                        </span>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <span class="text-sm text-gray-600 dark:text-gray-400">📦 Estoque:</span>
                        <span class="text-sm font-bold ${stockColor}">${stockLevel} unidades</span>
                    </div>
                </div>
                
                <div class="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <!-- Mobile layout: stacked buttons -->
                    <div class="flex flex-col gap-2 w-full sm:hidden">
                        <button data-action="view" data-item-id="${item.id}" 
                            class="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                            <i class="fas fa-eye"></i>
                            <span>Visualizar</span>
                        </button>
                        <div class="flex gap-2">
                            <button data-action="edit" data-item-id="${item.id}" 
                                class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                                <i class="fas fa-edit"></i>
                                <span>Editar</span>
                            </button>
                            <button data-action="delete" data-item-id="${item.id}" 
                                class="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Desktop layout: horizontal buttons -->
                    <div class="hidden sm:flex gap-2 w-full">
                        <button data-action="view" data-item-id="${item.id}" 
                            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                            <i class="fas fa-eye"></i>
                            <span class="hidden md:inline">Visualizar</span>
                        </button>
                        <button data-action="edit" data-item-id="${item.id}" 
                            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                            <i class="fas fa-edit"></i>
                            <span class="hidden md:inline">Editar</span>
                        </button>
                        <button data-action="delete" data-item-id="${item.id}" 
                            class="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-all duration-300 hover:scale-105">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    updateActiveFilters() {
        const activeFiltersDiv = DOMElements.get('activeFilters');
        const filterTagsDiv = DOMElements.get('filterTags');
        
        if (!activeFiltersDiv || !filterTagsDiv) return;
        
        const activeTags = [];
        
        if (this.filters.search) {
            activeTags.push({ key: 'search', label: `Busca: "${this.filters.search}"`, value: this.filters.search });
        }
        
        if (this.filters.category) {
            activeTags.push({ key: 'category', label: `Categoria: ${this.filters.category}`, value: this.filters.category });
        }
        
        if (this.filters.status) {
            const statusLabels = { active: 'Ativo', inactive: 'Inativo', maintenance: 'Manutenção' };
            activeTags.push({ key: 'status', label: `Status: ${statusLabels[this.filters.status]}`, value: this.filters.status });
        }
        
        if (this.filters.priceRange) {
            activeTags.push({ key: 'priceRange', label: `Preço: ${this.filters.priceRange}`, value: this.filters.priceRange });
        }
        
        if (this.filters.stock) {
            const stockLabels = { 
                zero: 'Sem estoque', 
                low: 'Estoque baixo', 
                medium: 'Estoque médio', 
                high: 'Estoque alto' 
            };
            activeTags.push({ key: 'stock', label: `Estoque: ${stockLabels[this.filters.stock]}`, value: this.filters.stock });
        }
        
        if (activeTags.length > 0) {
            activeFiltersDiv.classList.remove('hidden');
            filterTagsDiv.innerHTML = activeTags.map(tag => `
                <span class="inline-flex items-center gap-2 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 text-xs font-medium rounded-full">
                    ${tag.label}
                    <button onclick="AdvancedSearch.removeFilter('${tag.key}')" 
                        class="hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full p-0.5 transition-colors duration-200">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </span>
            `).join('');
        } else {
            activeFiltersDiv.classList.add('hidden');
        }
    },
    
    removeFilter(key) {
        this.filters[key] = '';
        
        // Update UI elements
        const elementMap = {
            search: 'searchInput',
            category: 'categoryFilter',
            status: 'statusFilter',
            priceRange: 'priceRangeFilter',
            stock: 'stockFilter'
        };
        
        const element = DOMElements.get(elementMap[key]);
        if (element) {
            element.value = '';
        }
        
        this.updateClearButton();
        this.applyFilters();
    },
    
    clearAllFilters() {
        // Reset all filters
        Object.keys(this.filters).forEach(key => {
            if (key !== 'sortBy' && key !== 'sortOrder') {
                this.filters[key] = '';
            }
        });
        
        // Reset pagination
        this.pagination.currentPage = 1;
        
        // Reset UI elements
        const elements = [
            'searchInput', 'categoryFilter', 'statusFilter', 
            'priceRangeFilter', 'stockFilter'
        ];
        
        elements.forEach(id => {
            const element = DOMElements.get(id);
            if (element) element.value = '';
        });
        
        this.updateClearButton();
        this.loadItems();
        
        ToastSystem.show('Filtros limpos com sucesso', 'info');
    }
};

// Search and Filter
async function handleSearch() {
    try {
        const query = DOMElements.get('searchInput')?.value || '';
    const category = DOMElements.get('filterCategory')?.value || '';
    const company = DOMElements.get('filterCompany')?.value || '';
    const status = DOMElements.get('filterStatus')?.value || '';
        
        const filteredItems = await searchItems(query, category, company, status);
        displayInventoryItems(filteredItems);
    } catch (error) {
        console.error('Erro na busca:', error);
    }
}

// Dashboard Updates
async function updateDashboard() {
    try {
        console.log('📊 Atualizando dashboard...');
        const stats = await loadStats();
        
        if (stats) {
            console.log('📈 Dados carregados:', stats);
            
            // Armazenar stats no AppState
            AppState.stats = stats;
            
            // Update header stats
            if (DOMElements.totalItems) {
                DOMElements.totalItems.textContent = stats.total;
            }
            if (DOMElements.activeItems) {
                // Contar itens ativos corretamente
                const activeCount = (stats.byStatus?.active || 0) + (stats.byStatus?.Ativo || 0);
                DOMElements.activeItems.textContent = activeCount;
            }
            
            // Update category stats
            updateCategoryStats(stats.byCategory);
            
            // Update company stats with real data
            updateCompanyStats(stats.byCompany);
            
            // Update recent items
            updateRecentItems();
            
            console.log('✅ Dashboard atualizado com sucesso');
        } else {
            console.warn('⚠️ Nenhum dado de estatísticas encontrado');
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar dashboard:', error);
    }
}

function updateCategoryStats(categoryData) {
    console.log('📊 updateCategoryStats chamada com:', categoryData);
    
    if (!DOMElements.get('#categoryStats')) {
        console.log('❌ Elemento categoryStats não encontrado');
        return;
    }
    
    // Mapear categorias reais para exibição
    const realCategories = categoryData || {};
    console.log('📈 Categorias processadas:', realCategories);
    console.log('🔢 Número de categorias:', Object.keys(realCategories).length);
    
    DOMElements.get('#categoryStats').innerHTML = '';
    
    // Se não há dados, mostrar mensagem
    if (Object.keys(realCategories).length === 0) {
        console.log('⚠️ Nenhuma categoria encontrada, exibindo mensagem padrão');
        DOMElements.get('#categoryStats').innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-chart-pie text-2xl text-gray-300 dark:text-gray-600 mb-2"></i>
                <p class="text-gray-500 dark:text-gray-400 text-sm">Nenhuma categoria encontrada</p>
            </div>
        `;
        return;
    }
    
    // Exibir categorias reais
    console.log('✅ Exibindo categorias:', Object.entries(realCategories));
    Object.entries(realCategories).forEach(([category, count]) => {
        console.log(`🏷️ Criando categoria: ${category} com ${count} itens`);
        const statDiv = document.createElement('div');
        statDiv.className = 'flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]';
        statDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mr-3"></div>
                <span class="text-gray-700 dark:text-gray-200 font-medium">${category}</span>
            </div>
            <span class="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-bold">${count}</span>
        `;
        DOMElements.get('#categoryStats').appendChild(statDiv);
        console.log(`✅ Categoria ${category} adicionada ao DOM`);
    });
    
    console.log('🎯 updateCategoryStats concluída');
}

// Nova função para atualizar estatísticas de empresas
function updateCompanyStats(companyData) {
    const companiesContainer = document.querySelector('#dashboard .space-y-4');
    if (!companiesContainer) return;
    
    const realCompanies = companyData || {};
    
    // Limpar empresas existentes
    companiesContainer.innerHTML = '';
    
    // Lista de empresas padrão com cores
    const defaultCompanies = [
        { name: 'Vespasian Ventures', color: 'from-purple-500 to-purple-600', bg: 'from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30', border: 'border-purple-200/50 dark:border-purple-700/50' },
        { name: 'Instituto AreLuna', color: 'from-blue-500 to-blue-600', bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30', border: 'border-blue-200/50 dark:border-blue-700/50' },
        { name: 'ProStoral', color: 'from-indigo-500 to-indigo-600', bg: 'from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30', border: 'border-indigo-200/50 dark:border-indigo-700/50' },
        { name: 'Pinklegion', color: 'from-pink-500 to-pink-600', bg: 'from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30', border: 'border-pink-200/50 dark:border-pink-700/50' },
        { name: 'Papagaio Fotogénico', color: 'from-yellow-500 to-yellow-600', bg: 'from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30', border: 'border-yellow-200/50 dark:border-yellow-700/50' },
        { name: 'Nuvens Autóctones', color: 'from-green-500 to-green-600', bg: 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30', border: 'border-green-200/50 dark:border-green-700/50' }
    ];
    
    // Exibir empresas com dados reais quando disponíveis
    defaultCompanies.forEach(company => {
        const count = realCompanies[company.name] || 0;
        const companyDiv = document.createElement('div');
        companyDiv.className = `flex items-center justify-between p-4 bg-gradient-to-r ${company.bg} rounded-2xl border ${company.border} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`;
        companyDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-4 h-4 bg-gradient-to-r ${company.color} rounded-full mr-4 animate-pulse-slow"></div>
                <span class="text-gray-700 dark:text-gray-200 font-semibold">${company.name}</span>
            </div>
            <span class="bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-bold">${count} itens</span>
        `;
        companiesContainer.appendChild(companyDiv);
    });
}

function updateRecentItems() {
    console.log('🕒 updateRecentItems chamada');
    
    // Buscar diretamente o elemento sem cache
    const recentItemsElement = document.querySelector('#recentItems');
    
    if (!recentItemsElement) {
        console.log('❌ Elemento recentItems não encontrado');
        return;
    }
    
    console.log('✅ Elemento recentItems encontrado');
    console.log('📦 AppState.currentItems:', AppState.currentItems.length);
    
    // Ordenar itens por data mais recente (updated_at ou created_at)
    const sortedItems = [...AppState.currentItems].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA; // Ordem decrescente (mais recente primeiro)
    });
    
    console.log('📅 Itens ordenados por data:', sortedItems.slice(0, 3).map(item => ({
        name: item.name,
        updated_at: item.updated_at,
        created_at: item.created_at
    })));
    
    const recentItems = sortedItems.slice(0, 5);
    console.log('🔢 Itens recentes selecionados:', recentItems.length);
    
    recentItemsElement.innerHTML = '';
    
    if (recentItems.length === 0) {
        console.log('⚠️ Nenhum item recente encontrado');
        recentItemsElement.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-4"></i>
                <p class="text-gray-500 dark:text-gray-400 font-medium">Nenhum item recente</p>
            </div>
        `;
        return;
    }
    
    console.log('✅ Criando cards para itens recentes:', recentItems.length);
    
    recentItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer';
        itemDiv.onclick = () => openViewModal(item.id);
        itemDiv.innerHTML = `
            <div class="flex items-center">
                <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                    <i class="fas fa-box text-white text-sm"></i>
                </div>
                <div>
                    <div class="font-semibold text-gray-800 dark:text-gray-200">${item.name}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">${item.company || 'Sem empresa'} • ${formatCategory(item.category)}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm font-bold text-green-600 dark:text-green-400">€ ${(item.unit_price || 0).toFixed(2)}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${item.quantity || 0} unidades</div>
            </div>
        `;
        recentItemsElement.appendChild(itemDiv);
    });
}

// Inventory Display
function updateInventoryDisplay() {
    console.log('🔄 Atualizando exibição do inventário...');
    console.log('📦 Itens no AppState:', AppState.currentItems.length);
    displayInventoryItems(AppState.currentItems);
}

function displayInventoryItems(items) {
    console.log('🎨 Renderizando itens:', items.length);
    
    // Teste direto sem cache
    const inventoryGridDirect = document.querySelector('#inventoryGrid');
    console.log('🔍 Teste direto - inventoryGrid encontrado:', !!inventoryGridDirect);
    
    // Teste com cache
    const inventoryGridCache = DOMElements.get('inventoryGrid');
    console.log('🔍 Teste com cache - inventoryGrid encontrado:', !!inventoryGridCache);
    
    if (!inventoryGridDirect) {
        console.error('❌ Elemento inventoryGrid não encontrado diretamente!');
        return;
    }
    
    console.log('✅ Elemento inventoryGrid encontrado');
    inventoryGridDirect.innerHTML = '';
    
    if (items.length === 0) {
        console.log('📭 Nenhum item para exibir');
        inventoryGridDirect.innerHTML = `
            <div class="no-items">
                <i class="fas fa-box-open" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>Nenhum item encontrado</p>
            </div>
        `;
        return;
    }
    
    console.log('🔨 Criando cards para', items.length, 'itens');
    items.forEach((item, index) => {
        console.log(`🏗️ Criando card ${index + 1}:`, item.name);
        const itemCard = createInventoryItemCard(item);
        inventoryGridDirect.appendChild(itemCard);
    });
    
    console.log('✅ Todos os cards foram adicionados ao DOM');
    
    // Configurar event listeners para os botões de ação
    setupItemActionListeners();
}

// Configurar event listeners para os botões de ação dos itens
function setupItemActionListeners() {
    console.log('🔧 Configurando event listeners para botões de ação');
    
    // Event delegation para botões de ação
    const inventoryGrid = document.querySelector('#inventoryGrid');
    if (!inventoryGrid) {
        console.error('❌ inventoryGrid não encontrado para configurar event listeners');
        return;
    }
    
    // Remove listeners existentes para evitar duplicação
    inventoryGrid.removeEventListener('click', handleItemActions);
    
    // Adiciona novo listener
    inventoryGrid.addEventListener('click', handleItemActions);
    
    console.log('✅ Event listeners configurados com sucesso');
}

// Handler para ações dos itens (view, edit, delete)
function handleItemActions(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const itemId = button.dataset.itemId;
    
    console.log(`🎯 Ação ${action} para item ${itemId}`);
    
    switch (action) {
        case 'view':
            openViewModal(itemId);
            break;
        case 'view-qr':
            openViewModal(itemId);
            break;
        case 'edit':
            openEditModal(itemId);
            break;
        case 'delete':
            e.preventDefault();
            e.stopPropagation();
            if (confirm('Tem certeza que deseja excluir este item?')) {
                deleteItem(itemId);
            }
            break;
        default:
            console.warn('⚠️ Ação desconhecida:', action);
    }
}

function createInventoryItemCard(item) {
    console.log('🏗️ Criando card para item:', item.name, 'ID:', item.id);
    
    const card = document.createElement('div');
    card.className = 'inventory-item';
    
    // Verificar se o item tem QR code
    let hasQRCode = false;
    if (item.module_data) {
        try {
            const moduleData = typeof item.module_data === 'string' ? 
                JSON.parse(item.module_data) : item.module_data;
            hasQRCode = !!(moduleData.qr_code && moduleData.qr_code_image);
        } catch (e) {
            console.log('Erro ao parsear module_data para item:', item.name, e);
        }
    }
    
    card.innerHTML = `
        <div class="item-header">
            <div>
                <div class="item-name">${item.name}</div>
                <span class="item-category">${formatCategory(item.category)}</span>
            </div>
        </div>
        
        <div class="item-details">
            <div class="item-detail">
                <span class="item-detail-label">Empresa:</span>
                <span class="item-detail-value">${item.company}</span>
            </div>
            ${item.location ? `
                <div class="item-detail">
                    <span class="item-detail-label">Localização:</span>
                    <span class="item-detail-value">${item.location}</span>
                </div>
            ` : ''}
            ${item.brand ? `
                <div class="item-detail">
                    <span class="item-detail-label">Marca:</span>
                    <span class="item-detail-value">${item.brand}</span>
                </div>
            ` : ''}
            ${item.model ? `
                <div class="item-detail">
                    <span class="item-detail-label">Modelo:</span>
                    <span class="item-detail-value">${item.model}</span>
                </div>
            ` : ''}
            ${item.value ? `
                <div class="item-detail">
                    <span class="item-detail-label">Valor:</span>
                    <span class="item-detail-value">€${parseFloat(item.value).toFixed(2)}</span>
                </div>
            ` : ''}
            <div class="item-detail">
                <span class="item-detail-label">Status:</span>
                <span class="item-status ${item.status}">${formatStatus(item.status)}</span>
            </div>
        </div>
        
        <div class="item-actions">
            <!-- Mobile layout: stacked buttons -->
            <div class="flex flex-col gap-2 w-full sm:hidden">
                <button class="btn-small btn-view" data-action="view" data-item-id="${item.id}" title="Visualizar">
                    <i class="fas fa-eye"></i>
                    <span>Visualizar</span>
                </button>
                <div class="flex gap-2">
                    ${hasQRCode ? `
                        <button class="btn-small btn-qr flex-1" data-action="view-qr" data-item-id="${item.id}" title="Ver QR Code">
                            <i class="fas fa-qrcode"></i>
                            <span>QR</span>
                        </button>
                    ` : ''}
                    <button class="btn-small btn-edit flex-1" data-action="edit" data-item-id="${item.id}" title="Editar">
                        <i class="fas fa-edit"></i>
                        <span>Editar</span>
                    </button>
                    <button class="btn-small btn-delete" data-action="delete" data-item-id="${item.id}" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <!-- Desktop layout: horizontal buttons -->
            <div class="hidden sm:flex gap-2">
                <button class="btn-small btn-view" data-action="view" data-item-id="${item.id}" title="Visualizar">
                    <i class="fas fa-eye"></i>
                </button>
                ${hasQRCode ? `
                    <button class="btn-small btn-qr" data-action="view-qr" data-item-id="${item.id}" title="Ver QR Code">
                        <i class="fas fa-qrcode"></i>
                    </button>
                ` : ''}
                <button class="btn-small btn-edit" data-action="edit" data-item-id="${item.id}" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-delete" data-action="delete" data-item-id="${item.id}" title="Excluir">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    console.log('✅ Card criado para:', item.name, hasQRCode ? 'com QR code' : 'sem QR code');
    return card;
}

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
                    onclick="ToastSystem.hide('${id}')">
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
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            const previewImg = document.getElementById('previewImg');
            const buttonText = document.getElementById('imageButtonText');
            
            previewImg.src = e.target.result;
            preview.classList.remove('hidden');
            buttonText.textContent = file.name;
        };
        reader.readAsDataURL(file);
    }
}

function removeImagePreview() {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const buttonText = document.getElementById('imageButtonText');
    const fileInput = document.getElementById('itemImage');
    
    if (preview) preview.classList.add('hidden');
    if (previewImg) previewImg.src = '';
    if (buttonText) buttonText.textContent = 'Selecionar Imagem';
    if (fileInput) fileInput.value = '';
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Make functions globally available
// ===== FUNÇÃO DE ATUALIZAÇÃO DE QR CODES =====
async function updateAllQRCodes() {
    const button = document.getElementById('updateQRCodesBtn');
    const statusDiv = document.getElementById('qrUpdateStatus');
    const resultDiv = document.getElementById('qrUpdateResult');
    const progressBar = document.getElementById('qrUpdateProgress');
    const logContent = document.getElementById('logContent');
    
    // Função para adicionar log
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        
        let colorClass = 'text-gray-300';
        let icon = '•';
        
        switch(type) {
            case 'success':
                colorClass = 'text-green-400';
                icon = '✓';
                break;
            case 'error':
                colorClass = 'text-red-400';
                icon = '✗';
                break;
            case 'warning':
                colorClass = 'text-yellow-400';
                icon = '⚠';
                break;
            case 'info':
                colorClass = 'text-blue-400';
                icon = 'ℹ';
                break;
        }
        
        logEntry.className = `${colorClass} flex items-start space-x-2`;
        logEntry.innerHTML = `
            <span class="text-gray-500 text-xs">[${timestamp}]</span>
            <span class="text-xs">${icon}</span>
            <span class="text-xs flex-1">${message}</span>
        `;
        
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    // Desabilitar botão e mostrar status
    button.disabled = true;
    statusDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    progressBar.style.width = '0%';
    
    // Limpar logs anteriores
    logContent.innerHTML = `
        <div class="flex items-center space-x-2 mb-2">
            <i class="fas fa-terminal text-green-400 text-sm"></i>
            <span class="text-green-400 font-mono text-sm font-bold">Logs de Atualização</span>
        </div>
    `;
    
    try {
        addLog('Iniciando processo de atualização de QR codes...', 'info');
        progressBar.style.width = '10%';
        
        addLog('Conectando com o servidor...', 'info');
        
        const response = await fetch('/api/update-qr-codes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        addLog('Conexão estabelecida, processando itens...', 'success');
        progressBar.style.width = '50%';
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        addLog('Recebendo dados do servidor...', 'info');
        const result = await response.json();
        progressBar.style.width = '100%';
        
        addLog(`Processamento concluído! ${result.updated} itens atualizados`, 'success');
        addLog(`${result.skipped} itens já estavam atualizados`, 'info');
        
        if (result.errors > 0) {
            addLog(`${result.errors} erros encontrados durante o processo`, 'error');
        }
        
        addLog(`Tempo total de execução: ${result.executionTime}ms`, 'info');
        
        // Aguardar um pouco para mostrar o progresso completo
        setTimeout(() => {
            statusDiv.classList.add('hidden');
            resultDiv.classList.remove('hidden');
            
            // Mostrar resultados
            resultDiv.innerHTML = `
                <div class="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6">
                    <div class="flex items-center space-x-3 mb-4">
                        <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <i class="fas fa-check text-green-600 dark:text-green-400"></i>
                        </div>
                        <h4 class="text-lg font-bold text-gray-800 dark:text-gray-100">Atualização Concluída!</h4>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                            <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${result.updated}</div>
                            <div class="text-sm text-blue-700 dark:text-blue-300">Atualizados</div>
                        </div>
                        <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 text-center">
                            <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${result.skipped}</div>
                            <div class="text-sm text-yellow-700 dark:text-yellow-300">Já atualizados</div>
                        </div>
                        <div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
                            <div class="text-2xl font-bold text-red-600 dark:text-red-400">${result.errors}</div>
                            <div class="text-sm text-red-700 dark:text-red-300">Erros</div>
                        </div>
                    </div>
                    
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        <p><strong>Total processado:</strong> ${result.total} itens</p>
                        <p><strong>Tempo de execução:</strong> ${result.executionTime}ms</p>
                    </div>
                </div>
            `;
            
            // Reabilitar botão
            button.disabled = false;
            
            // Mostrar notificação de sucesso
            ToastSystem.success(`QR codes atualizados com sucesso! ${result.updated} itens processados.`);
            
        }, 1500);
        
    } catch (error) {
        console.error('Erro ao atualizar QR codes:', error);
        addLog(`Erro durante a atualização: ${error.message}`, 'error');
        
        statusDiv.classList.add('hidden');
        resultDiv.classList.remove('hidden');
        
        resultDiv.innerHTML = `
            <div class="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6">
                <div class="flex items-center space-x-3 mb-4">
                    <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <i class="fas fa-times text-red-600 dark:text-red-400"></i>
                    </div>
                    <h4 class="text-lg font-bold text-red-800 dark:text-red-100">Erro na Atualização</h4>
                </div>
                <p class="text-red-700 dark:text-red-300">${error.message}</p>
            </div>
        `;
        
        // Reabilitar botão
        button.disabled = false;
        
        // Mostrar notificação de erro
        ToastSystem.error(`Erro ao atualizar QR codes: ${error.message}`);
    }
}

// ===== DROPDOWN MANAGEMENT =====
async function loadDropdownData() {
    try {
        const [categoriesResponse, collaboratorsResponse] = await Promise.all([
            fetch('/api/categories'),
            fetch('/api/collaborators')
        ]);

        const categoriesData = await categoriesResponse.json();
        const collaboratorsData = await collaboratorsResponse.json();

        if (categoriesData.success) {
            AppState.categories = categoriesData.data;
            populateCategoriesDropdown();
        }

        if (collaboratorsData.success) {
            AppState.collaborators = collaboratorsData.data;
            populateCollaboratorsDropdown();
        }
    } catch (error) {
        console.error('Erro ao carregar dados dos dropdowns:', error);
    }
}

function populateCategoriesDropdown() {
    const select = document.getElementById('itemCategory');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma categoria</option>';
    
    AppState.categories.forEach(category => {
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

function populateCollaboratorsDropdown() {
    const select = document.getElementById('itemCollaborator');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um colaborador</option>';
    
    AppState.collaborators.forEach(collaborator => {
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

function setupDropdownEventListeners() {
    // Handle category dropdown changes
    const categorySelect = document.getElementById('itemCategory');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                document.getElementById('categoryModal').classList.remove('hidden');
                this.value = ''; // Reset selection
            }
        });
    }

    // Handle collaborator dropdown changes
    const collaboratorSelect = document.getElementById('itemCollaborator');
    if (collaboratorSelect) {
        collaboratorSelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                document.getElementById('collaboratorModal').classList.remove('hidden');
                this.value = ''; // Reset selection
            }
        });
    }

    // Modal handlers
    const closeCategoryModal = document.getElementById('closeCategoryModal');
    if (closeCategoryModal) {
        closeCategoryModal.addEventListener('click', () => {
            document.getElementById('categoryModal').classList.add('hidden');
        });
    }

    const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');
    if (cancelCategoryBtn) {
        cancelCategoryBtn.addEventListener('click', () => {
            document.getElementById('categoryModal').classList.add('hidden');
        });
    }

    const closeCollaboratorModal = document.getElementById('closeCollaboratorModal');
    if (closeCollaboratorModal) {
        closeCollaboratorModal.addEventListener('click', () => {
            document.getElementById('collaboratorModal').classList.add('hidden');
        });
    }

    const cancelCollaboratorBtn = document.getElementById('cancelCollaboratorBtn');
    if (cancelCollaboratorBtn) {
        cancelCollaboratorBtn.addEventListener('click', () => {
            document.getElementById('collaboratorModal').classList.add('hidden');
        });
    }

    // Category form submission
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
                    // Add new category to the list
                    AppState.categories.push(result.data);
                    populateCategoriesDropdown();
                    
                    // Select the new category
                    document.getElementById('itemCategory').value = result.data.id;
                    
                    // Close modal and reset form
                    document.getElementById('categoryModal').classList.add('hidden');
                    categoryForm.reset();
                    
                    showNotification('Categoria criada com sucesso!', 'success');
                } else {
                    showNotification('Erro ao criar categoria: ' + (result.error || result.message || 'Erro desconhecido'), 'error');
                }
            } catch (error) {
                console.error('Erro ao criar categoria:', error);
                showNotification('Erro ao criar categoria', 'error');
            }
        });
    }

    // Collaborator form submission
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
                    // Add new collaborator to the list
                    AppState.collaborators.push(result.data);
                    populateCollaboratorsDropdown();
                    
                    // Select the new collaborator
                    document.getElementById('itemCollaborator').value = result.data.id;
                    
                    // Close modal and reset form
                    document.getElementById('collaboratorModal').classList.add('hidden');
                    collaboratorForm.reset();
                    
                    showNotification('Colaborador criado com sucesso!', 'success');
                } else {
                    showNotification('Erro ao criar colaborador: ' + (result.error || result.message || 'Erro desconhecido'), 'error');
                }
            } catch (error) {
                console.error('Erro ao criar colaborador:', error);
                showNotification('Erro ao criar colaborador', 'error');
            }
        });
    }
}

// Make functions globally available
window.handleImagePreview = handleImagePreview;
window.removeImagePreview = removeImagePreview;
window.openEditModal = openEditModal;
window.openViewModal = openViewModal;
window.deleteItem = deleteItem;
window.AdvancedSearch = AdvancedSearch;
window.DragDropSystem = DragDropSystem;
window.DOMElements = DOMElements;
window.handleEditItem = handleEditItem;
window.updateAllQRCodes = updateAllQRCodes;
window.loadDropdownData = loadDropdownData;
window.populateCategoriesDropdown = populateCategoriesDropdown;
window.populateCollaboratorsDropdown = populateCollaboratorsDropdown;
window.setupDropdownEventListeners = setupDropdownEventListeners;