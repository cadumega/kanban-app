import { useState, useEffect } from 'react';
import {
  X,
  BarChart3,
  TrendingUp,
  Users,
  Bot,
  DollarSign,
  MessageSquare,
  Bell,
  MapPin,
  Loader2,
  Gift,
} from 'lucide-react';
import * as api from '../../services/api';
import './ReportsPanel.css';

interface ReportsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RobotClient {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  segments: string | null;
  valor_implementacao: number;
  valor_mensal: number;
}

interface GiftRecipient {
  id: string;
  name: string;
  company: string | null;
  city: string | null;
  segments: string | null;
}

interface ReportStats {
  month: {
    notes: number;
    followups_completed: number;
    followups_scheduled: number;
  };
  totals: {
    robot_contacts: number;
    gift_contacts: number;
    valor_implementacao: number;
    valor_mensal: number;
  };
  top_contacts: {
    id: string;
    name: string;
    company: string | null;
    city: string | null;
    tag: string | null;
    is_robot: number;
    notes_count: number;
    followups_count: number;
    total_interactions: number;
  }[];
  contacts_by_tag: { tag: string | null; count: number }[];
  contacts_by_city: { city: string; count: number }[];
  recent_activity: {
    id: string;
    content: string | null;
    created_at: string;
    contact_id: string;
    contact_name: string;
    contact_company: string | null;
  }[];
  robot_clients: RobotClient[];
  gift_recipients: GiftRecipient[];
}

const TAG_COLORS: Record<string, string> = {
  lead: '#3B82F6',
  qualificado: '#8B5CF6',
  proposta: '#F59E0B',
  negociacao: '#EC4899',
  cliente: '#22C55E',
  perdido: '#EF4444',
};

export function ReportsPanel({ isOpen, onClose }: ReportsPanelProps) {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRobotClients, setShowRobotClients] = useState(false);
  const [showGiftRecipients, setShowGiftRecipients] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await api.getReportsStatistics();
      setStats(data);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="reports-panel-overlay" onClick={onClose}>
      <div className="reports-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="reports-panel__header">
          <div className="reports-panel__header-left">
            <BarChart3 size={22} />
            <h2>Relatórios CRM</h2>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="reports-panel__loading">
            <Loader2 size={32} className="spin" />
            <span>Carregando relatórios...</span>
          </div>
        ) : stats ? (
          <div className="reports-panel__body">
            {/* Summary Cards */}
            <div className="reports-panel__summary">
              <div className="reports-panel__card">
                <div className="reports-panel__card-icon reports-panel__card-icon--blue">
                  <MessageSquare size={20} />
                </div>
                <div className="reports-panel__card-content">
                  <span className="reports-panel__card-value">{stats.month.notes}</span>
                  <span className="reports-panel__card-label">Notas este mês</span>
                </div>
              </div>

              <div className="reports-panel__card">
                <div className="reports-panel__card-icon reports-panel__card-icon--green">
                  <Bell size={20} />
                </div>
                <div className="reports-panel__card-content">
                  <span className="reports-panel__card-value">{stats.month.followups_completed}</span>
                  <span className="reports-panel__card-label">Follow-ups concluídos</span>
                </div>
              </div>

              <div
                className="reports-panel__card reports-panel__card--clickable"
                onClick={() => setShowRobotClients(!showRobotClients)}
                title="Clique para ver lista"
              >
                <div className="reports-panel__card-icon reports-panel__card-icon--purple">
                  <Bot size={20} />
                </div>
                <div className="reports-panel__card-content">
                  <span className="reports-panel__card-value">{stats.totals.robot_contacts}</span>
                  <span className="reports-panel__card-label">Clientes com Robô</span>
                </div>
              </div>

              <div
                className="reports-panel__card reports-panel__card--clickable"
                onClick={() => setShowGiftRecipients(!showGiftRecipients)}
                title="Clique para ver lista"
              >
                <div className="reports-panel__card-icon reports-panel__card-icon--pink">
                  <Gift size={20} />
                </div>
                <div className="reports-panel__card-content">
                  <span className="reports-panel__card-value">{stats.totals.gift_contacts}</span>
                  <span className="reports-panel__card-label">Presentes Entregues</span>
                </div>
              </div>

              <div className="reports-panel__card">
                <div className="reports-panel__card-icon reports-panel__card-icon--orange">
                  <DollarSign size={20} />
                </div>
                <div className="reports-panel__card-content">
                  <span className="reports-panel__card-value">{formatCurrency(stats.totals.valor_mensal)}</span>
                  <span className="reports-panel__card-label">Receita Mensal</span>
                </div>
              </div>
            </div>

            {/* Robot Clients List */}
            {showRobotClients && stats.robot_clients && stats.robot_clients.length > 0 && (
              <div className="reports-panel__section reports-panel__section--highlight">
                <h3><Bot size={16} /> Clientes com Robô ({stats.robot_clients.length})</h3>
                <div className="reports-panel__robot-list">
                  {stats.robot_clients.map(client => (
                    <div key={client.id} className="reports-panel__robot-item">
                      <div className="reports-panel__robot-info">
                        <span className="reports-panel__robot-name">{client.name}</span>
                        {client.company && (
                          <span className="reports-panel__robot-company">{client.company}</span>
                        )}
                        {client.city && (
                          <span className="reports-panel__robot-city"><MapPin size={10} /> {client.city}</span>
                        )}
                      </div>
                      <div className="reports-panel__robot-values">
                        {client.valor_mensal > 0 && (
                          <span className="reports-panel__robot-mensal">
                            {formatCurrency(client.valor_mensal)}/mês
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gift Recipients List */}
            {showGiftRecipients && stats.gift_recipients && stats.gift_recipients.length > 0 && (
              <div className="reports-panel__section reports-panel__section--highlight">
                <h3><Gift size={16} /> Presentes Entregues ({stats.gift_recipients.length})</h3>
                <div className="reports-panel__robot-list">
                  {stats.gift_recipients.map(recipient => (
                    <div key={recipient.id} className="reports-panel__robot-item">
                      <div className="reports-panel__robot-info">
                        <span className="reports-panel__robot-name">{recipient.name}</span>
                        {recipient.company && (
                          <span className="reports-panel__robot-company">{recipient.company}</span>
                        )}
                        {recipient.city && (
                          <span className="reports-panel__robot-city"><MapPin size={10} /> {recipient.city}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue Details */}
            <div className="reports-panel__section">
              <h3><DollarSign size={16} /> Receita de Clientes</h3>
              <div className="reports-panel__revenue">
                <div className="reports-panel__revenue-item">
                  <span>Total Implementação:</span>
                  <strong>{formatCurrency(stats.totals.valor_implementacao)}</strong>
                </div>
                <div className="reports-panel__revenue-item">
                  <span>Total Mensal:</span>
                  <strong>{formatCurrency(stats.totals.valor_mensal)}</strong>
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="reports-panel__columns">
              {/* Top Contacts */}
              <div className="reports-panel__section">
                <h3><TrendingUp size={16} /> Top 10 Contatos (Interações)</h3>
                <div className="reports-panel__list">
                  {stats.top_contacts.map((contact, index) => (
                    <div key={contact.id} className="reports-panel__list-item">
                      <span className="reports-panel__rank">#{index + 1}</span>
                      <div className="reports-panel__contact-info">
                        <span className="reports-panel__contact-name">
                          {contact.name}
                          {contact.is_robot ? <Bot size={12} className="reports-panel__robot-badge" /> : null}
                        </span>
                        {contact.company && (
                          <span className="reports-panel__contact-company">{contact.company}</span>
                        )}
                      </div>
                      <div className="reports-panel__contact-stats">
                        <span title="Notas"><MessageSquare size={12} /> {contact.notes_count}</span>
                        <span title="Follow-ups"><Bell size={12} /> {contact.followups_count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.top_contacts.length === 0 && (
                    <p className="reports-panel__empty">Nenhum contato ainda</p>
                  )}
                </div>
              </div>

              {/* Funnel Distribution */}
              <div className="reports-panel__section">
                <h3><Users size={16} /> Funil de Vendas</h3>
                <div className="reports-panel__funnel">
                  {stats.contacts_by_tag.map(item => (
                    <div key={item.tag || 'null'} className="reports-panel__funnel-item">
                      <div className="reports-panel__funnel-bar">
                        <div
                          className="reports-panel__funnel-fill"
                          style={{
                            width: `${Math.min((item.count / Math.max(...stats.contacts_by_tag.map(t => t.count))) * 100, 100)}%`,
                            background: item.tag ? TAG_COLORS[item.tag] : '#71717A',
                          }}
                        />
                      </div>
                      <span className="reports-panel__funnel-label">
                        {item.tag || 'Sem tag'}
                      </span>
                      <span className="reports-panel__funnel-count">{item.count}</span>
                    </div>
                  ))}
                </div>

                <h3 style={{ marginTop: 24 }}><MapPin size={16} /> Por Cidade</h3>
                <div className="reports-panel__cities">
                  {stats.contacts_by_city.map(item => (
                    <div key={item.city} className="reports-panel__city-item">
                      <span>{item.city}</span>
                      <span className="reports-panel__city-count">{item.count}</span>
                    </div>
                  ))}
                  {stats.contacts_by_city.length === 0 && (
                    <p className="reports-panel__empty">Nenhuma cidade registrada</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="reports-panel__section reports-panel__section--full">
              <h3><MessageSquare size={16} /> Atividade Recente</h3>
              <div className="reports-panel__activity">
                {stats.recent_activity.map(note => (
                  <div key={note.id} className="reports-panel__activity-item">
                    <div className="reports-panel__activity-content">
                      <strong>{note.contact_name}</strong>
                      {note.contact_company && <span> @ {note.contact_company}</span>}
                      <p>{note.content || '(Imagem)'}</p>
                    </div>
                    <span className="reports-panel__activity-date">{formatDate(note.created_at)}</span>
                  </div>
                ))}
                {stats.recent_activity.length === 0 && (
                  <p className="reports-panel__empty">Nenhuma atividade recente</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="reports-panel__empty-state">
            <BarChart3 size={48} />
            <p>Erro ao carregar relatórios</p>
            <button onClick={loadStats} className="btn btn-primary">
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
