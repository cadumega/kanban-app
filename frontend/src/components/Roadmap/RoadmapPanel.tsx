import { useState, useEffect, useMemo } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import * as api from '../../services/api';
import './RoadmapPanel.css';

interface RoadmapTask {
  id: string;
  title: string;
  project: string;
  start_date: string;
  points: number;
  priority: string;
  updated_at: string;
  column_title: string;
  is_completed: number;
  completed_date: string | null;
  category_name: string | null;
  category_color: string | null;
}

interface RoadmapProject {
  name: string;
  tasks?: RoadmapTask[];
  task_count?: number;
  completed_tasks?: number;
  start_date: string | null;
  end_date: string | null;
  color: string;
}

interface RoadmapPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROJECT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B',
  '#22C55E', '#14B8A6', '#06B6D4', '#3B82F6', '#71717A',
];

export function RoadmapPanel({ isOpen, onClose }: RoadmapPanelProps) {
  const [projects, setProjects] = useState<RoadmapProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadRoadmap();
    }
  }, [isOpen]);

  const loadRoadmap = async () => {
    setLoading(true);
    try {
      const data = await api.getRoadmapTimeline();
      // Assign colors to projects
      const projectsWithColors = data.projects.map((p, idx) => ({
        ...p,
        color: PROJECT_COLORS[idx % PROJECT_COLORS.length]
      }));
      setProjects(projectsWithColors);
      // Expand all projects by default
      setExpandedProjects(new Set(projectsWithColors.map(p => p.name)));
    } catch (err) {
      console.error('Erro ao carregar roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate months for the timeline (with 10-day divisions)
  const timelineMonths = useMemo(() => {
    const months: {
      key: string;
      label: string;
      year: number;
      month: number;
      blocks: { start: Date; end: Date; label: string }[];
    }[] = [];
    const today = new Date();
    const startMonth = new Date(today.getFullYear(), today.getMonth() + viewOffset - 1, 1);

    for (let i = 0; i < 6; i++) {
      const date = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1);
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

      // Create 3 blocks of ~10 days each
      const blocks = [
        {
          start: new Date(date.getFullYear(), date.getMonth(), 1),
          end: new Date(date.getFullYear(), date.getMonth(), 10),
          label: '1-10'
        },
        {
          start: new Date(date.getFullYear(), date.getMonth(), 11),
          end: new Date(date.getFullYear(), date.getMonth(), 20),
          label: '11-20'
        },
        {
          start: new Date(date.getFullYear(), date.getMonth(), 21),
          end: new Date(date.getFullYear(), date.getMonth(), lastDay),
          label: `21-${lastDay}`
        },
      ];

      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: monthNames[date.getMonth()],
        year: date.getFullYear(),
        month: date.getMonth(),
        blocks
      });
    }
    return months;
  }, [viewOffset]);

  // Calculate timeline boundaries
  const timelineBounds = useMemo(() => {
    if (timelineMonths.length === 0) return { start: new Date(), end: new Date(), totalDays: 1 };

    const firstMonth = timelineMonths[0];
    const lastMonth = timelineMonths[timelineMonths.length - 1];
    const start = new Date(firstMonth.year, firstMonth.month, 1);
    const end = new Date(lastMonth.year, lastMonth.month + 1, 0);
    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return { start, end, totalDays };
  }, [timelineMonths]);

  // Calculate bar position for a task
  const getTaskBar = (task: RoadmapTask) => {
    if (!task.start_date) return null;

    const { start: timelineStart, end: timelineEnd, totalDays } = timelineBounds;

    const taskStart = new Date(task.start_date);
    taskStart.setHours(0, 0, 0, 0);

    let taskEnd: Date;
    if (task.is_completed && task.completed_date) {
      taskEnd = new Date(task.completed_date);
    } else if (task.points > 0) {
      taskEnd = new Date(taskStart.getTime() + task.points * 24 * 60 * 60 * 1000);
    } else {
      // Default to same day if no points
      taskEnd = new Date(taskStart.getTime() + 24 * 60 * 60 * 1000);
    }
    taskEnd.setHours(23, 59, 59, 999);

    // Check if task is visible in timeline
    if (taskEnd < timelineStart || taskStart > timelineEnd) return null;

    // Clamp to timeline bounds
    const clampedStart = Math.max(taskStart.getTime(), timelineStart.getTime());
    const clampedEnd = Math.min(taskEnd.getTime(), timelineEnd.getTime());

    const startOffset = (clampedStart - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const endOffset = (clampedEnd - timelineStart.getTime()) / (1000 * 60 * 60 * 24);

    const left = (startOffset / totalDays) * 100;
    const width = Math.max(((endOffset - startOffset) / totalDays) * 100, 1.5);

    // Check if completed in same month and within 10 days (show as dash)
    const durationDays = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24);
    const isSameMonth = taskStart.getMonth() === taskEnd.getMonth() && taskStart.getFullYear() === taskEnd.getFullYear();
    const isShortTask = durationDays <= 10;

    return {
      left: `${left}%`,
      width: `${width}%`,
      isShortTask: isSameMonth && isShortTask,
      durationDays
    };
  };

  const toggleProject = (projectName: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectName)) {
        next.delete(projectName);
      } else {
        next.add(projectName);
      }
      return next;
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Calculate today's position
  const todayPosition = useMemo(() => {
    const today = new Date();
    const { start: timelineStart, end: timelineEnd, totalDays } = timelineBounds;

    if (today < timelineStart || today > timelineEnd) return null;

    const offset = (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return (offset / totalDays) * 100;
  }, [timelineBounds]);

  if (!isOpen) return null;

  return (
    <div className="roadmap-panel-overlay" onClick={onClose}>
      <div className="roadmap-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="roadmap-panel__header">
          <h2>
            <FolderKanban size={20} />
            Business Roadmap
          </h2>
          <div className="roadmap-panel__header-actions">
            <span className="roadmap-panel__summary">
              {projects.length} projetos | {projects.reduce((sum, p) => sum + (p.task_count || 0), 0)} tarefas
            </span>
            <button onClick={onClose} className="btn btn-icon btn-ghost">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Timeline Navigation */}
        <div className="roadmap-panel__timeline-nav">
          <button onClick={() => setViewOffset(prev => prev - 3)} className="btn btn-ghost btn-sm">
            <ChevronLeft size={16} />
          </button>
          <span className="roadmap-panel__timeline-range">
            {timelineMonths[0]?.label} {timelineMonths[0]?.year} - {timelineMonths[5]?.label} {timelineMonths[5]?.year}
          </span>
          <button onClick={() => setViewOffset(prev => prev + 3)} className="btn btn-ghost btn-sm">
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setViewOffset(0)} className="btn btn-ghost btn-sm">
            Hoje
          </button>
        </div>

        {/* Timeline Content */}
        <div className="roadmap-panel__content">
          <div className="roadmap-panel__timeline">
            {/* Month Headers with 10-day blocks */}
            <div className="roadmap-panel__timeline-header">
              <div className="roadmap-panel__project-label">Projeto / Tarefa</div>
              <div className="roadmap-panel__months">
                {timelineMonths.map((month, idx) => (
                  <div
                    key={month.key}
                    className={`roadmap-panel__month ${idx === 0 || month.month === 0 ? 'roadmap-panel__month--year' : ''}`}
                  >
                    <div className="roadmap-panel__month-header">
                      {(idx === 0 || month.month === 0) && (
                        <span className="roadmap-panel__month-year">{month.year}</span>
                      )}
                      <span className="roadmap-panel__month-name">{month.label}</span>
                    </div>
                    <div className="roadmap-panel__month-blocks">
                      <div className="roadmap-panel__block">1-10</div>
                      <div className="roadmap-panel__block">11-20</div>
                      <div className="roadmap-panel__block">21+</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today Line */}
            {todayPosition !== null && (
              <div
                className="roadmap-panel__today-line"
                style={{ left: `calc(220px + ${todayPosition}% * (100% - 220px) / 100)` }}
              >
                <span className="roadmap-panel__today-label">Hoje</span>
              </div>
            )}

            {/* Project Rows */}
            <div className="roadmap-panel__rows">
              {projects.length === 0 && !loading && (
                <div className="roadmap-panel__empty">
                  <FolderKanban size={48} />
                  <p>Nenhuma tarefa com projeto e data de início</p>
                  <p className="roadmap-panel__empty-hint">
                    Crie tarefas no Kanban com o campo "Projeto" e "Data Início" preenchidos para visualizar no roadmap
                  </p>
                </div>
              )}

              {projects.map((project) => {
                const isExpanded = expandedProjects.has(project.name);

                return (
                  <div key={project.name} className="roadmap-panel__project-group">
                    {/* Project Header Row */}
                    <div
                      className="roadmap-panel__row roadmap-panel__row--project"
                      onClick={() => toggleProject(project.name)}
                    >
                      <div className="roadmap-panel__project-info">
                        <div
                          className="roadmap-panel__project-color"
                          style={{ backgroundColor: project.color }}
                        />
                        <div className="roadmap-panel__project-details">
                          <span className="roadmap-panel__project-name">
                            {isExpanded ? '▼' : '▶'} {project.name}
                          </span>
                          <span className="roadmap-panel__project-meta">
                            {project.completed_tasks}/{project.task_count} concluídas
                          </span>
                        </div>
                      </div>
                      <div className="roadmap-panel__bar-container">
                        {/* Project summary bar - spans all tasks */}
                        {project.start_date && (
                          <div
                            className="roadmap-panel__bar roadmap-panel__bar--project"
                            style={{
                              ...(() => {
                                const { start: timelineStart, totalDays } = timelineBounds;
                                const pStart = new Date(project.start_date!);
                                const pEnd = project.end_date ? new Date(project.end_date) : new Date();

                                const startOffset = Math.max(0, (pStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                                const endOffset = Math.min(totalDays, (pEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

                                return {
                                  left: `${(startOffset / totalDays) * 100}%`,
                                  width: `${Math.max(((endOffset - startOffset) / totalDays) * 100, 2)}%`,
                                  backgroundColor: project.color + '40',
                                  borderColor: project.color
                                };
                              })()
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Task Rows */}
                    {isExpanded && project.tasks?.map((task) => {
                      const bar = getTaskBar(task);

                      return (
                        <div key={task.id} className="roadmap-panel__row roadmap-panel__row--task">
                          <div className="roadmap-panel__task-info">
                            {task.is_completed ? (
                              <CheckCircle2 size={14} className="roadmap-panel__task-icon roadmap-panel__task-icon--done" />
                            ) : (
                              <Circle size={14} className="roadmap-panel__task-icon" />
                            )}
                            <span className="roadmap-panel__task-title" title={task.title}>
                              {task.title}
                            </span>
                            <span className="roadmap-panel__task-dates">
                              {formatDate(task.start_date)}
                              {task.is_completed && task.completed_date && (
                                <> → {formatDate(task.completed_date)}</>
                              )}
                            </span>
                          </div>
                          <div className="roadmap-panel__bar-container">
                            {bar ? (
                              <div
                                className={`roadmap-panel__bar roadmap-panel__bar--task ${bar.isShortTask ? 'roadmap-panel__bar--short' : ''} ${task.is_completed ? 'roadmap-panel__bar--completed' : ''}`}
                                style={{
                                  left: bar.left,
                                  width: bar.width,
                                  backgroundColor: task.is_completed ? '#22C55E' : project.color,
                                }}
                                title={`${task.title}\n${formatDate(task.start_date)} - ${task.is_completed ? formatDate(task.completed_date) : `${task.points || 0} dias`}`}
                              >
                                {!bar.isShortTask && (
                                  <span className="roadmap-panel__bar-label">
                                    {Math.round(bar.durationDays)}d
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="roadmap-panel__no-bar">fora do período</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="roadmap-panel__legend">
          <span className="roadmap-panel__legend-item">
            <span className="roadmap-panel__legend-bar" style={{ backgroundColor: '#22C55E' }} />
            Concluída
          </span>
          <span className="roadmap-panel__legend-item">
            <span className="roadmap-panel__legend-bar" style={{ backgroundColor: '#8B5CF6' }} />
            Em andamento
          </span>
          <span className="roadmap-panel__legend-item roadmap-panel__legend-item--short">
            <span className="roadmap-panel__legend-bar roadmap-panel__legend-bar--short" />
            ≤10 dias (traço)
          </span>
        </div>
      </div>
    </div>
  );
}
