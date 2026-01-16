# Kanban App + Mini CRM

Sistema de gerenciamento de tarefas estilo Kanban com CRM integrado e suporte multi-usuário.

**Repositório:** https://github.com/cadumega/kanban-app

---

## Novidades Recentes

- **Sistema Multi-Usuário** - Cada usuário tem seu próprio banco de dados isolado
- **Autenticação JWT** - Login seguro com tokens
- **Painel Administrativo** - Usuário master pode gerenciar outros usuários
- **Upload de Imagens no CRM** - Adicione imagens às notas de contatos
- **Deploy no Render** - Configuração pronta para produção

---

## Início Rápido

### Desenvolvimento Local

```bash
cd /Users/carlosmega/kanban-app
./iniciar.sh
```

Ou manualmente:

**Terminal 1 - Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

**Acessar:** http://localhost:5173

### Primeiro Login

- **Email:** `cadumega@outlook.com`
- **Senha:** `cadu@2026`

Este é o usuário master que pode criar outros usuários.

---

## Funcionalidades

### Kanban
- Drag & drop de tarefas
- Priorização (Alta, Média, Baixa)
- Categorias com cores
- Campo de Projeto - Associe tarefas a projetos
- Subtarefas/Checklist
- Valor monetário (R$/mês)
- Pontos de complexidade (1, 3, 5, 7)
- Deadline automático (data início + pontos = dias)
- Indicador visual de prazo
- Bloqueio de tarefas
- Filtros por pessoa, categoria, mês, projeto
- Coluna Suporte com divisores
- Dark Mode
- Exportação CSV/JSON

### Mini CRM
- Cadastro de contatos (nome, email, telefone, empresa, cargo)
- Histórico de notas por contato
- **Upload de imagens** nas notas (até 5MB)
- Integração com WhatsApp (link direto para ligar/mensagem)
- Timeline de interações

### Business Roadmap
- Timeline visual de projetos por período
- Tarefas agrupadas por projeto
- Divisão de meses em blocos de 10 dias
- Barras de duração (data início até conclusão)
- Linha vermelha indicando "Hoje"
- Projetos expansíveis/recolhíveis

### Sistema de Usuários
- **Autenticação JWT** - Login seguro
- **Multi-usuário** - Cada usuário tem dados isolados
- **Papéis** - Master (admin) e User (comum)
- **Painel Admin** - Criar, editar, ativar/desativar usuários

---

## Onde ficam seus dados

| O que | Caminho |
|-------|---------|
| **Banco de usuários** | `backend/data/users.db` |
| **Banco do usuário** | `backend/data/users/{email}/kanban.db` |
| **Imagens do usuário** | `backend/data/users/{email}/images/` |
| **Backups** | `~/kanban-backups/` |

---

## Deploy no Render

O projeto está configurado para deploy no Render com o arquivo `render.yaml`.

### Passos:

1. Suba o código para o GitHub
2. Crie uma conta no [Render](https://render.com)
3. Conecte o repositório
4. O Render detecta o `render.yaml` automaticamente
5. Aguarde o deploy (~5-10 min)

O disco persistente de 1GB é configurado automaticamente para manter os dados SQLite.

---

## Comandos Úteis

```bash
# Iniciar tudo (dev)
./iniciar.sh

# Fazer backup manual
./backup.sh

# Build para produção
cd frontend && npm run build
cd backend && npm start

# Parar servidores
pkill -f "node.*kanban"
```

---

## Tecnologias

- **Frontend:** React 18, TypeScript, Vite, @dnd-kit
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Autenticação:** JWT, bcryptjs
- **Upload:** Multer
- **Ícones:** Lucide React

---

## Documentação

| Arquivo | Descrição |
|---------|-----------|
| **GUIA-COMPLETO.md** | Guia didático completo do projeto (recomendado!) |
| `PROJETO-DOCUMENTACAO.md` | Documentação técnica |
| `BACKEND-EXPLICADO.md` | Explicação do backend |
| `DEPLOY-EXPLICADO.md` | Como publicar online |
| `render.yaml` | Configuração do Render |

---

## Estrutura

```
kanban-app/
├── backend/
│   ├── src/
│   │   ├── database/     # Configuração SQLite
│   │   ├── middleware/   # Autenticação
│   │   └── routes/       # Rotas da API
│   ├── data/             # Bancos de dados
│   │   ├── users.db      # Usuários do sistema
│   │   └── users/        # Pasta por usuário
│   │       └── email@example.com/
│   │           ├── kanban.db
│   │           └── images/
│   └── public/           # Frontend compilado
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Board/
│       │   ├── Contacts/     # CRM
│       │   ├── Login/        # Tela de login
│       │   ├── AdminPanel/   # Painel admin
│       │   └── ...
│       ├── services/
│       └── types/
│
├── render.yaml           # Config do Render
├── iniciar.sh            # Script para dev
└── GUIA-COMPLETO.md      # Documentação didática
```

---

## Links

- **App local:** http://localhost:5173
- **GitHub:** https://github.com/cadumega/kanban-app
- **Render:** (sua URL após deploy)
