# Kanban App - Documentação Completa

## Visão Geral

Sistema de gerenciamento de tarefas estilo Kanban desenvolvido com React + TypeScript no frontend e Node.js + SQLite no backend.

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
│   │   ├── components/          # Componentes React
│   │   │   ├── Board/           # Container principal do Kanban
│   │   │   ├── Column/          # Coluna do board
│   │   │   ├── TaskCard/        # Card de tarefa
│   │   │   ├── TaskModal/       # Modal de edição
│   │   │   └── Sidebar/         # Barra lateral com filtros
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
│   │   │   └── categories.js    # CRUD de categorias
│   │   └── index.js             # Server Express
│   └── package.json
│
└── kanban.db                    # Banco de dados SQLite
```

---

## Modelo de Dados

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
| blocked | BOOLEAN | Se está bloqueada |
| blocked_by | TEXT | Nome de quem bloqueia |
| blocked_reason | TEXT | Motivo do bloqueio |
| created_at | DATETIME | Data de criação |
| updated_at | DATETIME | Última atualização |

### Tabela: categories
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | TEXT (UUID) | Identificador único |
| name | TEXT | Nome da categoria |
| color | TEXT | Cor (hex) |

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
GET    /api/tasks/report      # Relatório agregado
```

### Categorias
```
GET    /api/categories       # Listar todas
POST   /api/categories       # Criar categoria
DELETE /api/categories/:id   # Excluir categoria
```

---

## Funcionalidades Implementadas

### 1. Board Kanban
- Drag and drop de tarefas entre colunas
- Reordenação de tarefas dentro da coluna
- Criação/edição/exclusão de colunas
- Cores personalizadas por coluna

### 2. Tarefas
- CRUD completo
- Priorização (Alta, Média, Baixa)
- Categorização com tags coloridas
- Campo de valor monetário (R$/mês)
- Pontos de complexidade (1, 3, 5, 7)
- Responsável e Dependente
- Mês opcional para planejamento
- Status de bloqueio

### 3. Filtros (Sidebar)
- Por prioridade
- Por categoria
- Por mês
- Por pessoa (responsável/dependente)
- Tarefas bloqueadas
- Contadores em tempo real

### 4. Interface
- Design minimalista (estilo Notion/Linear)
- Dark Mode
- Toggle para ocultar sidebar
- Área de drag expandida no card
- Contadores de valor por coluna e geral

### 5. Exportação
- JSON completo
- CSV para Excel/Sheets

---

## Componentes Principais

### Board.tsx
Container principal que renderiza as colunas e gerencia o drag and drop.

```tsx
// Usa @dnd-kit para DnD
<DndContext onDragEnd={handleDragEnd}>
  <SortableContext items={columns}>
    {columns.map(col => <Column key={col.id} />)}
  </SortableContext>
</DndContext>
```

### Column.tsx
Representa uma coluna do Kanban com header editável e lista de tasks.

```tsx
// Mostra total de valor e pontos
{totalValue > 0 && <span>{formatValue(totalValue)}</span>}
{totalPoints > 0 && <span>{totalPoints} pts</span>}
```

### TaskCard.tsx
Card de tarefa com área de drag, badges e indicadores visuais.

```tsx
// Área de drag expandida
<div className="task-card__drag-area" {...listeners} />
// Badges de prioridade, categoria, valor, pontos
```

### TaskModal.tsx
Modal completo para criar/editar tarefas com todos os campos.

```tsx
// Seletor de pontos de complexidade
{[1, 3, 5, 7].map(p => (
  <button onClick={() => setPoints(p)}>{p}</button>
))}
```

### Sidebar.tsx
Barra lateral com filtros, estatísticas e ações.

```tsx
// Filtros por pessoa (ordem alfabética)
{people.map(person => (
  <button onClick={() => onFilterByPerson(person)}>
    {person}
  </button>
))}
```

---

## Hook useBoard

Gerencia todo o estado da aplicação:

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

## Como Executar

### 1. Instalar dependências
```bash
# Backend
cd kanban-app/backend
npm install

# Frontend
cd kanban-app/frontend
npm install
```

### 2. Iniciar servidores
```bash
# Terminal 1 - Backend
cd kanban-app/backend
npm run dev
# Roda em http://localhost:3001

# Terminal 2 - Frontend
cd kanban-app/frontend
npm run dev
# Roda em http://localhost:5173
```

### 3. Acessar aplicação
Abra http://localhost:5173 no navegador.

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

## Próximos Passos Sugeridos

1. **Autenticação** - Login de usuários
2. **Multi-board** - Múltiplos boards por usuário
3. **Colaboração** - Compartilhar boards
4. **Notificações** - Alertas de tarefas bloqueadas
5. **Histórico** - Log de alterações
6. **Anexos** - Upload de arquivos
7. **Subtarefas** - Checklist dentro das tarefas
8. **Integração** - Conectar com calendário/email

---

## Comandos Úteis

```bash
# Verificar tipos TypeScript
cd frontend && npx tsc --noEmit

# Build de produção
cd frontend && npm run build

# Resetar banco de dados
rm backend/kanban.db
# (será recriado ao iniciar o backend)
```

---

## Usando com Cursor

1. Baixe o Cursor em https://cursor.com
2. Abra a pasta `kanban-app`
3. Use Cmd+K para fazer perguntas sobre o código
4. Use Cmd+L para chat com contexto do projeto

### Prompts úteis para o Cursor:
- "Explique como funciona o drag and drop"
- "Como adicionar um novo campo na tarefa"
- "Como criar um novo filtro na sidebar"
- "Refatore o componente TaskCard"

---

*Documentação gerada em Janeiro/2026*
