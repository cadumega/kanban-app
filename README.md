# Kanban App + Mini CRM

Sistema de gerenciamento de tarefas estilo Kanban com CRM integrado.

**Repositório:** https://github.com/cadumega/kanban-app

---

## Início Rápido (1 comando)

```bash
cd /Users/carlosmega/kanban-app
./iniciar.sh
```

Isso faz tudo automaticamente:
- ✅ Backup dos dados
- ✅ Inicia o backend
- ✅ Inicia o frontend
- ✅ Abre o navegador

---

## Funcionalidades

### Kanban
- Drag & drop de tarefas
- Priorização (Alta, Média, Baixa)
- Categorias com cores
- Valor monetário (R$/mês)
- Pontos de complexidade (1, 3, 5, 7)
- Bloqueio de tarefas
- Filtros por pessoa, categoria, mês
- Dark Mode
- Exportação CSV/JSON

### Mini CRM
- Cadastro de contatos
- Email, telefone (formatado), empresa, cargo
- Histórico de notas por contato
- Timeline de interações

---

## Onde ficam seus dados

| O que | Caminho |
|-------|---------|
| **Banco de dados** | `backend/kanban.db` |
| **Backups** | `~/kanban-backups/` |

---

## Comandos Úteis

### Iniciar o app
```bash
./iniciar.sh
```

### Fazer backup manual
```bash
./backup.sh
```

### Iniciar manualmente (2 terminais)

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

## Parar os servidores

Pressione `Ctrl+C` no terminal ou:
```bash
pkill -f "node.*kanban"
```

---

## Tecnologias

- **Frontend:** React 18, TypeScript, Vite, @dnd-kit
- **Backend:** Node.js, Express, SQLite
- **Ícones:** Lucide React

---

## Documentação

- `PROJETO-DOCUMENTACAO.md` - Documentação técnica completa
- `BACKEND-EXPLICADO.md` - Explicação didática do backend
- `DEPLOY-EXPLICADO.md` - Como publicar online

---

## Estrutura

```
kanban-app/
├── backend/           # API Node.js + SQLite
│   ├── src/
│   │   ├── database/  # Configuração do banco
│   │   └── routes/    # Rotas da API
│   └── kanban.db      # Banco de dados
├── frontend/          # React + TypeScript
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── iniciar.sh         # Script para iniciar tudo
├── backup.sh          # Script de backup
└── README.md          # Este arquivo
```

---

## Links

- **App local:** http://localhost:5173
- **GitHub:** https://github.com/cadumega/kanban-app
