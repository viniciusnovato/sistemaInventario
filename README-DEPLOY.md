# Deploy na Vercel - Sistema de Inventário AreLuna

## 📋 Pré-requisitos

1. **Conta na Vercel**: Crie uma conta em [vercel.com](https://vercel.com)
2. **Projeto Supabase**: Tenha seu projeto Supabase configurado
3. **Repositório Git**: Código deve estar em um repositório (GitHub, GitLab, etc.)

## 🚀 Passos para Deploy

### 1. Configurar Variáveis de Ambiente na Vercel

No painel da Vercel, configure as seguintes variáveis:

```
SUPABASE_URL=https://hvqckoajxhdqaxfawisd.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTMyMDksImV4cCI6MjA3NDQ2OTIwOX0.r260qHrvkLMHG60Pbld2zyjwXBY3B94Edk51YDpLXM4
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2cWNrb2FqeGhkcWF4ZmF3aXNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODg5MzIwOSwiZXhwIjoyMDc0NDY5MjA5fQ.giS313veFHErBnXpfafLS-c9loqVbeD6pggVHyYy7zY
NODE_ENV=production
```

### 2. Deploy Automático

1. Conecte seu repositório à Vercel
2. A Vercel detectará automaticamente as configurações do `vercel.json`
3. O deploy será executado automaticamente

### 3. Configurações Otimizadas

O projeto já está configurado com:

- ✅ **Roteamento otimizado** para SPA e API
- ✅ **Compressão** habilitada
- ✅ **Segurança** com Helmet e CSP
- ✅ **Região brasileira** (gru1) para menor latência
- ✅ **Memória otimizada** (1024MB)
- ✅ **Timeout configurado** (30s)

### 4. Funcionalidades Suportadas

- ✅ **Autenticação** via Supabase
- ✅ **Upload de imagens** para Supabase Storage
- ✅ **Geração de QR Codes**
- ✅ **API completa** para CRUD de itens
- ✅ **Interface responsiva**
- ✅ **Menu hambúrguer** (mobile e desktop)
- ✅ **Modo escuro**
- ✅ **Sistema de impressão**

## 🔧 Comandos Úteis

```bash
# Testar build localmente
npm run build

# Executar em desenvolvimento
npm run dev

# Executar em produção
npm start
```

## 📱 URLs Importantes

Após o deploy, as seguintes rotas estarão disponíveis:

- `/` - Página principal (inventário)
- `/login.html` - Página de login
- `/settings.html` - Configurações
- `/view-item.html?id=X` - Visualizar item
- `/edit-item.html?id=X` - Editar item
- `/api/*` - Endpoints da API

## 🛠️ Troubleshooting

### Erro de CORS
Se houver problemas de CORS, verifique se a URL do Supabase está correta nas variáveis de ambiente.

### Erro de Upload
Certifique-se de que o bucket `item-images` existe no Supabase Storage e está configurado como público.

### Erro de Autenticação
Verifique se as chaves do Supabase estão corretas e se o projeto está ativo.

## 📞 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento do Grupo AreLuna.