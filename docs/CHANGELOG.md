# Changelog - Kanban App

Histórico de alterações e solicitações do projeto.

---

## [2026-02-20] - Sessão de Desenvolvimento

### Funcionalidades Adicionadas

#### Campo "Presente" (Gift) no CRM
**Solicitação:** "pode criar um campo de checkbox chamado presente com icone de um gift, é para saber se eu entreguei um brinde nosso"

**Implementação:**
- Adicionado campo `presente` (INTEGER) na tabela `contacts`
- Migration automática para bancos existentes
- Checkbox "Presente / Brinde" no modal de edição do contato
- Ícone de presente (rosa) na coluna Status da lista de contatos
- Seção "Presentes Entregues" no painel de Relatórios (clicável)

**Arquivos modificados:**
- `backend/src/database/userDb.js` - migration
- `backend/src/routes/contacts.js` - CRUD
- `frontend/src/types/index.ts` - tipo Contact
- `frontend/src/components/Contacts/ContactDetailModal.tsx` - formulário
- `frontend/src/components/Contacts/ContactsPanel.tsx` - lista
- `frontend/src/components/Contacts/ReportsPanel.tsx` - relatórios

---

#### Simplificação da Interface CRM
**Solicitação:** "O botao Filtros deixa só o icone... Insights altera para AI... Analytics botao pode remover... briefing altera o nome para Agenda"

**Implementação:**
- Botão "Filtros" → apenas ícone (sem texto)
- "Insights" → "AI" com ícone Sparkles
- Botão "Analytics" removido
- "Briefing" → "Agenda"

**Arquivos modificados:**
- `frontend/src/components/Contacts/ContactsPanel.tsx`
- `frontend/src/components/Contacts/WeeklyDigestPanel.tsx`

---

### Bugs Corrigidos

#### Modal Click Bubbling (BUG CRÍTICO)
**Problema reportado:** "ao clicar fora no modal, retornar para a tela anterior que estava? exemplo cliquei em Agenda e dps cliquei fora do modal e voltou la pro kanban ao inves do CRM"

**Análise QA:**
- **Causa raiz:** Os modais internos (Agenda, Relatórios, etc.) estavam renderizados dentro do overlay do CRM. Quando o usuário clicava no fundo escuro de um modal interno, o evento de clique "subia" (event bubbling) até o overlay do CRM e fechava ambos.
- **Comportamento incorreto:** Clicar fora de modal interno → fecha tudo
- **Comportamento esperado:** Clicar fora de modal interno → fecha só o interno

**Correção:**
Adicionado `e.stopPropagation()` no onClick do overlay de todos os modais:
```tsx
// Antes
<div className="overlay" onClick={onClose}>

// Depois
<div className="overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
```

**Arquivos corrigidos:**
- `frontend/src/components/Contacts/WeeklyDigestPanel.tsx`
- `frontend/src/components/Contacts/ReportsPanel.tsx`
- `frontend/src/components/Contacts/FollowupsPanel.tsx`
- `frontend/src/components/Contacts/InsightsPanel.tsx`
- `frontend/src/components/Contacts/AnalyticsDashboard.tsx`
- `frontend/src/components/ConfirmDialog/ConfirmDialog.tsx`

---

## [2026-02-20] - Sessão Anterior (Resumo)

### Funcionalidades Adicionadas

#### Integração Google Calendar (Agenda)
**Solicitação:** "no digest tem algo que consigo enviar para o calendario google calendar?"

**Evolução:**
1. Primeira tentativa: Múltiplas abas (bloqueado por popup blocker)
2. Segunda tentativa: Download de arquivo .ics (usuário achou complicado)
3. Solução final: Modal com lista de links clicáveis para cada follow-up

**Implementação final:**
- Botão de calendário no painel Agenda
- Modal com lista de follow-ups como links
- Cada link abre Google Calendar com evento pré-preenchido

---

#### Preview de Imagens no Histórico CRM
**Solicitação:** "a imagem abre em uma nova guia, tem como ser um modal de preview?"

**Implementação:**
- Modal overlay com imagem em tamanho grande
- Botão de fechar (X)
- Link para abrir em nova aba
- Click fora fecha o modal

---

#### Autenticação de Imagens via Query Parameter
**Problema:** Imagens JPG apareciam quebradas após upload

**Análise:**
- Tags `<img>` não enviam headers de Authorization
- Endpoint `/api/contacts/images/:filename` requer autenticação

**Solução:**
- Backend aceita token via query parameter
- Frontend inclui token na URL da imagem

---

#### Filtro por Segmento no CRM
**Solicitação:** "No CRM ao clicar ja podia organizar conforme algum filtro, exemplo pode estar misturados os segmentos, clicando ali em segmento ja organizaria"

**Implementação:**
- Click no badge de segmento filtra contatos
- Toggle: clica de novo para remover filtro
- Visual feedback no badge ativo

---

#### Indicador de Último Contato
**Implementação:**
- Coluna "Último Contato" com dias desde última nota
- Cores por urgência:
  - Verde: ≤7 dias
  - Amarelo: ≤14 dias
  - Laranja: ≤30 dias
  - Vermelho: >30 dias

---

#### Botão de Refresh
**Solicitação:** "se eu apagar algum comentario ou imagem, tem como colocar algum botao de refresh só para recalcular esses dados?"

**Implementação:**
- Botão RefreshCw próximo aos botões de import/export
- Recarrega lista de contatos e follow-ups pendentes

---

## Arquitetura do Projeto

### Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Deploy:** Fly.io
- **Autenticação:** JWT

### Estrutura de Pastas
```
kanban-app/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Contacts/     # CRM
│       │   ├── Board/        # Kanban
│       │   └── shared/       # Componentes reutilizáveis
│       ├── services/         # API calls
│       └── types/            # TypeScript types
├── backend/
│   └── src/
│       ├── routes/           # Endpoints
│       ├── database/         # SQLite config
│       └── middleware/       # Auth, etc
└── docs/                     # Documentação
```

### Padrões de Modal
Todos os modais seguem este padrão para evitar bugs de click bubbling:
```tsx
<div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
  <div className="modal-content" onClick={e => e.stopPropagation()}>
    {/* conteúdo */}
  </div>
</div>
```
