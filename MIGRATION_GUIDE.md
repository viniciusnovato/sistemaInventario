# 🏢 Transformação para ERP Modular - Guia de Migração

## 📋 Visão Geral

Este guia descreve o processo de transformação do sistema de inventário em um ERP modular completo. A nova arquitetura permite:

- ✅ Múltiplos módulos independentes (Inventário, Vendas, Compras, Financeiro, CRM, RH, etc.)
- ✅ Controle granular de acesso por usuário e por role
- ✅ Dashboard centralizado com grid de módulos
- ✅ Painel administrativo para gerenciar módulos e acessos
- ✅ Sistema escalável e extensível

## 🗂️ Estrutura de Arquivos Criados

```
database/
├── setup-modules.sql      # Cria tabelas de módulos e acessos
└── seed-modules.sql       # Popula módulos iniciais

public/
├── dashboard.html         # Nova página inicial com grid de módulos
├── admin-modules.html     # Painel administrativo
├── inventory.html         # Módulo de inventário (antigo index.html)
└── login.html            # Atualizado para redirecionar ao dashboard

api/
├── index.js              # Novos endpoints de módulos
└── middleware/
    └── auth.js           # Novo middleware requireModuleAccess
```

## 🚀 Passo a Passo da Migração

### 1️⃣ Executar Scripts SQL no Supabase

Acesse o SQL Editor do Supabase e execute os scripts na ordem:

#### a) Criar Estrutura de Módulos
```sql
-- Execute o conteúdo de: database/setup-modules.sql
```

Este script cria:
- Tabela `modules` - Armazena os módulos do sistema
- Tabela `user_module_access` - Controle de acesso por usuário
- Tabela `role_module_access` - Controle de acesso por role
- Funções SQL para verificar acessos
- Triggers e políticas RLS

#### b) Popular Módulos Iniciais
```sql
-- Execute o conteúdo de: database/seed-modules.sql
```

Este script:
- Insere 8 módulos iniciais (Inventário, Vendas, Compras, Financeiro, CRM, RH, Relatórios, Configurações)
- Concede acesso ao módulo de Inventário para a role Admin
- Exibe os módulos criados e acessos configurados

### 2️⃣ Verificar Instalação

Após executar os scripts, verifique se tudo foi criado corretamente:

```sql
-- Verificar módulos criados
SELECT code, name, emoji, color, route, is_active 
FROM modules 
ORDER BY display_order;

-- Verificar acessos por role
SELECT r.name as role, m.name as module
FROM role_module_access rma
JOIN roles r ON r.id = rma.role_id
JOIN modules m ON m.id = rma.module_id
WHERE rma.is_active = true;
```

### 3️⃣ Reiniciar o Servidor

```bash
# Parar o servidor se estiver rodando
# Ctrl+C

# Iniciar novamente
npm start
```

### 4️⃣ Testar o Sistema

1. **Acesse o sistema**: http://localhost:3000
2. **Faça login** com um usuário Admin
3. **Você será redirecionado** para o dashboard com o grid de módulos
4. **Acesse o Painel Admin**: Clique no menu do usuário → "Painel Admin"

## 🎯 Funcionalidades Implementadas

### Dashboard de Módulos (`/dashboard.html`)
- Grid responsivo com todos os módulos disponíveis para o usuário
- Cards coloridos com ícones e emojis
- Animações suaves ao carregar
- Mensagem quando usuário não tem acesso a nenhum módulo

### Painel Administrativo (`/admin-modules.html`)
- **Aba Módulos**: Gerenciar módulos do sistema
  - Criar novos módulos
  - Editar módulos existentes
  - Ativar/desativar módulos
  - Definir ordem de exibição
  - Excluir módulos
  
- **Aba Usuários e Acessos**: Gerenciar acessos
  - Visualizar todos os usuários
  - Ver quantos módulos cada usuário tem acesso
  - Conceder/revogar acesso a módulos específicos
  - Interface intuitiva com checkboxes

### API Endpoints

#### Módulos
- `GET /api/modules` - Listar todos os módulos (admin)
- `GET /api/modules/available` - Listar módulos acessíveis pelo usuário
- `GET /api/modules/:moduleCode/check-access` - Verificar acesso a módulo
- `POST /api/modules` - Criar módulo (admin)
- `PUT /api/modules/:id` - Atualizar módulo (admin)
- `DELETE /api/modules/:id` - Deletar módulo (admin)

#### Acessos
- `GET /api/modules/access/user/:userId` - Listar acessos de um usuário (admin)
- `GET /api/modules/access/all-users` - Listar todos os usuários com acessos (admin)
- `POST /api/modules/access/grant` - Conceder acesso (admin)
- `DELETE /api/modules/access/revoke` - Revogar acesso (admin)

### Middleware de Segurança

Novo middleware `requireModuleAccess(moduleCode)` para proteger rotas:

```javascript
// Exemplo de uso em rotas futuras
app.get('/api/sales/*', 
    authenticateToken, 
    requireModuleAccess('SALES'), 
    (req, res) => {
        // Lógica do endpoint
    }
);
```

## 📦 Módulos Iniciais Criados

| Código | Nome | Emoji | Cor | Rota | Status |
|--------|------|-------|-----|------|--------|
| INVENTORY | Inventário | 📦 | Azul | /inventory.html | ✅ Implementado |
| SALES | Vendas | 🛒 | Verde | /sales.html | 🔜 A implementar |
| PURCHASES | Compras | 🛍️ | Laranja | /purchases.html | 🔜 A implementar |
| FINANCIAL | Financeiro | 💰 | Amarelo | /financial.html | 🔜 A implementar |
| CRM | Clientes (CRM) | 👥 | Roxo | /crm.html | 🔜 A implementar |
| HR | Recursos Humanos | 👔 | Índigo | /hr.html | 🔜 A implementar |
| REPORTS | Relatórios | 📊 | Teal | /reports.html | 🔜 A implementar |
| SETTINGS | Configurações | ⚙️ | Cinza | /settings.html | 🔜 A implementar |

## 🔐 Gerenciamento de Acessos

### Por Role (Recomendado)
Conceda acesso a módulos para roles inteiras:

```sql
-- Exemplo: Conceder acesso ao módulo de Vendas para role "Vendedor"
INSERT INTO role_module_access (role_id, module_id)
SELECT r.id, m.id
FROM roles r, modules m
WHERE r.name = 'Vendedor' AND m.code = 'SALES';
```

### Por Usuário (Específico)
Conceda acesso individual através do painel admin ou via API:

```javascript
// Via API
POST /api/modules/access/grant
{
  "user_id": "uuid-do-usuario",
  "module_id": "uuid-do-modulo",
  "expires_at": "2024-12-31" // Opcional
}
```

## 🎨 Personalização de Módulos

### Cores Disponíveis
- `blue` - Azul
- `green` - Verde
- `purple` - Roxo
- `orange` - Laranja
- `red` - Vermelho
- `indigo` - Índigo
- `teal` - Teal
- `cyan` - Ciano
- `yellow` - Amarelo
- `pink` - Rosa
- `gray` - Cinza
- `slate` - Ardósia

### Ícones
Use classes do Font Awesome 6:
- `fas fa-boxes` - Caixas
- `fas fa-shopping-cart` - Carrinho
- `fas fa-dollar-sign` - Cifrão
- `fas fa-users` - Usuários
- E muitos outros...

## 🔄 Próximos Passos

1. **Implementar módulos restantes** (Vendas, Compras, Financeiro, etc.)
2. **Adicionar proteção de rotas** usando `requireModuleAccess` middleware
3. **Criar dashboards específicos** para cada módulo
4. **Implementar relatórios** no módulo de Relatórios
5. **Adicionar notificações** entre módulos
6. **Criar integrações** entre módulos (ex: Vendas → Financeiro)

## 🐛 Troubleshooting

### Problema: Nenhum módulo aparece no dashboard
**Solução**: Verifique se o usuário tem acesso aos módulos:
```sql
SELECT * FROM user_module_access WHERE user_id = 'seu-user-id';
SELECT * FROM role_module_access WHERE role_id IN (
    SELECT role_id FROM user_roles WHERE user_id = 'seu-user-id'
);
```

### Problema: Erro ao acessar painel admin
**Solução**: Verifique se o usuário tem a role "Admin":
```sql
SELECT r.name 
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
WHERE ur.user_id = 'seu-user-id';
```

### Problema: Função SQL não encontrada
**Solução**: Execute novamente o script `setup-modules.sql` no Supabase.

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Verifique o console do navegador (F12)
3. Consulte a documentação do Supabase
4. Entre em contato com o time de desenvolvimento

---

**Desenvolvido por**: Grupo AreLuna  
**Versão**: 2.0.0  
**Data**: 2024
