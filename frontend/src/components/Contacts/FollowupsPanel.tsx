import { useState, useEffect } from 'react';
import { X, Bell, Clock, Check, User, Building, ChevronRight } from 'lucide-react';
import type { ContactFollowup } from '../../types';
import * as api from '../../services/api';
import './FollowupsPanel.css';

interface FollowupsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: (contactId: string) => void;
}

export function FollowupsPanel({ isOpen, onClose, onOpenContact }: FollowupsPanelProps) {
  const [followups, setFollowups] = useState<ContactFollowup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadFollowups();
    }
  }, [isOpen]);

  const loadFollowups = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingFollowups();
      setFollowups(data);
    } catch (err) {
      console.error('Erro ao carregar follow-ups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollowup = async (followup: ContactFollowup) => {
    try {
      await api.updateFollowup(followup.contact_id, followup.id, { completed: true });
      setFollowups(prev => prev.filter(f => f.id !== followup.id));
    } catch (err) {
      console.error('Erro ao completar follow-up:', err);
    }
  };

  const getFollowupStatus = (date: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (date < today) return 'overdue';
    if (date === today) return 'today';
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    if (date <= weekFromNow.toISOString().split('T')[0]) return 'soon';
    return 'future';
  };

  const formatFollowupDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Amanhã';
    if (diffDays === -1) return 'Ontem';
    if (diffDays < -1) return `Há ${Math.abs(diffDays)} dias`;
    if (diffDays <= 7) return `Em ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Group followups by status
  const overdueFollowups = followups.filter(f => getFollowupStatus(f.date) === 'overdue');
  const todayFollowups = followups.filter(f => getFollowupStatus(f.date) === 'today');
  const soonFollowups = followups.filter(f => getFollowupStatus(f.date) === 'soon');
  const futureFollowups = followups.filter(f => getFollowupStatus(f.date) === 'future');

  if (!isOpen) return null;

  return (
    <div className="followups-panel-overlay" onClick={onClose}>
      <div className="followups-panel" onClick={e => e.stopPropagation()}>
        <div className="followups-panel__header">
          <h2>
            <Bell size={20} />
            Follow-ups Pendentes
          </h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="followups-panel__body">
          {loading ? (
            <div className="followups-panel__loading">Carregando...</div>
          ) : followups.length === 0 ? (
            <div className="followups-panel__empty">
              <Bell size={48} />
              <p>Nenhum follow-up pendente</p>
              <span>Adicione follow-ups nos contatos do CRM</span>
            </div>
          ) : (
            <>
              {overdueFollowups.length > 0 && (
                <div className="followups-panel__section">
                  <h3 className="followups-panel__section-title followups-panel__section-title--overdue">
                    <span className="followups-panel__section-dot" />
                    Atrasados ({overdueFollowups.length})
                  </h3>
                  <div className="followups-panel__list">
                    {overdueFollowups.map(followup => (
                      <FollowupItem
                        key={followup.id}
                        followup={followup}
                        status="overdue"
                        formatDate={formatFollowupDate}
                        onToggle={handleToggleFollowup}
                        onOpenContact={onOpenContact}
                      />
                    ))}
                  </div>
                </div>
              )}

              {todayFollowups.length > 0 && (
                <div className="followups-panel__section">
                  <h3 className="followups-panel__section-title followups-panel__section-title--today">
                    <span className="followups-panel__section-dot" />
                    Hoje ({todayFollowups.length})
                  </h3>
                  <div className="followups-panel__list">
                    {todayFollowups.map(followup => (
                      <FollowupItem
                        key={followup.id}
                        followup={followup}
                        status="today"
                        formatDate={formatFollowupDate}
                        onToggle={handleToggleFollowup}
                        onOpenContact={onOpenContact}
                      />
                    ))}
                  </div>
                </div>
              )}

              {soonFollowups.length > 0 && (
                <div className="followups-panel__section">
                  <h3 className="followups-panel__section-title followups-panel__section-title--soon">
                    <span className="followups-panel__section-dot" />
                    Esta Semana ({soonFollowups.length})
                  </h3>
                  <div className="followups-panel__list">
                    {soonFollowups.map(followup => (
                      <FollowupItem
                        key={followup.id}
                        followup={followup}
                        status="soon"
                        formatDate={formatFollowupDate}
                        onToggle={handleToggleFollowup}
                        onOpenContact={onOpenContact}
                      />
                    ))}
                  </div>
                </div>
              )}

              {futureFollowups.length > 0 && (
                <div className="followups-panel__section">
                  <h3 className="followups-panel__section-title followups-panel__section-title--future">
                    <span className="followups-panel__section-dot" />
                    Próximos ({futureFollowups.length})
                  </h3>
                  <div className="followups-panel__list">
                    {futureFollowups.map(followup => (
                      <FollowupItem
                        key={followup.id}
                        followup={followup}
                        status="future"
                        formatDate={formatFollowupDate}
                        onToggle={handleToggleFollowup}
                        onOpenContact={onOpenContact}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface FollowupItemProps {
  followup: ContactFollowup;
  status: string;
  formatDate: (date: string) => string;
  onToggle: (followup: ContactFollowup) => void;
  onOpenContact?: (contactId: string) => void;
}

function FollowupItem({ followup, status, formatDate, onToggle, onOpenContact }: FollowupItemProps) {
  return (
    <div className={`followups-panel__item followups-panel__item--${status}`}>
      <button
        onClick={() => onToggle(followup)}
        className="followups-panel__item-check"
        title="Marcar como concluído"
      >
        <Check size={12} />
      </button>

      <div className="followups-panel__item-content">
        <div className="followups-panel__item-contact">
          <User size={14} />
          <span className="followups-panel__item-name">{followup.contact_name}</span>
          {followup.contact_company && (
            <>
              <span className="followups-panel__item-separator">•</span>
              <Building size={12} />
              <span className="followups-panel__item-company">{followup.contact_company}</span>
            </>
          )}
        </div>
        <div className="followups-panel__item-info">
          <span className="followups-panel__item-date">
            <Clock size={12} />
            {formatDate(followup.date)}
          </span>
          {followup.description && (
            <span className="followups-panel__item-desc">{followup.description}</span>
          )}
        </div>
      </div>

      {onOpenContact && (
        <button
          onClick={() => onOpenContact(followup.contact_id)}
          className="followups-panel__item-open"
          title="Abrir contato"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
