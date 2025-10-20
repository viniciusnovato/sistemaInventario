// =====================================================
// PROSTORAL - Sistema de Gestão de Laboratório
// =====================================================

class ProstoralApp {
    constructor() {
        this.currentView = 'dashboard';
        this.clients = [];
        this.inventory = [];
        this.orders = [];
        this.workTypes = [];
        this.apiBaseUrl = '/api/prostoral';
        this.init();
    }

    async init() {
        // Aguardar authManager estar pronto
        if (!window.authManager) {
            console.error('AuthManager não encontrado');
            window.location.href = 'login.html';
            return;
        }

        await window.authManager.init();

        // Verificar autenticação após inicialização
        if (!window.authManager.isUserAuthenticated()) {
            console.log('Usuário não autenticado, redirecionando para login');
            window.location.href = 'login.html';
            return;
        }

        // Carregar dados do usuário
        await this.loadUserInfo();

        // Configurar tabs
        this.setupTabs();

        // Carregar view inicial
        this.switchView('dashboard');

        // Event listeners
        this.setupEventListeners();
    }

    async loadUserInfo() {
        const user = window.authManager.user;
        if (user && user.email) {
            document.getElementById('user-name').textContent = user.email;
            document.getElementById('user-role').textContent = 'Usuário';
        }
    }

    setupTabs() {
        const tabs = [
            { id: 'dashboard', name: 'Dashboard', icon: 'fas fa-chart-pie', permission: 'prostoral:dashboard:read' },
            { id: 'clients', name: 'Clientes', icon: 'fas fa-users', permission: 'prostoral:clients:read' },
            { id: 'orders', name: 'Ordens de Serviço', icon: 'fas fa-clipboard-list', permission: 'prostoral:orders:read' },
            { id: 'inventory', name: 'Estoque', icon: 'fas fa-boxes', permission: 'prostoral:inventory:read' },
        ];

        const tabsContainer = document.getElementById('prostoral-tabs');
        tabsContainer.innerHTML = '';

        tabs.forEach(tab => {
            // Verificar permissão
            if (!window.authManager.hasPermission(tab.permission)) {
                return;
            }

            const tabElement = document.createElement('button');
            tabElement.className = 'nav-tab px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2';
            tabElement.innerHTML = `
                <i class="${tab.icon}"></i>
                <span>${tab.name}</span>
            `;
            tabElement.onclick = () => this.switchView(tab.id);
            tabsContainer.appendChild(tabElement);
        });
    }

    switchView(viewName) {
        // Esconder todas as views
        document.querySelectorAll('.view-content').forEach(view => {
            view.classList.add('hidden');
        });

        // Mostrar view selecionada
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        // Atualizar tabs ativas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active', 'bg-emerald-600', 'text-white');
            tab.classList.add('bg-white', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        });

        const activeTab = Array.from(document.querySelectorAll('.nav-tab'))[
            ['dashboard', 'clients', 'orders', 'inventory'].indexOf(viewName)
        ];
        if (activeTab) {
            activeTab.classList.add('active', 'bg-emerald-600', 'text-white');
            activeTab.classList.remove('bg-white', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
        }

        this.currentView = viewName;

        // Carregar dados da view
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'clients':
                await this.loadClients();
                break;
            case 'inventory':
                await this.loadInventory();
                break;
            case 'orders':
                await this.loadOrders();
                break;
        }
    }

    async loadDashboard() {
        try {
            // Carregar estatísticas básicas
            const token = await window.authManager.getAccessToken();

            // Clientes ativos
            const clientsRes = await fetch(`${this.apiBaseUrl}/clients?is_active=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (clientsRes.ok) {
                const clientsData = await clientsRes.json();
                document.getElementById('stat-active-clients').textContent = clientsData.clients.length;
            }

            // Estoque baixo
            const lowStockRes = await fetch(`${this.apiBaseUrl}/inventory/low-stock`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (lowStockRes.ok) {
                const lowStockData = await lowStockRes.json();
                document.getElementById('stat-low-stock').textContent = lowStockData.items.length;
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        }
    }

    async loadClients() {
        try {
            const token = await window.authManager.getAccessToken();
            const search = document.getElementById('client-search')?.value || '';
            const type = document.getElementById('client-filter-type')?.value || '';
            const status = document.getElementById('client-filter-status')?.value || '';

            let url = `${this.apiBaseUrl}/clients?`;
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (status) url += `is_active=${status}&`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar clientes');
            }

            const data = await response.json();
            this.clients = data.clients || [];

            // Filtrar por tipo se necessário
            let filteredClients = this.clients;
            if (type) {
                filteredClients = this.clients.filter(c => c.client_type === type);
            }

            this.renderClients(filteredClients);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            this.showError('Erro ao carregar clientes');
        }
    }

    renderClients(clients) {
        const tbody = document.getElementById('clients-table-body');
        
        if (!clients || clients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum cliente encontrado
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = clients.map(client => {
            const typeLabels = {
                'clinic': 'Clínica',
                'dentist': 'Dentista',
                'individual': 'Individual'
            };

            const statusBadge = client.is_active
                ? '<span class="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">Ativo</span>'
                : '<span class="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">Inativo</span>';

            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">${client.full_name}</div>
                        ${client.contact_person ? `<div class="text-sm text-gray-500 dark:text-gray-400">${client.contact_person}</div>` : ''}
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                            ${typeLabels[client.client_type] || client.client_type}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 dark:text-white">${client.email || '-'}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${client.phone || '-'}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        ${client.nif_vat || '-'}
                    </td>
                    <td class="px-6 py-4">
                        ${statusBadge}
                    </td>
                    <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onclick="prostoralApp.viewClient('${client.id}')" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="prostoralApp.editClient('${client.id}')" class="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async loadInventory() {
        try {
            const token = await window.authManager.getAccessToken();
            
            const response = await fetch(`${this.apiBaseUrl}/inventory`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar estoque');
            }

            const data = await response.json();
            this.inventory = data.items || [];

            // TODO: Renderizar estoque
            console.log('Estoque carregado:', this.inventory);
        } catch (error) {
            console.error('Erro ao carregar estoque:', error);
        }
    }

    async loadOrders() {
        try {
            const token = await window.authManager.getAccessToken();
            const search = document.getElementById('order-search')?.value || '';
            const status = document.getElementById('order-filter-status')?.value || '';
            const client_id = document.getElementById('order-filter-client')?.value || '';
            const work_type_id = document.getElementById('order-filter-type')?.value || '';

            let url = `${this.apiBaseUrl}/orders?`;
            if (search) url += `search=${encodeURIComponent(search)}&`;
            if (status) url += `status=${status}&`;
            if (client_id) url += `client_id=${client_id}&`;
            if (work_type_id) url += `work_type_id=${work_type_id}&`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar ordens de serviço');
            }

            const data = await response.json();
            this.orders = data.orders || [];

            this.renderOrders(this.orders);
            
            // Carregar clientes e tipos de trabalho para os filtros e modal
            await this.loadWorkTypes();
            await this.loadClientsForSelect();
        } catch (error) {
            console.error('Erro ao carregar ordens de serviço:', error);
            this.showError('Erro ao carregar ordens de serviço');
        }
    }

    async loadWorkTypes() {
        try {
            const token = await window.authManager.getAccessToken();
            
            const response = await fetch(`${this.apiBaseUrl}/work-types`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar tipos de trabalho');
            }

            const data = await response.json();
            this.workTypes = data.workTypes || [];

            // Popula select de tipos de trabalho nos filtros
            const filterSelect = document.getElementById('order-filter-type');
            if (filterSelect && filterSelect.options.length === 1) {
                this.workTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    filterSelect.appendChild(option);
                });
            }

            // Popula select de tipos de trabalho no modal
            const modalSelect = document.querySelector('#order-form select[name="work_type_id"]');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">Selecione o tipo</option>';
                this.workTypes.forEach(type => {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = type.name;
                    modalSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar tipos de trabalho:', error);
        }
    }

    async loadClientsForSelect() {
        try {
            const token = await window.authManager.getAccessToken();
            
            const response = await fetch(`${this.apiBaseUrl}/clients?is_active=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Erro ao carregar clientes');
            }

            const data = await response.json();
            const clients = data.clients || [];

            // Popula select de clientes nos filtros
            const filterSelect = document.getElementById('order-filter-client');
            if (filterSelect && filterSelect.options.length === 1) {
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.full_name;
                    filterSelect.appendChild(option);
                });
            }

            // Popula select de clientes no modal
            const modalSelect = document.querySelector('#order-form select[name="client_id"]');
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">Selecione um cliente</option>';
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.id;
                    option.textContent = client.full_name;
                    modalSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
        }
    }

    renderOrders(orders) {
        const tbody = document.getElementById('orders-table-body');
        
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhuma ordem de serviço encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = orders.map(order => {
            const statusLabels = {
                'pending': { text: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
                'in_production': { text: 'Em Produção', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
                'quality_check': { text: 'Controle de Qualidade', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
                'ready': { text: 'Pronto', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
                'delivered': { text: 'Entregue', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
                'cancelled': { text: 'Cancelado', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
            };

            const statusInfo = statusLabels[order.status] || { text: order.status, color: 'bg-gray-100 text-gray-800' };
            
            const deadline = order.deadline ? new Date(order.deadline).toLocaleDateString('pt-BR') : '-';
            const isOverdue = order.deadline && new Date(order.deadline) < new Date() && order.status !== 'delivered';

            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td class="px-6 py-4">
                        <div class="font-medium text-gray-900 dark:text-white">${order.work_order_number}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 dark:text-white">${order.client?.full_name || '-'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 dark:text-white">${order.patient_name || '-'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm text-gray-900 dark:text-white">${order.work_type?.name || '-'}</div>
                    </td>
                    <td class="px-6 py-4">
                        <div class="text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-900 dark:text-white'}">
                            ${deadline}
                            ${isOverdue ? '<i class="fas fa-exclamation-triangle ml-1"></i>' : ''}
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-3 py-1 text-xs font-medium ${statusInfo.color} rounded-full">
                            ${statusInfo.text}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onclick="prostoralApp.viewOrder('${order.id}')" class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="prostoralApp.editOrder('${order.id}')" class="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Busca de clientes
        const clientSearch = document.getElementById('client-search');
        if (clientSearch) {
            let debounceTimer;
            clientSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.loadClients(), 300);
            });
        }

        // Filtros de clientes
        const clientFilterType = document.getElementById('client-filter-type');
        const clientFilterStatus = document.getElementById('client-filter-status');
        
        if (clientFilterType) {
            clientFilterType.addEventListener('change', () => this.loadClients());
        }
        if (clientFilterStatus) {
            clientFilterStatus.addEventListener('change', () => this.loadClients());
        }

        // Form de cliente
        const clientForm = document.getElementById('client-form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => this.handleClientSubmit(e));
        }

        // Busca e filtros de ordens
        const orderSearch = document.getElementById('order-search');
        if (orderSearch) {
            let debounceTimer;
            orderSearch.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => this.loadOrders(), 300);
            });
        }

        const orderFilterStatus = document.getElementById('order-filter-status');
        const orderFilterClient = document.getElementById('order-filter-client');
        const orderFilterType = document.getElementById('order-filter-type');
        
        if (orderFilterStatus) {
            orderFilterStatus.addEventListener('change', () => this.loadOrders());
        }
        if (orderFilterClient) {
            orderFilterClient.addEventListener('change', () => this.loadOrders());
        }
        if (orderFilterType) {
            orderFilterType.addEventListener('change', () => this.loadOrders());
        }

        // Form de ordem de serviço
        const orderForm = document.getElementById('order-form');
        if (orderForm) {
            orderForm.addEventListener('submit', (e) => this.handleOrderSubmit(e));
        }
    }

    async handleOrderSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const orderData = Object.fromEntries(formData.entries());

        try {
            const token = await window.authManager.getAccessToken();
            
            const response = await fetch(`${this.apiBaseUrl}/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error('Erro ao criar ordem de serviço');
            }

            this.showSuccess('Ordem de serviço criada com sucesso!');
            closeOrderModal();
            this.loadOrders();
        } catch (error) {
            console.error('Erro ao criar OS:', error);
            this.showError('Erro ao criar ordem de serviço');
        }
    }

    async handleClientSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const clientData = Object.fromEntries(formData.entries());

        try {
            const token = await window.authManager.getAccessToken();
            
            const response = await fetch(`${this.apiBaseUrl}/clients`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                throw new Error('Erro ao criar cliente');
            }

            this.showSuccess('Cliente criado com sucesso!');
            closeClientModal();
            this.loadClients();
        } catch (error) {
            console.error('Erro ao criar cliente:', error);
            this.showError('Erro ao criar cliente');
        }
    }

    viewClient(id) {
        console.log('Ver cliente:', id);
        // TODO: Implementar visualização de cliente
    }

    editClient(id) {
        console.log('Editar cliente:', id);
        // TODO: Implementar edição de cliente
    }

    viewOrder(id) {
        console.log('Ver OS:', id);
        // TODO: Implementar visualização detalhada de OS
        alert('Visualização detalhada em desenvolvimento');
    }

    editOrder(id) {
        console.log('Editar OS:', id);
        // TODO: Implementar edição de OS
        alert('Edição de OS em desenvolvimento');
    }

    showSuccess(message) {
        // TODO: Implementar toast de sucesso
        alert(message);
    }

    showError(message) {
        // TODO: Implementar toast de erro
        alert(message);
    }
}

// Funções globais para modals
function openClientModal() {
    document.getElementById('client-modal').classList.remove('hidden');
    document.getElementById('client-modal').classList.add('flex');
}

function closeClientModal() {
    document.getElementById('client-modal').classList.add('hidden');
    document.getElementById('client-modal').classList.remove('flex');
    document.getElementById('client-form').reset();
}

function openInventoryModal() {
    alert('Modal de estoque em desenvolvimento');
}

function openOrderModal() {
    document.getElementById('order-modal').classList.remove('hidden');
    document.getElementById('order-modal').classList.add('flex');
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
    document.getElementById('order-modal').classList.remove('flex');
    document.getElementById('order-form').reset();
}

// Inicializar aplicação
let prostoralApp;
document.addEventListener('DOMContentLoaded', () => {
    prostoralApp = new ProstoralApp();
});

