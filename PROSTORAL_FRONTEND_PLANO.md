# 🎨 Plano de Ação - Frontend Laboratório ProStoral

**Data de Criação:** 20 de Outubro de 2025  
**Status:** 📋 Planejamento  
**Objetivo:** Completar todas as interfaces frontend do módulo ProStoral

---

## 📊 Status Atual do Frontend

### ✅ O que já está pronto (Fase 1-6):
- [x] **Dashboard Principal** - Estrutura básica (view vazia)
- [x] **Gestão de Clientes** - Interface completa
  - [x] Tabela de listagem
  - [x] Filtros e busca
  - [x] Modal de criação/edição
  - [x] Cards informativos
- [x] **Ordens de Serviço** - Interface completa
  - [x] Tabela de listagem
  - [x] Filtros por status, cliente, tipo
  - [x] Modal de criação
  - [x] Formulário completo
- [x] **Kits de Procedimentos** - Interface completa
  - [x] Grid de cards
  - [x] Filtros por tipo
  - [x] Modal de criação
  - [x] Lista dinâmica de materiais
- [x] **Estoque** - Interface completa
  - [x] Tabela de listagem
  - [x] Filtros avançados
  - [x] Modal de criação
  - [x] Placeholders para QR Code

### ❌ O que falta implementar (Fase 7-12):

#### 1. Dashboard com KPIs (Fase 12)
**Prioridade:** 🔴 ALTA  
**Complexidade:** ⚠️ Média  
**Tempo Estimado:** 4-6 horas

**Componentes necessários:**
- [ ] Widget de KPIs principais (cards)
  - [ ] Total de OS por status
  - [ ] Faturamento (total, pago, pendente)
  - [ ] Estoque baixo
  - [ ] Intercorrências abertas
- [ ] Gráfico de OS por status (Chart.js ou similar)
- [ ] Tabela de OS recentes
- [ ] Alertas e notificações
- [ ] Filtros de período

**Bibliotecas sugeridas:**
- Chart.js para gráficos
- Moment.js para datas

---

#### 2. Controle de Produção (Fase 7)
**Prioridade:** 🟡 MÉDIA  
**Complexidade:** ✅ Baixa  
**Tempo Estimado:** 2-3 horas

**Componentes necessários:**
- [ ] Widget de check-in/check-out
  - [ ] Botão de iniciar trabalho em OS
  - [ ] Timer de tempo ativo
  - [ ] Botão de finalizar trabalho
- [ ] Lista de trabalhos ativos
- [ ] Histórico de registros de tempo
- [ ] Relatório de horas por técnico

**Interface:**
- Widget flutuante ou seção no dashboard
- Formulário simples para check-in
- Cronômetro visual

---

#### 3. Visualização de CMV (Fase 8)
**Prioridade:** 🟡 MÉDIA  
**Complexidade:** ⚠️ Média  
**Tempo Estimado:** 2-3 horas

**Componentes necessários:**
- [ ] Card de custos na visualização de OS
  - [ ] Custo de materiais diretos
  - [ ] Custo de mão de obra
  - [ ] Custos indiretos
  - [ ] Total do CMV
- [ ] Botão para recalcular CMV
- [ ] Histórico de cálculos
- [ ] Breakdown visual (gráfico pizza)

**Interface:**
- Tab ou seção na visualização de OS
- Cards coloridos por tipo de custo
- Gráfico de composição de custos

---

#### 4. Gestão de Consertos (Fase 9)
**Prioridade:** 🟢 BAIXA  
**Complexidade:** ⚠️ Média  
**Tempo Estimado:** 3-4 horas

**Componentes necessários:**
- [ ] Nova aba "Consertos"
- [ ] Tabela de consertos
  - [ ] Filtros por status
  - [ ] Vinculação com OS original
- [ ] Modal de criação de conserto
  - [ ] Seleção de OS original
  - [ ] Motivo do conserto
  - [ ] Causa raiz
  - [ ] Notas
- [ ] Badge de "Tem Conserto" nas OS
- [ ] Histórico de consertos por OS

**Interface:**
- Tab adicional no menu
- Modal similar ao de OS
- Indicadores visuais de retrabalho

---

#### 5. Gestão de Intercorrências (Fase 10)
**Prioridade:** 🟢 BAIXA  
**Complexidade:** ⚠️ Média  
**Tempo Estimado:** 3-4 horas

**Componentes necessários:**
- [ ] Nova aba "Intercorrências"
- [ ] Tabela de intercorrências
  - [ ] Filtros por status e severidade
  - [ ] Cores por severidade
- [ ] Modal de criação de intercorrência
  - [ ] Seleção de OS
  - [ ] Descrição do problema
  - [ ] Severidade
  - [ ] Anexos (opcional)
- [ ] Sistema de notificações
- [ ] Chat/comentários por intercorrência

**Interface:**
- Tab adicional no menu
- Badges de severidade coloridos
- Sistema de workflow visual

---

#### 6. Faturação (Fase 11)
**Prioridade:** 🔴 ALTA  
**Complexidade:** ⚠️ Média  
**Tempo Estimado:** 4-5 horas

**Componentes necessários:**
- [ ] Nova aba "Faturas"
- [ ] Tabela de faturas
  - [ ] Filtros por status, cliente, período
  - [ ] Status coloridos
- [ ] Modal de criação de fatura
  - [ ] Seleção de cliente
  - [ ] Seleção de OS para faturar
  - [ ] Adição manual de itens
  - [ ] Cálculo automático de totais
  - [ ] Descontos e impostos
- [ ] Visualização de fatura
  - [ ] Preview de impressão
  - [ ] Botão de gerar PDF
  - [ ] Botão de enviar por email
- [ ] Mudança de status de fatura
  - [ ] Marcar como enviada
  - [ ] Marcar como paga
  - [ ] Marcar como vencida

**Interface:**
- Tab adicional no menu
- Modal complexo com calculadora
- Preview de fatura estilo "invoice"

---

#### 7. Relatórios Gerenciais (Fase 12)
**Prioridade:** 🔴 ALTA  
**Complexidade:** 🔴 Alta  
**Tempo Estimado:** 5-6 horas

**Componentes necessários:**
- [ ] Nova aba "Relatórios"
- [ ] Seletor de tipo de relatório
  - [ ] Produção
  - [ ] Financeiro
  - [ ] Estoque
  - [ ] CMV
- [ ] Filtros avançados
  - [ ] Período (data de/até)
  - [ ] Cliente
  - [ ] Técnico
  - [ ] Categoria
- [ ] Visualizações
  - [ ] Tabelas com dados
  - [ ] Gráficos (barras, linha, pizza)
  - [ ] Cards de resumo
- [ ] Botões de ação
  - [ ] Exportar para Excel
  - [ ] Exportar para PDF
  - [ ] Imprimir

**Bibliotecas sugeridas:**
- Chart.js para gráficos
- SheetJS (xlsx) para exportação Excel
- jsPDF para exportação PDF

---

## 🎯 Plano de Implementação

### Fase 1: Funcionalidades Críticas (Semana 1)
**Prioridade:** 🔴 ALTA

1. **Dashboard com KPIs** (2 dias)
   - Dia 1: Estrutura e widgets de KPIs
   - Dia 2: Gráficos e integração com API

2. **Faturação** (2 dias)
   - Dia 1: Tabela e modal de criação
   - Dia 2: Preview e mudança de status

3. **Relatórios Básicos** (1 dia)
   - Estrutura base e relatório financeiro

---

### Fase 2: Funcionalidades Complementares (Semana 2)
**Prioridade:** 🟡 MÉDIA

4. **Controle de Produção** (1 dia)
   - Widget de check-in/check-out
   - Lista de trabalhos ativos

5. **Visualização de CMV** (1 dia)
   - Card de custos nas OS
   - Breakdown visual

6. **Relatórios Avançados** (1 dia)
   - Relatórios de produção e CMV
   - Exportações

---

### Fase 3: Funcionalidades Opcionais (Semana 3)
**Prioridade:** 🟢 BAIXA

7. **Gestão de Consertos** (1.5 dias)
   - Tab e modal de consertos
   - Integração com OS

8. **Gestão de Intercorrências** (1.5 dias)
   - Tab e modal de intercorrências
   - Sistema de workflow

---

## 🛠️ Melhorias de UX/UI

### Design System
- [ ] Padronizar cores e espaçamentos
- [ ] Criar componentes reutilizáveis
- [ ] Adicionar animações suaves
- [ ] Melhorar feedback visual

### Responsividade
- [ ] Testar em mobile (< 768px)
- [ ] Testar em tablet (768px - 1024px)
- [ ] Ajustar tabelas para mobile
- [ ] Criar versão mobile de modais

### Acessibilidade
- [ ] Adicionar labels ARIA
- [ ] Garantir navegação por teclado
- [ ] Melhorar contraste de cores
- [ ] Adicionar estados de foco visíveis

### Performance
- [ ] Implementar paginação real
- [ ] Lazy loading de imagens
- [ ] Debounce em buscas
- [ ] Cache de dados

---

## 📚 Bibliotecas Recomendadas

### Gráficos e Visualização
- **Chart.js** - Gráficos simples e bonitos
- **ApexCharts** - Gráficos mais avançados
- **D3.js** - Visualizações customizadas

### Tabelas
- **DataTables** - Tabelas com recursos avançados
- **AG Grid** - Tabelas enterprise

### Formulários
- **Cleave.js** - Máscaras de input
- **Flatpickr** - Date picker moderno

### QR Code
- **QRCode.js** - Geração de QR codes
- **Html5-QRCode** - Scanner de QR codes

### PDF
- **jsPDF** - Geração de PDFs
- **pdfmake** - PDFs mais complexos

### Excel
- **SheetJS (xlsx)** - Exportação Excel

### Notificações
- **Toastify** - Toasts bonitos
- **SweetAlert2** - Modais de confirmação

---

## 🧪 Checklist de Teste

### Testes Funcionais
- [ ] Todos os botões funcionam
- [ ] Todos os formulários validam
- [ ] Todas as APIs respondem
- [ ] Filtros funcionam corretamente
- [ ] Modais abrem e fecham
- [ ] Dados são salvos corretamente

### Testes de Integração
- [ ] Fluxo completo de OS (criar → produzir → faturar)
- [ ] Fluxo de conserto (OS → conserto → resolução)
- [ ] Fluxo de intercorrência (reportar → resolver)
- [ ] Fluxo de faturação (criar → enviar → pagar)

### Testes de UX
- [ ] Interface intuitiva
- [ ] Feedback visual adequado
- [ ] Tempos de resposta aceitáveis
- [ ] Navegação fluida
- [ ] Mensagens de erro claras

### Testes de Responsividade
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 📈 Métricas de Sucesso

### Performance
- Carregamento inicial < 2s
- Resposta de API < 500ms
- Transições suaves (60fps)

### Usabilidade
- 90%+ dos usuários completam tarefas sem ajuda
- Tempo médio por tarefa < 2 minutos
- Taxa de erro < 5%

### Adoção
- 80%+ dos usuários ativos semanalmente
- 90%+ de satisfação do usuário
- < 3 tickets de suporte por semana

---

## 🎊 Conclusão

### Resumo do Plano
- **Total de Telas:** 7 novas + melhorias nas 4 existentes
- **Tempo Total Estimado:** 3-4 semanas
- **Prioridades:** Dashboard, Faturação e Relatórios
- **Tecnologias:** Chart.js, jsPDF, SheetJS, QRCode.js

### Próximo Passo
🚀 **Iniciar com o Dashboard** - A funcionalidade mais visível e importante para os usuários.

**Status:** Pronto para desenvolvimento! 🎯

