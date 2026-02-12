import { useState, useEffect, useCallback } from 'react';
import type { Column, Task, Category, Filters, CreateTaskPayload, Priority } from '../types';
import * as api from '../services/api';
import type { Board, BoardLimitInfo } from '../services/api';

export function useBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(() => {
    return localStorage.getItem('currentBoardId');
  });
  const [boardLimitInfo, setBoardLimitInfo] = useState<BoardLimitInfo | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    category_id: null,
    priority: null,
    month: null,
    blocked: null,
  });

  // Load boards list
  const loadBoards = useCallback(async () => {
    try {
      const [boardsData, limitInfo] = await Promise.all([
        api.getBoards(),
        api.getBoardLimitInfo(),
      ]);
      setBoards(boardsData);
      setBoardLimitInfo(limitInfo);

      // Set current board if not set or invalid
      if (boardsData.length > 0) {
        const savedBoardId = localStorage.getItem('currentBoardId');
        const validBoard = boardsData.find(b => b.id === savedBoardId);
        if (validBoard) {
          setCurrentBoardId(validBoard.id);
        } else {
          setCurrentBoardId(boardsData[0].id);
          localStorage.setItem('currentBoardId', boardsData[0].id);
        }
      }
      return boardsData;
    } catch (err) {
      console.error('Erro ao carregar boards:', err);
      return [];
    }
  }, []);

  // Load columns and tasks for current board
  const loadData = useCallback(async (boardId?: string) => {
    try {
      setLoading(true);
      const targetBoardId = boardId || currentBoardId;
      const [columnsData, categoriesData] = await Promise.all([
        api.getColumns(targetBoardId || undefined),
        api.getCategories(),
      ]);
      setColumns(columnsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentBoardId]);

  // Load boards first, then data
  useEffect(() => {
    const init = async () => {
      const boardsData = await loadBoards();
      if (boardsData.length > 0) {
        const savedBoardId = localStorage.getItem('currentBoardId');
        const validBoard = boardsData.find(b => b.id === savedBoardId);
        const targetBoardId = validBoard?.id || boardsData[0].id;
        await loadData(targetBoardId);
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Switch board
  const selectBoard = useCallback(async (boardId: string) => {
    setCurrentBoardId(boardId);
    localStorage.setItem('currentBoardId', boardId);
    await loadData(boardId);
  }, [loadData]);

  // Create board
  const createBoard = async (name: string) => {
    try {
      const newBoard = await api.createBoard(name);
      setBoards(prev => [...prev, newBoard]);
      setBoardLimitInfo(prev => prev ? { ...prev, current: prev.current + 1, canCreate: prev.current + 1 < prev.limit } : null);
      await selectBoard(newBoard.id);
      return newBoard;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao criar board';
      setError(message);
      throw new Error(message);
    }
  };

  // Update board
  const updateBoard = async (id: string, name: string) => {
    try {
      const updated = await api.updateBoard(id, name);
      setBoards(prev => prev.map(b => b.id === id ? { ...b, name: updated.name } : b));
      return updated;
    } catch (err) {
      setError('Erro ao atualizar board');
      throw err;
    }
  };

  // Delete board
  const deleteBoard = async (id: string) => {
    try {
      await api.deleteBoard(id);
      const remaining = boards.filter(b => b.id !== id);
      setBoards(remaining);
      setBoardLimitInfo(prev => prev ? { ...prev, current: prev.current - 1, canCreate: true } : null);

      // If deleted current board, switch to first remaining
      if (currentBoardId === id && remaining.length > 0) {
        await selectBoard(remaining[0].id);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao excluir board';
      setError(message);
      throw new Error(message);
    }
  };

  const currentBoard = boards.find(b => b.id === currentBoardId);

  // Filter tasks
  const getFilteredColumns = useCallback(() => {
    if (!filters.category_id && !filters.priority && !filters.month && filters.blocked === null && !filters.person && !filters.project) {
      return columns;
    }

    return columns.map(col => ({
      ...col,
      tasks: col.tasks.filter(task => {
        if (filters.category_id && task.category_id !== filters.category_id) return false;
        if (filters.priority && task.priority !== filters.priority) return false;
        if (filters.month && task.month !== filters.month) return false;
        if (filters.blocked !== null && Boolean(task.blocked) !== filters.blocked) return false;
        if (filters.person && task.assignee !== filters.person && task.dependent !== filters.person) return false;
        if (filters.project && task.project !== filters.project) return false;
        return true;
      }),
    }));
  }, [columns, filters]);

  // Column operations
  const addColumn = async (title: string, color?: string) => {
    try {
      const newColumn = await api.createColumn(title, color, currentBoardId || undefined);
      setColumns(prev => [...prev, newColumn]);
    } catch (err) {
      setError('Erro ao criar coluna');
      console.error(err);
    }
  };

  const updateColumn = async (id: string, updates: { title?: string; color?: string }) => {
    try {
      await api.updateColumn(id, updates);
      setColumns(prev =>
        prev.map(col => (col.id === id ? { ...col, ...updates } : col))
      );
    } catch (err) {
      setError('Erro ao atualizar coluna');
      console.error(err);
    }
  };

  const removeColumn = async (id: string) => {
    try {
      await api.deleteColumn(id);
      setColumns(prev => prev.filter(col => col.id !== id));
    } catch (err) {
      setError('Erro ao excluir coluna');
      console.error(err);
    }
  };

  // Task operations
  const addTask = async (payload: CreateTaskPayload) => {
    try {
      const newTask = await api.createTask(payload);
      setColumns(prev =>
        prev.map(col =>
          col.id === payload.column_id
            ? { ...col, tasks: [...col.tasks, newTask] }
            : col
        )
      );
      return newTask;
    } catch (err) {
      setError('Erro ao criar tarefa');
      console.error(err);
      return null;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      const { blocked, ...rest } = updates;
      const updatedTask = await api.updateTask(id, rest);
      setColumns(prev =>
        prev.map(col => ({
          ...col,
          tasks: col.tasks.map(task =>
            task.id === id ? { ...task, ...updatedTask } : task
          ),
        }))
      );
      return updatedTask;
    } catch (err) {
      setError('Erro ao atualizar tarefa');
      console.error(err);
      return null;
    }
  };

  const moveTask = async (taskId: string, targetColumnId: string, position: number) => {
    // Optimistic update
    const sourceColumn = columns.find(col => col.tasks.some(t => t.id === taskId));
    if (!sourceColumn) return;

    const task = sourceColumn.tasks.find(t => t.id === taskId);
    if (!task) return;

    setColumns(prev => {
      const newColumns = prev.map(col => {
        if (col.id === sourceColumn.id && col.id !== targetColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter(t => t.id !== taskId),
          };
        }
        if (col.id === targetColumnId) {
          const newTasks = col.tasks.filter(t => t.id !== taskId);
          newTasks.splice(position, 0, { ...task, column_id: targetColumnId, position });
          return { ...col, tasks: newTasks };
        }
        return col;
      });
      return newColumns;
    });

    try {
      await api.moveTask({ id: taskId, column_id: targetColumnId, position });
    } catch (err) {
      setError('Erro ao mover tarefa');
      console.error(err);
      loadData(); // Reload on error
    }
  };

  const removeTask = async (id: string) => {
    try {
      await api.deleteTask(id);
      setColumns(prev =>
        prev.map(col => ({
          ...col,
          tasks: col.tasks.filter(task => task.id !== id),
        }))
      );
    } catch (err) {
      setError('Erro ao excluir tarefa');
      console.error(err);
    }
  };

  const toggleTaskBlock = async (
    id: string,
    blocked: boolean,
    blocked_by?: string,
    blocked_reason?: string
  ) => {
    try {
      const updatedTask = await api.toggleTaskBlock(id, blocked, blocked_by, blocked_reason);
      setColumns(prev =>
        prev.map(col => ({
          ...col,
          tasks: col.tasks.map(task =>
            task.id === id ? updatedTask : task
          ),
        }))
      );
    } catch (err) {
      setError('Erro ao bloquear/desbloquear tarefa');
      console.error(err);
    }
  };

  const toggleTaskFocus = async (id: string, focus: boolean) => {
    try {
      const updatedTask = await api.toggleTaskFocus(id, focus);
      setColumns(prev =>
        prev.map(col => ({
          ...col,
          tasks: col.tasks.map(task =>
            task.id === id ? updatedTask : task
          ),
        }))
      );
    } catch (err) {
      setError('Erro ao alterar foco da tarefa');
      console.error(err);
    }
  };

  // Category operations
  const addCategory = async (name: string, color?: string) => {
    try {
      const newCategory = await api.createCategory(name, color);
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (err) {
      setError('Erro ao criar categoria');
      console.error(err);
      return null;
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (err) {
      setError('Erro ao excluir categoria');
      console.error(err);
    }
  };

  // Get all unique months from tasks
  const getMonths = useCallback(() => {
    const months = new Set<string>();
    columns.forEach(col => {
      col.tasks.forEach(task => {
        if (task.month) months.add(task.month);
      });
    });
    return Array.from(months).sort().reverse();
  }, [columns]);

  // Stats
  const getStats = useCallback(() => {
    let total = 0;
    let blocked = 0;
    let totalValue = 0;
    let totalPoints = 0;
    const byPriority: Record<Priority, number> = { alta: 0, media: 0, baixa: 0 };
    const byCategory: Record<string, number> = {};

    columns.forEach(col => {
      col.tasks.forEach(task => {
        total++;
        if (task.blocked) blocked++;
        totalValue += task.value || 0;
        totalPoints += task.points || 0;
        byPriority[task.priority]++;
        if (task.category_id) {
          byCategory[task.category_id] = (byCategory[task.category_id] || 0) + 1;
        }
      });
    });

    return { total, blocked, totalValue, totalPoints, byPriority, byCategory };
  }, [columns]);

  return {
    // Boards
    boards,
    currentBoard,
    currentBoardId,
    boardLimitInfo,
    selectBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    // Columns and tasks
    columns,
    categories,
    loading,
    error,
    filters,
    setFilters,
    getFilteredColumns,
    addColumn,
    updateColumn,
    removeColumn,
    addTask,
    updateTask,
    moveTask,
    removeTask,
    toggleTaskBlock,
    toggleTaskFocus,
    addCategory,
    removeCategory,
    getMonths,
    getStats,
    refresh: () => loadData(currentBoardId || undefined),
  };
}
