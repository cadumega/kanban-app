import { ReactNode } from 'react';
import {
  Inbox,
  Users,
  Calendar,
  LayoutGrid,
  FileText,
  Search,
  FolderOpen,
  ClipboardList
} from 'lucide-react';
import './EmptyState.css';

export type EmptyStateType =
  | 'tasks'
  | 'contacts'
  | 'followups'
  | 'boards'
  | 'notes'
  | 'search'
  | 'folder'
  | 'generic';

interface EmptyStateProps {
  type?: EmptyStateType;
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const defaultIcons: Record<EmptyStateType, ReactNode> = {
  tasks: <ClipboardList size={48} strokeWidth={1.5} />,
  contacts: <Users size={48} strokeWidth={1.5} />,
  followups: <Calendar size={48} strokeWidth={1.5} />,
  boards: <LayoutGrid size={48} strokeWidth={1.5} />,
  notes: <FileText size={48} strokeWidth={1.5} />,
  search: <Search size={48} strokeWidth={1.5} />,
  folder: <FolderOpen size={48} strokeWidth={1.5} />,
  generic: <Inbox size={48} strokeWidth={1.5} />
};

export function EmptyState({
  type = 'generic',
  title,
  description,
  action,
  icon,
  size = 'md'
}: EmptyStateProps) {
  const displayIcon = icon || defaultIcons[type];

  return (
    <div className={`empty-state empty-state--${size}`} role="status">
      <div className="empty-state__icon" aria-hidden="true">
        {displayIcon}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      {description && (
        <p className="empty-state__description">{description}</p>
      )}
      {action && (
        <div className="empty-state__action">{action}</div>
      )}
    </div>
  );
}

// Pre-configured empty states for common use cases
export function EmptyTasks({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      type="tasks"
      title="Nenhuma tarefa"
      description="Comece adicionando sua primeira tarefa"
      action={
        onAdd && (
          <button className="empty-state__btn" onClick={onAdd}>
            Adicionar tarefa
          </button>
        )
      }
    />
  );
}

export function EmptyContacts({ onAdd }: { onAdd?: () => void }) {
  return (
    <EmptyState
      type="contacts"
      title="Nenhum contato"
      description="Adicione contatos para gerenciar seu CRM"
      action={
        onAdd && (
          <button className="empty-state__btn" onClick={onAdd}>
            Adicionar contato
          </button>
        )
      }
    />
  );
}

export function EmptyFollowups() {
  return (
    <EmptyState
      type="followups"
      title="Nenhum follow-up pendente"
      description="Voce esta em dia com seus contatos!"
    />
  );
}

export function EmptySearch({ query }: { query?: string }) {
  return (
    <EmptyState
      type="search"
      title="Nenhum resultado"
      description={query ? `Nenhum resultado para "${query}"` : 'Tente buscar por outro termo'}
    />
  );
}

export function EmptyNotes() {
  return (
    <EmptyState
      type="notes"
      title="Nenhuma nota"
      description="Adicione notas para registrar interacoes"
      size="sm"
    />
  );
}
