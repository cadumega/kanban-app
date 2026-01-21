# Kanban App + Mini CRM

Sistema de gerenciamento de tarefas estilo Kanban com CRM integrado, follow-ups e suporte multi-usuário.

**Repositório:** https://github.com/cadumega/kanban-app

**Produção:**
- Frontend: https://kanban-app-five-snowy.vercel.app
- Backend: https://kanban-api-cadu.fly.dev

---

## Novidades Recentes

- **Follow-ups no CRM** - Agende lembretes para contatar clientes (7d, 15d, 30d, 3m, 6m ou data personalizada)
- **Painel de Follow-ups** - Veja todos os follow-ups pendentes organizados por urgência
- **Busca de Contatos** - Filtre contatos por nome, empresa, email ou cargo
- **Tags de Funil** - Classifique contatos: Lead, Qualificado, Proposta, Negociação, Cliente, Perdido
- **Deploy no Fly.io** - Backend com volume persistente (dados não se perdem!)
- **Deploy na Vercel** - Frontend grátis e rápido

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
- **Busca de contatos** - Filtre por palavra-chave
- **Tags de funil** - Lead, Qualificado, Proposta, Negociação, Cliente, Perdido
- Histórico de notas por contato
- **Upload de imagens** nas notas (até 5MB)
- **Follow-ups** - Agende lembretes (7d, 15d, 30d, 3m, 6m ou personalizado)
- **Painel de Follow-ups** - Veja todos pendentes por urgência
- Integração com WhatsApp (link direto)
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

## Deploy em Produção

O projeto está configurado para rodar gratuitamente:

| Serviço | O que hospeda | Custo |
|---------|---------------|-------|
| **Vercel** | Frontend (React) | Grátis |
| **Fly.io** | Backend (Node.js + SQLite) | Grátis |

**Importante:** Os dados são persistentes! O Fly.io usa um volume de 1GB que não se perde quando o servidor reinicia.

Para detalhes de como fazer o deploy, veja: **[04-DEPLOY.md](./04-DEPLOY.md)**

---

## Onde ficam seus dados

### Local (desenvolvimento)
| O que | Caminho |
|-------|---------|
| **Banco de usuários** | `backend/data/users.db` |
| **Banco do usuário** | `backend/data/{email}/kanban.db` |
| **Imagens do usuário** | `backend/data/{email}/images/` |

### Produção (Fly.io)
| O que | Caminho |
|-------|---------|
| **Volume persistente** | `/data/` (1GB) |
| **Bancos de dados** | `/data/{email}/kanban.db` |
| **Imagens** | `/data/{email}/images/` |

---

## Comandos Úteis

```bash
# Iniciar tudo (dev)
./iniciar.sh

# Build para produção
cd frontend && npm run build

# Deploy do backend (Fly.io)
cd backend && fly deploy

# Ver logs do Fly.io
fly logs

# Parar servidores locais
pkill -f "node.*kanban"
```

---

## Tecnologias

- **Frontend:** React 18, TypeScript, Vite, @dnd-kit
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Autenticação:** JWT, bcryptjs
- **Upload:** Multer
- **Ícones:** Lucide React
- **Deploy:** Fly.io (backend), Vercel (frontend)

---

## Documentação

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | **[01-GUIA-COMPLETO.md](./01-GUIA-COMPLETO.md)** | Tutorial didático (conceitos, arquitetura) |
| 2 | **[02-BACKEND.md](./02-BACKEND.md)** | Como funciona o backend (rotas, banco, auth) |
| 3 | **[03-DOCUMENTACAO-TECNICA.md](./03-DOCUMENTACAO-TECNICA.md)** | Detalhes técnicos (tipos, componentes) |
| 4 | **[04-DEPLOY.md](./04-DEPLOY.md)** | Como publicar (Fly.io + Vercel) |

---

## Estrutura

```
kanban-app/
├── backend/
│   ├── src/
│   │   ├── database/     # Configuração SQLite
│   │   ├── middleware/   # Autenticação JWT
│   │   └── routes/       # Rotas da API
│   ├── data/             # Bancos de dados (local)
│   ├── Dockerfile        # Config para Fly.io
│   └── fly.toml          # Config do Fly.io
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board/
│   │   │   ├── Contacts/     # CRM + Follow-ups
│   │   │   ├── Roadmap/      # Business Roadmap
│   │   │   ├── Login/
│   │   │   └── AdminPanel/
│   │   ├── services/
│   │   └── types/
│   ├── .env.production   # URL da API em produção
│   └── vite.config.ts
│
├── 01-GUIA-COMPLETO.md
├── 02-BACKEND.md
├── 03-DOCUMENTACAO-TECNICA.md
├── 04-DEPLOY.md
└── README.md
```

---

## Links

- **App Produção:** https://kanban-app-five-snowy.vercel.app
- **API Produção:** https://kanban-api-cadu.fly.dev
- **GitHub:** https://github.com/cadumega/kanban-app
- **App Local:** http://localhost:5173
