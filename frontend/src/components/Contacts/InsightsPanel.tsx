import { useState, useEffect } from 'react';
import {
  X,
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  Clock,
  DollarSign,
  Target,
  MessageSquare,
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Zap,
  ThermometerSun,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import * as api from '../../services/api';
import type { InsightsResponse, Insight, InsightContact } from '../../services/api';
import './InsightsPanel.css';

interface InsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: (contactId: string) => void;
}

const PRIORITY_CONFIG = {
  1: { label: 'CRITICO', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.1)', icon: AlertTriangle },
  2: { label: 'ALTO', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.1)', icon: AlertCircle },
  3: { label: 'MEDIO', color: '#3B82F6', bgColor: 'rgba(59, 130, 246, 0.1)', icon: Lightbulb },
  4: { label: 'BAIXO', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.1)', icon: CheckCircle },
};

const TYPE_ICONS: Record<string, typeof Lightbulb> = {
  stalled_deals: Clock,
  buying_signals: Zap,
  overdue_followups: Calendar,
  cooling_leads: ThermometerSun,
  no_followup: Calendar,
  high_value_risk: DollarSign,
  conversion_ready: Target,
  objections: MessageSquare,
  activity_drop: TrendingUp,
  wins: CheckCircle,
};

export function InsightsPanel({ isOpen, onClose, onOpenContact }: InsightsPanelProps) {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadInsights();
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

  const loadInsights = async () => {
    setLoading(true);
    try {
      const result = await api.getInsights();
      setData(result);
      // Expand critical and high priority insights by default
      const toExpand = new Set<string>();
      result.insights.forEach(i => {
        if (i.priority <= 2 && i.contacts.length > 0) {
          toExpand.add(i.id);
        }
      });
      setExpandedInsights(toExpand);
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedInsights(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleContactClick = (contactId: string) => {
    if (onOpenContact) {
      onOpenContact(contactId);
      onClose();
    }
  };

  const renderContactList = (contacts: InsightContact[]) => {
    if (contacts.length === 0) return null;

    return (
      <div className="insights__contact-list">
        {contacts.map((contact, idx) => (
          <div
            key={`${contact.id}-${idx}`}
            className="insights__contact-item"
            onClick={() => handleContactClick(contact.id)}
          >
            <div className="insights__contact-main">
              <div className="insights__contact-avatar">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <div className="insights__contact-info">
                <span className="insights__contact-name">{contact.name}</span>
                {contact.company && (
                  <span className="insights__contact-company">{contact.company}</span>
                )}
              </div>
              {contact.tag && (
                <span className={`insights__contact-tag insights__contact-tag--${contact.tag}`}>
                  {contact.tag}
                </span>
              )}
            </div>

            <div className="insights__contact-details">
              {contact.days !== undefined && (
                <span className="insights__contact-detail">
                  <Clock size={12} />
                  {contact.days} dias
                </span>
              )}
              {contact.valor_mensal !== undefined && contact.valor_mensal > 0 && (
                <span className="insights__contact-detail insights__contact-detail--value">
                  <DollarSign size={12} />
                  {formatCurrency(contact.valor_mensal)}/mes
                </span>
              )}
              {contact.keywords && (
                <span className="insights__contact-detail insights__contact-detail--keywords">
                  Palavras: {contact.keywords}
                </span>
              )}
              {contact.objections && (
                <span className="insights__contact-detail insights__contact-detail--objections">
                  Objecoes: {contact.objections}
                </span>
              )}
              {contact.message && (
                <span className="insights__contact-detail">
                  {contact.message}
                </span>
              )}
            </div>

            {contact.note_preview && (
              <div className="insights__contact-note">
                "{contact.note_preview}..."
              </div>
            )}

            <ArrowRight size={14} className="insights__contact-arrow" />
          </div>
        ))}
      </div>
    );
  };

  const renderInsight = (insight: Insight) => {
    const config = PRIORITY_CONFIG[insight.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG[3];
    const TypeIcon = TYPE_ICONS[insight.type] || Lightbulb;
    const isExpanded = expandedInsights.has(insight.id);
    const hasContacts = insight.contacts.length > 0;

    return (
      <div
        key={insight.id}
        className={`insights__card insights__card--priority-${insight.priority}`}
        style={{ borderLeftColor: config.color }}
      >
        <div
          className="insights__card-header"
          onClick={() => hasContacts && toggleExpand(insight.id)}
        >
          <div className="insights__card-icon" style={{ background: config.bgColor, color: config.color }}>
            <TypeIcon size={18} />
          </div>

          <div className="insights__card-content">
            <div className="insights__card-title-row">
              <span className="insights__card-priority" style={{ background: config.bgColor, color: config.color }}>
                {config.label}
              </span>
              <h3 className="insights__card-title">{insight.title}</h3>
            </div>
            <p className="insights__card-description">{insight.description}</p>
          </div>

          {hasContacts && (
            <button className="insights__card-expand">
              {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>

        {isExpanded && hasContacts && (
          <div className="insights__card-body">
            {renderContactList(insight.contacts)}
          </div>
        )}

        <div className="insights__card-action">
          <Zap size={14} />
          <span>{insight.action}</span>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="insights-overlay" onClick={onClose}>
      <div className="insights-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="insights__header">
          <div className="insights__header-left">
            <Lightbulb size={22} />
            <h2>Insights & Acoes</h2>
          </div>
          <div className="insights__header-actions">
            <button
              onClick={loadInsights}
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
          <div className="insights__loading">
            <Loader2 size={32} className="spin" />
            <span>Analisando dados...</span>
          </div>
        ) : !data ? (
          <div className="insights__empty">
            <Lightbulb size={48} />
            <p>Erro ao carregar insights</p>
            <button onClick={loadInsights} className="btn btn-primary">
              Tentar novamente
            </button>
          </div>
        ) : data.insights.length === 0 ? (
          <div className="insights__empty insights__empty--success">
            <CheckCircle size={48} />
            <h3>Tudo em ordem!</h3>
            <p>Nenhum insight ou acao necessaria no momento.</p>
            <p className="insights__empty-hint">Continue operando normalmente e volte depois.</p>
          </div>
        ) : (
          <div className="insights__body">
            {/* Summary */}
            <div className="insights__summary">
              <div className="insights__summary-item insights__summary-item--critical">
                <AlertTriangle size={16} />
                <span>{data.summary.critical} critico(s)</span>
              </div>
              <div className="insights__summary-item insights__summary-item--high">
                <AlertCircle size={16} />
                <span>{data.summary.high} alto(s)</span>
              </div>
              <div className="insights__summary-item insights__summary-item--medium">
                <Lightbulb size={16} />
                <span>{data.summary.medium} medio(s)</span>
              </div>
              <div className="insights__summary-item insights__summary-item--low">
                <CheckCircle size={16} />
                <span>{data.summary.low} baixo(s)</span>
              </div>
            </div>

            {/* Insights list */}
            <div className="insights__list">
              {data.insights.map(insight => renderInsight(insight))}
            </div>

            {/* Footer */}
            <div className="insights__footer">
              <span>Analise gerada em {new Date(data.generated_at).toLocaleString('pt-BR')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
