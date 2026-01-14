import { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal, Pencil, Trash2, X, Check, DollarSign } from 'lucide-react';
import { TaskCard } from '../TaskCard/TaskCard';
import type { Column as ColumnType, Task } from '../../types';
import './Column.css';

interface ColumnProps {
  column: ColumnType;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateColumn: (id: string, updates: { title?: string; color?: string }) => void;
  onDeleteColumn: (id: string) => void;
}

export function Column({
  column,
  onAddTask,
  onEditTask,
  onUpdateColumn,
  onDeleteColumn,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const totalValue = useMemo(() => {
    return column.tasks.reduce((sum, task) => sum + (task.value || 0), 0);
  }, [column.tasks]);

  const totalPoints = useMemo(() => {
    return column.tasks.reduce((sum, task) => sum + (task.points || 0), 0);
  }, [column.tasks]);

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
                      if (confirm(`Excluir coluna "${column.title}" e todas as tarefas?`)) {
                        onDeleteColumn(column.id);
                      }
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
              <DollarSign size={12} />
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
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onEditTask(task)}
            />
          ))}
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
    </div>
  );
}
