---
marp: true
paginate: true
size: 16:9
header: Kanban App
footer: Documentação • Jan/2026
---

# Kanban App

Sistema de gerenciamento de tarefas estilo **Kanban**

- Frontend: **React 18 + TypeScript + Vite**
- Backend: **Node.js + Express + SQLite**

---

## Agenda

- Visão geral e objetivos
- Stack e estrutura de pastas
- Modelo de dados
- API (endpoints)
- Frontend: componentes e estado (`useBoard`)
- Fluxo de dados (end-to-end)
- Design system (light/dark)
- Como rodar local
- Próximos passos

---

## Visão geral

- Board com **colunas** e **tarefas**
- **Drag and drop** entre colunas e reordenação
- **Filtros** via sidebar + contadores
- **Exportação** (JSON/CSV) e **relatórios** agregados

---

## Tecnologias (Frontend)

- **React 18**: UI
- **TypeScript**: tipagem
- **Vite**: dev server e build
- **@dnd-kit**: drag and drop
- **Lucide React**: ícones
- **Axios**: HTTP

---

## Tecnologias (Backend)

- **Node.js + Express**: API HTTP
- **better-sqlite3**: SQLite síncrono
- **UUID**: IDs únicos
- **CORS**: acesso do frontend

---

## Estrutura de pastas (alto nível)

```text
kanban-app/
├── frontend/      # React + TS
├── backend/       # Express + SQLite
├── README.md
├── PROJETO-DOCUMENTACAO.md
└── BACKEND-EXPLICADO.md
```

---

## Estrutura (Frontend)

```text
frontend/src/
├── components/
│   ├── Board/      # container do Kanban
│   ├── Column/     # coluna
│   ├── TaskCard/   # card
│   ├── TaskModal/  # criar/editar
│   └── Sidebar/    # filtros
├── hooks/useBoard.ts
├── services/api.ts
├── styles/global.css
└── types/index.ts
```

---

## Estrutura (Backend)

```text
backend/src/
├── index.js               # servidor Express
├── database/init.js       # cria/abre SQLite e tabelas
└── routes/
    ├── columns.js         # CRUD colunas
    ├── tasks.js           # CRUD tarefas + move/block/export/report
    └── categories.js      # CRUD categorias
```

---

## Modelo de dados — `columns`

- **id** (UUID)
- **title**
- **position** (ordem no board)
- **color** (hex)
- **created_at**

---

## Modelo de dados — `tasks` (principais campos)

- **id** (UUID), **title**, **description**
- **column_id**, **position**
- **priority** (alta/média/baixa)
- **category_id**, **month**
- **assignee**, **dependent**
- **value** (R$/mês), **points** (1,3,5,7)
- **blocked**, **blocked_by**, **blocked_reason**
- **created_at**, **updated_at**

---

## Modelo de dados — `categories`

- **id** (UUID)
- **name**
- **color** (hex)

---

## API — Colunas

```text
GET    /api/columns
POST   /api/columns
PUT    /api/columns/:id
DELETE /api/columns/:id
```

- `GET /api/columns`: retorna colunas **com tarefas**

---

## API — Tarefas

```text
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
PUT    /api/tasks/:id/move
PUT    /api/tasks/:id/block
GET    /api/tasks/export/json
GET    /api/tasks/export/csv
GET    /api/tasks/report
```

---

## API — Categorias

```text
GET    /api/categories
POST   /api/categories
DELETE /api/categories/:id
```

---

## Frontend — Componentes principais

- **Board**: renderiza colunas + orquestra DnD
- **Column**: header editável + lista + totais (valor/pontos)
- **TaskCard**: badges (prioridade/categoria/valor/pontos) + drag area
- **TaskModal**: criar/editar com todos os campos
- **Sidebar**: filtros e estatísticas

---

## Estado — `useBoard` (o “cérebro”)

O hook centraliza:

- `columns`, `categories`
- `filters` + `setFilters`
- `getFilteredColumns`, `getStats`
- ações: `addTask`, `updateTask`, `moveTask`...

---

## Fluxo de dados (end-to-end)

```text
Usuário
  ↓ ação (criar/mover/filtrar)
App.tsx
  ↓ chama hook
useBoard.ts (estado otimista + API)
  ↓
api.ts (HTTP)
  ↓
Backend Express
  ↓
SQLite (persistência)
  ↑
Frontend atualiza UI
```

---

## Design system (resumo)

- **Light mode**: fundo claro + cards brancos + coluna cinza suave
- **Dark mode**: fundos escuros e texto claro
- **Prioridades**: vermelho/amarelo/verde (high/medium/low)

---

## Como executar (dev)

### 1) Instalar dependências

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2) Subir servidores

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001/api`

---

## Comandos úteis

```bash
# Tipos TypeScript
cd frontend && npx tsc --noEmit

# Build
cd frontend && npm run build

# Reset DB (recria ao subir backend)
rm backend/kanban.db
```

---

## Próximos passos sugeridos

- Autenticação
- Multi-board
- Colaboração
- Notificações
- Histórico (audit log)
- Anexos
- Subtarefas
- Integrações (calendário/email)

---

# Fim

Documentos-base:
- `README.md`
- `PROJETO-DOCUMENTACAO.md`
- `BACKEND-EXPLICADO.md`
