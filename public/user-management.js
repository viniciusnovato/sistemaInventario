/**
 * User Management System
 * Gerenciamento de Usuários - Grupo AreLuna
 */

class UserManagement {
    constructor() {
        this.apiBaseUrl = window.CONFIG.API_URL;
        this.currentEditingUserId = null;
        this.users = [];
        this.init();
    }

    async init() {
        // Wait for auth to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check authentication
        if (!isAuthenticated()) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check admin access
        await this.checkAdminAccess();
        
        // Load current user info
        const user = await getCurrentUser();
        if (user) {
            document.getElementById('userEmail').textContent = user.email;
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load users
        await this.loadUsers();
    }

    async checkAdminAccess() {
        try {
            const token = getAccessToken();
            const response = await fetch(`${this.apiBaseUrl}/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                const isAdmin = userData.roles?.some(role => role.toLowerCase().includes('admin')) ||
                              userData.permissions?.includes('users:manage') ||
                              userData.permissions?.includes('admin:all');
                
                if (!isAdmin) {
                    alert('Você não tem permissão para acessar esta página.');
                    window.location.href = 'dashboard.html';
                }
            }
        } catch (error) {
            console.error('Error checking admin access:', error);
            window.location.href = 'dashboard.html';
        }
    }

    setupEventListeners() {
        // Logout button
        document.getElementById('logoutButton').addEventListener('click', async () => {
            await signOut();
        });

        // Create user button
        document.getElementById('btnCreateUser').addEventListener('click', () => {
            this.openUserModal();
        });

        // Close modal buttons
        document.getElementById('btnCloseUserModal').addEventListener('click', () => {
            this.closeUserModal();
        });
        document.getElementById('btnCancelUser').addEventListener('click', () => {
            this.closeUserModal();
        });

        // Form submission
        document.getElementById('formUser').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        // Search and filters
        document.getElementById('searchUsers').addEventListener('input', () => {
            this.filterUsers();
        });
        document.getElementById('filterStatus').addEventListener('change', () => {
            this.filterUsers();
        });

        // Event delegation for user action buttons
        document.getElementById('usersTableBody').addEventListener('click', (e) => {
            const button = e.target.closest('.user-action-btn');
            if (!button) return;
            
            const action = button.dataset.action;
            const userId = button.dataset.userId;
            
            switch(action) {
                case 'edit':
                    this.editUser(userId);
                    break;
                case 'toggle-status':
                    const currentStatus = button.dataset.userStatus === 'true';
                    this.toggleUserStatus(userId, currentStatus);
                    break;
            }
        });

        // Module checkboxes
        document.querySelectorAll('.module-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const module = e.target.dataset.module;
                const permissions = document.querySelectorAll(`[data-permission^="${module}:"]`);
                permissions.forEach(perm => perm.checked = e.target.checked);
            });
        });

        // Admin checkbox
        document.getElementById('isAdmin').addEventListener('change', (e) => {
            if (e.target.checked) {
                // Check all permissions
                document.querySelectorAll('.module-checkbox, .permission-checkbox').forEach(cb => {
                    cb.checked = true;
                    cb.disabled = true;
                });
            } else {
                // Uncheck and enable all
                document.querySelectorAll('.module-checkbox, .permission-checkbox').forEach(cb => {
                    cb.checked = false;
                    cb.disabled = false;
                });
            }
        });

        // Click outside modal to close
        document.getElementById('modalUser').addEventListener('click', (e) => {
            if (e.target.id === 'modalUser') {
                this.closeUserModal();
            }
        });
    }

    async loadUsers() {
        try {
            const token = getAccessToken();
            const response = await fetch(`${this.apiBaseUrl}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load users');

            const data = await response.json();
            this.users = data.users || [];
            this.renderUsers(this.users);
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Erro ao carregar usuários');
        }
    }

    filterUsers() {
        const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
        const statusFilter = document.getElementById('filterStatus').value;

        let filtered = this.users;

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(user => 
                (user.full_name || user.email).toLowerCase().includes(searchTerm) ||
                user.email.toLowerCase().includes(searchTerm)
            );
        }

        // Filter by status
        if (statusFilter === 'active') {
            filtered = filtered.filter(user => user.is_active !== false);
        } else if (statusFilter === 'inactive') {
            filtered = filtered.filter(user => user.is_active === false);
        }

        this.renderUsers(filtered);
    }

    renderUsers(users) {
        const tbody = document.getElementById('usersTableBody');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');

        // Hide loading
        loadingState.classList.add('hidden');

        if (!users || users.length === 0) {
            tbody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        tbody.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span class="text-indigo-600 font-semibold text-sm">
                                ${(user.full_name || user.email).charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.full_name || 'Sem nome'}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.email}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-1">
                        ${this.renderRoles(user.roles)}
                    </div>
                </td>
                <td class="px-6 py-4">
                    <div class="flex flex-wrap gap-1">
                        ${this.renderModules(user.permissions)}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${user.is_active !== false 
                        ? '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Ativo</span>'
                        : '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inativo</span>'
                    }
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button data-action="edit" data-user-id="${user.id}" class="user-action-btn text-indigo-600 hover:text-indigo-900 mr-3" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button data-action="toggle-status" data-user-id="${user.id}" data-user-status="${user.is_active !== false}" 
                        class="user-action-btn ${user.is_active !== false ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}" 
                        title="${user.is_active !== false ? 'Desativar' : 'Ativar'}">
                        <i class="fas fa-${user.is_active !== false ? 'ban' : 'check-circle'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderRoles(roles) {
        if (!roles || roles.length === 0) {
            return '<span class="text-xs text-gray-400">Sem função</span>';
        }
        
        return roles.slice(0, 2).map(role => `
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                ${role}
            </span>
        `).join('');
    }

    renderModules(permissions) {
        if (!permissions || permissions.length === 0) {
            return '<span class="text-xs text-gray-400">Nenhum módulo</span>';
        }

        const modules = new Set();
        permissions.forEach(perm => {
            const module = perm.split(':')[0];
            modules.add(module);
        });

        const moduleIcons = {
            inventory: '📦',
            laboratory: '🧪',
            reports: '📊',
            settings: '⚙️',
            admin: '👑',
            users: '👥'
        };

        return Array.from(modules).slice(0, 4).map(module => `
            <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                ${moduleIcons[module] || '📋'} ${module}
            </span>
        `).join('');
    }

    openUserModal(userId = null) {
        this.currentEditingUserId = userId;
        const modal = document.getElementById('modalUser');
        const title = document.getElementById('modalUserTitle');
        const passwordFields = document.getElementById('passwordFields');

        if (userId) {
            title.innerHTML = '<i class="fas fa-user-edit text-indigo-600 mr-2"></i>Editar Usuário';
            passwordFields.classList.add('hidden');
            document.getElementById('userPassword').removeAttribute('required');
            this.loadUserData(userId);
        } else {
            title.innerHTML = '<i class="fas fa-user-plus text-indigo-600 mr-2"></i>Novo Usuário';
            passwordFields.classList.remove('hidden');
            document.getElementById('userPassword').setAttribute('required', '');
            this.resetUserForm();
        }

        modal.classList.remove('hidden');
    }

    closeUserModal() {
        document.getElementById('modalUser').classList.add('hidden');
        this.resetUserForm();
        this.currentEditingUserId = null;
    }

    resetUserForm() {
        document.getElementById('formUser').reset();
        document.querySelectorAll('.module-checkbox, .permission-checkbox').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
        });
        document.getElementById('isAdmin').checked = false;
    }

    async loadUserData(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('userName').value = user.full_name || '';
        document.getElementById('userEmail_input').value = user.email;

        // Check admin status
        const isAdmin = user.roles?.some(role => role.toLowerCase().includes('admin'));
        document.getElementById('isAdmin').checked = isAdmin;

        // Load permissions
        if (user.permissions && !isAdmin) {
            user.permissions.forEach(perm => {
                const checkbox = document.querySelector(`[data-permission="${perm}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });

            // Check modules if all permissions are checked
            ['inventory', 'laboratory', 'reports', 'settings'].forEach(module => {
                const modulePerms = document.querySelectorAll(`[data-permission^="${module}:"]`);
                const allChecked = Array.from(modulePerms).every(cb => cb.checked);
                const moduleCheckbox = document.querySelector(`[data-module="${module}"]`);
                if (moduleCheckbox && allChecked) {
                    moduleCheckbox.checked = true;
                }
            });
        }

        if (isAdmin) {
            document.querySelectorAll('.module-checkbox, .permission-checkbox').forEach(cb => {
                cb.checked = true;
                cb.disabled = true;
            });
        }
    }

    async saveUser() {
        try {
            const name = document.getElementById('userName').value;
            const email = document.getElementById('userEmail_input').value;
            const password = document.getElementById('userPassword').value;
            const isAdmin = document.getElementById('isAdmin').checked;

            // Get selected permissions
            const permissions = [];
            if (!isAdmin) {
                document.querySelectorAll('.permission-checkbox:checked').forEach(cb => {
                    permissions.push(cb.dataset.permission);
                });
            }

            const userData = {
                full_name: name,
                email: email,
                is_admin: isAdmin,
                permissions: isAdmin ? [] : permissions
            };

            if (!this.currentEditingUserId) {
                userData.password = password;
            }

            const token = getAccessToken();
            const url = this.currentEditingUserId 
                ? `${this.apiBaseUrl}/admin/users/${this.currentEditingUserId}`
                : `${this.apiBaseUrl}/admin/users`;
            
            const method = this.currentEditingUserId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to save user');
            }

            this.showSuccess(this.currentEditingUserId ? 'Usuário atualizado!' : 'Usuário criado!');
            this.closeUserModal();
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError(error.message || 'Erro ao salvar usuário');
        }
    }

    async editUser(userId) {
        this.openUserModal(userId);
    }

    async toggleUserStatus(userId, currentStatus) {
        const action = currentStatus ? 'desativar' : 'ativar';
        if (!confirm(`Deseja realmente ${action} este usuário?`)) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${this.apiBaseUrl}/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    is_active: !currentStatus
                })
            });

            if (!response.ok) throw new Error('Failed to update user status');

            this.showSuccess(`Usuário ${action}do com sucesso!`);
            await this.loadUsers();
        } catch (error) {
            console.error('Error toggling user status:', error);
            this.showError('Erro ao atualizar status do usuário');
        }
    }

    showSuccess(message) {
        alert(message); // You can replace this with a better notification system
    }

    showError(message) {
        alert(message); // You can replace this with a better notification system
    }
}

// Initialize when DOM is ready
let userManagement;
document.addEventListener('DOMContentLoaded', () => {
    userManagement = new UserManagement();
});

