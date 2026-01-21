# Deploy no Fly.io + Vercel (Guia Conversacional)

Esse guia documenta o processo que fizemos para colocar o Kanban App online, de graça, com dados persistentes.

---

## Por que Fly.io + Vercel?

Antes a gente tentou o Render, mas tinha um problema: **no plano grátis os dados sumiam** quando o servidor reiniciava. Isso porque o SQLite salva num arquivo, e o Render não mantém arquivos no free tier.

Pesquisei alternativas e o **Fly.io** se destacou:
- Tem **volume persistente grátis** (até 3GB)
- Servidor em São Paulo (baixa latência)
- Auto-sleep quando não usa (economia)

Para o **frontend**, a **Vercel** é perfeita:
- Deploy automático do GitHub
- Grátis pra projetos pessoais
- Muito rápido

**Resumo dos custos:**
| Serviço | Custo |
|---------|-------|
| Fly.io (backend) | $0 |
| Vercel (frontend) | $0 |
| **Total** | **$0/mês** |

---

## Parte 1: Deploy do Backend no Fly.io

### 1.1 Instalar o CLI do Fly

```bash
curl -L https://fly.io/install.sh | sh
```

Depois adiciona no PATH (ou reinicia o terminal):
```bash
export PATH="$HOME/.fly/bin:$PATH"
```

### 1.2 Fazer login

```bash
fly auth login
```

Vai abrir o navegador pra você logar. Cria uma conta se não tiver.

**Obs:** O Fly.io pede cartão de crédito pra verificação, mas **não cobra nada** no free tier.

### 1.3 Preparar o projeto

Primeiro, precisamos de um **Dockerfile** no backend. Ele diz pro Fly como rodar nossa aplicação:

```dockerfile
# backend/Dockerfile
FROM node:20-slim

# Instala dependências pra compilar o better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Cria pasta de dados (será o volume)
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
```

### 1.4 Configurar o fly.toml

Esse arquivo diz pro Fly como configurar o app:

```toml
# backend/fly.toml
app = 'kanban-api-cadu'
primary_region = 'gru'  # São Paulo

[env]
  NODE_ENV = 'production'
  DATA_DIR = '/data'      # Onde o volume vai ser montado
  PORT = '3000'

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'   # Desliga quando não usa
  auto_start_machines = true    # Liga quando recebe request

[[mounts]]
  source = 'kanban_data'        # Nome do volume
  destination = '/data'          # Onde montar

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

### 1.5 Ajustar o código pra usar o volume

No `userDb.js`, mudamos pra ler o caminho do banco de uma variável de ambiente:

```javascript
// Antes:
const dataDir = path.join(__dirname, '../../data');

// Depois:
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
```

Assim, localmente usa `backend/data/`, mas no Fly usa `/data/` (o volume).

### 1.6 Criar o app e volume

```bash
cd backend

# Cria o app (sem fazer deploy ainda)
fly launch --copy-config --yes --no-deploy

# Cria o volume de 1GB em São Paulo
fly volumes create kanban_data --region gru --size 1 --yes
```

### 1.7 Configurar secrets

O JWT_SECRET precisa ser secreto, então usamos `fly secrets`:

```bash
fly secrets set JWT_SECRET="$(openssl rand -base64 32)"
fly secrets set PORT=3000
```

### 1.8 Deploy!

```bash
fly deploy
```

Aguarda uns 2-3 minutos. Quando terminar, testa:

```bash
curl https://kanban-api-cadu.fly.dev/api/health
# Deve retornar: {"status":"ok","timestamp":"..."}
```

**Pronto!** Backend no ar com dados persistentes.

---

## Parte 2: Deploy do Frontend na Vercel

### 2.1 Configurar URL da API

Cria um arquivo `.env.production` no frontend:

```env
VITE_API_URL=https://kanban-api-cadu.fly.dev/api
```

E atualiza o `api.ts` pra usar essa variável:

```typescript
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
});
```

### 2.2 Ajustar o build pra Vercel

O Vite estava configurado pra gerar o build em `../backend/public` (pra rodar tudo junto localmente). Mas a Vercel espera em `dist`.

Solução: detectar automaticamente:

```typescript
// vite.config.ts
const outDir = process.env.VERCEL ? 'dist' : '../backend/public'

export default defineConfig({
  build: {
    outDir,
    emptyOutDir: true
  },
  // ...
})
```

### 2.3 Deploy na Vercel

1. Acesse https://vercel.com e logue com GitHub
2. Clique **"Add New Project"**
3. Importe o repositório `kanban-app`
4. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
5. Clique **Deploy**

A Vercel vai:
1. Detectar que é um projeto Vite
2. Rodar `npm install` e `npm run build`
3. Servir os arquivos estáticos

**Pronto!** Frontend no ar.

---

## Parte 3: Problemas que encontramos

### Erro: "404 NOT_FOUND" na Vercel

**Causa:** A Vercel não sabia que o frontend estava na pasta `frontend`.

**Solução:** Configurar "Root Directory" como `frontend` nas settings do projeto.

### Erro: "No Output Directory named 'dist'"

**Causa:** O Vite estava gerando o build em `../backend/public` em vez de `dist`.

**Solução:** Adicionar detecção automática no `vite.config.ts`:
```typescript
const outDir = process.env.VERCEL ? 'dist' : '../backend/public'
```

### Erro: TypeScript errors no build

**Causa:** Variáveis declaradas mas não usadas, tipos incompatíveis.

**Solução:** Corrigir os erros de TS antes do push:
- Remover variáveis duplicadas
- Adicionar `?` em propriedades opcionais
- Criar `vite-env.d.ts` pra tipos do `import.meta.env`

### Erro: "could not find a good candidate" no Fly.io

**Causa:** O servidor estava rodando na porta 3001, mas o Fly esperava 3000.

**Solução:** Adicionar `PORT=3000` nos secrets:
```bash
fly secrets set PORT=3000
```

---

## Parte 4: Comandos úteis do dia-a-dia

### Fly.io

```bash
# Ver status do app
fly status

# Ver logs em tempo real
fly logs

# Acessar o servidor via SSH
fly ssh console

# Listar volumes
fly volumes list

# Fazer novo deploy após mudanças
cd backend && fly deploy

# Ver secrets configurados
fly secrets list
```

### Vercel

A Vercel faz deploy automático quando você dá push no GitHub. Mas se precisar:

```bash
# Instalar CLI (opcional)
npm i -g vercel

# Deploy manual
cd frontend && vercel --prod
```

---

## Parte 5: Arquitetura final

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│     Vercel      │◄───────►│     Fly.io      │
│   (Frontend)    │  HTTPS  │    (Backend)    │
│                 │         │                 │
│  React + Vite   │         │ Node + Express  │
│                 │         │                 │
└─────────────────┘         └────────┬────────┘
                                     │
                                     │
                            ┌────────▼────────┐
                            │                 │
                            │  Volume /data   │
                            │    (1GB)        │
                            │                 │
                            │  SQLite DBs     │
                            │  + Imagens      │
                            │                 │
                            └─────────────────┘
```

**Fluxo:**
1. Usuário acessa `kanban-app-five-snowy.vercel.app`
2. Vercel serve o React
3. React faz requests pra `kanban-api-cadu.fly.dev/api`
4. Fly.io processa e salva no SQLite (volume persistente)

---

## Parte 6: URLs finais

| O que | URL |
|-------|-----|
| **App (Frontend)** | https://kanban-app-five-snowy.vercel.app |
| **API (Backend)** | https://kanban-api-cadu.fly.dev |
| **Health Check** | https://kanban-api-cadu.fly.dev/api/health |
| **GitHub** | https://github.com/cadumega/kanban-app |

---

## Resumo

1. **Fly.io** hospeda o backend Node.js com SQLite
2. **Volume persistente** garante que dados não se perdem
3. **Vercel** hospeda o frontend React
4. **Tudo grátis** (free tier de ambos)
5. **Auto-deploy** no push pro GitHub

Qualquer dúvida, é só rodar `fly logs` pra ver o que tá acontecendo no backend ou checar os logs de deploy na Vercel.
