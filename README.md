# Kanban App

Sistema de gerenciamento de tarefas estilo Kanban.

---

## Como Executar (Passo a Passo)

### Pré-requisitos
- Node.js instalado (v18 ou superior)
- Terminal (iTerm, Terminal do Mac, etc.)

---

### Passo 1: Abrir o Terminal

Abra o Terminal do Mac (Cmd + Espaço, digite "Terminal")

---

### Passo 2: Navegar até a pasta do projeto

```bash
cd /Users/carlosmega/kanban-app
```

---

### Passo 3: Iniciar o Backend

```bash
cd backend
npm run dev
```

Você verá: `Server running on http://localhost:3001`

**Deixe este terminal aberto!**

---

### Passo 4: Abrir OUTRO terminal (Cmd + T)

```bash
cd /Users/carlosmega/kanban-app/frontend
npm run dev
```

Você verá: `Local: http://localhost:5173/`

---

### Passo 5: Abrir no navegador

Acesse: **http://localhost:5173**

---

## Comando Rápido (Tudo de uma vez)

Cole isso no terminal:

```bash
cd /Users/carlosmega/kanban-app && cd backend && npm run dev &
sleep 2 && cd /Users/carlosmega/kanban-app/frontend && npm run dev &
sleep 3 && open http://localhost:5173
```

---

## Parar os Servidores

Para parar, pressione `Ctrl + C` em cada terminal.

Ou mate todos de uma vez:

```bash
pkill -f "node.*kanban"
```

---

## Estrutura do Projeto

```
kanban-app/
├── backend/          # API Node.js + SQLite
├── frontend/         # React + TypeScript
├── README.md         # Este arquivo
├── PROJETO-DOCUMENTACAO.md  # Documentação completa
└── BACKEND-EXPLICADO.md     # Explicação do backend para iniciantes
```

---

## Links Úteis

- **Aplicação**: http://localhost:5173
- **API Backend**: http://localhost:3001/api
- **Documentação**: Abra `PROJETO-DOCUMENTACAO.md`
- **Entender o Backend**: Abra `BACKEND-EXPLICADO.md`

---

## Abrir no Cursor

```bash
cursor /Users/carlosmega/kanban-app
```

---

## Problemas Comuns

### "Porta já em uso"
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### "npm não encontrado"
Instale o Node.js: https://nodejs.org

### Tela branca
Verifique se o backend está rodando (Passo 3)
