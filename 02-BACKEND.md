# Backend Explicado para Iniciantes

## O que é o Backend?

Imagine um restaurante:
- **Frontend** = O salão onde o cliente vê o cardápio e faz pedidos
- **Backend** = A cozinha onde a comida é preparada e armazenada
- **Banco de Dados** = A geladeira/despensa onde os ingredientes ficam guardados

O frontend é bonito, mas ele não sabe cozinhar. Ele só sabe pedir. Quem faz o trabalho pesado é o backend.

---

## Como o Frontend e Backend Conversam?

Eles usam **HTTP** (o mesmo protocolo que seu navegador usa para acessar sites).

```
[Frontend]  ----pedido HTTP---->  [Backend]
   React                           Node.js
                                      |
                                      v
                                  [SQLite]
                                  Banco de Dados
```

### Exemplo prático:

1. Você clica em "Criar Tarefa" no frontend
2. Frontend envia um pedido: `POST /api/tasks` com os dados da tarefa
3. Backend recebe, valida e salva no banco
4. Backend responde: "Tarefa criada com sucesso!" + dados da tarefa
5. Frontend atualiza a tela

---

## Estrutura do Nosso Backend

```
backend/
├── src/
│   ├── index.js           # Arquivo principal (servidor)
│   ├── database/
│   │   └── init.js        # Configuração do banco de dados
│   └── routes/
│       ├── columns.js     # Rotas de colunas
│       ├── tasks.js       # Rotas de tarefas
│       └── categories.js  # Rotas de categorias
├── package.json           # Dependências do projeto
└── kanban.db              # Arquivo do banco SQLite
```

---

## Arquivo por Arquivo

### 1. package.json - As Dependências

```json
{
  "dependencies": {
    "express": "^4.18.2",      // Framework web (recebe pedidos HTTP)
    "better-sqlite3": "^9.2.2", // Banco de dados SQLite
    "uuid": "^9.0.0",          // Gera IDs únicos
    "cors": "^2.8.5"           // Permite frontend acessar backend
  }
}
```

**Por que precisamos de cada um?**

- **Express**: É tipo um garçom. Recebe os pedidos e direciona para o lugar certo
- **better-sqlite3**: É a geladeira. Guarda e busca os dados
- **uuid**: Gera códigos únicos tipo `550e8400-e29b-41d4-a716-446655440000`
- **cors**: Sem isso, o navegador bloqueia o frontend de falar com o backend

---

### 2. index.js - O Servidor Principal

```javascript
// Importa as ferramentas
const express = require('express');
const cors = require('cors');

// Importa as rotas (cada arquivo cuida de uma coisa)
const columnsRoutes = require('./routes/columns');
const tasksRoutes = require('./routes/tasks');
const categoriesRoutes = require('./routes/categories');

// Cria o aplicativo Express
const app = express();

// Middlewares (funções que rodam antes de cada pedido)
app.use(cors());              // Permite acesso de outros domínios
app.use(express.json());      // Entende JSON no corpo dos pedidos

// Conecta as rotas
// Quando alguém acessar /api/columns, usa o arquivo columns.js
app.use('/api/columns', columnsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/categories', categoriesRoutes);

// Liga o servidor na porta 3001
app.listen(3001, () => {
  console.log('Servidor rodando em http://localhost:3001');
});
```

**Analogia do Restaurante:**
- `app` = O restaurante inteiro
- `app.use(cors())` = Aceitar clientes de qualquer lugar
- `app.use(express.json())` = Entender pedidos escritos em JSON
- `app.use('/api/columns', ...)` = "Pedidos de colunas vão para a cozinha A"
- `app.listen(3001)` = "Abrimos as portas na porta 3001!"

---

### 3. database/init.js - O Banco de Dados

```javascript
const Database = require('better-sqlite3');

// Cria/abre o arquivo do banco de dados
const db = new Database('kanban.db');

// Cria as tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS columns (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    color TEXT DEFAULT '#6366F1',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    column_id TEXT,
    position INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'media',
    value REAL DEFAULT 0,
    points INTEGER DEFAULT 0,
    blocked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Exporta para outros arquivos usarem
module.exports = db;
```

**O que é SQLite?**
- É um banco de dados que fica em UM ARQUIVO só (`kanban.db`)
- Não precisa instalar nada separado (tipo MySQL ou PostgreSQL)
- Perfeito para projetos pequenos/médios
- O arquivo fica na pasta do projeto

**O que é uma Tabela?**
Pense como uma planilha do Excel:

```
Tabela: tasks
+------+------------------+----------+----------+
|  id  |      title       | priority |  value   |
+------+------------------+----------+----------+
| abc1 | Fazer login      | alta     | 1000     |
| abc2 | Criar dashboard  | media    | 500      |
| abc3 | Corrigir bug     | baixa    | 0        |
+------+------------------+----------+----------+
```

---

### 4. routes/tasks.js - As Rotas de Tarefas

Este é o arquivo mais importante. Vamos ver pedaço por pedaço:

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

// Cria um "mini-app" só para tarefas
const router = express.Router();
```

#### GET - Buscar todas as tarefas

```javascript
// Quando alguém fizer GET /api/tasks
router.get('/', (req, res) => {
  // Busca todas as tarefas no banco
  const tasks = db.prepare('SELECT * FROM tasks').all();

  // Retorna como JSON
  res.json(tasks);
});
```

**O que acontece:**
1. Frontend faz: `GET http://localhost:3001/api/tasks`
2. Backend executa o SQL: `SELECT * FROM tasks`
3. Banco retorna todas as linhas da tabela
4. Backend envia de volta como JSON

#### POST - Criar nova tarefa

```javascript
// Quando alguém fizer POST /api/tasks
router.post('/', (req, res) => {
  // Pega os dados que vieram no corpo do pedido
  const { title, description, column_id, priority } = req.body;

  // Gera um ID único
  const id = uuidv4();

  // Insere no banco de dados
  db.prepare(`
    INSERT INTO tasks (id, title, description, column_id, priority)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, title, description, column_id, priority);

  // Busca a tarefa recém criada
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Retorna a tarefa criada
  res.status(201).json(task);
});
```

**O que é `req.body`?**
É o corpo do pedido. Quando o frontend envia:
```javascript
fetch('/api/tasks', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Minha tarefa',
    priority: 'alta'
  })
})
```

O `req.body` vai conter: `{ title: 'Minha tarefa', priority: 'alta' }`

**O que são os `?` no SQL?**
São placeholders de segurança. Evitam SQL Injection (um tipo de ataque).

```javascript
// ERRADO (vulnerável):
db.prepare(`INSERT INTO tasks (title) VALUES ('${title}')`);

// CERTO (seguro):
db.prepare('INSERT INTO tasks (title) VALUES (?)').run(title);
```

#### PUT - Atualizar tarefa

```javascript
router.put('/:id', (req, res) => {
  // :id vem da URL. Ex: PUT /api/tasks/abc123
  const { id } = req.params;

  // Dados novos vêm do corpo
  const { title, description, priority } = req.body;

  // Atualiza no banco
  db.prepare(`
    UPDATE tasks
    SET title = ?, description = ?, priority = ?
    WHERE id = ?
  `).run(title, description, priority, id);

  // Retorna a tarefa atualizada
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(task);
});
```

**O que é `req.params`?**
São os valores da URL. Se a rota é `/:id` e alguém acessa `/api/tasks/abc123`:
- `req.params.id` = `'abc123'`

#### DELETE - Excluir tarefa

```javascript
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Deleta do banco
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

  // Retorna sucesso (204 = No Content)
  res.status(204).send();
});
```

---

## Os Verbos HTTP (Métodos)

| Verbo  | Significado | Exemplo |
|--------|-------------|---------|
| GET    | Buscar dados | Listar tarefas |
| POST   | Criar novo | Criar tarefa |
| PUT    | Atualizar | Editar tarefa |
| DELETE | Excluir | Remover tarefa |

**Analogia:**
- GET = "Me mostra o cardápio"
- POST = "Quero fazer um pedido novo"
- PUT = "Troca o refrigerante por suco"
- DELETE = "Cancela meu pedido"

---

## Códigos de Status HTTP

| Código | Significado | Quando usar |
|--------|-------------|-------------|
| 200 | OK | Deu tudo certo |
| 201 | Created | Algo foi criado com sucesso |
| 204 | No Content | Deletou com sucesso |
| 400 | Bad Request | Pedido mal formatado |
| 404 | Not Found | Não encontrou o recurso |
| 500 | Server Error | Erro interno do servidor |

---

## SQL Básico

SQL é a linguagem para falar com o banco de dados.

### SELECT - Buscar dados
```sql
-- Buscar todas as tarefas
SELECT * FROM tasks;

-- Buscar só título e prioridade
SELECT title, priority FROM tasks;

-- Buscar com filtro
SELECT * FROM tasks WHERE priority = 'alta';

-- Buscar ordenado
SELECT * FROM tasks ORDER BY created_at DESC;
```

### INSERT - Inserir dados
```sql
INSERT INTO tasks (id, title, priority)
VALUES ('abc123', 'Minha tarefa', 'alta');
```

### UPDATE - Atualizar dados
```sql
UPDATE tasks
SET title = 'Novo título', priority = 'baixa'
WHERE id = 'abc123';
```

### DELETE - Remover dados
```sql
DELETE FROM tasks WHERE id = 'abc123';
```

---

## Fluxo Completo: Criar uma Tarefa

```
1. [Usuário] Clica em "Nova Tarefa" e preenche o formulário

2. [Frontend - TaskModal.tsx]
   Coleta os dados e chama a API:

   await api.post('/tasks', {
     title: 'Fazer relatório',
     priority: 'alta',
     column_id: 'col-1'
   });

3. [Frontend - api.ts]
   Faz o pedido HTTP:

   POST http://localhost:3001/api/tasks
   Content-Type: application/json
   Body: {"title": "Fazer relatório", ...}

4. [Backend - index.js]
   Recebe o pedido e direciona:

   "É /api/tasks? Manda pro routes/tasks.js!"

5. [Backend - routes/tasks.js]
   Processa o POST:

   const { title, priority, column_id } = req.body;
   const id = uuidv4(); // Gera: "550e8400-e29b..."

   db.prepare('INSERT INTO tasks...').run(...);

6. [SQLite - kanban.db]
   Salva no arquivo:

   +------------+------------------+----------+
   | id         | title            | priority |
   +------------+------------------+----------+
   | 550e8400.. | Fazer relatório  | alta     |
   +------------+------------------+----------+

7. [Backend]
   Responde com a tarefa criada:

   res.status(201).json(task);

8. [Frontend - useBoard.ts]
   Recebe a resposta e atualiza o estado:

   setColumns(prev => [...prev, newTask]);

9. [Frontend - React]
   Re-renderiza a tela com a nova tarefa
```

---

## Testando o Backend sem Frontend

Você pode testar o backend usando o terminal:

```bash
# Listar todas as tarefas
curl http://localhost:3001/api/tasks

# Criar uma tarefa
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title": "Teste", "column_id": "sua-column-id", "priority": "alta"}'

# Deletar uma tarefa
curl -X DELETE http://localhost:3001/api/tasks/id-da-tarefa
```

Ou use ferramentas visuais:
- **Postman** (app)
- **Insomnia** (app)
- **Thunder Client** (extensão VS Code)

---

## Resumo

| Conceito | O que é | No nosso projeto |
|----------|---------|------------------|
| Express | Framework web | Recebe pedidos HTTP |
| Rotas | Caminhos da API | `/api/tasks`, `/api/columns` |
| req.body | Corpo do pedido | Dados enviados pelo frontend |
| req.params | Parâmetros da URL | ID da tarefa |
| res.json() | Envia resposta | Retorna dados ao frontend |
| SQLite | Banco de dados | Arquivo `kanban.db` |
| SQL | Linguagem do banco | SELECT, INSERT, UPDATE, DELETE |

---

## Exercícios para Praticar

1. **Fácil**: Adicione um `console.log` em cada rota para ver quando é chamada
2. **Médio**: Crie uma rota `GET /api/tasks/count` que retorna quantas tarefas existem
3. **Difícil**: Crie uma rota `GET /api/tasks/blocked` que retorna só tarefas bloqueadas

---

---

## Sistema de Autenticação (Novo!)

Agora o sistema tem login! Veja como funciona:

### O que é JWT?

JWT (JSON Web Token) é um "passe" que o usuário ganha ao fazer login. Funciona assim:

```
1. Usuário faz login (email + senha)
2. Backend verifica se está correto
3. Se OK, gera um TOKEN (string codificada)
4. Frontend guarda o token no localStorage
5. A cada pedido, frontend envia o token
6. Backend verifica se o token é válido
```

**Analogia**: É como uma pulseira de evento. Você entra uma vez (login), ganha a pulseira (token), e pode acessar qualquer área sem mostrar documento de novo.

### Estrutura do Token JWT

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImFiYyIsImVtYWlsIjoidGVzdGVAZXhhbXBsZS5jb20ifQ.asdfgh
|_____Header_____|.____________Payload______________|._____Assinatura_____|
```

- **Header**: Tipo do token
- **Payload**: Dados do usuário (id, email, role)
- **Assinatura**: Prova que é válido (usa uma senha secreta)

### Middleware de Autenticação

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'segredo';

const authMiddleware = (req, res, next) => {
  // Pega o token do header
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    // Verifica se o token é válido
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;  // Adiciona dados do usuário ao request
    next();              // Continua para o próximo passo
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
};
```

### Como a Senha é Protegida?

Usamos **bcrypt** para "embaralhar" a senha de forma irreversível:

```javascript
const bcrypt = require('bcryptjs');

// Ao criar usuário
const hash = bcrypt.hashSync('minhaSenha123', 10);
// Resultado: $2a$10$N9qo8uLOickgx2ZMRZoMy... (impossível reverter!)

// Ao fazer login
const senhaCorreta = bcrypt.compareSync('minhaSenha123', hashDoBanco);
// Retorna true ou false
```

---

## Sistema Multi-Usuário (Novo!)

Cada usuário tem seu próprio banco de dados. Por quê?

### Opções que existem:

| Abordagem | Descrição | Usamos? |
|-----------|-----------|---------|
| user_id em cada tabela | Uma coluna identificando o dono | Não |
| Um banco por usuário | Arquivo separado para cada um | **Sim!** |

### Por que um banco por usuário?

1. **Isolamento total**: Dados nunca se misturam
2. **Backup fácil**: Copiar um arquivo = backup do usuário
3. **Simples de implementar**: Não precisa mudar todas as queries
4. **Perfeito para testes**: Fácil deletar/recriar

### Como funciona:

```
data/
├── users.db                      # Só tem os usuários
└── users/
    ├── joao@empresa.com/
    │   ├── kanban.db             # Dados do João
    │   └── images/               # Imagens do João
    └── maria@empresa.com/
        ├── kanban.db             # Dados da Maria
        └── images/               # Imagens da Maria
```

### O Middleware que Injeta o Banco

```javascript
// Em index.js
const injectUserDb = (req, res, next) => {
  // req.user vem do authMiddleware (tem o email)
  req.db = getUserDb(req.user.email);  // Abre o banco do usuário
  next();
};

// Uso nas rotas:
app.use('/api/tasks', authMiddleware, injectUserDb, tasksRoutes);
//                     ↑ verifica login   ↑ pega banco do usuário
```

### Nas rotas, usamos req.db:

```javascript
// Antes (banco global):
const db = require('../database/init');
const tasks = db.prepare('SELECT * FROM tasks').all();

// Agora (banco do usuário):
const tasks = req.db.prepare('SELECT * FROM tasks').all();
```

---

## Migrações de Banco

Quando adicionamos novas colunas, precisamos atualizar bancos existentes:

```javascript
function migrateUserDb(db) {
  // Verifica se a coluna existe
  const tableInfo = db.prepare("PRAGMA table_info(contact_notes)").all();
  const hasImagePath = tableInfo.some(col => col.name === 'image_path');

  // Se não existe, adiciona
  if (!hasImagePath) {
    db.exec('ALTER TABLE contact_notes ADD COLUMN image_path TEXT');
  }

  // Verifica se a coluna city existe em contacts
  const contactsInfo = db.prepare("PRAGMA table_info(contacts)").all();
  const hasCity = contactsInfo.some(col => col.name === 'city');
  if (!hasCity) {
    db.exec('ALTER TABLE contacts ADD COLUMN city TEXT DEFAULT NULL');
  }
}
```

Isso roda automaticamente quando o banco é aberto.

---

## Upload de Imagens (Novo!)

Usamos **Multer** para receber arquivos:

```javascript
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Salva na pasta do usuário
    cb(null, `data/users/${req.user.email}/images`);
  },
  filename: (req, file, cb) => {
    // Nome único: timestamp-uuid.extensao
    cb(null, `${Date.now()}-${uuidv4()}.jpg`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max 5MB
});

// Uso na rota:
router.post('/notes', upload.single('image'), (req, res) => {
  const imagePath = req.file?.filename;  // Nome do arquivo salvo
  // ... salva no banco
});
```

---

## Resumo das Novidades

| Recurso | Antes | Agora |
|---------|-------|-------|
| Login | Não tinha | JWT + bcrypt |
| Dados | Um banco global | Um banco por usuário |
| Imagens | Não tinha | Upload com Multer |
| Rotas | Abertas | Protegidas com middleware |

---

## API de Contatos e Follow-ups (CRM)

O CRM tem endpoints para gerenciar contatos, notas e follow-ups.

### Rotas de Contatos

```javascript
// Listar todos os contatos (com contagem de notas)
GET /api/contacts

// Detalhes de um contato (com notas)
GET /api/contacts/:id

// Criar contato
POST /api/contacts
Body: { name, email, phone, company, role, tag, city }

// Atualizar contato
PUT /api/contacts/:id

// Excluir contato (também exclui notas e imagens)
DELETE /api/contacts/:id
```

### Rotas de Notas (com upload de imagem)

```javascript
// Adicionar nota (com imagem opcional)
POST /api/contacts/:id/notes
Body: FormData { content, image }

// Excluir nota
DELETE /api/contacts/:contactId/notes/:noteId

// Servir imagem
GET /api/contacts/images/:filename
```

### Rotas de Follow-ups

```javascript
// Listar todos os follow-ups pendentes (para o painel)
GET /api/contacts/followups/pending
// Retorna: { ...followup, contact_name, contact_company, contact_city, contact_tag }

// Follow-ups de um contato
GET /api/contacts/:id/followups

// Criar follow-up
POST /api/contacts/:id/followups
Body: { date, description }

// Atualizar follow-up (marcar completo ou editar)
PUT /api/contacts/:contactId/followups/:followupId
Body: { date, description, completed }

// Excluir follow-up
DELETE /api/contacts/:contactId/followups/:followupId
```

### Exemplo: Buscar Follow-ups Pendentes

O endpoint `/api/contacts/followups/pending` usa JOIN para trazer dados do contato:

```javascript
const followups = db.prepare(`
  SELECT f.*,
    c.name as contact_name,
    c.company as contact_company,
    c.city as contact_city,
    c.tag as contact_tag
  FROM contact_followups f
  JOIN contacts c ON f.contact_id = c.id
  WHERE f.completed = 0
  ORDER BY f.date ASC
`).all();
```

Isso permite exibir badges de cidade e tag do funil no painel de follow-ups.

---

## Próximos Passos de Aprendizado

1. **Validação** - Verificar se os dados estão corretos antes de salvar
2. **Tratamento de Erros** - O que fazer quando algo dá errado
3. ~~**Autenticação**~~ ✅ Já implementado!
4. **Relacionamentos** - Como conectar tabelas (JOIN) ✅ Usado nos follow-ups!
5. ~~**Migrations**~~ ✅ Já implementado!
6. **Escalabilidade** - Migrar para PostgreSQL quando necessário

---

*Documentação atualizada em Fevereiro de 2026*
