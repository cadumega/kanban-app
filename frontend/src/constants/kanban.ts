/**
 * Kanban Constants
 * Centralized constants for task management
 */

export type Priority = 'alta' | 'media' | 'baixa';

export interface PriorityConfig {
  value: Priority;
  label: string;
  color: string;
  bgColor: string;
}

export const PRIORITY_OPTIONS: PriorityConfig[] = [
  { value: 'alta', label: 'Alta', color: '#DC2626', bgColor: '#FEE2E2' },
  { value: 'media', label: 'Media', color: '#D97706', bgColor: '#FEF3C7' },
  { value: 'baixa', label: 'Baixa', color: '#16A34A', bgColor: '#DCFCE7' }
];

export const PRIORITY_COLORS: Record<Priority, { color: string; bgColor: string }> = {
  alta: { color: '#DC2626', bgColor: '#FEE2E2' },
  media: { color: '#D97706', bgColor: '#FEF3C7' },
  baixa: { color: '#16A34A', bgColor: '#DCFCE7' }
};

export const getPriorityLabel = (priority: Priority): string => {
  const option = PRIORITY_OPTIONS.find(p => p.value === priority);
  return option?.label || priority;
};

export const getPriorityColors = (priority: Priority): { color: string; bgColor: string } => {
  return PRIORITY_COLORS[priority] || { color: '#6B7280', bgColor: '#F3F4F6' };
};

// Points options for task complexity
export const POINTS_OPTIONS = [1, 3, 5, 7] as const;
export type Points = typeof POINTS_OPTIONS[number];

// Project status options
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: 'planning', label: 'Planejamento', color: '#6366F1' },
  { value: 'active', label: 'Ativo', color: '#22C55E' },
  { value: 'paused', label: 'Pausado', color: '#F59E0B' },
  { value: 'completed', label: 'Concluido', color: '#10B981' }
];
