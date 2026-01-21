# Kanban App + CRM - Documentação Completa

## Visão Geral

Sistema de gerenciamento de tarefas estilo Kanban com Mini CRM integrado. Desenvolvido com React + TypeScript no frontend e Node.js + SQLite no backend.

**Repositório:** https://github.com/cadumega/kanban-app

---

## Tecnologias Utilizadas

### Frontend
- **React 18** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool rápido
- **@dnd-kit** - Drag and drop moderno
- **Lucide React** - Ícones minimalistas
- **Axios** - Cliente HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **better-sqlite3** - Banco SQLite síncrono
- **UUID** - Geração de IDs únicos
- **CORS** - Cross-origin requests

---

## Estrutura de Pastas

```
kanban-app/
├── frontend/                    # Aplicação React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board/           # Container principal do Kanban
│   │   │   ├── Column/          # Coluna do board
│   │   │   ├── TaskCard/        # Card de tarefa
│   │   │   ├── TaskModal/       # Modal de edição de tarefa
│   │   │   ├── Sidebar/         # Barra lateral com filtros
│   │   │   ├── Contacts/        # Mini CRM (contatos)
│   │   │   └── Roadmap/         # Business Roadmap (timeline)
│   │   ├── hooks/
│   │   │   └── useBoard.ts      # Hook principal de estado
│   │   ├── services/
│   │   │   └── api.ts           # Serviço de API
│   │   ├── styles/
│   │   │   └── global.css       # Estilos globais + Dark Mode
│   │   ├── types/
│   │   │   └── index.ts         # Tipos TypeScript
│   │   ├── App.tsx              # Componente principal
│   │   └── main.tsx             # Entry point
│   └── package.json
│
├── backend/                     # API Node.js
│   ├── src/
│   │   ├── database/
│   │   │   └── init.js          # Inicialização SQLite
│   │   ├── routes/
│   │   │   ├── columns.js       # CRUD de colunas
│   │   │   ├── tasks.js         # CRUD de tarefas
│   │   │   ├── categories.js    # CRUD de categorias
│   │   │   ├── contacts.js      # CRUD de contatos (CRM)
│   │   │   └── projects.js      # Roadmap e projetos
│   │   └── index.js             # Server Express
│   ├── kanban.db                # Banco de dados SQLite
│   └── package.json
│
├── iniciar.sh                   # Script para iniciar o app
├── backup.sh                    # Script de backup
├── README.md                    # Guia rápido
├── PROJETO-DOCUMENTACAO.md      # Este arquivo
├── BACKEND-EXPLICADO.md         # Explicação didática
└── DEPLOY-EXPLICADO.md          # Como publicar online
```

---

## Modelo de Dados (SQLite)

### Tabela: columns
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| title | TEXT | Nome da coluna |
| position | INTEGER | Ordem no board |
| color | TEXT | Cor da coluna (hex) |
| created_at | DATETIME | Data de criação |

### Tabela: tasks
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| title | TEXT | Título da tarefa |
| description | TEXT | Descrição detalhada |
| column_id | TEXT | FK para coluna |
| position | INTEGER | Ordem na coluna |
| priority | TEXT | alta/media/baixa |
| category_id | TEXT | FK para categoria |
| month | TEXT | Mês opcional (2024-01) |
| assignee | TEXT | Responsável pela tarefa |
| dependent | TEXT | Quem depende desta tarefa |
| value | REAL | Valor em R$/mês |
| points | INTEGER | Pontos de complexidade (1,3,5,7) |
| start_date | TEXT | Data de início para cálculo de deadline |
| **project** | TEXT | Nome do projeto associado |
| blocked | INTEGER | Se está bloqueada (0/1) |
| blocked_by | TEXT | Nome de quem bloqueia |
| blocked_reason | TEXT | Motivo do bloqueio |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Última atualização |

### Tabela: task_checklist (Subtarefas)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| task_id | TEXT | FK para tarefa |
| text | TEXT | Texto da subtarefa |
| completed | INTEGER | Se está concluída (0/1) |
| position | INTEGER | Ordem na lista |
| created_at | DATETIME | Data de criação |

### Tabela: categories
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| name | TEXT | Nome da categoria |
| color | TEXT | Cor (hex) |

### Tabela: contacts (CRM)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| name | TEXT | Nome do contato |
| email | TEXT | Email |
| phone | TEXT | Telefone |
| company | TEXT | Empresa |
| role | TEXT | Cargo/Função |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Última atualização |

### Tabela: contact_notes (Histórico CRM)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| contact_id | TEXT | FK para contato |
| content | TEXT | Conteúdo da nota |
| created_at | DATETIME | Data de criação |

### Tabela: projects (Roadmap)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| name | TEXT | Nome do projeto (único) |
| description | TEXT | Descrição do projeto |
| color | TEXT | Cor (hex) |
| status | TEXT | planning/active/paused/completed |
| start_date | TEXT | Data de início |
| end_date | TEXT | Data de término prevista |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Última atualização |

---

## API Endpoints

### Colunas
```
GET    /api/columns          # Listar todas (com tarefas)
POST   /api/columns          # Criar coluna
PUT    /api/columns/:id      # Editar coluna
DELETE /api/columns/:id      # Excluir coluna
```

### Tarefas
```
GET    /api/tasks            # Listar todas
POST   /api/tasks            # Criar tarefa
PUT    /api/tasks/:id        # Editar tarefa
DELETE /api/tasks/:id        # Excluir tarefa
PUT    /api/tasks/:id/move   # Mover entre colunas
PUT    /api/tasks/:id/block  # Bloquear/desbloquear
GET    /api/tasks/export/json # Exportar JSON
GET    /api/tasks/export/csv  # Exportar CSV
GET    /api/tasks/report      # Relatório/resumo
```

### Checklist (Subtarefas)
```
GET    /api/tasks/:id/checklist           # Listar itens
POST   /api/tasks/:id/checklist           # Adicionar item
PUT    /api/tasks/:taskId/checklist/:itemId  # Atualizar item
DELETE /api/tasks/:taskId/checklist/:itemId  # Excluir item
```

### Categorias
```
GET    /api/categories       # Listar todas
POST   /api/categories       # Criar categoria
DELETE /api/categories/:id   # Excluir categoria
```

### Contatos (CRM)
```
GET    /api/contacts         # Listar todos
GET    /api/contacts/:id     # Detalhes + notas
POST   /api/contacts         # Criar contato
PUT    /api/contacts/:id     # Editar contato
DELETE /api/contacts/:id     # Excluir contato
POST   /api/contacts/:id/notes     # Adicionar nota
DELETE /api/contacts/:id/notes/:noteId  # Excluir nota
```

### Projetos (Roadmap)
```
GET    /api/projects              # Listar todos (com contagem de tarefas)
GET    /api/projects/:id          # Detalhes + tarefas do projeto
GET    /api/projects/roadmap/timeline  # Dados para timeline (tarefas agrupadas)
POST   /api/projects              # Criar projeto
PUT    /api/projects/:id          # Editar projeto
DELETE /api/projects/:id          # Excluir projeto
```

---

## Funcionalidades

### Kanban Board
- Drag and drop de tarefas entre colunas
- Reordenação de tarefas dentro da coluna
- Criação/edição/exclusão de colunas
- Cores personalizadas por coluna
- Contadores de valor (R$) e pontos por coluna
- **Coluna Suporte**: Coluna especial com divisores visuais a cada 3 tarefas
- **Divisores por mês**: Na coluna "Concluído", tarefas são agrupadas por mês

### Tarefas
- CRUD completo
- Priorização (Alta, Média, Baixa) com cores
- Categorização com tags coloridas
- **Campo de Projeto**: Associe tarefas a projetos (badge roxo destacado)
- **Subtarefas/Checklist**: Adicione itens de checklist com progresso visual
- Campo de valor monetário (R$/mês)
- Pontos de complexidade (1, 3, 5, 7)
- **Deadline automático**: Data de início + pontos = deadline (pontos = dias)
- Indicador visual de prazo no card (verde/amarelo/vermelho)
- Responsável e Dependente
- Mês opcional para planejamento
- Status de bloqueio com motivo
- Descrição visível apenas no modal (cards compactos)

### Filtros (Sidebar)
- Por prioridade
- Por categoria
- **Por projeto**
- Por mês
- Por pessoa (responsável/dependente)
- Tarefas bloqueadas
- Botão "Limpar todos os filtros"
- Contadores em tempo real

### Interface
- Design minimalista (estilo Notion/Linear)
- Dark Mode
- Toggle para ocultar sidebar
- Área de drag expandida no card
- Modal de edição ampliado (1100px) com layout em grid

### Exportação
- JSON completo
- CSV para Excel/Sheets

### Mini CRM
- Cadastro de contatos (nome, email, telefone, empresa, cargo)
- Telefone formatado automaticamente (XX) XXXXX-XXXX
- Histórico de notas por contato (timeline)
- Contador de notas na lista

### Business Roadmap
- **Timeline visual** de projetos com navegação por período
- Tarefas agrupadas por projeto (expansível/recolhível)
- **Divisão de 10 dias**: Cada mês dividido em 3 blocos (1-10, 11-20, 21+)
- Barras de duração calculadas automaticamente:
  - **Início**: Campo `start_date` da tarefa
  - **Fim**: Se concluída, usa `updated_at`; senão usa `start_date + points` (dias)
- **Indicadores visuais**:
  - Barra verde = tarefa concluída
  - Barra colorida = em andamento
  - Traço fino = duração ≤10 dias
- Linha vermelha indicando "Hoje"
- 6 meses visíveis com navegação anterior/próximo
- Projetos derivados automaticamente do campo `project` das tarefas

---

## Scripts de Automação

### iniciar.sh
Inicia todo o sistema com um comando:
- Inicia backend na porta 3001
- Inicia frontend na porta 5173
- Abre o navegador

```bash
./iniciar.sh
```

### backup.sh
Faz backup do banco de dados:
- Salva em `~/kanban-backups/`
- Nome com data/hora
- Mantém últimos 10 backups

```bash
./backup.sh
```

---

## Como Executar

### Forma Fácil (1 comando)
```bash
cd /Users/carlosmega/kanban-app
./iniciar.sh
```

### Forma Manual (2 terminais)

**Terminal 1 - Backend:**
```bash
cd /Users/carlosmega/kanban-app/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd /Users/carlosmega/kanban-app/frontend
npm run dev
```

**Acessar:** http://localhost:5173

---

## Onde ficam os dados

| O que | Caminho |
|-------|---------|
| Banco de dados | `backend/kanban.db` |
| Backups | `~/kanban-backups/` |

---

## Design System

### Cores (Light Mode)
```css
--bg-primary: #FAFAFA      /* Fundo principal */
--bg-secondary: #FFFFFF    /* Cards */
--bg-column: #F4F4F5       /* Colunas */
--text-primary: #18181B    /* Texto principal */
--accent: #6366F1          /* Cor destaque (indigo) */
--danger: #EF4444          /* Alertas/bloqueios */
--success: #22C55E         /* Sucesso/valores */
```

### Cores (Dark Mode)
```css
--bg-primary: #09090B
--bg-secondary: #18181B
--bg-column: #27272A
--text-primary: #FAFAFA
```

### Prioridades
```css
--priority-high: #FEE2E2   /* Vermelho claro */
--priority-medium: #FEF3C7 /* Amarelo claro */
--priority-low: #DCFCE7    /* Verde claro */
```

---

## Componentes Principais

### Board.tsx
Container principal que renderiza as colunas e gerencia o drag and drop com @dnd-kit.

### Column.tsx
Coluna do Kanban com header editável, contador de tarefas, total de valor e pontos.

### TaskCard.tsx
Card de tarefa com área de drag expandida, badges de prioridade/categoria, valor, pontos e indicador de deadline com cores (verde = ok, amarelo = próximo, vermelho = atrasado).

### TaskModal.tsx
Modal para criar/editar tarefas com todos os campos, incluindo seletor de pontos (1,3,5,7) e campo de data de início para cálculo automático de deadline.

### Sidebar.tsx
Barra lateral com filtros, estatísticas, dark mode toggle e botões de exportação.

### ContactsPanel.tsx
Painel de CRM com lista de contatos, formulário de edição e histórico de notas.

### RoadmapPanel.tsx
Painel de Business Roadmap com:
- Timeline horizontal com meses divididos em blocos de 10 dias
- Projetos como grupos expansíveis
- Tarefas como barras de duração
- Navegação temporal (anterior/próximo)
- Indicador "Hoje" como linha vermelha
- Legenda de status

---

## Hook useBoard

Gerencia todo o estado da aplicação Kanban:

```tsx
const {
  columns,           // Lista de colunas com tarefas
  categories,        // Lista de categorias
  filters,           // Filtros ativos
  setFilters,        // Atualizar filtros
  getFilteredColumns,// Colunas filtradas
  getStats,          // Estatísticas (total, valor, pontos)
  addTask,           // Criar tarefa
  updateTask,        // Atualizar tarefa
  moveTask,          // Mover tarefa
  // ... outros métodos
} = useBoard();
```

---

## Fluxo de Dados

```
[Usuário]
    ↓ Ação (criar tarefa, mover, filtrar)
[App.tsx]
    ↓ Chama função do hook
[useBoard.ts]
    ↓ Atualiza estado local (otimista)
    ↓ Chama API
[api.ts]
    ↓ Request HTTP
[Backend Express]
    ↓ Processa request
[SQLite]
    ↓ Persiste dados
    ↑ Retorna resultado
[Frontend]
    ↑ Atualiza UI
```

---

*Documentação atualizada em Janeiro/2026*
