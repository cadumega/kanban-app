import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Column } from '../Column/Column';
import { TaskCard } from '../TaskCard/TaskCard';
import type { Column as ColumnType, Task } from '../../types';
import './Board.css';

interface BoardProps {
  columns: ColumnType[];
  onAddColumn: () => void;
  onAddTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onUpdateColumn: (id: string, updates: { title?: string; color?: string }) => void;
  onDeleteColumn: (id: string) => void;
  onMoveTask: (taskId: string, targetColumnId: string, position: number) => void;
  onToggleFocus?: (id: string, focus: boolean) => void;
}

export function Board({
  columns,
  onAddColumn,
  onAddTask,
  onEditTask,
  onUpdateColumn,
  onDeleteColumn,
  onMoveTask,
  onToggleFocus,
}: BoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findTask = (id: string): Task | undefined => {
    for (const column of columns) {
      const task = column.tasks.find((t) => t.id === id);
      if (task) return task;
    }
    return undefined;
  };

  const findColumn = (id: string): ColumnType | undefined => {
    // Check if id is a column id
    const column = columns.find((c) => c.id === id);
    if (column) return column;

    // Check if id is a task id
    for (const col of columns) {
      if (col.tasks.some((t) => t.id === id)) {
        return col;
      }
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(event.active.id as string);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (_event: DragOverEvent) => {
    // Could implement preview here if needed
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) {
      setActiveTask(null);
      return;
    }

    // If dropped on the same position, do nothing
    if (activeId === overId) {
      setActiveTask(null);
      return;
    }

    // Find target position
    let newPosition = 0;
    const overTask = findTask(overId);

    if (overTask) {
      // Dropped on a task
      newPosition = overColumn.tasks.findIndex((t) => t.id === overId);
    } else {
      // Dropped on a column (empty space)
      newPosition = overColumn.tasks.length;
    }

    onMoveTask(activeId, overColumn.id, newPosition);
    setActiveTask(null);
  };

  return (
    <div className="board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="board__columns">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
              onToggleFocus={onToggleFocus}
            />
          ))}

          <button onClick={onAddColumn} className="board__add-column">
            <Plus size={20} />
            <span>Nova coluna</span>
          </button>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="board__drag-overlay">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
