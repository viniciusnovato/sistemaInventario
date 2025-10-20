# 🔧 Guia de Correção de Erros - Dashboard

## 📋 Problemas Identificados

### Erro 1: `Cannot read properties of undefined (reading 'full_name')`
**Causa:** O dashboard estava tentando acessar `response.profile.full_name`, mas a API retorna `full_name` diretamente no objeto.

**Status:** ✅ **CORRIGIDO**

### Erro 2: `GET /api/modules/available 500 (Internal Server Error)`
**Causa:** A função SQL `get_user_accessible_modules` não está criada no banco de dados.

**Status:** ⚠️ **REQUER AÇÃO**

---

## 🚀 Solução Rápida

### Passo 1: Verificar o Estado do Banco de Dados

Execute o script de verificação:

```bash
node verify-database-setup.js
```

Este script irá:
- ✅ Verificar se todas as tabelas necessárias existem
- ✅ Verificar se as funções SQL estão criadas
- ✅ Verificar se existem módulos cadastrados
- ✅ Verificar se existem acessos configurados

### Passo 2: Configurar o Banco de Dados (se necessário)

Se o script indicar que faltam tabelas ou funções, siga estes passos:

1. **Acesse o Supabase Dashboard**
   - Vá para [https://supabase.com](https://supabase.com)
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em "SQL Editor"
   - Clique em "New query"

3. **Execute o Script de Setup**
   - Abra o arquivo `database/setup-modules.sql`
   - Copie todo o conteúdo
   - Cole no SQL Editor do Supabase
   - Clique em "Run" ou pressione `Ctrl+Enter`

4. **Verifique a Execução**
   - Execute novamente: `node verify-database-setup.js`
   - Deve mostrar ✅ para todos os itens

### Passo 3: Configurar Acesso Admin (Opcional)

Se você quiser dar acesso de admin a um usuário específico:

```bash
node setup-admin.js
```

Este script irá:
- Criar a role "Admin" se não existir
- Associar o usuário à role Admin
- Dar acesso a todos os módulos para a role Admin

---

## 📊 Estrutura do Banco de Dados

### Tabelas Necessárias

1. **`modules`** - Módulos disponíveis no sistema
   - Contém: inventory, financial, hr, crm, sales, etc.

2. **`user_module_access`** - Acesso direto de usuários aos módulos
   - Permite dar acesso específico a um usuário

3. **`role_module_access`** - Acesso de roles aos módulos
   - Permite dar acesso baseado em roles (Admin, Manager, etc.)

### Funções SQL Necessárias

1. **`get_user_accessible_modules(p_user_id UUID)`**
   - Retorna todos os módulos que um usuário pode acessar
   - Considera acesso direto E acesso via role

2. **`user_has_module_access(p_user_id UUID, p_module_code VARCHAR)`**
   - Verifica se um usuário tem acesso a um módulo específico
   - Retorna TRUE ou FALSE

---

## 🔍 Diagnóstico de Problemas

### Se o erro 500 persistir:

1. **Verifique os logs do servidor:**
   ```bash
   # No terminal onde o servidor está rodando
   # Procure por mensagens de erro relacionadas a 'get_user_accessible_modules'
   ```

2. **Teste a função SQL diretamente no Supabase:**
   ```sql
   -- No SQL Editor do Supabase
   SELECT * FROM get_user_accessible_modules('SEU_USER_ID_AQUI');
   ```

3. **Verifique se o usuário tem roles:**
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'SEU_USER_ID_AQUI';
   ```

4. **Verifique se existem módulos:**
   ```sql
   SELECT * FROM modules WHERE is_active = true;
   ```

### Se o erro de `full_name` persistir:

Isso já foi corrigido no código, mas se ainda ocorrer:

1. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+R` (Windows/Linux)
   - Pressione `Cmd+Shift+R` (Mac)

2. **Verifique se o arquivo foi atualizado:**
   - Abra `public/dashboard.html`
   - Procure pela linha 238
   - Deve estar: `response.full_name` (não `response.profile.full_name`)

---

## 📝 Checklist de Verificação

Antes de testar o sistema, certifique-se de que:

- [ ] O arquivo `.env` está configurado com as credenciais corretas do Supabase
- [ ] O servidor está rodando (`node api/index.js` ou `npm start`)
- [ ] O script `verify-database-setup.js` retorna ✅ para todos os itens
- [ ] Existe pelo menos um usuário cadastrado no sistema
- [ ] O usuário tem uma role associada (Admin, Manager, etc.)
- [ ] A role tem acesso a pelo menos um módulo

---

## 🎯 Teste Final

Após seguir todos os passos:

1. **Acesse o sistema:**
   ```
   http://localhost:3002/login.html
   ```

2. **Faça login com suas credenciais**

3. **Verifique se:**
   - O nome do usuário aparece corretamente no canto superior direito
   - Os módulos são carregados e exibidos no dashboard
   - Não há erros no console do navegador (F12)

---

## 🆘 Suporte

Se os problemas persistirem:

1. **Verifique os logs do servidor** - Procure por mensagens de erro detalhadas
2. **Verifique o console do navegador** - Pressione F12 e veja a aba Console
3. **Execute o script de verificação** - `node verify-database-setup.js`
4. **Verifique as variáveis de ambiente** - Certifique-se de que o `.env` está correto

---

## 📚 Arquivos Modificados

- ✅ `public/dashboard.html` - Corrigido acesso ao `full_name`
- ✅ `verify-database-setup.js` - Novo script de verificação criado
- ✅ `FIX_ERRORS_GUIDE.md` - Este guia

---

## 🔄 Próximos Passos

Após corrigir os erros:

1. Execute `node verify-database-setup.js` para confirmar que tudo está OK
2. Se necessário, execute `node setup-admin.js` para configurar um admin
3. Acesse o painel admin em `http://localhost:3002/admin-modules.html`
4. Configure os acessos dos usuários aos módulos
5. Teste o sistema completo

---

**Última atualização:** $(date)
**Versão:** 1.0
