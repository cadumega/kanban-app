# Guia Completo do Sistema Kanban

> **Documentação Didática** - Um guia narrativo e explicativo sobre como o projeto funciona, desde a arquitetura até o deploy.

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Tecnologias Utilizadas](#2-tecnologias-utilizadas)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Como Funciona o Backend](#4-como-funciona-o-backend)
5. [O Banco de Dados SQLite](#5-o-banco-de-dados-sqlite)
6. [Sistema de Autenticação](#6-sistema-de-autenticação)
7. [Sistema Multi-Usuário](#7-sistema-multi-usuário)
8. [O CRM de Contatos](#8-o-crm-de-contatos)
9. [Deploy no Render](#9-deploy-no-render)
10. [Escalabilidade Futura](#10-escalabilidade-futura)
11. [Comandos Úteis](#11-comandos-úteis)

---

## 1. Visão Geral do Projeto

### O que é?

Este é um **sistema de gerenciamento de tarefas estilo Kanban** - aquele quadro com colunas onde você arrasta cards de uma coluna para outra. Pense no Trello, Notion ou Linear.

Mas além do Kanban básico, o sistema inclui:
- **CRM de Contatos**: Gerencie contatos com notas e imagens
- **Roadmap de Projetos**: Visualize projetos no tempo
- **Sistema Multi-Usuário**: Cada usuário tem seus próprios dados
- **Painel Administrativo**: O usuário master gerencia outros usuários

### Por que foi construído assim?

A ideia foi criar algo **prático para uso pessoal/pequenos times**, sem a complexidade de sistemas empresariais. Por isso:

- **SQLite ao invés de PostgreSQL/MySQL**: Mais simples, não precisa de servidor de banco separado
- **Um banco por usuário**: Isolamento total de dados, fácil de fazer backup
- **React + Node.js**: Stack moderna, bem documentada, fácil de encontrar ajuda

---

## 2. Tecnologias Utilizadas

### Frontend (o que o usuário vê)

| Tecnologia | Para quê serve? |
|------------|-----------------|
| **React 18** | Biblioteca para construir interfaces. Permite criar componentes reutilizáveis |
| **TypeScript** | JavaScript com tipos. Ajuda a evitar erros e dá autocomplete no editor |
| **Vite** | Ferramenta de build ultra-rápida. Substitui o antigo Create React App |
| **@dnd-kit** | Biblioteca de drag & drop. Permite arrastar os cards entre colunas |
| **Axios** | Cliente HTTP. Faz as chamadas para o backend |
| **Lucide React** | Ícones bonitos e leves |

### Backend (o que roda no servidor)

| Tecnologia | Para quê serve? |
|------------|-----------------|
| **Node.js** | Permite rodar JavaScript no servidor |
| **Express** | Framework web. Facilita criar APIs REST |
| **better-sqlite3** | Banco de dados SQLite. Rápido e síncrono |
| **JWT (jsonwebtoken)** | Gera tokens de autenticação |
| **bcryptjs** | Criptografa senhas de forma segura |
| **Multer** | Gerencia upload de arquivos (imagens) |
| **UUID** | Gera identificadores únicos para registros |

### Por que essas escolhas?

**React** porque é o mais popular e tem muita documentação. **TypeScript** porque evita muitos bugs em tempo de desenvolvimento. **SQLite** porque é simples - o banco é só um arquivo, não precisa instalar nada extra. **Express** porque é o padrão do Node.js para APIs.

---

## 3. Arquitetura do Sistema

### Estrutura de Pastas

```
kanban-app/
├── frontend/                 # Código React (interface do usuário)
│   ├── src/
│   │   ├── components/       # Componentes visuais
│   │   │   ├── Board/        # Quadro Kanban principal
│   │   │   ├── Column/       # Colunas do Kanban
│   │   │   ├── TaskCard/     # Cards de tarefas
│   │   │   ├── TaskModal/    # Modal de edição de tarefa
│   │   │   ├── Contacts/     # CRM de contatos
│   │   │   ├── Login/        # Tela de login
│   │   │   └── AdminPanel/   # Painel administrativo
│   │   ├── services/         # Chamadas para API
│   │   ├── types/            # Definições TypeScript
│   │   └── hooks/            # Hooks customizados
│   └── package.json
│
├── backend/                  # Código Node.js (servidor)
│   ├── src/
│   │   ├── routes/           # Endpoints da API
│   │   ├── middleware/       # Autenticação, etc.
│   │   └── database/         # Configuração do SQLite
│   ├── data/                 # Onde ficam os bancos SQLite
│   │   ├── users.db          # Banco central (usuários)
│   │   └── users/            # Pasta com banco de cada usuário
│   │       └── usuario@email.com/
│   │           ├── kanban.db # Banco do usuário
│   │           └── images/   # Imagens enviadas
│   └── package.json
│
├── render.yaml               # Configuração do Render
└── GUIA-COMPLETO.md          # Este arquivo!
```

### Como as partes se conectam?

```
┌─────────────────┐     HTTP/REST      ┌─────────────────┐
│                 │ ←───────────────── │                 │
│    Frontend     │                    │    Backend      │
│    (React)      │ ───────────────→   │    (Node.js)    │
│                 │                    │                 │
└─────────────────┘                    └────────┬────────┘
        ↑                                       │
        │                                       │
   Navegador                              ┌─────▼─────┐
   do Usuário                             │  SQLite   │
                                          │ Databases │
                                          └───────────┘
```

1. **Usuário** acessa o site pelo navegador
2. **Frontend React** renderiza a interface
3. Quando o usuário faz algo (criar tarefa, mover card), o frontend chama a **API REST**
4. **Backend Express** recebe a requisição, valida, e manipula o **banco SQLite**
5. Backend retorna os dados, frontend atualiza a tela

---

## 4. Como Funciona o Backend

### O que é uma API REST?

REST é um padrão para criar APIs web. Funciona assim:

- **GET** = Buscar dados (ex: listar tarefas)
- **POST** = Criar algo novo (ex: criar tarefa)
- **PUT** = Atualizar algo existente (ex: editar tarefa)
- **DELETE** = Remover algo (ex: deletar tarefa)

### Exemplo Prático

Quando você cria uma tarefa no Kanban:

```
Frontend                                    Backend
   │                                           │
   │  POST /api/tasks                          │
   │  { title: "Comprar leite", ... }          │
   │ ────────────────────────────────────────► │
   │                                           │
   │                                           │  ← Salva no SQLite
   │                                           │
   │  { id: "abc123", title: "Comprar leite" } │
   │ ◄──────────────────────────────────────── │
   │                                           │
   │  ← Atualiza a tela                        │
```

### Estrutura de um Endpoint

Veja o arquivo `backend/src/routes/tasks.js`:

```javascript
// GET /api/tasks - Lista todas as tarefas
router.get('/', (req, res) => {
  const db = req.db;  // Banco do usuário logado
  const tasks = db.prepare('SELECT * FROM tasks').all();
  res.json(tasks);    // Retorna como JSON
});

// POST /api/tasks - Cria nova tarefa
router.post('/', (req, res) => {
  const db = req.db;
  const { title, description, column_id } = req.body;

  // Valida dados
  if (!title) {
    return res.status(400).json({ error: 'Título obrigatório' });
  }

  // Insere no banco
  const id = uuidv4();
  db.prepare('INSERT INTO tasks (id, title, ...) VALUES (?, ?, ...)').run(id, title, ...);

  // Retorna a tarefa criada
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.status(201).json(task);
});
```

### Middlewares - O que são?

Middlewares são funções que rodam **antes** do seu endpoint. Pense como filtros ou verificações.

```javascript
// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // Adiciona usuário à requisição
    next();              // Continua para o próximo middleware/endpoint
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

O fluxo fica:

```
Requisição → authMiddleware → injectUserDb → Seu Endpoint
                   │                │
                   │                └─ Pega o banco do usuário
                   └─ Verifica se está logado
```

---

## 5. O Banco de Dados SQLite

### O que é SQLite?

SQLite é um banco de dados que fica em **um único arquivo**. Não precisa instalar servidor, não precisa configurar portas. O arquivo `.db` É o banco de dados.

**Vantagens:**
- Simples de usar e fazer backup (copiar o arquivo)
- Rápido para operações locais
- Perfeito para aplicações de pequeno/médio porte

**Desvantagens:**
- Não suporta múltiplas escritas simultâneas
- Para milhares de usuários simultâneos, precisa de PostgreSQL/MySQL

### Estrutura das Tabelas

#### Banco Central (`data/users.db`)

Contém apenas os usuários do sistema:

```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,        -- Senha criptografada com bcrypt
    name TEXT,
    role TEXT DEFAULT 'user',      -- 'master' ou 'user'
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Banco do Usuário (`data/users/email@example.com/kanban.db`)

Cada usuário tem seu próprio banco com todas as tabelas:

```sql
-- Colunas do Kanban
CREATE TABLE columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    position INTEGER NOT NULL,
    color TEXT DEFAULT '#6366F1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tarefas
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    column_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    priority TEXT DEFAULT 'media',    -- alta, media, baixa
    category_id TEXT,
    month TEXT,                       -- '2024-01'
    assignee TEXT,                    -- Responsável
    dependent TEXT,                   -- Dependente
    value REAL DEFAULT 0,             -- Valor financeiro
    points INTEGER DEFAULT 0,         -- Pontos de esforço
    start_date TEXT,
    project TEXT,                     -- ID do projeto
    blocked INTEGER DEFAULT 0,        -- 0 ou 1
    blocked_by TEXT,
    blocked_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Categorias/Tags
CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6366F1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contatos (CRM)
CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notas dos Contatos
CREATE TABLE contact_notes (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    content TEXT,
    image_path TEXT,                  -- Caminho da imagem
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Checklist de Tarefas (Subtarefas)
CREATE TABLE task_checklist (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    text TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    position INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projetos (Roadmap)
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366F1',
    status TEXT DEFAULT 'planning',  -- planning, active, paused, completed
    start_date TEXT,
    end_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Como os Dados se Relacionam?

```
┌──────────────┐
│   columns    │
│──────────────│
│ id           │◄─────────────┐
│ title        │              │
│ position     │              │
└──────────────┘              │
                              │
┌──────────────┐              │        ┌──────────────┐
│    tasks     │              │        │  categories  │
│──────────────│              │        │──────────────│
│ id           │              │        │ id           │◄──────┐
│ title        │              │        │ name         │       │
│ column_id    │──────────────┘        │ color        │       │
│ category_id  │───────────────────────┘               │       │
│ project      │────────────────────────────┐          │       │
└──────────────┘                            │          │       │
       ▲                                    │          │       │
       │                                    ▼          │       │
┌──────┴───────┐                    ┌──────────────┐   │       │
│task_checklist│                    │   projects   │   │       │
│──────────────│                    │──────────────│   │       │
│ id           │                    │ id           │◄──┘       │
│ task_id      │                    │ name         │           │
│ text         │                    │ status       │           │
└──────────────┘                    └──────────────┘           │
                                                               │
┌──────────────┐         ┌──────────────────┐                  │
│   contacts   │         │   contact_notes  │                  │
│──────────────│         │──────────────────│                  │
│ id           │◄────────│ contact_id       │                  │
│ name         │         │ content          │                  │
│ email        │         │ image_path       │                  │
└──────────────┘         └──────────────────┘                  │
```

### Migrações - Atualizando o Banco

Quando adicionamos funcionalidades novas (como upload de imagens), precisamos atualizar a estrutura do banco de usuários existentes. Isso é feito em `userDb.js`:

```javascript
function migrateUserDb(db) {
  // Verifica se a coluna image_path existe
  const tableInfo = db.prepare("PRAGMA table_info(contact_notes)").all();
  const hasImagePath = tableInfo.some(col => col.name === 'image_path');

  // Se não existe, adiciona
  if (!hasImagePath) {
    db.exec('ALTER TABLE contact_notes ADD COLUMN image_path TEXT');
    console.log('Migração: adicionada coluna image_path em contact_notes');
  }
}
```

Essa função roda toda vez que o banco de um usuário é aberto, garantindo que está atualizado.

---

## 6. Sistema de Autenticação

### Como funciona o Login?

1. **Usuário digita email e senha**
2. **Frontend envia para** `POST /api/auth/login`
3. **Backend verifica:**
   - Email existe?
   - Usuário está ativo?
   - Senha confere? (usando bcrypt)
4. **Se OK, gera um token JWT**
5. **Frontend armazena o token** no localStorage
6. **Todas as requisições futuras** enviam esse token no header

### O que é JWT?

JWT (JSON Web Token) é uma string codificada que contém informações do usuário. Exemplo:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpZCI6ImFiYzEyMyIsImVtYWlsIjoidGVzdGVAZXhhbXBsZS5jb20ifQ.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Parece confuso, mas é só três partes separadas por ponto:
1. **Header**: tipo de token
2. **Payload**: dados do usuário (id, email, role)
3. **Assinatura**: prova que o token é válido

O backend usa uma **chave secreta** (JWT_SECRET) para assinar. Se alguém tentar modificar o token, a assinatura não bate e o backend rejeita.

### Como a Senha é Protegida?

Senhas **nunca** são salvas em texto puro. Usamos **bcrypt**:

```javascript
// Ao criar usuário
const hashedPassword = bcryptjs.hashSync(password, 10);
// Salva hashedPassword no banco

// Ao fazer login
const isValid = bcryptjs.compareSync(senhaDigitada, hashDoBanco);
```

O hash é irreversível - mesmo olhando o banco, não dá para descobrir a senha original.

---

## 7. Sistema Multi-Usuário

### A Abordagem Escolhida: Um Banco por Usuário

Existem várias formas de separar dados de usuários:

| Abordagem | Descrição | Prós | Contras |
|-----------|-----------|------|---------|
| **Uma coluna user_id** | Todas as tabelas têm user_id | Simples de implementar | Risco de vazamento se esquecer WHERE |
| **Schemas separados** | Um schema por usuário | Bom isolamento | Complexo de gerenciar |
| **Um banco por usuário** ✓ | Cada um tem seu arquivo .db | Isolamento total, backup fácil | Mais arquivos para gerenciar |

Escolhemos **um banco por usuário** porque:
- Isolamento total de dados
- Fácil fazer backup individual
- Simples de implementar
- Perfeito para fase de testes

### Como Funciona na Prática

```
data/
├── users.db                      # Banco central (só usuários)
└── users/
    ├── cadumega@outlook.com/     # Pasta do usuário master
    │   ├── kanban.db             # Banco com tarefas, contatos, etc
    │   └── images/               # Imagens enviadas
    │       ├── 1234-abc.jpg
    │       └── 5678-def.png
    │
    ├── joao@empresa.com/         # Outro usuário
    │   ├── kanban.db
    │   └── images/
    │
    └── maria@empresa.com/        # Mais um usuário
        ├── kanban.db
        └── images/
```

### O Fluxo de Login

1. Usuário faz login
2. Backend verifica credenciais no `users.db`
3. Se OK, gera token JWT com email
4. Nas requisições seguintes:
   - Middleware extrai email do token
   - Middleware abre/cria banco do usuário
   - Banco fica disponível em `req.db`
   - Endpoint usa `req.db` para queries

```javascript
// Middleware que injeta o banco do usuário
const injectUserDb = (req, res, next) => {
  try {
    req.db = getUserDb(req.user.email);  // Abre banco do usuário
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao acessar banco' });
  }
};
```

### Papéis de Usuário

- **master**: Pode criar/editar/desativar outros usuários
- **user**: Acesso apenas aos próprios dados

O usuário master padrão é:
- **Email**: `cadumega@outlook.com`
- **Senha**: `cadu@2026`

---

## 8. O CRM de Contatos

### Funcionalidades

- Lista de contatos com nome, email, telefone, empresa, cargo
- Histórico de notas por contato
- **Upload de imagens** nas notas
- Integração com WhatsApp (link direto)

### Upload de Imagens - Como Funciona

Usamos **Multer**, uma biblioteca Node.js para upload de arquivos.

```javascript
// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salva na pasta do usuário
    const imagesDir = getUserImagesDir(req.user.email);
    cb(null, imagesDir);
  },
  filename: (req, file, cb) => {
    // Nome único: timestamp-uuid.extensao
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5MB
  fileFilter: (req, file, cb) => {
    // Só permite imagens
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    // ...
  }
});
```

O frontend envia a imagem via **FormData**:

```javascript
const formData = new FormData();
formData.append('content', 'Texto da nota');
formData.append('image', arquivoSelecionado);

await api.post(`/contacts/${contactId}/notes`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 9. Deploy no Render

### O que é o Render?

Render é uma plataforma de **hospedagem em nuvem**. Similar ao Heroku, mas com plano gratuito melhor. Você faz push do código e ele roda automaticamente.

### Por que Render?

- **Plano gratuito** com features suficientes
- **Disco persistente** (importante para SQLite!)
- **Deploy automático** via GitHub
- **SSL grátis** (https)

### Configuração (`render.yaml`)

```yaml
services:
  - type: web
    name: kanban-app
    env: node
    plan: free

    # Comandos de build
    buildCommand: |
      cd frontend && npm install && npm run build
      cd ../backend && npm install

    # Comando para iniciar
    startCommand: cd backend && npm start

    # Variáveis de ambiente
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true  # Render gera automaticamente

    # IMPORTANTE: Disco para persistir dados
    disk:
      name: data
      mountPath: /opt/render/project/src/backend/data
      sizeGB: 1
```

### Por que o Disco é Importante?

Sem disco persistente, **os dados seriam perdidos** a cada deploy ou reinício. O Render (e outras plataformas) rodam em containers que são "efêmeros" - tudo que não está no disco persistente some.

O disco de 1GB fica montado em `/opt/render/project/src/backend/data`, que é onde salvamos os bancos SQLite e imagens.

### Passo a Passo para Deploy

1. **Suba o código para GitHub**
```bash
git init
git add .
git commit -m "Primeiro commit"
git remote add origin https://github.com/seu-usuario/kanban-app.git
git push -u origin main
```

2. **Crie conta no Render** (render.com)

3. **Novo Web Service**
   - Conecte com GitHub
   - Selecione o repositório
   - Render detecta o `render.yaml` automaticamente

4. **Aguarde o deploy** (5-10 minutos)

5. **Acesse a URL** gerada (tipo `kanban-app.onrender.com`)

### Primeiro Acesso em Produção

O usuário master é criado automaticamente no primeiro acesso:
- **Email**: `cadumega@outlook.com`
- **Senha**: `cadu@2026`

Você pode mudar depois ou criar novos usuários pelo painel admin.

---

## 10. Escalabilidade Futura

### Limitações Atuais

O sistema atual funciona bem para:
- Até ~10-20 usuários simultâneos
- Até ~100 usuários totais
- Uso individual ou pequenos times

### Para Escalar Mais

Se precisar suportar centenas/milhares de usuários:

#### 1. Trocar SQLite por PostgreSQL

```
Atual:                          Futuro:
┌─────────────┐                 ┌─────────────┐
│   SQLite    │                 │ PostgreSQL  │
│  (arquivos) │      →          │  (servidor) │
└─────────────┘                 └─────────────┘
```

PostgreSQL suporta milhares de conexões simultâneas e é o padrão para produção.

#### 2. Usar Bucket S3 para Imagens

Ao invés de salvar imagens no disco:

```
Atual:                          Futuro:
┌─────────────┐                 ┌─────────────┐
│   Disco     │                 │  AWS S3 ou  │
│   Local     │      →          │ Cloudflare  │
└─────────────┘                 └─────────────┘
```

Vantagens:
- Armazenamento ilimitado
- CDN (carrega mais rápido)
- Mais confiável

#### 3. Mudar para Multi-Tenancy com Schemas

Ao invés de um banco por usuário:

```sql
-- Cada usuário tem seu próprio schema
CREATE SCHEMA user_123;
CREATE TABLE user_123.tasks (...);
```

Mais eficiente para muitos usuários, mas mais complexo de implementar.

#### 4. Adicionar Cache (Redis)

Para reduzir carga no banco:

```
Frontend → API → Redis (cache) → PostgreSQL
```

Redis guarda dados frequentes em memória = muito mais rápido.

### Custo Estimado para Escalar

| Escala | Infra Sugerida | Custo/mês |
|--------|----------------|-----------|
| Até 20 usuários | Render Free + Disco 1GB | $0 |
| 20-100 usuários | Render Starter + Disco 5GB | ~$7 |
| 100-500 usuários | Render + PostgreSQL | ~$25-50 |
| 500+ usuários | AWS/GCP + RDS + S3 | ~$100+ |

---

## 11. Comandos Úteis

### Desenvolvimento Local

```bash
# Iniciar backend (em uma aba do terminal)
cd backend
npm run dev

# Iniciar frontend (em outra aba)
cd frontend
npm run dev

# Acessar: http://localhost:5173
```

### Build para Produção

```bash
# Frontend (gera arquivos em backend/public)
cd frontend
npm run build

# Backend (roda a versão de produção)
cd backend
npm start
```

### Git

```bash
# Ver status
git status

# Commit de mudanças
git add .
git commit -m "Descrição da mudança"

# Enviar para GitHub (e trigger deploy no Render)
git push
```

### Banco de Dados

```bash
# Acessar banco via terminal (precisa do sqlite3 instalado)
sqlite3 backend/data/users/usuario@email.com/kanban.db

# Comandos SQL dentro do sqlite3:
.tables                    # Lista tabelas
.schema tasks              # Mostra estrutura da tabela
SELECT * FROM tasks;       # Lista todas as tarefas
.quit                      # Sair
```

### Logs do Render

```bash
# Na dashboard do Render:
# Services → kanban-app → Logs

# Ou via CLI do Render (precisa instalar):
render logs
```

---

## Glossário Rápido

| Termo | Significado |
|-------|-------------|
| **API** | Interface que permite sistemas se comunicarem |
| **REST** | Padrão de arquitetura para APIs web |
| **JWT** | Token de autenticação codificado |
| **Hash** | Transformação irreversível (usado para senhas) |
| **Middleware** | Código que roda entre requisição e resposta |
| **SQLite** | Banco de dados em arquivo único |
| **Multer** | Biblioteca para upload de arquivos |
| **Deploy** | Publicar aplicação em produção |
| **Container** | Ambiente isolado onde a aplicação roda |

---

## Conclusão

Este sistema foi construído pensando em **simplicidade e praticidade**. Cada decisão técnica foi tomada para facilitar:

- **SQLite**: Sem complicação de servidor de banco
- **Um banco por usuário**: Isolamento total, fácil backup
- **JWT**: Autenticação stateless, fácil de escalar
- **Render**: Deploy simples, custo zero inicial

Para as próximas fases, você pode:
1. Testar bem o sistema atual
2. Adicionar mais funcionalidades se necessário
3. Quando/se precisar escalar, migrar gradualmente

Qualquer dúvida, este documento serve como referência. Boa sorte com o projeto!

---

*Documentação gerada em Janeiro de 2026*
