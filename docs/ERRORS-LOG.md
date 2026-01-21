# Log de Erros e Soluções

Documento para registrar problemas encontrados durante o desenvolvimento e suas soluções.

---

## 2026-01-21 - Deploy e Melhorias de UX

### Erro 1: TypeScript - Imports não utilizados
**Contexto:** Build do frontend falhou

**Erro:**
```
src/components/Contacts/FunnelPanel.tsx(6,3): error TS6133: 'DollarSign' is declared but its value is never read.
src/components/Contacts/FunnelPanel.tsx(31,10): error TS6133: 'loading' is declared but its value is never read.
src/components/TaskCard/TaskCard.tsx(3,93): error TS6133: 'Minus' is declared but its value is never read.
```

**Causa:** Imports e variáveis declaradas mas não utilizadas no código.

**Solução:** Remover os imports e variáveis não utilizados:
```tsx
// Antes
import { X, TrendingUp, Users, DollarSign } from 'lucide-react';
const [loading, setLoading] = useState(false);

// Depois
import { X, TrendingUp, Users } from 'lucide-react';
// removido loading state
```

---

### Erro 2: Fly CLI não encontrado
**Contexto:** Tentativa de deploy no Fly.io

**Erro:**
```
(eval):1: command not found: fly
```

**Causa:** O CLI do Fly.io não está no PATH padrão do sistema.

**Solução:** Usar o caminho completo do executável:
```bash
# Ao invés de
fly deploy

# Usar
~/.fly/bin/fly deploy
```

---

### Erro 3: npm build no diretório errado
**Contexto:** Build do frontend

**Erro:**
```
npm error Missing script: "build"
```

**Causa:** Comando executado no diretório `/backend` ao invés de `/frontend`.

**Solução:** Navegar para o diretório correto antes de executar:
```bash
cd /Users/carlosmega/kanban-app/frontend && npm run build
```

---

### Erro 4: Token do Vercel expirado
**Contexto:** Deploy no Vercel via CLI

**Erro:**
```
Error: The specified token is not valid. Use `vercel login` to generate a new token.
```

**Causa:** Token de autenticação do Vercel expirou ou foi revogado.

**Solução alternativa:** Fazer push para o GitHub para acionar deploy automático:
```bash
git add -A
git commit -m "feat: descrição das mudanças"
git push origin main
```

**Solução definitiva:** Fazer login novamente no Vercel:
```bash
npx vercel login
```

---

### Erro 5: Vercel CLI requer confirmação
**Contexto:** Deploy no Vercel via CLI

**Erro:**
```
Error: Command `vercel deploy` requires confirmation. Use option "--yes" to confirm.
```

**Causa:** CLI do Vercel requer confirmação interativa.

**Solução:** Adicionar flag `--yes`:
```bash
npx vercel --prod --yes
```

---

## Template para novos erros

### Erro: [Título descritivo]
**Contexto:** [Onde/quando ocorreu]

**Erro:**
```
[Mensagem de erro completa]
```

**Causa:** [Explicação do que causou o erro]

**Solução:**
```bash
[Código ou comando que resolveu]
```

---

## Dicas Gerais

### Build do Frontend
```bash
# Desenvolvimento local (output para backend/public)
cd frontend && npm run build

# Para Vercel (output para dist)
cd frontend && VERCEL=1 npm run build
```

### Deploy
```bash
# Backend (Fly.io)
cd backend && ~/.fly/bin/fly deploy

# Frontend (via GitHub)
git push origin main
```

### Verificar erros de TypeScript antes do commit
```bash
cd frontend && npx tsc --noEmit
```
