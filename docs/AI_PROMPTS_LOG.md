# Log de Prompts e Solicitações - AI Assistant

Este documento registra todas as solicitações enviadas ao assistente de IA e um resumo das ações realizadas. Útil para:
- Manter histórico de decisões
- Facilitar continuidade entre sessões
- Permitir análise por outras IAs
- Documentar evolução do projeto

---

## Sessão: 2026-02-20

### Prompt #1 - Campo Presente e Simplificação UI
**Solicitação completa:**
> "pode criar um campo de checkbox chamado presente com icone de um gift, é para saber se eu entreguei um brinde nosso, deixa isso no status, se eu tiver preenchido isso no contato da pessoa. O botao Filtros deixa só o icone na tela de contatos CRM. Insights altera para AI, o Analytics botao pode remover, se nao fica muita coisa to enxugando mais. O briefing altera o nome para Agenda. Relatorios coloca uma parte sobre quantos contatos eu dei presente gift, só para ter uma noção."

**Ações realizadas:**
1. **Backend:**
   - Adicionada coluna `presente INTEGER DEFAULT 0` na tabela contacts
   - Migration automática em `userDb.js`
   - CRUD atualizado em `contacts.js`
   - Endpoint de relatórios inclui contagem de presentes

2. **Frontend:**
   - Tipo Contact atualizado com campo `presente`
   - Checkbox no modal de edição (ContactDetailModal)
   - Ícone Gift na coluna Status (ContactsPanel)
   - Botão Filtros → só ícone
   - Insights → AI (com ícone Sparkles)
   - Analytics → removido
   - Briefing → Agenda
   - Seção "Presentes Entregues" no ReportsPanel

**Commit:** `feat: Add gift tracking, simplify CRM interface`

---

### Prompt #2 - Bug de Modal Click
**Solicitação completa:**
> "tem como corrigir ao clicar fora no modal, retornar para a tela anterior que estava? exemplo cliquei em Agenda e dps cliquei fora do modal e voltou la pro kanban ao inves do CRM, consegue revisar os outros para ver se esta certo esse comportamento, analise como um QA essa experiencia de usuario."

**Análise QA realizada:**
- Testada hierarquia de modais
- Identificada causa raiz: event bubbling
- Mapeados todos os modais afetados

**Ações realizadas:**
1. Corrigido `stopPropagation()` em 6 componentes:
   - WeeklyDigestPanel
   - ReportsPanel
   - FollowupsPanel
   - InsightsPanel
   - AnalyticsDashboard
   - ConfirmDialog

**Padrão estabelecido:**
```tsx
onClick={(e) => { e.stopPropagation(); onClose(); }}
```

**Commit:** `fix: Prevent modal click bubbling to close parent panels`

---

### Prompt #3 - Documentação
**Solicitação completa:**
> "ao encontrar esses bugs consegue atualizar na documentacao referente a isso para termos um historic, nao lembro se solicitei algo parecido antes? esses logs do que foi solicitado consegue armazenar numa documentacao nova de solicitacoes de prompts enviadas e um resumo do que vc fez para facilitar analise de outra ia ao ler essa documentacao o que acha?"

**Ações realizadas:**
1. Criado `/docs/CHANGELOG.md` - histórico técnico de alterações
2. Criado `/docs/AI_PROMPTS_LOG.md` - log de prompts (este arquivo)

---

## Sessões Anteriores (Resumo Consolidado)

### Integração Google Calendar
**Prompt:** "no digest tem algo que consigo enviar para o calendario google calendar?"

**Evolução:**
- v1: window.open() múltiplo → bloqueado por popup blocker
- v2: Download .ics → usuário achou complicado
- v3: Modal com links clicáveis → aprovado

---

### Preview de Imagens
**Prompt:** "a imagem abre em uma nova guia, tem como ser um modal de preview?"

**Solução:** Modal overlay com imagem, botão fechar, link para nova aba

---

### Imagens Quebradas
**Prompt:** "testa ai enviei uma imagem e nao funcionou em jpg ao enviar, o historico dela parece com oquebrada"

**Diagnóstico:** Tags `<img>` não enviam Authorization header
**Solução:** Token via query parameter

---

### Filtro por Segmento
**Prompt:** "No CRM ao clicar ja podia organizar conforme algum filtro"

**Solução:** Click em badge de segmento filtra/desfiltra

---

### Indicador de Último Contato
**Prompt:** (inferido do contexto)

**Solução:** Coluna com dias desde última nota + cores por urgência

---

### Renomeação Digest → Briefing → Agenda
**Prompt:** "esse digest teria outra palavra em portugues ou ingles?"
**Prompt:** "Altere para Briefing"
**Prompt:** "briefing altera o nome para Agenda"

---

## Como Usar Esta Documentação

### Para Continuar Desenvolvimento
1. Leia `CHANGELOG.md` para entender alterações técnicas
2. Leia `AI_PROMPTS_LOG.md` para contexto das decisões
3. Verifique padrões estabelecidos antes de implementar

### Para Outra IA
Ao iniciar nova sessão, você pode informar:
> "Leia /docs/CHANGELOG.md e /docs/AI_PROMPTS_LOG.md para contexto do projeto"

### Formato de Atualização
Ao final de cada sessão, adicionar:
```markdown
### Prompt #N - [Título Descritivo]
**Solicitação completa:**
> [cópia exata do prompt do usuário]

**Ações realizadas:**
1. [lista de ações]

**Commit:** `[mensagem do commit]`
```
