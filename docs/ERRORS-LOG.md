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

**Solução:** Fazer login novamente no Vercel:
```bash
cd frontend && npx vercel login
```
Isso abre o navegador para autenticar. Após login, deploy normalmente:
```bash
npx vercel --prod --yes
```

**Solução alternativa:** Fazer push para o GitHub (se conectado ao Vercel):
```bash
git push origin main
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

## 2026-02-05 - Correções de UX no CRM

### Bug 6: Grid da tabela do CRM desalinhado
**Contexto:** Modo tabela (lista) do CRM - colunas não mostravam dados

**Problema:** O CSS usava `grid-template-columns` com 7 colunas, mas o HTML tinha estrutura aninhada (checkbox + botão com conteúdo). Os dados ficavam todos empilhados na primeira coluna.

**Causa:** O header usava um grid flat, mas as rows tinham checkbox + botão wrapper. O grid não se propagava para os elementos internos do botão.

**Solução:** Reestruturar para grid de 2 colunas no nível da row (checkbox + conteúdo), e criar um sub-grid no conteúdo:
```css
/* Row: 2 colunas */
.contacts-panel__list-row {
  grid-template-columns: 40px 1fr;
}

/* Conteúdo: 5 sub-colunas */
.contacts-panel__list-row-content {
  display: grid;
  grid-template-columns: 1.8fr 1.5fr 1fr 100px 80px;
}

/* Header: mesma estrutura */
.contacts-panel__list-header-cols {
  grid-template-columns: 1.8fr 1.5fr 1fr 100px 80px;
}
```

---

### Bug 7: Textos invisíveis no modo dark
**Contexto:** CRM em dark mode - vários textos com contraste insuficiente

**Problema:** Colunas da tabela (empresa, cidade), headers, filtros e área de busca usavam cores que ficavam invisíveis no fundo escuro.

**Causa:** Classes CSS usavam `var(--text-secondary)` e `var(--text-muted)` sem override específico para dark mode, resultando em textos cinza-escuro sobre fundo escuro.

**Solução:** Adicionar seletores `[data-theme="dark"]` específicos para todos os elementos do CRM:
```css
[data-theme="dark"] .contacts-panel__col-company {
  color: var(--text-primary);
}

[data-theme="dark"] .contacts-panel__list-header {
  color: var(--text-secondary);
  background: var(--bg-primary);
}
```

---

### Bug 8: Área de busca e filtros com design simples demais
**Contexto:** Header do CRM - campo de busca e dropdowns de filtro

**Problema:** Campos de busca e filtros tinham padding pequeno, sem efeitos de foco, visual inconsistente entre light/dark mode.

**Solução:** Redesign completo:
- Busca: `border-radius: 12px`, `min-width: 300px`, efeito glow no focus
- Filtros: padding maior (`8px 32px`), hover states, `min-width: 140px`
- Botão "Filtros": mesmo estilo arredondado da busca
- View toggle (Lista/Kanban): padding interno com cantos arredondados
- Clear filters: hover com background vermelho claro
```css
.contacts-panel__header-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
```

---

### Melhoria 1: Ordenação padrão por empresa
**Contexto:** Lista de contatos no CRM

**Mudança:** Valor padrão do `sortField` alterado de `'name'` para `'company'` e `sortOrder: 'asc'` — contatos agora aparecem organizados por empresa em ordem alfabética ao abrir o CRM.

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

---

## URLs de Produção (Atualizado: 2026-02-05)

| Serviço | URL |
|---------|-----|
| **Frontend (Vercel)** | https://frontend-pi-black-47.vercel.app |
| **Backend (Fly.io)** | https://kanban-api-cadu.fly.dev |
| **GitHub** | https://github.com/cadumega/kanban-app |

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
