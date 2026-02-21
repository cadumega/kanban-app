import { useState } from 'react';
import { X, ArrowRight, MessageSquare } from 'lucide-react';
import type { Contact, CRMColumn } from '../../types';
import './MoveContactModal.css';

interface MoveContactModalProps {
  isOpen: boolean;
  contact: Contact;
  fromColumn: CRMColumn;
  toColumn: CRMColumn;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
}

export function MoveContactModal({
  isOpen,
  contact,
  fromColumn,
  toColumn,
  onConfirm,
  onCancel,
}: MoveContactModalProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(note.trim() || undefined);
    } finally {
      setIsSubmitting(false);
      setNote('');
    }
  };

  const handleCancel = () => {
    setNote('');
    onCancel();
  };

  return (
    <div className="move-modal-overlay" onClick={handleCancel}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        <header className="move-modal__header">
          <h3>Mover Contato</h3>
          <button className="btn btn-ghost" onClick={handleCancel}>
            <X size={18} />
          </button>
        </header>

        <div className="move-modal__content">
          <div className="move-modal__contact">
            <span className="move-modal__contact-name">{contact.name}</span>
            {contact.company && (
              <span className="move-modal__contact-company">{contact.company}</span>
            )}
          </div>

          <div className="move-modal__flow">
            <div className="move-modal__column" style={{ borderLeftColor: fromColumn.color }}>
              <span>{fromColumn.title}</span>
            </div>
            <ArrowRight size={20} className="move-modal__arrow" />
            <div className="move-modal__column move-modal__column--target" style={{ borderLeftColor: toColumn.color }}>
              <span>{toColumn.title}</span>
            </div>
          </div>

          <div className="move-modal__note-section">
            <label>
              <MessageSquare size={14} />
              Adicionar nota (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Reunião realizada, cliente demonstrou interesse..."
              rows={3}
            />
          </div>
        </div>

        <footer className="move-modal__footer">
          <button className="btn btn-ghost" onClick={handleCancel} disabled={isSubmitting}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Movendo...' : 'Confirmar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
