# 🦷 Plano de Ação: Módulo Laboratório ProStoral

**Versão:** 1.0  
**Data:** 20 de Outubro de 2025  
**Status:** Em Planejamento

---

## 📋 Visão Geral do Projeto

Sistema completo de gestão para laboratório de prótese dentária integrado ao ERP Grupo AreLuna, incluindo:
- Gestão de OS e produção
- Controle de estoque com QR Code
- Cálculo de CMV (Custo da Mercadoria Vendida)
- Sistema de consertos e intercorrências
- Gestão de clientes/clínicas
- Controle de mão de obra e produtividade
- Sistema multi-nível de permissões 

---

## 🎯 Fases de Implementação

### 📊 **FASE 1: Estrutura de Base de Dados** (Prioridade: ALTA)

**Objetivo:** Criar toda a estrutura SQL necessária para suportar o módulo.

**Tarefas:**

#### 1.1 Tabelas Principais
- [ ] `prostoral_clients` - Clientes/Clínicas/Dentistas
  - Campos: nome, clínica, dentista, NIF, endereço, contatos, condições comerciais
  - Campos de histórico e observações
- [ ] `prostoral_work_orders` (OS) - Ordens de Serviço
  - Vinculação com cliente e paciente
  - Status do workflow (Recebido → Design → Produção → Acabamento → CQ → Entregue)
  - Datas: entrada, previsão, entrega
  - Upload de anexos (RX, fotos, STL, PLY, OBJ)
  - QR Code único
- [ ] `prostoral_procedure_kits` - Kits de Procedimentos
  - Templates de materiais por tipo de prótese
  - Lista de materiais e quantidades padrão
- [ ] `prostoral_work_order_materials` - Materiais usados por OS
  - Vinculação com inventário existente
  - Quantidade prevista vs real
- [ ] `prostoral_repairs` - Consertos/Retrabalhos
  - Vinculação com OS original
  - Tipo: faturável ou garantia
  - Motivo, custos adicionais
- [ ] `prostoral_issues` - Intercorrências
  - Vinculação com OS
  - Status do workflow
  - Timeline de comunicações
- [ ] `prostoral_time_tracking` - Registro de Horas
  - Check-in/out por técnico
  - Etapa de produção
  - Horas trabalhadas
- [ ] `prostoral_cmv` - Cálculo de CMV
  - Materiais diretos
  - Mão de obra direta (MOD)
  - Custos indiretos rateados
- [ ] `prostoral_invoices` - Faturação
  - Vinculação com OS
  - Valores, pagamentos, status

#### 1.2 Views e Funções SQL
- [ ] View: `v_prostoral_active_orders` - OS ativas com detalhes
- [ ] View: `v_prostoral_cmv_summary` - Resumo de custos por OS
- [ ] View: `v_prostoral_technician_workload` - Carga de trabalho por técnico
- [ ] Function: `calculate_order_cmv(order_id)` - Calcula CMV de uma OS
- [ ] Function: `check_inventory_availability(kit_id)` - Verifica disponibilidade de materiais
- [ ] Function: `generate_order_qrcode(order_id)` - Gera QR Code único

#### 1.3 Triggers e Constraints
- [ ] Trigger: Auto-atualização de `updated_at`
- [ ] Trigger: Baixa automática de estoque ao finalizar OS
- [ ] Trigger: Cálculo automático de CMV ao mudar status para "Entregue"
- [ ] Constraint: Validação de status do workflow
- [ ] Constraint: Validação de datas (entrega >= previsão >= entrada)

**Tempo Estimado:** 3-4 dias  
**Dependências:** Nenhuma

---

### 🔐 **FASE 2: Sistema de Permissões e Roles** (Prioridade: ALTA)

**Objetivo:** Configurar níveis de acesso específicos do módulo ProStoral.

**Tarefas:**

#### 2.1 Criar Roles Específicos
- [ ] Role: `protetico` (Técnico de Laboratório)
  - Permissões: `prostoral:read`, `prostoral:create_timesheet`, `prostoral:update_materials`
- [ ] Role: `lab_manager` (Gerente de Laboratório)
  - Permissões: `prostoral:*` (exceto configurações globais)
- [ ] Role: `lab_client` (Cliente/Clínica/Dentista)
  - Permissões: `prostoral:read_own`, `prostoral:create_order`, `prostoral:create_issue`
- [ ] Admin já tem acesso total via `admin:all`

#### 2.2 Configurar Permissões Granulares
- [ ] `prostoral:read` - Ver OS e informações gerais
- [ ] `prostoral:create` - Criar novas OS
- [ ] `prostoral:update` - Editar OS existentes
- [ ] `prostoral:delete` - Excluir OS
- [ ] `prostoral:view_cmv` - Ver custos e margens
- [ ] `prostoral:manage_clients` - Gerenciar clientes
- [ ] `prostoral:manage_kits` - Gerenciar kits de procedimentos
- [ ] `prostoral:manage_issues` - Gerenciar intercorrências
- [ ] `prostoral:create_timesheet` - Registrar horas trabalhadas
- [ ] `prostoral:view_reports` - Ver relatórios

#### 2.3 Middleware e Validações
- [ ] Middleware: `requireProstoralAccess` - Valida acesso ao módulo
- [ ] Middleware: `requireProstoralPermission(action)` - Valida permissão específica
- [ ] Middleware: `checkOrderOwnership` - Valida que cliente só vê suas OS

**Tempo Estimado:** 2 dias  
**Dependências:** Fase 1 (tabelas)

---

### 👥 **FASE 3: Gestão de Clientes/Clínicas** (Prioridade: MÉDIA)

**Objetivo:** Sistema completo de cadastro e gestão de parceiros.

**Tarefas:**

#### 3.1 Backend API
- [ ] POST `/api/prostoral/clients` - Criar cliente
- [ ] GET `/api/prostoral/clients` - Listar clientes (com paginação e filtros)
- [ ] GET `/api/prostoral/clients/:id` - Detalhes do cliente
- [ ] PUT `/api/prostoral/clients/:id` - Atualizar cliente
- [ ] DELETE `/api/prostoral/clients/:id` - Desativar cliente
- [ ] POST `/api/prostoral/clients/:id/documents` - Upload de documentos
- [ ] GET `/api/prostoral/clients/:id/history` - Histórico de OS
- [ ] GET `/api/prostoral/clients/:id/stats` - Estatísticas (faturamento, CMV, retrabalho)

#### 3.2 Frontend - Página de Clientes
- [ ] Lista de clientes com busca e filtros
- [ ] Formulário de cadastro/edição
- [ ] Upload de documentos (contratos, faturas, protocolos)
- [ ] Área de observações internas
- [ ] Histórico de OS, consertos e intercorrências
- [ ] Cards com estatísticas por cliente

#### 3.3 Relatórios
- [ ] Faturamento por cliente (mensal/anual)
- [ ] CMV médio por cliente
- [ ] Taxa de retrabalho por cliente
- [ ] Ranking de clientes mais rentáveis

**Tempo Estimado:** 4 dias  
**Dependências:** Fase 1, Fase 2

---

### 🦷 **FASE 4: Sistema de Ordens de Serviço (OS)** (Prioridade: CRÍTICA)

**Objetivo:** Núcleo do sistema - gestão completa do ciclo de vida das OS.

**Tarefas:**

#### 4.1 Backend API
- [ ] POST `/api/prostoral/orders` - Criar nova OS
- [ ] GET `/api/prostoral/orders` - Listar OS (filtros: status, cliente, técnico, data)
- [ ] GET `/api/prostoral/orders/:id` - Detalhes da OS
- [ ] PUT `/api/prostoral/orders/:id` - Atualizar OS
- [ ] PUT `/api/prostoral/orders/:id/status` - Mudar status
- [ ] POST `/api/prostoral/orders/:id/attachments` - Upload de anexos
- [ ] GET `/api/prostoral/orders/:id/timeline` - Linha do tempo
- [ ] POST `/api/prostoral/orders/:id/qrcode` - Gerar QR Code
- [ ] POST `/api/prostoral/orders/:id/checkin` - Check-in de técnico
- [ ] POST `/api/prostoral/orders/:id/checkout` - Check-out de técnico

#### 4.2 Frontend - Criação de OS
- [ ] Formulário multi-step (cliente, paciente, trabalho, anexos)
- [ ] Seleção de tipo de trabalho (carrega kit automaticamente)
- [ ] Upload de arquivos (RX, fotos, STL, PLY, OBJ)
- [ ] Definição de datas e prioridade
- [ ] Atribuição de técnico responsável
- [ ] Geração e impressão de etiqueta com QR Code

#### 4.3 Frontend - Painel de Produção
- [ ] Visualização Kanban (colunas por status)
- [ ] Visualização Gantt (timeline de produção)
- [ ] Filtros: cliente, técnico, status, prioridade, data
- [ ] Drag & drop para mudar status
- [ ] Indicadores visuais: atrasadas, urgentes, hoje
- [ ] Check-in/out rápido

#### 4.4 Frontend - Detalhes da OS
- [ ] Informações completas da OS
- [ ] Timeline de eventos
- [ ] Materiais utilizados (kit + adições/remoções)
- [ ] Horas trabalhadas por técnico
- [ ] Anexos e documentos
- [ ] CMV calculado (para gerente/admin)
- [ ] Botões de ação por status

**Tempo Estimado:** 8-10 dias  
**Dependências:** Fase 1, Fase 2, Fase 3

---

### 🧰 **FASE 5: Kits de Procedimentos** (Prioridade: MÉDIA)

**Objetivo:** Templates de materiais por tipo de prótese.

**Tarefas:**

#### 5.1 Backend API
- [ ] POST `/api/prostoral/kits` - Criar kit
- [ ] GET `/api/prostoral/kits` - Listar kits
- [ ] GET `/api/prostoral/kits/:id` - Detalhes do kit
- [ ] PUT `/api/prostoral/kits/:id` - Atualizar kit
- [ ] DELETE `/api/prostoral/kits/:id` - Deletar kit
- [ ] POST `/api/prostoral/kits/:id/duplicate` - Duplicar kit

#### 5.2 Frontend
- [ ] Lista de kits com busca
- [ ] Formulário de criação/edição
- [ ] Seleção de materiais do inventário
- [ ] Definição de quantidades padrão
- [ ] Preview de custo estimado
- [ ] Histórico de uso do kit

#### 5.3 Integração com OS
- [ ] Carregamento automático do kit ao criar OS
- [ ] Permitir personalização por OS (adicionar/remover itens)
- [ ] Relatório de consumo real vs previsto

**Tempo Estimado:** 3 dias  
**Dependências:** Fase 1, Fase 4

---

### 📦 **FASE 6: Integração com Estoque (QR Code)** (Prioridade: ALTA)

**Objetivo:** Conectar o sistema de inventário existente com as OS.

**Tarefas:**

#### 6.1 Backend API
- [ ] GET `/api/prostoral/inventory/available` - Materiais disponíveis
- [ ] POST `/api/prostoral/orders/:id/materials/scan` - Baixa via QR Code
- [ ] POST `/api/prostoral/orders/:id/materials/return` - Devolução parcial
- [ ] GET `/api/prostoral/orders/:id/materials/history` - Histórico de movimentação

#### 6.2 Frontend - Baixa de Materiais
- [ ] Scanner QR Code (câmera do celular/leitor)
- [ ] Confirmação de quantidade
- [ ] Vinculação automática com OS
- [ ] Alerta de estoque mínimo
- [ ] Histórico de movimentações

#### 6.3 Alertas e Notificações
- [ ] Alerta de estoque mínimo
- [ ] Alerta de validade próxima
- [ ] Alerta de consumo anormal
- [ ] Sugestão de reposição

**Tempo Estimado:** 4 dias  
**Dependências:** Fase 1, Fase 4

---

### ⏱️ **FASE 7: Controle de Produção e Mão de Obra** (Prioridade: ALTA)

**Objetivo:** Registrar tempo trabalhado e calcular custos de MOD.

**Tarefas:**

#### 7.1 Backend API
- [ ] POST `/api/prostoral/timesheet/checkin` - Iniciar trabalho
- [ ] POST `/api/prostoral/timesheet/checkout` - Finalizar trabalho
- [ ] GET `/api/prostoral/timesheet/active` - Sessões ativas
- [ ] GET `/api/prostoral/timesheet/history` - Histórico por técnico
- [ ] GET `/api/prostoral/timesheet/stats` - Estatísticas de produtividade

#### 7.2 Frontend - Registro de Horas
- [ ] Botão de check-in/out rápido
- [ ] Timer visível durante trabalho
- [ ] Pausas e interrupções
- [ ] Comentários por sessão
- [ ] Dashboard de horas trabalhadas

#### 7.3 Relatórios de Produtividade
- [ ] Horas por técnico (dia/semana/mês)
- [ ] Produtividade individual (OS/hora)
- [ ] Eficiência por etapa
- [ ] Carga de trabalho e gargalos
- [ ] Custo de MOD por OS

**Tempo Estimado:** 4 dias  
**Dependências:** Fase 1, Fase 4

---

### 💰 **FASE 8: Cálculo de CMV** (Prioridade: ALTA)

**Objetivo:** Calcular automaticamente o custo real de cada OS.

**Tarefas:**

#### 8.1 Backend - Lógica de Cálculo
- [ ] Função: `calculateDirectMaterials(order_id)` - Soma de materiais usados
- [ ] Função: `calculateDirectLabor(order_id)` - Custo de horas trabalhadas
- [ ] Função: `calculateIndirectCosts(order_id)` - Rateio de custos indiretos
- [ ] Função: `calculateTotalCMV(order_id)` - CMV = Materiais + MOD + Indiretos
- [ ] Trigger: Cálculo automático ao finalizar OS

#### 8.2 Backend API
- [ ] GET `/api/prostoral/cmv/:order_id` - CMV de uma OS específica
- [ ] GET `/api/prostoral/cmv/summary` - CMV consolidado (período, cliente, tipo)
- [ ] POST `/api/prostoral/cmv/indirect-costs` - Configurar custos indiretos

#### 8.3 Frontend - Dashboard CMV
- [ ] Card: CMV por OS
- [ ] Card: Margem real e rentabilidade
- [ ] Card: Desvios (custo padrão vs real)
- [ ] Gráficos: CMV por tipo de trabalho
- [ ] Gráficos: Evolução de custos no tempo
- [ ] Tabela: OS mais/menos rentáveis

#### 8.4 Configurações
- [ ] Definir salário/hora por técnico
- [ ] Definir custos indiretos (aluguel, energia, etc.)
- [ ] Definir método de rateio (por hora, por OS, fixo)

**Tempo Estimado:** 5 dias  
**Dependências:** Fase 1, Fase 4, Fase 6, Fase 7

---

### 🔧 **FASE 9: Gestão de Consertos/Retrabalhos** (Prioridade: MÉDIA)

**Objetivo:** Controlar retrabalhos e custos extras.

**Tarefas:**

#### 9.1 Backend API
- [ ] POST `/api/prostoral/repairs` - Criar conserto
- [ ] GET `/api/prostoral/repairs` - Listar consertos
- [ ] GET `/api/prostoral/repairs/:id` - Detalhes do conserto
- [ ] PUT `/api/prostoral/repairs/:id` - Atualizar conserto
- [ ] GET `/api/prostoral/orders/:id/repairs` - Consertos de uma OS

#### 9.2 Frontend
- [ ] Formulário de registro de conserto
- [ ] Vinculação com OS original
- [ ] Definição: faturável ou garantia
- [ ] Motivo e descrição detalhada
- [ ] Registro de materiais e horas extras
- [ ] Integração automática com CMV

#### 9.3 Relatórios
- [ ] Taxa de retrabalho (%) por período
- [ ] Principais causas de retrabalho
- [ ] Custos de retrabalho por cliente
- [ ] Retrabalho por técnico

**Tempo Estimado:** 3 dias  
**Dependências:** Fase 1, Fase 4, Fase 8

---

### ⚠️ **FASE 10: Gestão de Intercorrências** (Prioridade: ALTA)

**Objetivo:** Sistema de comunicação e resolução de problemas.

**Tarefas:**

#### 10.1 Backend API
- [ ] POST `/api/prostoral/issues` - Criar intercorrência
- [ ] GET `/api/prostoral/issues` - Listar intercorrências
- [ ] GET `/api/prostoral/issues/:id` - Detalhes da intercorrência
- [ ] PUT `/api/prostoral/issues/:id/status` - Atualizar status
- [ ] POST `/api/prostoral/issues/:id/comments` - Adicionar comentário
- [ ] POST `/api/prostoral/issues/:id/convert-to-repair` - Converter em conserto
- [ ] GET `/api/prostoral/orders/:id/issues` - Intercorrências de uma OS

#### 10.2 Frontend - Criação de Intercorrência
- [ ] Formulário (tipo, descrição, urgência)
- [ ] Upload de fotos/documentos
- [ ] Vinculação com OS
- [ ] Notificação automática ao admin/gerente

#### 10.3 Frontend - Painel de Intercorrências (Admin)
- [ ] Lista com filtros (status, tipo, cliente, data)
- [ ] Status: Aberta → Em análise → Em conserto → Aguardando cliente → Resolvida → Encerrada
- [ ] Timeline de comunicações
- [ ] Botão: Converter em conserto
- [ ] Atribuição de responsável

#### 10.4 Notificações
- [ ] E-mail ao criar intercorrência
- [ ] E-mail ao mudar status
- [ ] Notificação in-app
- [ ] Resumo diário de intercorrências abertas

#### 10.5 Relatórios
- [ ] Intercorrências por tipo
- [ ] Intercorrências por cliente
- [ ] Tempo médio de resolução
- [ ] Taxa de reincidência

**Tempo Estimado:** 5 dias  
**Dependências:** Fase 1, Fase 4, Fase 9

---

### 💵 **FASE 11: Faturação e Financeiro** (Prioridade: MÉDIA)

**Objetivo:** Controlar receitas, pagamentos e custos.

**Tarefas:**

#### 11.1 Backend API
- [ ] POST `/api/prostoral/invoices` - Criar fatura
- [ ] GET `/api/prostoral/invoices` - Listar faturas
- [ ] GET `/api/prostoral/invoices/:id` - Detalhes da fatura
- [ ] PUT `/api/prostoral/invoices/:id` - Atualizar fatura
- [ ] POST `/api/prostoral/invoices/:id/send` - Enviar por e-mail
- [ ] POST `/api/prostoral/invoices/batch` - Faturar múltiplas OS

#### 11.2 Frontend
- [ ] Criação automática ao finalizar OS
- [ ] Agrupamento de OS por cliente
- [ ] Edição de valores e descontos
- [ ] Preview e impressão de fatura
- [ ] Registro de pagamentos
- [ ] Status: Pendente, Paga, Vencida

#### 11.3 Integrações (Opcional)
- [ ] Integração com e-Fatura (Portugal)
- [ ] Integração com Moloni
- [ ] Integração com Sage
- [ ] Export para Excel/PDF

#### 11.4 Relatórios Financeiros
- [ ] Faturamento mensal/anual
- [ ] Contas a receber
- [ ] Margem de contribuição
- [ ] Rentabilidade por cliente

**Tempo Estimado:** 4 dias  
**Dependências:** Fase 1, Fase 4, Fase 8

---

### 📊 **FASE 12: Dashboard e Relatórios** (Prioridade: MÉDIA)

**Objetivo:** KPIs e relatórios gerenciais.

**Tarefas:**

#### 12.1 Dashboard Principal
- [ ] Card: OS ativas (por status)
- [ ] Card: OS atrasadas
- [ ] Card: Faturamento do mês
- [ ] Card: CMV médio
- [ ] Card: Taxa de retrabalho
- [ ] Gráfico: Volume de produção (mensal)
- [ ] Gráfico: Produtividade por técnico
- [ ] Gráfico: Margem por cliente
- [ ] Lista: OS urgentes/prioritárias

#### 12.2 Relatórios Operacionais
- [ ] Volume de OS em produção
- [ ] Tempo médio de execução
- [ ] Taxa de entrega no prazo
- [ ] Produtividade por técnico (OS/hora)
- [ ] Utilização de materiais
- [ ] Gargalos de produção

#### 12.3 Relatórios Financeiros
- [ ] CMV médio por tipo de trabalho
- [ ] Margem média por cliente
- [ ] Rentabilidade por período
- [ ] Custos de retrabalho
- [ ] Contas a receber

#### 12.4 Relatórios de Qualidade
- [ ] Taxa de retrabalho (%)
- [ ] Intercorrências por tipo
- [ ] Tempo médio de resolução
- [ ] Satisfação do cliente (se houver pesquisa)

#### 12.5 Exportação
- [ ] Export para Excel
- [ ] Export para PDF
- [ ] Agendamento de relatórios por e-mail

**Tempo Estimado:** 5 dias  
**Dependências:** Todas as fases anteriores

---

## 📅 Cronograma Estimado

| Fase | Descrição | Duração | Início | Fim |
|------|-----------|---------|--------|-----|
| 1 | Base de Dados | 4 dias | Dia 1 | Dia 4 |
| 2 | Permissões | 2 dias | Dia 5 | Dia 6 |
| 3 | Gestão de Clientes | 4 dias | Dia 7 | Dia 10 |
| 4 | Sistema de OS | 10 dias | Dia 11 | Dia 20 |
| 5 | Kits de Procedimentos | 3 dias | Dia 21 | Dia 23 |
| 6 | Integração Estoque | 4 dias | Dia 24 | Dia 27 |
| 7 | Controle de Produção | 4 dias | Dia 28 | Dia 31 |
| 8 | Cálculo de CMV | 5 dias | Dia 32 | Dia 36 |
| 9 | Consertos | 3 dias | Dia 37 | Dia 39 |
| 10 | Intercorrências | 5 dias | Dia 40 | Dia 44 |
| 11 | Faturação | 4 dias | Dia 45 | Dia 48 |
| 12 | Dashboard | 5 dias | Dia 49 | Dia 53 |

**Total: ~53 dias úteis (~10-11 semanas)**

---

## 🎯 Marcos (Milestones)

1. **Semana 1:** Base de dados e permissões ✅
2. **Semana 2:** Gestão de clientes completa ✅
3. **Semana 4:** Sistema de OS funcional (MVP) ✅
4. **Semana 6:** Estoque integrado e controle de produção ✅
5. **Semana 8:** CMV automatizado ✅
6. **Semana 10:** Consertos e intercorrências ✅
7. **Semana 11:** Sistema completo com relatórios ✅

---

## 🔧 Stack Tecnológico

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- Multer (upload de arquivos)
- QRCode (geração de QR Codes)
- JWT (autenticação)

**Frontend:**
- HTML5 + JavaScript (Vanilla)
- Tailwind CSS
- Font Awesome (ícones)
- Chart.js (gráficos)
- QR Scanner (leitura de QR Codes)

**Infraestrutura:**
- Vercel (hospedagem)
- Supabase Storage (arquivos)
- GitHub (versionamento)

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Complexidade do cálculo de CMV | Alto | Média | Validação com contador/gestor |
| Performance com muitas OS | Médio | Média | Paginação, índices SQL, cache |
| Upload de arquivos grandes | Médio | Alta | Limit de 10MB, compressão |
| Integração com e-Fatura | Alto | Baixa | API bem documentada |
| Adoção pelos técnicos | Alto | Média | Treinamento e UX intuitivo |

---

## 📌 Notas Importantes

1. **MVP (Minimum Viable Product):** Fases 1-4 são críticas para ter um sistema funcional
2. **Testes:** Cada fase deve ser testada antes de avançar
3. **Feedback:** Validar com usuários reais após Fase 4
4. **Documentação:** Criar manual do usuário e API docs
5. **Backup:** Sistema de backup automático dos dados
6. **Mobile First:** Interface responsiva para uso em tablets/celulares no laboratório

---

## ✅ Critérios de Sucesso

- [ ] 100% das OS rastreadas do início ao fim
- [ ] CMV calculado automaticamente com erro < 5%
- [ ] Tempo de criação de OS < 2 minutos
- [ ] 90% das intercorrências resolvidas em < 48h
- [ ] Zero perda de dados (backup diário)
- [ ] Interface intuitiva (< 1h de treinamento)
- [ ] Tempo de resposta < 2s para todas as operações

---

**Próximo passo:** Iniciar Fase 1 - Estrutura de Base de Dados

