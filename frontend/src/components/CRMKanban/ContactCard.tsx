import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Building2, Clock, DollarSign, Bot, Gift } from 'lucide-react';
import type { Contact, ContactSegment } from '../../types';
import './ContactCard.css';

interface ContactCardProps {
  contact: Contact;
  onClick: () => void;
  isDragging?: boolean;
}

const SEGMENT_COLORS: Record<ContactSegment, string> = {
  'n8n': '#EA4B71',
  'chapeu': '#8B5CF6',
  'parceria': '#22C55E',
  'consultoria': '#F59E0B',
};

const SEGMENT_LABELS: Record<ContactSegment, string> = {
  'n8n': 'N8N',
  'chapeu': 'Chapéu',
  'parceria': 'Parceria',
  'consultoria': 'Consultoria',
};

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
}

function formatDaysSince(days: number | undefined): string {
  if (days === undefined || days === null) return '-';
  const rounded = Math.floor(days);
  if (rounded === 0) return 'Hoje';
  if (rounded === 1) return '1 dia';
  return `${rounded} dias`;
}

function getDaysColor(days: number | undefined): string {
  if (days === undefined || days === null) return 'var(--text-secondary)';
  if (days <= 3) return 'var(--success)';
  if (days <= 7) return 'var(--accent)';
  if (days <= 14) return 'var(--warning)';
  return 'var(--danger)';
}

export function ContactCard({ contact, onClick, isDragging }: ContactCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: contact.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dragging = isDragging || isSortableDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`contact-card ${dragging ? 'contact-card--dragging' : ''}`}
      onClick={onClick}
    >
      <div className="contact-card__header">
        <span className="contact-card__name">{contact.name}</span>
        {contact.is_robot === 1 && (
          <span className="contact-card__badge contact-card__badge--robot" title="Robot">
            <Bot size={12} />
          </span>
        )}
        {contact.presente === 1 && (
          <span className="contact-card__badge contact-card__badge--gift" title="Presente enviado">
            <Gift size={12} />
          </span>
        )}
      </div>

      {contact.company && (
        <div className="contact-card__company">
          <Building2 size={12} />
          <span>{contact.company}</span>
        </div>
      )}

      {contact.segments && (
        <div className="contact-card__segments">
          {contact.segments.split(',').map((seg) => (
            <span
              key={seg}
              className="contact-card__segment"
              style={{ background: SEGMENT_COLORS[seg as ContactSegment] || '#6B7280' }}
              title={SEGMENT_LABELS[seg as ContactSegment] || seg}
            >
              {SEGMENT_LABELS[seg as ContactSegment] || seg}
            </span>
          ))}
        </div>
      )}

      <div className="contact-card__footer">
        {contact.valor_mensal > 0 && (
          <div className="contact-card__value" title={`R$ ${contact.valor_mensal.toLocaleString('pt-BR')}/mês`}>
            <DollarSign size={12} />
            <span>{formatCurrency(contact.valor_mensal)}</span>
          </div>
        )}

        <div
          className="contact-card__days"
          style={{ color: getDaysColor(contact.days_since_contact) }}
          title={`Dias desde último contato`}
        >
          <Clock size={12} />
          <span>{formatDaysSince(contact.days_since_contact)}</span>
        </div>
      </div>
    </div>
  );
}

// Simpler card for DragOverlay
export function ContactCardOverlay({ contact }: { contact: Contact }) {
  return (
    <div className="contact-card contact-card--overlay">
      <div className="contact-card__header">
        <span className="contact-card__name">{contact.name}</span>
      </div>
      {contact.company && (
        <div className="contact-card__company">
          <Building2 size={12} />
          <span>{contact.company}</span>
        </div>
      )}
    </div>
  );
}
