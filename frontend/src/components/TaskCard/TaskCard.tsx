import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lock, Calendar, User, Users, DollarSign, Clock } from 'lucide-react';
import type { Task } from '../../types';
import './TaskCard.css';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityLabels = {
    alta: 'Alta',
    media: 'Média',
    baixa: 'Baixa',
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(m) - 1]} ${year}`;
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'task-card--dragging' : ''} ${task.blocked ? 'task-card--blocked' : ''}`}
    >
      {/* Drag handle - área maior para arrastar */}
      <div className="task-card__drag-area" {...attributes} {...listeners} />

      <div className="task-card__content" onClick={onClick}>
        <div className="task-card__header">
          <h4 className="task-card__title">{task.title}</h4>
          <div className="task-card__header-icons">
            {task.points > 0 && (
              <span className="points-badge" title="Pontos de complexidade">
                <Clock size={10} />
                {task.points}
              </span>
            )}
            {task.blocked === 1 && (
              <Lock size={14} className="task-card__lock" />
            )}
          </div>
        </div>

        {task.description && (
          <p className="task-card__description">{task.description}</p>
        )}

        {(task.assignee || task.dependent) && (
          <div className="task-card__people">
            {task.assignee && (
              <span className="task-card__person task-card__person--assignee">
                <User size={12} />
                {task.assignee}
              </span>
            )}
            {task.dependent && (
              <span className="task-card__person task-card__person--dependent">
                <Users size={12} />
                {task.dependent}
              </span>
            )}
          </div>
        )}

        <div className="task-card__footer">
          <div className="task-card__badges">
            <span className={`badge badge-priority-${task.priority}`}>
              {priorityLabels[task.priority]}
            </span>

            {task.category_name && (
              <span
                className="task-card__category"
                style={{ backgroundColor: task.category_color + '20', color: task.category_color }}
              >
                {task.category_name}
              </span>
            )}
          </div>

          <div className="task-card__meta">
            {task.value > 0 && (
              <span className="value-badge" title="Valor mensal">
                <DollarSign size={10} />
                {formatValue(task.value)}
              </span>
            )}
            {task.month && (
              <span className="task-card__month">
                <Calendar size={12} />
                {formatMonth(task.month)}
              </span>
            )}
          </div>
        </div>

        {task.blocked === 1 && task.blocked_by && (
          <div className="task-card__blocked-info">
            Bloqueado por: {task.blocked_by}
          </div>
        )}
      </div>
    </div>
  );
}
