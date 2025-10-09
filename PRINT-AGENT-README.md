# Local Print Agent - Brother QL-810Wc

Este é o agente local de impressão que monitora a fila de impressão no Supabase e imprime QR codes na impressora Brother QL-810Wc.

## 📋 Pré-requisitos

### 1. Driver da Impressora
- **macOS**: Baixe e instale o driver oficial da Brother para QL-810Wc
- **Windows**: Instale o driver P-touch Editor e QL-810Wc driver
- **Linux**: Instale o CUPS e o driver brother-ql

### 2. Node.js
- Node.js 18+ instalado no sistema
- npm ou yarn para gerenciar dependências

### 3. Configuração da Impressora
A impressora deve estar:
- Conectada via USB ou Wi-Fi à rede local
- Configurada no sistema operacional
- Testada com impressão básica

## 🚀 Instalação

### 1. Instalar Dependências
```bash
# Copiar o arquivo de dependências
cp package-print-agent.json package.json

# Instalar dependências
npm install
```

### 2. Verificar Impressora
```bash
# macOS/Linux - verificar impressoras disponíveis
lpstat -p

# Deve mostrar algo como:
# printer Brother_QL_810W is idle. enabled since...
```

### 3. Configurar Nome da Impressora
Edite o arquivo `local-print-agent.js` e ajuste o nome da impressora:

```javascript
const PRINTER_CONFIG = {
    name: 'Brother_QL_810W', // ← Ajuste conforme seu sistema
    labelSize: '62',
    orientation: 'portrait'
};
```

## 🖨️ Uso

### Iniciar o Agent
```bash
node local-print-agent.js
```

### Executar em Modo Desenvolvimento
```bash
npm run dev
```

### Executar como Serviço (Opcional)
Para manter o agent rodando permanentemente, você pode configurá-lo como serviço do sistema.

#### macOS (launchd)
Crie o arquivo `~/Library/LaunchAgents/com.inventario.printagent.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.inventario.printagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/caminho/para/local-print-agent.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/caminho/para/diretorio</string>
</dict>
</plist>
```

Carregar o serviço:
```bash
launchctl load ~/Library/LaunchAgents/com.inventario.printagent.plist
```

## 🔧 Configuração Avançada

### Tamanhos de Etiqueta Suportados
A Brother QL-810Wc suporta vários tamanhos de etiqueta:
- 62mm (padrão)
- 29mm
- 38mm
- 17x54mm
- 17x87mm

### Personalizar Layout do QR Code
Edite a função `generateQRCodeImage()` no arquivo `local-print-agent.js` para ajustar:
- Tamanho do QR code
- Fonte e tamanho do texto
- Layout da etiqueta
- Cores

### Configurar Retry Logic
O agent automaticamente tenta reimprimir jobs que falharam até 3 vezes. Para ajustar:

```javascript
// Na função processJob()
if (job.retry_count < 3) { // ← Altere o número máximo de tentativas
    await this.retryJob(job.id);
}
```

## 🐛 Troubleshooting

### Impressora Não Encontrada
```
❌ Impressora não encontrada: Brother_QL_810W
```

**Soluções:**
1. Verifique se a impressora está ligada e conectada
2. Confirme o nome da impressora com `lpstat -p`
3. Ajuste o nome no `PRINTER_CONFIG`

### Erro de Conexão com Supabase
```
❌ Erro na conexão com Supabase
```

**Soluções:**
1. Verifique sua conexão com a internet
2. Confirme as credenciais do Supabase no código
3. Verifique se a tabela `print_queue` existe

### Erro de Dependências Canvas
```
Error: Cannot find module 'canvas'
```

**Soluções:**
- **macOS**: `brew install pkg-config cairo pango libpng jpeg giflib librsvg`
- **Ubuntu**: `sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`
- **Windows**: Instale windows-build-tools: `npm install --global windows-build-tools`

### Jobs Ficam em "Processing"
Se jobs ficam presos no status "processing":

1. Reinicie o agent
2. Verifique logs de erro
3. Execute limpeza manual no Supabase:

```sql
UPDATE print_queue 
SET status = 'failed', error_message = 'Agent restart required'
WHERE status = 'processing' AND updated_at < NOW() - INTERVAL '5 minutes';
```

## 📊 Monitoramento

### Logs do Agent
O agent produz logs detalhados:
- ✅ Operações bem-sucedidas
- ❌ Erros e falhas
- 🔔 Novos jobs recebidos
- 🖨️ Status de impressão

### Status dos Jobs
Monitore o status dos jobs no Supabase:

```sql
SELECT 
    id,
    item_name,
    status,
    created_at,
    completed_at,
    error_message
FROM print_queue 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔒 Segurança

- O agent usa apenas a chave pública (anon) do Supabase
- Arquivos temporários são automaticamente removidos
- Não armazena dados sensíveis localmente
- Suporta Row Level Security (RLS) do Supabase

## 📝 Logs e Debugging

Para debug detalhado, adicione variáveis de ambiente:

```bash
DEBUG=* node local-print-agent.js
```

Ou modifique o nível de log no código:

```javascript
// Adicionar no início do arquivo
const DEBUG = true;

// Usar em funções
if (DEBUG) console.log('Debug info:', data);
```

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs do agent
2. Teste a impressora com outros documentos
3. Confirme a conectividade com Supabase
4. Verifique as permissões da tabela `print_queue`

Para problemas específicos da Brother QL-810Wc, consulte:
- Manual oficial da Brother
- Fóruns de suporte da Brother
- Documentação do driver CUPS (Linux/macOS)