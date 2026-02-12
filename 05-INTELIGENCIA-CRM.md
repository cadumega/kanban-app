# Sistema de Inteligencia do CRM

Documentacao tecnica do sistema de analise automatica de leads e oportunidades.

---

## Visao Geral

O sistema analisa automaticamente os dados do CRM para:
- Pontuar leads (0-100) com base em engajamento
- Classificar leads (HOT/WARM/COLD/AT_RISK)
- Detectar sinais de compra em notas
- Identificar objecoes e resistencias
- Gerar insights acionaveis
- Alertar sobre riscos no pipeline

---

## 1. Lead Scoring

### Formula de Pontuacao

Cada contato inicia com **50 pontos** (base) e recebe ajustes:

#### Engajamento (Notas)
| Quantidade de Notas | Pontos |
|---------------------|--------|
| 10+ notas | +20 |
| 5-9 notas | +15 |
| 2-4 notas | +10 |
| 0 notas | -10 |

#### Recencia (Dias sem Contato)
| Dias | Pontos |
|------|--------|
| 0-3 dias | +15 |
| 4-7 dias | +10 |
| 8-14 dias | 0 |
| 15-30 dias | -10 + alerta |
| 31+ dias | -20 + alerta urgente |

#### Posicao no Funil
| Etapa | Pontos |
|-------|--------|
| lead | +5 |
| qualificado | +15 |
| proposta | +25 |
| negociacao | +30 |
| cliente | +10 |
| perdido | -30 |

#### Valor
| Condicao | Pontos |
|----------|--------|
| valor_mensal > 0 OU valor_implementacao > 0 | +10 |

#### Sinais de Compra
- +5 pontos por keyword detectado em notas recentes

#### Follow-ups Atrasados
- -5 pontos por follow-up vencido

### Classificacoes

| Score | Classificacao | Cor | Prioridade |
|-------|---------------|-----|------------|
| 80-100 | HOT | Vermelho | CRITICA |
| 60-79 | WARM | Laranja | ALTA |
| 40-59 | COLD | Azul | MEDIA |
| 0-39 | AT_RISK | Cinza | BAIXA |

---

## 2. Deteccao de Sinais de Compra

### Keywords Monitoradas

#### Budget (Orcamento)
```
orcamento, budget, quanto custa, investimento, valor, preco, proposta
```

#### Urgencia
```
urgente, preciso ate, deadline, rapido, logo, amanha, essa semana
```

#### Decisao
```
decisao, aprovar, fechar, contratar, comecar, vamos fazer
```

#### Interesse
```
interessado, gostei, perfeito, excelente, otimo, quero
```

### Funcionamento

1. Sistema analisa as 3 notas mais recentes
2. Busca keywords em lowercase
3. Cada match adiciona +5 ao score
4. Gera insight "Sinais de Compra" se score >= 3

---

## 3. Deteccao de Objecoes

### Keywords Monitoradas

#### Preco
```
caro, muito caro, acima do orcamento, nao tenho verba
```

#### Timing
```
agora nao, depois, proximo mes, proximo ano, mais tarde
```

#### Competidor
```
concorrente, outra empresa, comparando, cotacao
```

#### Duvida
```
nao sei, preciso pensar, vou avaliar, consultar
```

### Funcionamento

1. Analisa notas recentes
2. Detecta keywords de objecao
3. Gera alerta com severity "medium"
4. Categoriza por tipo de objecao

---

## 4. Insights Automaticos

### Tipos de Insights

#### 1. Negocios Parados (stalled_deals)
- **Criterio:** Contatos em proposta/negociacao sem atividade >10 dias
- **Prioridade:** 1 (Critica)
- **Acao:** "Entre em contato hoje para nao perder o momentum"

#### 2. Sinais de Compra (buying_signals)
- **Criterio:** Keywords de intencao detectadas em notas recentes
- **Prioridade:** 2 (Alta)
- **Acao:** "Priorize estes contatos - alta probabilidade de conversao"

#### 3. Follow-ups Atrasados (overdue_followups)
- **Criterio:** Follow-ups com data vencida
- **Prioridade:** 1 (Critica)
- **Acao:** "Complete ou reagende estes follow-ups hoje"

#### 4. Leads Esfriando (cooling_leads)
- **Criterio:** 2+ notas nos ultimos 90 dias, 0 no ultimo mes
- **Prioridade:** 2 (Alta)
- **Acao:** "Retome contato antes que percam interesse"

#### 5. Sem Follow-up (no_followup)
- **Criterio:** Etapas ativas (lead/qualificado/proposta/negociacao) sem follow-up agendado
- **Prioridade:** 3 (Media)
- **Acao:** "Agende follow-ups para manter o pipeline em movimento"

#### 6. Alto Valor em Risco (high_value_risk)
- **Criterio:** valor_mensal >= 1000 OU valor_implementacao >= 5000, inativos >7 dias
- **Prioridade:** 1 (Critica)
- **Acao:** "Acao imediata necessaria - valor significativo em jogo"

#### 7. Prontos para Avancar (conversion_ready)
- **Criterio:** Lead/qualificado com 3+ notas e 1+ follow-up completado
- **Prioridade:** 3 (Media)
- **Acao:** "Avalie se estao prontos para proposta ou qualificacao"

#### 8. Objecoes Detectadas (objections)
- **Criterio:** Keywords de objecao em notas recentes
- **Prioridade:** 2 (Alta)
- **Acao:** "Prepare argumentos para contornar essas objecoes"

#### 9. Queda de Atividade (activity_drop)
- **Criterio:** Notas esta semana < 50% da semana passada
- **Prioridade:** 3 (Media)
- **Acao:** "Aumente as interacoes com contatos"

#### 10. Conversoes (wins)
- **Criterio:** Novos clientes nos ultimos 7 dias
- **Prioridade:** 4 (Baixa/Celebracao)
- **Acao:** "Continue o excelente trabalho"

---

## 5. Analytics Dashboard

### Metricas Disponiveis

#### Overview
- Total de contatos
- Deals ativos
- Deals ganhos
- Deals perdidos
- Taxa de conversao (%)
- Receita mensal total
- Receita de implementacao total
- Valor medio por deal

#### Funil de Vendas
- Distribuicao por etapa
- Percentual de cada etapa
- Valor mensal por etapa
- Cor visual por etapa

#### Pipeline Velocity
- Tempo medio em cada etapa
- Baseado em historico de transicoes (contact_tag_history)
- Numero de transicoes registradas

#### Tendencias Mensais (6 meses)
- Notas criadas por mes
- Follow-ups completados por mes
- Novos contatos por mes
- Conversoes por mes

#### Performance por Segmento
- Contatos por segmento
- Deals ganhos por segmento
- Deals perdidos por segmento
- Taxa de conversao por segmento
- Valor mensal por segmento

#### Hot Contacts
- Top 5 contatos em proposta/negociacao
- Ordenados por quantidade de notas
- Prioridade para "negociacao" sobre "proposta"

#### Atividade Recente
- Ultimas 20 atividades
- Tipos: note, followup, tag_change
- Com nome do contato e descricao

---

## 6. Weekly Digest

### Conteudo do Relatorio

#### Resumo
- Total de contatos com follow-ups
- Total de follow-ups pendentes
- Atrasados
- Hoje
- Proximos 7 dias
- Hot leads (score >= 80)
- At risk leads (score < 40)

#### Alertas
- Top 10 alertas criticos (severity: high)
- Com nome do contato e mensagem

#### Hot Leads
- Top 5 contatos com score >= 80
- Com inteligencia completa

#### At Risk Leads
- Top 5 contatos com score < 40
- Com alertas e sugestoes

#### Por Segmento
- Contatos agrupados por segmento
- Com score e classificacao
- Ordenados por prioridade

---

## 7. API Endpoints

### GET /api/contacts/reports/insights
Retorna analise automatica com insights acionaveis.

**Response:**
```json
{
  "generated_at": "2026-02-12T10:00:00Z",
  "summary": {
    "total_insights": 5,
    "critical": 2,
    "high": 2,
    "medium": 1,
    "low": 0
  },
  "insights": [
    {
      "id": "stalled_deals-123",
      "type": "stalled_deals",
      "priority": 1,
      "title": "2 negocio(s) parado(s)",
      "description": "Contatos em proposta/negociacao sem atividade...",
      "contacts": [...],
      "action": "Entre em contato hoje..."
    }
  ]
}
```

### GET /api/contacts/reports/analytics
Retorna metricas do dashboard analitico.

**Response:**
```json
{
  "overview": {
    "total_contacts": 50,
    "active_deals": 30,
    "won_deals": 15,
    "lost_deals": 5,
    "conversion_rate": 75,
    "total_valor_mensal": 50000,
    "total_valor_impl": 100000,
    "avg_deal_value": 3333
  },
  "funnel": [...],
  "velocity": [...],
  "months": [...],
  "segments": [...],
  "recent_activity": [...],
  "hot_contacts": [...]
}
```

### GET /api/contacts/reports/weekly-digest
Retorna relatorio semanal com scoring.

**Response:**
```json
{
  "period": { "start": "2026-02-12", "end": "2026-02-19" },
  "summary": {
    "total_contacts": 10,
    "total_followups": 15,
    "overdue": 3,
    "today": 2,
    "upcoming": 10,
    "hot_leads": 2,
    "at_risk_leads": 1
  },
  "alerts": [...],
  "hot_leads": [...],
  "at_risk_leads": [...],
  "by_segment": {
    "n8n": [...],
    "consultoria": [...]
  }
}
```

---

## 8. Estrutura de Dados

### Tabela: contact_tag_history
Rastreia mudancas de etapa para calcular velocidade.

```sql
CREATE TABLE contact_tag_history (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  old_tag TEXT,
  new_tag TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);
```

### Objeto: LeadIntelligence
```typescript
interface LeadIntelligence {
  score: number;           // 0-100
  classification: {
    label: 'HOT' | 'WARM' | 'COLD' | 'AT_RISK';
    color: string;
    priority: string;
  };
  alerts: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    category?: string;
    message: string;
  }[];
  signals: {
    type: string;
    category: string;
    keyword: string;
  }[];
  daysSinceContact: number;
}
```

---

## 9. Evolucoes Futuras

### Prioridade Alta
- [ ] Health Score separado (frequency + recency + value + trend)
- [ ] Alertas time-based automaticos por etapa
- [ ] Agendamento auto de follow-ups por etapa
- [ ] Auto-escalacao (score >= 80 sobe de etapa)
- [ ] Analise de padroes por segmento

### Prioridade Media
- [ ] Sugestao de proxima melhor acao por contato
- [ ] Previsao de receita do pipeline
- [ ] Timeline consolidada (todas interacoes)
- [ ] Analise de ciclo de vendas (alerta acima da media)
- [ ] Relatorio de performance por periodo

### Complementares
- [ ] Analise de sentimento em notas (rule-based)
- [ ] Heatmap de atividade (melhor dia/hora)
- [ ] Tracker de concorrentes mencionados
- [ ] Contatos similares (mesmo perfil)
- [ ] Segmentacao automatica assistida

---

## 10. Componentes Frontend

### InsightsPanel.tsx
- Painel modal com lista de insights
- Cards expandiveis por prioridade
- Clique no contato abre detalhes
- Botao de refresh

### AnalyticsDashboard.tsx
- Dashboard com grid de metricas
- Funil visual com barras coloridas
- Graficos de tendencia
- Lista de hot contacts

### WeeklyDigestPanel.tsx
- Relatorio organizavel (timeline ou segmento)
- Badges de score em cada contato
- Exportar para WhatsApp/texto
- Alertas em destaque

---

*Documentacao atualizada em Fevereiro 2026*
