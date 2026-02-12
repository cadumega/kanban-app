import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Lock, Calendar, User, Users, Clock, CheckSquare, FolderKanban, ArrowUp, ArrowDown, Star } from 'lucide-react';
import type { Task } from '../../types';
import './TaskCard.css';

// Calcula status do deadline baseado em start_date + pontos (pontos = dias)
function getDeadlineStatus(startDate: string | null, points: number, completedAt: string | null) {
  if (!startDate || points <= 0) return null;

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Se concluído, calcular baseado na data de conclusão
  if (completedAt) {
    const completed = new Date(completedAt);
    completed.setHours(0, 0, 0, 0);
    const totalDays = points;
    const daysUsed = Math.ceil((completed.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = totalDays - daysUsed;
    const progress = Math.min(Math.max((daysUsed / totalDays) * 100, 0), 100);

    return {
      status: daysRemaining >= 0 ? 'completed' : 'completed-late',
      daysRemaining,
      progress,
      totalDays,
      isCompleted: true,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = points;
  const daysElapsed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = totalDays - daysElapsed;

  // Percentual de progresso (0 a 100+)
  const progress = Math.min(Math.max((daysElapsed / totalDays) * 100, 0), 120);

  let status: string;
  if (daysRemaining < 0) {
    status = 'overdue';
  } else if (daysRemaining === 0) {
    status = 'today';
  } else if (progress >= 70) {
    status = 'close';
  } else {
    status = 'ok';
  }

  return { status, daysRemaining, progress, totalDays, isCompleted: false };
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onToggleFocus?: (id: string, focus: boolean) => void;
}

export function TaskCard({ task, onClick, onToggleFocus }: TaskCardProps) {
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

  const priorityConfig = {
    alta: { label: 'Alta', icon: ArrowUp, color: '#E53935' },
    media: { label: 'Média', icon: ArrowUp, color: '#FB8C00' },
    baixa: { label: 'Baixa', icon: ArrowDown, color: '#1E88E5' },
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

  const deadlineStatus = getDeadlineStatus(task.start_date, task.points, task.completed_at);

  const handleToggleFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFocus) {
      onToggleFocus(task.id, !task.focus);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'task-card--dragging' : ''} ${task.blocked ? 'task-card--blocked' : ''} ${task.focus ? 'task-card--focus' : ''}`}
    >
      {/* Focus ribbon */}
      {task.focus === 1 && (
        <div className="task-card__focus-ribbon" title="Foco do dia">
          <Star size={10} />
        </div>
      )}

      {/* Drag handle - área maior para arrastar */}
      <div className="task-card__drag-area" {...attributes} {...listeners} />

      <div className="task-card__content" onClick={onClick}>
        <div className="task-card__header">
          <h4 className="task-card__title">{task.title}</h4>
          <div className="task-card__header-icons">
            {onToggleFocus && (
              <button
                className={`task-card__focus-btn ${task.focus ? 'task-card__focus-btn--active' : ''}`}
                onClick={handleToggleFocus}
                title={task.focus ? 'Remover foco' : 'Marcar como foco do dia'}
              >
                <Star size={14} />
              </button>
            )}
            {task.blocked === 1 && (
              <Lock size={14} className="task-card__lock" />
            )}
          </div>
        </div>

        {deadlineStatus && (
          <div
            className={`task-card__deadline task-card__deadline--${deadlineStatus.status}`}
            title={deadlineStatus.isCompleted
              ? (deadlineStatus.daysRemaining >= 0
                ? `Concluído ${deadlineStatus.daysRemaining}d antes do prazo`
                : `Concluído ${Math.abs(deadlineStatus.daysRemaining)}d após o prazo`)
              : (deadlineStatus.daysRemaining < 0
                ? `${Math.abs(deadlineStatus.daysRemaining)}d atrasado`
                : deadlineStatus.daysRemaining === 0
                  ? 'Vence hoje!'
                  : `${deadlineStatus.daysRemaining}d restantes`)}
          >
            <div className="task-card__deadline-bar">
              <div
                className="task-card__deadline-fill"
                style={{ width: `${Math.min(deadlineStatus.progress, 100)}%` }}
              />
            </div>
            <span className="task-card__deadline-label">
              {deadlineStatus.isCompleted
                ? '✓'
                : (deadlineStatus.daysRemaining < 0
                  ? `+${Math.abs(deadlineStatus.daysRemaining)}`
                  : deadlineStatus.daysRemaining)}
            </span>
          </div>
        )}

        {task.blocked === 1 && task.blocked_by && (
          <div className="task-card__blocked-info">
            Bloqueado por: {task.blocked_by}
          </div>
        )}

        <div className="task-card__footer">
          <span className="task-card__priority" style={{ color: priorityConfig[task.priority].color }} title={priorityConfig[task.priority].label}>
            {(() => {
              const PriorityIcon = priorityConfig[task.priority].icon;
              return <PriorityIcon size={14} strokeWidth={3} />;
            })()}
          </span>

          {task.points > 0 && (
            <span className="task-card__tag task-card__tag--points" title="Pontos (dias)">
              <Clock size={10} />
              {task.points}
            </span>
          )}

          {task.category_name && (
            <span
              className="task-card__category"
              style={{ backgroundColor: task.category_color + '20', color: task.category_color }}
            >
              {task.category_name}
            </span>
          )}

          {task.project && (
            <span className="task-card__tag task-card__tag--project">
              <FolderKanban size={10} />
              {task.project}
            </span>
          )}

          {task.assignee && (
            <span className="task-card__tag task-card__tag--assignee">
              <User size={10} />
              {task.assignee}
            </span>
          )}

          {task.dependent && (
            <span className="task-card__tag task-card__tag--dependent">
              <Users size={10} />
              {task.dependent}
            </span>
          )}

          {task.value > 0 && (
            <span className="task-card__tag task-card__tag--value" title="Valor mensal">
              {formatValue(task.value)}
            </span>
          )}

          {task.month && (
            <span className="task-card__tag task-card__tag--month">
              <Calendar size={10} />
              {formatMonth(task.month)}
            </span>
          )}

          {(task.checklist_total ?? 0) > 0 && (
            <span
              className={`task-card__tag task-card__tag--checklist ${task.checklist_completed === task.checklist_total ? 'task-card__tag--checklist-done' : ''}`}
              title="Subtarefas"
            >
              <CheckSquare size={10} />
              {task.checklist_completed}/{task.checklist_total}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
