import { useState, useMemo, Fragment } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, X, Check } from 'lucide-react';
import { TaskCard } from '../TaskCard/TaskCard';
import { ConfirmDialog, useToast } from '../shared';
import type { Column as ColumnType, Task } from '../../types';
import './Column.css';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function formatMonthLabel(month: string | null): string {
  if (!month) return 'Sem data';
  const [year, m] = month.split('-');
  return `${MONTH_NAMES[parseInt(m) - 1]} ${year}`;
}

interface ColumnProps {
  column: ColumnType;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateColumn: (id: string, updates: { title?: string; color?: string }) => void;
  onDeleteColumn: (id: string) => void;
  onToggleFocus?: (id: string, focus: boolean) => void;
}

export function Column({
  column,
  onAddTask,
  onEditTask,
  onUpdateColumn,
  onDeleteColumn,
  onToggleFocus,
}: ColumnProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const totalValue = useMemo(() => {
    return column.tasks.reduce((sum, task) => sum + (task.value || 0), 0);
  }, [column.tasks]);

  const totalPoints = useMemo(() => {
    return column.tasks.reduce((sum, task) => sum + (task.points || 0), 0);
  }, [column.tasks]);

  // Check if column is Concluído or Suporte (case-insensitive)
  const isConcluido = column.title.toLowerCase().includes('conclu');
  const isSuporte = column.title.toLowerCase().includes('suporte');

  // Group tasks by month for Concluído column
  const tasksByMonth = useMemo(() => {
    if (!isConcluido) return null;

    const groups: { month: string | null; tasks: Task[] }[] = [];
    let currentMonth: string | null = null;
    let currentGroup: Task[] = [];

    // Sort tasks by month (descending - most recent first)
    const sortedTasks = [...column.tasks].sort((a, b) => {
      const monthA = a.month || '0000-00';
      const monthB = b.month || '0000-00';
      return monthB.localeCompare(monthA);
    });

    sortedTasks.forEach(task => {
      const taskMonth = task.month || null;
      if (taskMonth !== currentMonth) {
        if (currentGroup.length > 0) {
          groups.push({ month: currentMonth, tasks: currentGroup });
        }
        currentMonth = taskMonth;
        currentGroup = [task];
      } else {
        currentGroup.push(task);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ month: currentMonth, tasks: currentGroup });
    }

    return groups;
  }, [column.tasks, isConcluido]);

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setEditTitle(column.title);
      setIsEditing(false);
    }
  };

  return (
    <div className={`column ${isOver ? 'column--over' : ''}`}>
      <div className="column__header">
        <div className="column__header-left">
          <div
            className="column__color-dot"
            style={{ backgroundColor: column.color }}
          />
          {isEditing ? (
            <div className="column__edit-title">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveTitle}
                className="column__title-input"
                autoFocus
              />
              <button onClick={handleSaveTitle} className="btn btn-icon btn-ghost">
                <Check size={14} />
              </button>
              <button
                onClick={() => {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }}
                className="btn btn-icon btn-ghost"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <h3 className="column__title">{column.title}</h3>
              <span className="column__count">{column.tasks.length}</span>
            </>
          )}
        </div>

        <div className="column__header-right">
          <button
            onClick={() => onAddTask(column.id)}
            className="btn btn-icon btn-ghost"
            title="Adicionar tarefa"
          >
            <Plus size={16} />
          </button>
          <div className="column__menu-wrapper">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="btn btn-icon btn-ghost"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="column__menu-backdrop" onClick={() => setShowMenu(false)} />
                <div className="column__menu">
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setShowMenu(false);
                    }}
                    className="column__menu-item"
                  >
                    <Pencil size={14} />
                    Editar nome
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="column__menu-item column__menu-item--danger"
                  >
                    <Trash2 size={14} />
                    Excluir coluna
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats da coluna */}
      {(totalValue > 0 || totalPoints > 0) && (
        <div className="column__stats">
          {totalValue > 0 && (
            <span className="column__stat column__stat--value">
              {formatValue(totalValue)}
            </span>
          )}
          {totalPoints > 0 && (
            <span className="column__stat column__stat--points">
              {totalPoints} pts
            </span>
          )}
        </div>
      )}

      <div ref={setNodeRef} className="column__content">
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* Concluído: tasks grouped by month with dividers */}
          {isConcluido && tasksByMonth ? (
            tasksByMonth.map((group, groupIndex) => (
              <Fragment key={group.month || 'no-month'}>
                {groupIndex > 0 && (
                  <div className="column__month-divider">
                    <span>{formatMonthLabel(group.month)}</span>
                  </div>
                )}
                {groupIndex === 0 && group.month && (
                  <div className="column__month-divider column__month-divider--first">
                    <span>{formatMonthLabel(group.month)}</span>
                  </div>
                )}
                {group.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onEditTask(task)}
                    onToggleFocus={onToggleFocus}
                  />
                ))}
              </Fragment>
            ))
          ) : isSuporte ? (
            /* Suporte: divider every 3 tasks */
            column.tasks.map((task, index) => (
              <Fragment key={task.id}>
                {index > 0 && index % 3 === 0 && (
                  <div className="column__task-divider" />
                )}
                <TaskCard
                  task={task}
                  onClick={() => onEditTask(task)}
                  onToggleFocus={onToggleFocus}
                />
              </Fragment>
            ))
          ) : (
            /* Default: no dividers */
            column.tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onEditTask(task)}
                onToggleFocus={onToggleFocus}
              />
            ))
          )}
        </SortableContext>

        {column.tasks.length === 0 && (
          <div className="column__empty">
            <p>Nenhuma tarefa</p>
            <button
              onClick={() => onAddTask(column.id)}
              className="btn btn-secondary btn-sm"
            >
              <Plus size={14} />
              Adicionar
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir coluna?"
        message={`A coluna "${column.title}" e todas as ${column.tasks.length} tarefas serão excluídas permanentemente.`}
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={() => {
          onDeleteColumn(column.id);
          setShowDeleteConfirm(false);
          toast.success('Coluna excluída');
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
