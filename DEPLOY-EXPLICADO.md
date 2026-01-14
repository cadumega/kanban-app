# Como Publicar seu App - Guia Completo

## Visão Geral

Para colocar seu app online, você precisa de 3 coisas:

```
1. GitHub       → Guardar seu código (gratuito)
2. Hospedagem   → Servidor para rodar o app (tem opções gratuitas)
3. Banco de Dados → Onde os dados ficam salvos (tem opções gratuitas)
```

---

## Passo 1: Subir para o GitHub

### 1.1 Criar conta no GitHub (se não tiver)
Acesse: https://github.com/signup

### 1.2 Criar repositório
1. Clique em "New repository"
2. Nome: `kanban-app`
3. Deixe público ou privado
4. NÃO marque "Add README" (já temos)
5. Clique "Create repository"

### 1.3 Subir o código (comandos)
```bash
cd /Users/carlosmega/kanban-app

# Inicializar git (se não tiver)
git init

# Adicionar todos os arquivos
git add .

# Criar primeiro commit
git commit -m "Primeiro commit - Kanban App completo"

# Conectar ao GitHub (troque SEU_USUARIO pelo seu)
git remote add origin https://github.com/SEU_USUARIO/kanban-app.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

Pronto! Seu código está no GitHub.

---

## Passo 2: Escolher Onde Hospedar

### Opções Gratuitas Populares (2024/2025):

| Serviço | Frontend | Backend | Banco | Facilidade |
|---------|----------|---------|-------|------------|
| **Railway** | ✅ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **Render** | ✅ | ✅ | ✅ | ⭐⭐⭐⭐ |
| **Vercel + Supabase** | ✅ | ❌ | ✅ | ⭐⭐⭐ |
| **Fly.io** | ✅ | ✅ | ✅ | ⭐⭐⭐ |

**Recomendação para iniciantes: Railway** (mais fácil, tudo em um lugar)

---

## Passo 3: Deploy com Railway (Mais Fácil)

### 3.1 Criar conta
1. Acesse https://railway.app
2. Clique "Login with GitHub"
3. Autorize o acesso

### 3.2 Criar projeto
1. Clique "New Project"
2. Selecione "Deploy from GitHub repo"
3. Escolha seu repositório `kanban-app`

### 3.3 Configurar Backend
1. Railway detecta automaticamente que é Node.js
2. Adicione variável de ambiente:
   - `PORT` = `3001`
3. O backend vai rodar automaticamente

### 3.4 Configurar Frontend
1. Crie outro serviço no mesmo projeto
2. Aponte para a pasta `/frontend`
3. Comando de build: `npm run build`
4. Comando de start: `npm run preview`

### 3.5 Banco de Dados
**Problema com SQLite**: SQLite salva num arquivo local. Em servidores na nuvem, esse arquivo pode ser apagado quando o servidor reinicia.

**Soluções**:

**Opção A - Manter SQLite (mais simples, funciona no Railway)**
- Railway permite "volumes" que persistem arquivos
- Funciona, mas tem limitações

**Opção B - Migrar para PostgreSQL (recomendado para produção)**
- Railway oferece PostgreSQL grátis
- Mais robusto e profissional
- Requer mudanças no código (não é difícil)

---

## Entendendo Custos de Banco de Dados

### SQLite (o que você usa agora)
```
Custo: R$ 0 (gratuito)
Como funciona: É um arquivo no seu computador (kanban.db)
Limite: Tamanho do seu HD
Problema: Não funciona bem na nuvem sem configuração extra
```

### PostgreSQL/MySQL na Nuvem

| Serviço | Plano Grátis | Limite |
|---------|--------------|--------|
| **Supabase** | Sim | 500MB, 2 projetos |
| **Railway** | Sim | $5/mês de crédito grátis |
| **Neon** | Sim | 512MB |
| **PlanetScale** | Sim | 1GB |
| **Turso** | Sim | 8GB (SQLite na nuvem!) |

**Para seu app Kanban**: Qualquer plano grátis é mais que suficiente!

### Quanto espaço seu app usa?
```
1 tarefa ≈ 500 bytes
1.000 tarefas ≈ 500 KB
10.000 tarefas ≈ 5 MB
100.000 tarefas ≈ 50 MB

Plano grátis (500MB) = ~1 milhão de tarefas
```

Ou seja: **você nunca vai pagar** para uso pessoal.

---

## Deploy Passo a Passo com Railway

### Preparar o código para deploy:

**1. Criar arquivo `railway.json` na raiz:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**2. Atualizar `backend/package.json`:**
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  }
}
```

**3. Configurar variáveis de ambiente no Railway:**
- `PORT`: será definido automaticamente pelo Railway

---

## Alternativa Super Fácil: Vercel (só Frontend)

Se quiser só mostrar o frontend (sem salvar dados):

1. Acesse https://vercel.com
2. Login com GitHub
3. Import seu repositório
4. Selecione a pasta `frontend`
5. Deploy automático!

**Limitação**: Sem backend, os dados não salvam.

---

## Migrar SQLite → PostgreSQL (Opcional)

Se quiser fazer a migração para PostgreSQL, as mudanças são:

### 1. Instalar dependência
```bash
cd backend
npm install pg
```

### 2. Mudar conexão do banco
```javascript
// Antes (SQLite)
const Database = require('better-sqlite3');
const db = new Database('kanban.db');

// Depois (PostgreSQL)
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

### 3. Ajustar queries
```javascript
// SQLite (síncrono)
const tasks = db.prepare('SELECT * FROM tasks').all();

// PostgreSQL (assíncrono)
const { rows: tasks } = await pool.query('SELECT * FROM tasks');
```

---

## Resumo: Caminho Mais Fácil

```
1. Suba o código pro GitHub (5 min)
2. Crie conta no Railway (2 min)
3. Conecte o repositório (2 min)
4. Configure variáveis (2 min)
5. Deploy automático! ✅

Total: ~15 minutos
Custo: R$ 0
```

---

## Checklist Final

- [ ] Código no GitHub
- [ ] Conta no Railway/Render/Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] Testar se funciona online
- [ ] Compartilhar link com amigos!

---

## Links Úteis

- **Railway**: https://railway.app
- **Render**: https://render.com
- **Vercel**: https://vercel.com
- **Supabase** (banco PostgreSQL): https://supabase.com
- **Turso** (SQLite na nuvem): https://turso.tech

---

## Dúvidas Comuns

**P: Preciso pagar algo?**
R: Não para uso pessoal. Planos gratuitos são suficientes.

**P: E se meu app ficar famoso?**
R: Aí você migra para plano pago (~$5-20/mês). Problema bom de ter!

**P: Meus dados estão seguros?**
R: Sim, os serviços são confiáveis. Mas faça backups.

**P: Posso usar domínio próprio?**
R: Sim! Todos os serviços permitem conectar seu domínio.

---

*Guia criado em Janeiro/2026*
