// =====================================================
// PROSTORAL - Sistema de Gestão de Laboratório
// =====================================================

class ProstoralApp {
    constructor() {
        this.clients = [];
        this.orders = [];
        this.kits = [];
        this.inventory = [];
        this.apiBaseUrl = '/api/prostoral';
        this.init();
    }

    async init() {
        console.log('Iniciando ProStoral App...');
        
        // Aguardar authManager estar pronto
        if (!window.authManager) {
            console.error('AuthManager não encontrado');
            window.location.href = 'login.html';
            return;
        }

        // Aguardar inicialização do authManager
        await window.authManager.init();

        // Verificar autenticação
        if (!window.authManager.isUserAuthenticated()) {
            console.log('Usuário não autenticado, redirecionando para login');
            window.location.href = 'login.html';
            return;
        }

        console.log('Usuário autenticado!');

        // Carregar dados do usuário
        await this.loadUserInfo();

        // Carregar dashboard (view inicial)
        await this.loadDashboard();

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadUserInfo() {
        const user = window.authManager.user;
        if (user && user.email) {
            // Desktop
            document.getElementById('totalOrders').textContent = '0';
            document.getElementById('totalClients').textContent = '0';
            
            // Mobile
            document.getElementById('mobileUserEmail').textContent = user.email;
            document.getElementById('mobileTotalOrders').textContent = '0';
            document.getElementById('mobileTotalClients').textContent = '0';
        }
    }

    setupEventListeners() {
        // Filtros de clientes
        const clientSearch = document.getElementById('client-search');
        const clientFilterType = document.getElementById('client-filter-type');
        const clientFilterStatus = document.getElementById('client-filter-status');

        if (clientSearch) {
            clientSearch.addEventListener('input', this.debounce(() => this.loadClients(), 300));
        }
        if (clientFilterType) {
            clientFilterType.addEventListener('change', () => this.loadClients());
        }
        if (clientFilterStatus) {
            clientFilterStatus.addEventListener('change', () => this.loadClients());
        }
    }

    debounce(func, wait) {
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

    // =====================================================
    // DASHBOARD
    // =====================================================

    async loadDashboard() {
        console.log('Carregando dashboard...');
        try {
            const token = await window.authManager.getAccessToken();
            
            // Carregar KPIs
            const response = await fetch(`${this.apiBaseUrl}/dashboard/kpis`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar KPIs');
            }

            const data = await response.json();
            
            if (data.success && data.kpis) {
                // Atualizar KPIs
                document.getElementById('kpi-active-orders').textContent = data.kpis.totalOrders || 0;
                document.getElementById('kpi-low-stock').textContent = data.kpis.lowStockItems || 0;
                document.getElementById('kpi-active-clients').textContent = data.kpis.ordersByStatus?.active || 0;
                document.getElementById('kpi-open-incidents').textContent = data.kpis.openIncidents || 0;
                
                // Atualizar header stats
                document.getElementById('totalOrders').textContent = data.kpis.totalOrders || 0;
                document.getElementById('mobileTotalOrders').textContent = data.kpis.totalOrders || 0;
            }

            // Carregar atividades recentes
            await this.loadRecentActivities();

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            this.showError('Erro ao carregar dashboard');
        }
    }

    async loadRecentActivities() {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        try {
            const token = await window.authManager.getAccessToken();
            
            // Buscar últimas OS
            const response = await fetch(`${this.apiBaseUrl}/orders?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar atividades');
            }

            const data = await response.json();
            
            if (data.success && data.orders && data.orders.length > 0) {
                container.innerHTML = `
                    <div class="space-y-4">
                        ${data.orders.map(order => `
                            <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <div class="flex items-center gap-4">
                                    <div class="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
                                        <i class="fas fa-clipboard-list text-emerald-600 dark:text-emerald-400"></i>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900 dark:text-white">OS #${order.work_order_number || order.id.substring(0, 8)}</p>
                                        <p class="text-sm text-gray-600 dark:text-gray-400">${order.patient_name || 'Paciente'}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${this.getStatusColor(order.status)}">
                                        ${this.getStatusText(order.status)}
                                    </span>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        ${new Date(order.created_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-inbox text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
                        <p class="text-gray-500 dark:text-gray-400">Nenhuma atividade recente</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar atividades:', error);
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
                    <p>Erro ao carregar atividades</p>
                </div>
            `;
        }
    }

    // =====================================================
    // CLIENTES
    // =====================================================

    async loadClients() {
        console.log('Carregando clientes...');
        try {
            const token = await window.authManager.getAccessToken();
            const search = document.getElementById('client-search')?.value || '';
            const type = document.getElementById('client-filter-type')?.value || '';
            const status = document.getElementById('client-filter-status')?.value || '';

            let url = `${this.apiBaseUrl}/clients?`;
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (type) url += `type=${type}&`;
            if (status) url += `status=${status}&`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar clientes');
            }

            const data = await response.json();
            this.clients = data.clients || [];

            // Atualizar contadores
            const activeClients = this.clients.filter(c => c.is_active).length;
            document.getElementById('totalClients').textContent = this.clients.length;
            document.getElementById('mobileTotalClients').textContent = this.clients.length;
            document.getElementById('kpi-active-clients').textContent = activeClients;

            this.renderClients();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.showError('Erro ao carregar clientes');
        }
    }

    renderClients() {
        const tbody = document.getElementById('clients-table-body');
        if (!tbody) return;

        if (this.clients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        <i class="fas fa-users text-6xl mb-4 opacity-50"></i>
                        <p>Nenhum cliente encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.clients.map(client => `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                            <i class="fas ${this.getClientIcon(client.type)} text-white"></i>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">
                                ${client.full_name || client.company_name || 'N/A'}
                            </div>
                            ${client.company_name && client.full_name ? `<div class="text-sm text-gray-500 dark:text-gray-400">${client.company_name}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getTypeColor(client.type)}">
                        ${this.getTypeText(client.type)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${client.email || 'N/A'}<br>
                    <span class="text-gray-500 dark:text-gray-400">${client.phone || 'N/A'}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    ${client.nif || 'N/A'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${client.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                        ${client.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="prostoralApp.viewClient('${client.id}')" class="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 mr-3">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="prostoralApp.editClient('${client.id}')" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="prostoralApp.deleteClient('${client.id}')" class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // =====================================================
    // HELPERS
    // =====================================================

    getClientIcon(type) {
        const icons = {
            clinic: 'fa-building',
            dentist: 'fa-user-md',
            individual: 'fa-user'
        };
        return icons[type] || 'fa-user';
    }

    getTypeColor(type) {
        const colors = {
            clinic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            dentist: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            individual: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        };
        return colors[type] || colors.individual;
    }

    getTypeText(type) {
        const texts = {
            clinic: 'Clínica',
            dentist: 'Dentista',
            individual: 'Individual'
        };
        return texts[type] || 'Individual';
    }

    getStatusColor(status) {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            in_production: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            quality_check: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            delivered: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
            cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        };
        return colors[status] || colors.pending;
    }

    getStatusText(status) {
        const texts = {
            pending: 'Pendente',
            in_production: 'Em Produção',
            quality_check: 'Controle Qualidade',
            ready: 'Pronto',
            delivered: 'Entregue',
            cancelled: 'Cancelado'
        };
        return texts[status] || 'Pendente';
    }

    showError(message) {
        alert(message);
    }

    showSuccess(message) {
        alert(message);
    }

    // Métodos placeholder
    viewClient(id) {
        console.log('Ver cliente:', id);
        this.showError('Funcionalidade em desenvolvimento');
    }

    editClient(id) {
        console.log('Editar cliente:', id);
        this.showError('Funcionalidade em desenvolvimento');
    }

    deleteClient(id) {
        console.log('Deletar cliente:', id);
        this.showError('Funcionalidade em desenvolvimento');
    }
}

// Funções globais para modals
function openClientModal() {
    alert('Modal de novo cliente - Em desenvolvimento');
}

// Inicializar app quando DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, aguardando authManager...');
    
    // Aguardar authManager estar disponível
    const checkAuthManager = setInterval(() => {
        if (window.authManager) {
            clearInterval(checkAuthManager);
            console.log('AuthManager disponível, iniciando app...');
            window.prostoralApp = new ProstoralApp();
        }
    }, 100);
    
    // Timeout de segurança
    setTimeout(() => {
        clearInterval(checkAuthManager);
        if (!window.prostoralApp) {
            console.error('Timeout ao aguardar authManager');
            window.location.href = 'login.html';
        }
    }, 5000);
});
