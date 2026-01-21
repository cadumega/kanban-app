import { useState, useEffect, useMemo } from 'react';
import {
  X,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { Contact, ContactTag } from '../../types';
import * as api from '../../services/api';
import './FunnelPanel.css';

interface FunnelPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenContact?: (contactId: string) => void;
}

// Funnel stages in order
const FUNNEL_STAGES: { value: ContactTag; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: '#3B82F6' },
  { value: 'qualificado', label: 'Qualificado', color: '#8B5CF6' },
  { value: 'proposta', label: 'Proposta', color: '#F59E0B' },
  { value: 'negociacao', label: 'Negociação', color: '#EC4899' },
  { value: 'cliente', label: 'Cliente', color: '#22C55E' },
];

const LOST_STAGE = { value: 'perdido' as ContactTag, label: 'Perdido', color: '#EF4444' };

export function FunnelPanel({ isOpen, onClose, onOpenContact }: FunnelPanelProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedStage, setSelectedStage] = useState<ContactTag | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
    }
  };

  // Group contacts by funnel stage
  const funnelData = useMemo(() => {
    const stages = FUNNEL_STAGES.map(stage => ({
      ...stage,
      contacts: contacts.filter(c => c.tag === stage.value),
      count: contacts.filter(c => c.tag === stage.value).length,
    }));

    const lostCount = contacts.filter(c => c.tag === 'perdido').length;
    const noTagCount = contacts.filter(c => !c.tag).length;
    const total = contacts.length;
    const maxCount = Math.max(...stages.map(s => s.count), 1);

    return { stages, lostCount, noTagCount, total, maxCount };
  }, [contacts]);

  // Calculate conversion rates
  const conversionRates = useMemo(() => {
    const rates: { from: string; to: string; rate: number }[] = [];

    for (let i = 0; i < funnelData.stages.length - 1; i++) {
      const current = funnelData.stages[i];
      const next = funnelData.stages[i + 1];

      // Count contacts that moved to next stage or beyond
      const movedForward = funnelData.stages
        .slice(i + 1)
        .reduce((sum, s) => sum + s.count, 0);

      const total = current.count + movedForward;
      const rate = total > 0 ? Math.round((movedForward / total) * 100) : 0;

      rates.push({
        from: current.label,
        to: next.label,
        rate,
      });
    }

    return rates;
  }, [funnelData]);

  const handleContactClick = (contactId: string) => {
    onClose();
    if (onOpenContact) {
      onOpenContact(contactId);
    }
  };

  if (!isOpen) return null;

  const stageContacts = selectedStage
    ? contacts.filter(c => c.tag === selectedStage)
    : selectedStage === null && funnelData.noTagCount > 0
      ? contacts.filter(c => !c.tag)
      : [];

  return (
    <div className="funnel-panel-overlay" onClick={onClose}>
      <div className="funnel-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="funnel-panel__header">
          <h2>
            <TrendingUp size={20} />
            Funil de Vendas
          </h2>
          <div className="funnel-panel__header-stats">
            <span className="funnel-panel__stat">
              <Users size={14} />
              {funnelData.total} contatos
            </span>
          </div>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="funnel-panel__body">
          {/* Funnel Visualization */}
          <div className="funnel-panel__funnel">
            {funnelData.stages.map((stage, index) => {
              const widthPercent = 100 - (index * 15);
              const isSelected = selectedStage === stage.value;

              return (
                <div key={stage.value} className="funnel-panel__stage-wrapper">
                  <button
                    className={`funnel-panel__stage ${isSelected ? 'funnel-panel__stage--selected' : ''}`}
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: stage.color,
                    }}
                    onClick={() => setSelectedStage(isSelected ? null : stage.value)}
                  >
                    <span className="funnel-panel__stage-label">{stage.label}</span>
                    <span className="funnel-panel__stage-count">{stage.count}</span>
                  </button>

                  {/* Conversion arrow */}
                  {index < funnelData.stages.length - 1 && conversionRates[index] && (
                    <div className="funnel-panel__conversion">
                      <span className="funnel-panel__conversion-rate">
                        {conversionRates[index].rate}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Lost contacts indicator */}
            {funnelData.lostCount > 0 && (
              <div className="funnel-panel__lost">
                <span
                  className="funnel-panel__lost-badge"
                  style={{ backgroundColor: LOST_STAGE.color }}
                >
                  {LOST_STAGE.label}: {funnelData.lostCount}
                </span>
              </div>
            )}

            {/* No tag contacts */}
            {funnelData.noTagCount > 0 && (
              <button
                className={`funnel-panel__no-tag ${selectedStage === null ? 'funnel-panel__no-tag--selected' : ''}`}
                onClick={() => setSelectedStage(selectedStage === null ? 'lead' : null)}
              >
                Sem classificação: {funnelData.noTagCount}
              </button>
            )}
          </div>

          {/* Stage Details */}
          {selectedStage && (
            <div className="funnel-panel__details">
              <h3>
                {FUNNEL_STAGES.find(s => s.value === selectedStage)?.label || 'Contatos'}
                <span className="funnel-panel__details-count">
                  ({stageContacts.length})
                </span>
              </h3>
              <div className="funnel-panel__contacts-list">
                {stageContacts.map(contact => (
                  <button
                    key={contact.id}
                    className="funnel-panel__contact"
                    onClick={() => handleContactClick(contact.id)}
                  >
                    <div className="funnel-panel__contact-avatar">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="funnel-panel__contact-info">
                      <span className="funnel-panel__contact-name">{contact.name}</span>
                      {contact.company && (
                        <span className="funnel-panel__contact-company">{contact.company}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="funnel-panel__summary">
            <div className="funnel-panel__summary-title">Resumo do Funil</div>
            <div className="funnel-panel__summary-grid">
              {funnelData.stages.map(stage => (
                <div key={stage.value} className="funnel-panel__summary-item">
                  <span
                    className="funnel-panel__summary-dot"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="funnel-panel__summary-label">{stage.label}</span>
                  <span className="funnel-panel__summary-value">{stage.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
