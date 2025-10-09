/**
 * Sistema de Autenticação - Supabase Auth
 * Grupo AreLuna - Sistema de Inventário
 */

// Configuração do Supabase
const SUPABASE_URL = 'https://hvqckoajxhdqaxfawisd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4';

// Inicializar cliente Supabase
const supabaseAuth = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Classe para gerenciar autenticação
 */
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.session = null;
        this.isAuthenticated = false;
        this.init();
    }

    /**
     * Inicializa o sistema de autenticação
     */
    async init() {
        try {
            // Verificar sessão atual
            const { data: { session }, error } = await supabaseAuth.auth.getSession();
            
            if (error) {
                console.error('Erro ao verificar sessão:', error);
                return;
            }

            if (session) {
                this.setSession(session);
            }

            // Escutar mudanças de autenticação
            supabaseAuth.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event, session);
                
                if (event === 'SIGNED_IN' && session) {
                    this.setSession(session);
                } else if (event === 'SIGNED_OUT') {
                    this.clearSession();
                }
            });

        } catch (error) {
            console.error('Erro ao inicializar autenticação:', error);
        }
    }

    /**
     * Define a sessão do usuário
     */
    setSession(session) {
        this.session = session;
        this.currentUser = session.user;
        this.isAuthenticated = true;
        
        // Armazenar informações do usuário
        localStorage.setItem('user', JSON.stringify(this.currentUser));
        localStorage.setItem('isAuthenticated', 'true');
        
        console.log('Usuário autenticado:', this.currentUser.email);
    }

    /**
     * Limpa a sessão do usuário
     */
    clearSession() {
        this.session = null;
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Limpar localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('rememberMe');
        
        console.log('Sessão limpa');
    }

    /**
     * Fazer login
     */
    async signIn(email, password) {
        try {
            const { data, error } = await supabaseAuth.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                throw error;
            }

            return { success: true, data };

        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Fazer logout
     */
    async signOut() {
        try {
            const { error } = await supabaseAuth.auth.signOut();
            
            if (error) {
                throw error;
            }

            this.clearSession();
            
            // Redirecionar para login
            window.location.href = 'login.html';
            
            return { success: true };

        } catch (error) {
            console.error('Erro no logout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Alterar senha do usuário
     */
    async changePassword(currentPassword, newPassword) {
        try {
            // Verificar se o usuário está autenticado
            if (!this.isUserAuthenticated()) {
                throw new Error('Usuário não autenticado');
            }

            // Primeiro, verificar se a senha atual está correta
            // fazendo um novo login com as credenciais atuais
            const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
                email: this.currentUser.email,
                password: currentPassword
            });

            if (signInError) {
                throw new Error('Senha atual incorreta');
            }

            // Se o login foi bem-sucedido, alterar a senha
            const { data, error } = await supabaseAuth.auth.updateUser({
                password: newPassword
            });

            if (error) {
                throw error;
            }

            return { success: true, data };

        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            throw error;
        }
    }

    /**
     * Verificar se o usuário está autenticado
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.session && this.currentUser;
    }

    /**
     * Obter usuário atual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Obter sessão atual
     */
    getCurrentSession() {
        return this.session;
    }

    /**
     * Proteger página (redirecionar para login se não autenticado)
     */
    requireAuth() {
        if (!this.isUserAuthenticated()) {
            console.log('Usuário não autenticado, redirecionando para login');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Redirecionar usuário autenticado (para página de login)
     */
    redirectIfAuthenticated() {
        if (this.isUserAuthenticated()) {
            console.log('Usuário já autenticado, redirecionando para dashboard');
            window.location.href = 'index.html';
            return true;
        }
        return false;
    }

    /**
     * Obter token de acesso
     */
    getAccessToken() {
        return this.session?.access_token || null;
    }

    /**
     * Verificar se o token está válido
     */
    isTokenValid() {
        if (!this.session) return false;
        
        const now = Math.floor(Date.now() / 1000);
        return this.session.expires_at > now;
    }

    /**
     * Renovar token se necessário
     */
    async refreshTokenIfNeeded() {
        if (!this.session || this.isTokenValid()) {
            return true;
        }

        try {
            const { data, error } = await supabaseAuth.auth.refreshSession();
            
            if (error) {
                throw error;
            }

            if (data.session) {
                this.setSession(data.session);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Erro ao renovar token:', error);
            this.signOut();
            return false;
        }
    }
}

/**
 * Instância global do gerenciador de autenticação
 */
const authManager = new AuthManager();

/**
 * Funções utilitárias para uso nas páginas
 */

/**
 * Proteger página atual
 */
function requireAuthentication() {
    return authManager.requireAuth();
}

/**
 * Redirecionar se já autenticado
 */
function redirectIfAuthenticated() {
    return authManager.redirectIfAuthenticated();
}

/**
 * Fazer logout
 */
async function logout() {
    const result = await authManager.signOut();
    if (!result.success) {
        console.error('Erro ao fazer logout:', result.error);
        alert('Erro ao fazer logout. Tente novamente.');
    }
}

/**
 * Obter usuário atual
 */
function getCurrentUser() {
    return authManager.getCurrentUser();
}

/**
 * Verificar se está autenticado
 */
function isAuthenticated() {
    return authManager.isUserAuthenticated();
}

/**
 * Obter token de acesso
 */
function getAccessToken() {
    return authManager.getAccessToken();
}

/**
 * Adicionar cabeçalho de autorização às requisições
 */
function getAuthHeaders() {
    const token = getAccessToken();
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

/**
 * Fazer requisição autenticada
 */
async function authenticatedFetch(url, options = {}) {
    // Renovar token se necessário
    await authManager.refreshTokenIfNeeded();
    
    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * Mostrar informações do usuário na interface
 */
function displayUserInfo() {
    const user = getCurrentUser();
    if (!user) return;

    // Procurar elementos para mostrar info do usuário
    const userEmailElements = document.querySelectorAll('[data-user-email]');
    const userNameElements = document.querySelectorAll('[data-user-name]');
    
    userEmailElements.forEach(el => {
        el.textContent = user.email;
    });
    
    userNameElements.forEach(el => {
        el.textContent = user.user_metadata?.full_name || user.email.split('@')[0];
    });
}

/**
 * Adicionar botão de logout à interface
 */
function addLogoutButton() {
    const logoutButtons = document.querySelectorAll('[data-logout-btn]');
    
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (confirm('Tem certeza que deseja sair?')) {
                await logout();
            }
        });
    });
}

/**
 * Inicialização automática quando o DOM estiver pronto
 */
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um pouco para o authManager inicializar
    setTimeout(() => {
        displayUserInfo();
        addLogoutButton();
    }, 100);
});

// Exportar para uso global
window.authManager = authManager;
window.requireAuthentication = requireAuthentication;
window.redirectIfAuthenticated = redirectIfAuthenticated;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.isAuthenticated = isAuthenticated;
window.getAccessToken = getAccessToken;
window.getAuthHeaders = getAuthHeaders;
window.authenticatedFetch = authenticatedFetch;