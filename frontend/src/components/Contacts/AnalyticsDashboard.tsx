import { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Clock,
  Target,
  Zap,
  MessageSquare,
  Bell,
  ArrowRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import * as api from '../../services/api';
import type { AnalyticsResponse } from '../../services/api';
import './AnalyticsDashboard.css';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const SEGMENT_LABELS: Record<string, string> = {
  n8n: 'N8N',
  chapeu: 'Chapeu',
  parceria: 'Parceria',
  consultoria: 'Consultoria',
};

export function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const result = await api.getAnalytics();
      setData(result);
    } catch (err) {
      console.error('Erro ao carregar analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note': return <MessageSquare size={14} />;
      case 'followup': return <Bell size={14} />;
      case 'tag_change': return <ArrowRight size={14} />;
      default: return <Zap size={14} />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'note': return 'Nota';
      case 'followup': return 'Follow-up';
      case 'tag_change': return 'Mudanca';
      default: return type;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="analytics-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="analytics-dashboard" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="analytics__header">
          <div className="analytics__header-left">
            <BarChart3 size={22} />
            <h2>Dashboard Analitico</h2>
          </div>
          <div className="analytics__header-actions">
            <button
              onClick={loadAnalytics}
              className="btn btn-sm btn-secondary"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Atualizar
            </button>
            <button onClick={onClose} className="btn btn-icon btn-ghost">
              <X size={20} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="analytics__loading">
            <Loader2 size={32} className="spin" />
            <span>Carregando analytics...</span>
          </div>
        ) : !data ? (
          <div className="analytics__empty">
            <BarChart3 size={48} />
            <p>Erro ao carregar dados</p>
            <button onClick={loadAnalytics} className="btn btn-primary">
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="analytics__body">
            {/* Overview Cards */}
            <div className="analytics__overview">
              <div className="analytics__card analytics__card--primary">
                <Users size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{data.overview.total_contacts}</span>
                  <span className="analytics__card-label">Total Contatos</span>
                </div>
              </div>

              <div className="analytics__card analytics__card--blue">
                <Target size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{data.overview.active_deals}</span>
                  <span className="analytics__card-label">Em Negociacao</span>
                </div>
              </div>

              <div className="analytics__card analytics__card--green">
                <TrendingUp size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{data.overview.won_deals}</span>
                  <span className="analytics__card-label">Ganhos</span>
                </div>
              </div>

              <div className="analytics__card analytics__card--red">
                <TrendingDown size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{data.overview.lost_deals}</span>
                  <span className="analytics__card-label">Perdidos</span>
                </div>
              </div>

              <div className="analytics__card analytics__card--purple">
                <Zap size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{data.overview.conversion_rate}%</span>
                  <span className="analytics__card-label">Conversao</span>
                </div>
              </div>

              <div className="analytics__card analytics__card--orange">
                <DollarSign size={24} />
                <div className="analytics__card-content">
                  <span className="analytics__card-value">{formatCurrency(data.overview.total_valor_mensal)}</span>
                  <span className="analytics__card-label">Receita Mensal</span>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="analytics__grid">
              {/* Funnel */}
              <div className="analytics__section analytics__section--funnel">
                <h3><Target size={16} /> Funil de Vendas</h3>
                <div className="analytics__funnel">
                  {data.funnel.map((stage) => (
                    <div key={stage.tag || 'null'} className="analytics__funnel-stage">
                      <div className="analytics__funnel-bar-container">
                        <div
                          className="analytics__funnel-bar"
                          style={{
                            width: `${Math.max(stage.percentage, 5)}%`,
                            background: stage.color,
                          }}
                        >
                          <span className="analytics__funnel-count">{stage.count}</span>
                        </div>
                      </div>
                      <div className="analytics__funnel-info">
                        <span className="analytics__funnel-label">{stage.label}</span>
                        <span className="analytics__funnel-percent">{stage.percentage}%</span>
                      </div>
                      {stage.valor_mensal > 0 && (
                        <span className="analytics__funnel-value">
                          {formatCurrency(stage.valor_mensal)}/mes
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Velocity */}
              <div className="analytics__section analytics__section--velocity">
                <h3><Clock size={16} /> Velocidade do Pipeline</h3>
                {data.velocity.some(v => v.avg_days !== null) ? (
                  <div className="analytics__velocity">
                    {data.velocity.map(stage => (
                      <div key={stage.tag} className="analytics__velocity-item">
                        <div
                          className="analytics__velocity-dot"
                          style={{ background: stage.color }}
                        />
                        <span className="analytics__velocity-label">{stage.label}</span>
                        <span className="analytics__velocity-days">
                          {stage.avg_days !== null ? `${stage.avg_days} dias` : '-'}
                        </span>
                        {stage.transitions > 0 && (
                          <span className="analytics__velocity-transitions">
                            ({stage.transitions} transicoes)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics__velocity-empty">
                    <Clock size={32} />
                    <p>Sem dados de velocidade ainda</p>
                    <span>Mude contatos de etapa para calcular</span>
                  </div>
                )}
              </div>

              {/* Monthly Trends */}
              <div className="analytics__section analytics__section--trends">
                <h3><BarChart3 size={16} /> Tendencias Mensais</h3>
                <div className="analytics__trends">
                  <div className="analytics__trends-header">
                    <span>Mes</span>
                    <span>Notas</span>
                    <span>Follow-ups</span>
                    <span>Novos</span>
                    <span>Conversoes</span>
                  </div>
                  {data.months.map(month => (
                    <div key={month.month} className="analytics__trends-row">
                      <span className="analytics__trends-month">{month.month}</span>
                      <span className="analytics__trends-value">{month.notes}</span>
                      <span className="analytics__trends-value">{month.followups}</span>
                      <span className="analytics__trends-value analytics__trends-value--new">
                        {month.new_contacts > 0 ? `+${month.new_contacts}` : '0'}
                      </span>
                      <span className="analytics__trends-value analytics__trends-value--conv">
                        {month.conversions > 0 ? `+${month.conversions}` : '0'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segment Performance */}
              <div className="analytics__section analytics__section--segments">
                <h3><Users size={16} /> Performance por Segmento</h3>
                {data.segments.length > 0 ? (
                  <div className="analytics__segments">
                    {data.segments.map(seg => (
                      <div key={seg.name} className="analytics__segment-item">
                        <div className="analytics__segment-header">
                          <span className="analytics__segment-name">
                            {SEGMENT_LABELS[seg.name] || seg.name}
                          </span>
                          <span className="analytics__segment-count">{seg.count} contatos</span>
                        </div>
                        <div className="analytics__segment-stats">
                          <span className="analytics__segment-won">
                            {seg.won} ganhos
                          </span>
                          <span className="analytics__segment-lost">
                            {seg.lost} perdidos
                          </span>
                          <span className="analytics__segment-rate">
                            {seg.conversion_rate}% conv.
                          </span>
                        </div>
                        {seg.valor_mensal > 0 && (
                          <span className="analytics__segment-value">
                            {formatCurrency(seg.valor_mensal)}/mes
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics__segments-empty">
                    <p>Nenhum segmento definido</p>
                  </div>
                )}
              </div>

              {/* Hot Contacts */}
              <div className="analytics__section analytics__section--hot">
                <h3><Zap size={16} /> Proximos a Fechar</h3>
                {data.hot_contacts.length > 0 ? (
                  <div className="analytics__hot-list">
                    {data.hot_contacts.map(contact => (
                      <div key={contact.id} className="analytics__hot-item">
                        <div className="analytics__hot-info">
                          <span className="analytics__hot-name">{contact.name}</span>
                          {contact.company && (
                            <span className="analytics__hot-company">{contact.company}</span>
                          )}
                        </div>
                        <div className="analytics__hot-meta">
                          <span
                            className={`analytics__hot-tag analytics__hot-tag--${contact.tag}`}
                          >
                            {contact.tag}
                          </span>
                          {contact.valor_mensal > 0 && (
                            <span className="analytics__hot-value">
                              {formatCurrency(contact.valor_mensal)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="analytics__hot-empty">
                    <p>Nenhum contato em proposta/negociacao</p>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="analytics__section analytics__section--activity">
                <h3><MessageSquare size={16} /> Atividade Recente</h3>
                <div className="analytics__activity">
                  {data.recent_activity.slice(0, 10).map(activity => (
                    <div key={activity.id} className="analytics__activity-item">
                      <div className={`analytics__activity-icon analytics__activity-icon--${activity.type}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="analytics__activity-content">
                        <div className="analytics__activity-header">
                          <span className="analytics__activity-type">
                            {getActivityLabel(activity.type)}
                          </span>
                          <span className="analytics__activity-contact">
                            {activity.contact_name}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="analytics__activity-desc">
                            {activity.description.length > 80
                              ? activity.description.substring(0, 80) + '...'
                              : activity.description}
                          </p>
                        )}
                      </div>
                      <span className="analytics__activity-date">
                        {formatDate(activity.date)}
                      </span>
                    </div>
                  ))}
                  {data.recent_activity.length === 0 && (
                    <div className="analytics__activity-empty">
                      <p>Nenhuma atividade registrada</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
