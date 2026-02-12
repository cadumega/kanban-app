# Kanban App + Mini CRM

Sistema de gerenciamento de tarefas estilo Kanban com CRM integrado, follow-ups e suporte multi-usuário.

**Repositório:** https://github.com/cadumega/kanban-app

**Produção:**
- Frontend: https://frontend-pi-black-47.vercel.app
- Backend: https://kanban-api-cadu.fly.dev

---

## Novidades Recentes

### Fevereiro 2026 - Sistema de Inteligencia (Mais Recente)
- **Insights Panel** - Botao amarelo "Insights" no CRM com analise automatica
  - Negocios parados (proposta/negociacao sem atividade >10 dias)
  - Sinais de compra detectados em notas
  - Follow-ups atrasados
  - Leads esfriando (tinham engajamento, pararam)
  - Contatos sem follow-up agendado
  - Alto valor em risco (R$1000+/mes inativos)
  - Objecoes detectadas ("caro", "depois", "concorrente")
  - Sugestao de acao para cada insight
- **Analytics Dashboard** - Botao "Analytics" com metricas visuais
  - Funil de vendas com percentuais
  - Pipeline velocity (tempo medio em cada etapa)
  - Tendencias mensais (ultimos 6 meses)
  - Performance por segmento
  - Hot contacts (proximos a fechar)
  - Timeline de atividade recente
- **Weekly Digest** - Relatorio semanal com scoring de leads
  - Lead Scoring (0-100) com classificacao HOT/WARM/COLD/AT_RISK
  - Alertas de leads esfriando
  - Sinais de compra detectados
  - Organizacao por segmento e data
- **Edicao de Notas** - Editar comentarios ja registrados no historico
- **Multi-board** - Suporte a multiplos quadros Kanban independentes
- **Header CRM reorganizado** - Botoes agrupados logicamente

### Fevereiro 2026
- **Sidebar recolhida por padrão** - Mais espaço para o board, expanda clicando no ícone
- **Calendário de Follow-ups no CRM** - Botão "Calendário" no header do CRM
  - Visualização mensal dos follow-ups agendados
  - Clique no dia para ver detalhes
  - Acesso rápido ao contato pelo calendário
- **Painel de Relatórios CRM** - Dashboard com estatísticas completas
  - Notas do mês, follow-ups concluídos, clientes com robô
  - Receita (valor implementação + mensal) de todos os contatos com valores
  - Top 10 contatos por interações
  - Funil de vendas visual
  - Distribuição por cidade
  - Atividade recente
- **Novos campos de Contato**:
  - Telefone do Robô (para automação)
  - Link de redirecionamento WhatsApp
  - Valor Implementação (R$)
  - Valor Mensal (R$)
  - Checkbox "Tem Robô" (ao lado do título da seção)
- **Tecla ESC** - Fecha todos os modais (tarefas, contatos, importação, relatórios, calendário)
- **Modal de Tarefas Melhorado**:
  - Layout mais amplo e organizado
  - Título e botão X na mesma linha
  - Botões de ação com mais padding (Cancelar/Salvar)
- **Modal de Contato Melhorado**:
  - Botões Cancelar/Salvar fixos no topo (ao lado do título)
  - Campos em duas colunas (mais compacto)
  - Seção de automação com checkbox inline
  - Scroll no formulário quando necessário
- **Bug fix: Contador de prazo** - O contador de deadline para quando a tarefa é movida para "Concluído"
  - Campo `completed_at` preenchido automaticamente
  - Não exibe mais barra de progresso em tarefas concluídas
- **Interface mais limpa** - Removido botão "Nova Coluna" do header (use menu da última coluna)

### Fevereiro 2026
- **Importação de CSV** - Importe contatos de planilhas (Google Sheets/Excel)
  - Detecção automática de colunas (nome, email, telefone, empresa, cargo, cidade, tag)
  - Preview dos dados antes de importar
  - Remoção de linhas individuais no preview
  - Mapeamento inteligente de tags (lead, qualificado, proposta, etc.)
- **Exportação de CSV** - Exporte contatos para planilhas
  - Exporta todos ou apenas filtrados
  - Compatível com Excel (UTF-8 com BOM)
- **Modal Expandido de Contato** - Clique único abre modal com detalhes completos
  - Layout em duas colunas (Follow-ups + Notas)
  - Todas as funcionalidades disponíveis no modal
  - Painel lateral removido em favor do modal (UI mais limpa)
- **Campo de Data nas Notas** - Escolha a data da nota manualmente
  - Útil para registrar interações passadas
- **Follow-ups com Data Formatada** - Exibe "Retornar em dd/mm/yyyy"
  - Mostra claramente quando retornar ao contato
- **Coluna Telefone na Lista** - Visualize telefone direto na tabela de contatos
- **Correção de bugs visuais** - Setas duplicadas nos dropdowns de filtro corrigidas

### Anteriores
- **Campo Cidade nos Contatos** - Registre a cidade de cada contato (com sugestões automáticas)
- **Filtro por Cidade** - Filtre contatos e follow-ups por cidade
- **Badges no Follow-up** - Cidade e etapa do funil visíveis em cada follow-up
- **Contador por Cidade** - Veja quantos follow-ups pendentes por cidade
- **Funil de Vendas** - Visualização hierárquica dos contatos por etapa do funil
- **Sidebar Colapsada** - Ícones de acesso rápido quando sidebar oculta
- **Setas de Prioridade** - Estilo JIRA (alta=vermelho, média=laranja, baixa=azul)
- **Badge de Notificação** - Contador de follow-ups pendentes no sino
- **Linha "Hoje" no Roadmap** - Indicador visual da data atual
- **Modal Melhorado** - Layout com mais espaçamento e organização
- **Follow-ups no CRM** - Agende lembretes para contatar clientes
- **Tags de Funil** - Lead, Qualificado, Proposta, Negociação, Cliente, Perdido
- **Deploy no Fly.io** - Backend com volume persistente
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
- Indicador visual de prazo (para ao concluir tarefa)
- Data de conclusão (`completed_at`) preenchida automaticamente
- Bloqueio de tarefas
- Filtros por pessoa, categoria, mês, projeto
- Coluna Suporte com divisores
- Dark Mode
- Exportação CSV/JSON
- **Tecla ESC** - Fecha modais de tarefas e contatos

### Mini CRM
- Cadastro de contatos (nome, email, telefone, empresa, cargo, **cidade**)
- **Campos de automação**:
  - Telefone do Robô (número usado pela automação)
  - Link de redirecionamento WhatsApp
  - Valor Implementação (R$)
  - Valor Mensal (R$)
  - Checkbox "Tem Robô" para clientes com automação ativa
- **Busca de contatos** - Filtre por palavra-chave (inclui cidade)
- **Filtro por cidade** - Dropdown dinâmico na lista de contatos
- **Tags de funil** - Lead, Qualificado, Proposta, Negociação, Cliente, Perdido
- Histórico de notas por contato
- **Upload de imagens** nas notas (até 5MB)
- **Follow-ups** - Agende lembretes (7d, 15d, 30d, 3m, 6m ou personalizado)
- **Painel de Follow-ups** - Veja todos pendentes por urgência
  - Filtro por cidade com contador
  - Badges de cidade e etapa do funil em cada item
  - **Visualização em Calendário** - Veja follow-ups no mês inteiro
- **Calendário no CRM** - Acesso rápido ao calendário de follow-ups pelo header
- **Painel de Relatórios** - Dashboard com estatísticas do CRM
  - Notas e follow-ups do mês
  - Receita total (implementação + mensal)
  - Top 10 contatos por interações
  - Funil de vendas (contatos por etapa)
  - Distribuição por cidade
  - Atividade recente
- Integração com WhatsApp (link direto)
- Timeline de interações
- **Importar CSV** - Importe contatos de planilhas
  - Colunas aceitas: nome, email, telefone, empresa, cargo, cidade, tag
  - Detecta automaticamente variações (ex: "Nome Completo", "name", "nome")
- **Exportar CSV** - Exporte contatos para planilhas (compatível com Excel)
- **Modal Expandido** - Clique no contato abre tela grande com todos os detalhes

### Sistema de Inteligencia (CRM)

Sistema de analise automatica para identificar oportunidades e riscos no pipeline.

#### Lead Scoring (0-100)

Cada contato recebe pontuacao baseada em:

| Fator | Impacto |
|-------|---------|
| Quantidade de notas | +10 a +20 |
| Dias desde ultima interacao | -20 a +15 |
| Posicao no funil | +5 a +30 |
| Valor (mensal/impl) | +10 |
| Sinais de compra | +5 por keyword |
| Follow-ups atrasados | -5 por atraso |

**Classificacoes:**
- **HOT** (80+): Prioridade critica
- **WARM** (60-79): Alta prioridade
- **COLD** (40-59): Media prioridade
- **AT_RISK** (<40): Em risco

#### Deteccao de Sinais de Compra

Keywords que indicam intencao:
- **Budget:** orcamento, quanto custa, investimento, proposta
- **Urgencia:** urgente, deadline, rapido, essa semana
- **Decisao:** aprovar, fechar, contratar, vamos fazer
- **Interesse:** interessado, perfeito, otimo, quero

#### Deteccao de Objecoes

Keywords que indicam resistencia:
- **Preco:** caro, sem verba, acima do orcamento
- **Timing:** depois, proximo mes, mais tarde
- **Competidor:** concorrente, comparando, cotacao
- **Duvida:** preciso pensar, vou avaliar

#### Insights Automaticos

| Tipo | Descricao | Prioridade |
|------|-----------|------------|
| Negocios Parados | Proposta/negociacao >10 dias sem atividade | Critica |
| Alto Valor em Risco | R$1000+/mes inativos >7 dias | Critica |
| Follow-ups Atrasados | Datas vencidas | Critica |
| Sinais de Compra | Keywords detectadas em notas | Alta |
| Objecoes | Resistencias identificadas | Alta |
| Leads Esfriando | Queda de engajamento | Alta |
| Sem Follow-up | Etapas ativas sem proximo passo | Media |
| Prontos para Avancar | Bom engajamento | Media |

#### Evolucoes Futuras (Backlog)

Features que podem ser implementadas:

**Prioridade Alta:**
- Health Score por contato
- Alertas time-based automaticos
- Agendamento auto de follow-ups
- Auto-escalacao de leads (score >= 80)

**Prioridade Media:**
- Sugestao de proxima melhor acao
- Previsao de receita do pipeline
- Timeline consolidada
- Analise de ciclo de vendas

**Complementares:**
- Analise de sentimento em notas
- Heatmap de atividade
- Tracker de concorrentes
- Contatos similares

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
# Iniciar tudo (dev com hot reload)
./iniciar.sh

# Build para produção
cd frontend && npm run build

# Rodar build local (após npm run build)
cd backend && NODE_ENV=production node src/index.js
# Acessar em http://localhost:3001

# Deploy do backend (Fly.io)
cd backend && ~/.fly/bin/fly deploy

# Deploy do frontend (Vercel)
cd frontend && npx vercel --prod --yes

# Ver logs do Fly.io
fly logs

# Parar servidores locais
pkill -f "node.*kanban"
lsof -ti:3001 | xargs kill -9  # Força parar porta 3001
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
| 5 | **[05-INTELIGENCIA-CRM.md](./05-INTELIGENCIA-CRM.md)** | Sistema de inteligencia e scoring |

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
│   │   │   │   ├── Board.tsx
│   │   │   │   └── BoardSelector.tsx    # Seletor multi-board
│   │   │   ├── Contacts/
│   │   │   │   ├── ContactsPanel.tsx    # Painel principal CRM
│   │   │   │   ├── ContactDetailModal.tsx
│   │   │   │   ├── AnalyticsDashboard.tsx  # Metricas e funil
│   │   │   │   ├── InsightsPanel.tsx    # Analise automatica
│   │   │   │   ├── WeeklyDigestPanel.tsx   # Relatorio semanal
│   │   │   │   ├── FollowupsPanel.tsx   # Calendario
│   │   │   │   └── ReportsPanel.tsx
│   │   │   ├── Roadmap/
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

## Bugs Conhecidos e Soluções

### Tela branca após build local
**Problema:** Após rodar `npm run build`, ao acessar `http://localhost:3001` a tela fica branca.

**Causa:** O servidor só serve arquivos estáticos quando `NODE_ENV=production`.

**Solução:**
```bash
cd backend
NODE_ENV=production node src/index.js
```

### Porta 3001 já em uso
**Problema:** Erro `EADDRINUSE: address already in use :::3001`

**Solução:**
```bash
lsof -ti:3001 | xargs kill -9
```

### Modal fecha o painel CRM inteiro
**Problema:** Clicar fora do modal de detalhes ou importação fecha tudo.

**Solução:** Usar `e.stopPropagation()` no onClick do overlay do modal para evitar propagação do evento.

### Setas duplicadas nos dropdowns de filtro
**Problema:** Os botões select nos filtros do CRM mostram múltiplas setas (ícones sobrepostos).

**Causa:** Usar `background:` (shorthand CSS) sobrescreve todas as propriedades de background, incluindo `background-image` que é a seta nativa do select.

**Solução:** Usar `background-color:` em vez de `background:` no CSS dos selects.

```css
/* Errado - sobrescreve a seta nativa */
.contacts-panel__filter-select:hover {
  background: var(--bg-hover);
}

/* Correto - preserva a seta nativa */
.contacts-panel__filter-select:hover {
  background-color: var(--bg-hover);
}
```

---

## Links

- **App Produção:** https://frontend-pi-black-47.vercel.app
- **API Produção:** https://kanban-api-cadu.fly.dev
- **GitHub:** https://github.com/cadumega/kanban-app
- **App Local (dev):** http://localhost:5173
- **App Local (build):** http://localhost:3001
