import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Filter,
  Tag,
  AlertTriangle,
  Lock,
  Calendar,
  ChevronDown,
  ChevronRight,
  X,
  Plus,
  User,
  Moon,
  Sun,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  PanelLeftClose,
  FolderKanban,
} from 'lucide-react';
import type { Category, Filters, Priority, Column } from '../../types';
import './Sidebar.css';

interface SidebarProps {
  categories: Category[];
  columns: Column[];
  filters: Filters;
  months: string[];
  stats: {
    total: number;
    blocked: number;
    totalValue: number;
    totalPoints: number;
    byPriority: Record<Priority, number>;
    byCategory: Record<string, number>;
  };
  darkMode: boolean;
  onFilterChange: (filters: Filters) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onToggleDarkMode: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportJSON: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleSidebar: () => void;
  onFilterByPerson: (person: string) => void;
}

export function Sidebar({
  categories,
  columns,
  filters,
  months,
  stats,
  darkMode,
  onFilterChange,
  onAddCategory,
  onDeleteCategory,
  onToggleDarkMode,
  onExportJSON,
  onExportCSV,
  onImportJSON,
  onToggleSidebar,
  onFilterByPerson,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState({
    priority: true,
    category: true,
    month: false,
    people: true,
    project: true,
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#6366F1');
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Get unique people (assignees and dependents)
  const people = useMemo(() => {
    const peopleSet = new Set<string>();
    columns.forEach(col => {
      col.tasks.forEach(task => {
        if (task.assignee) peopleSet.add(task.assignee);
        if (task.dependent) peopleSet.add(task.dependent);
      });
    });
    return Array.from(peopleSet).sort((a, b) => a.localeCompare(b));
  }, [columns]);

  // Count tasks per person
  const taskCountByPerson = useMemo(() => {
    const counts: Record<string, number> = {};
    columns.forEach(col => {
      col.tasks.forEach(task => {
        if (task.assignee) {
          counts[task.assignee] = (counts[task.assignee] || 0) + 1;
        }
        if (task.dependent) {
          counts[task.dependent] = (counts[task.dependent] || 0) + 1;
        }
      });
    });
    return counts;
  }, [columns]);

  // Get unique projects
  const projects = useMemo(() => {
    const projectSet = new Set<string>();
    columns.forEach(col => {
      col.tasks.forEach(task => {
        if (task.project) projectSet.add(task.project);
      });
    });
    return Array.from(projectSet).sort((a, b) => a.localeCompare(b));
  }, [columns]);

  // Count tasks per project
  const taskCountByProject = useMemo(() => {
    const counts: Record<string, number> = {};
    columns.forEach(col => {
      col.tasks.forEach(task => {
        if (task.project) {
          counts[task.project] = (counts[task.project] || 0) + 1;
        }
      });
    });
    return counts;
  }, [columns]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handlePriorityFilter = (priority: Priority | null) => {
    onFilterChange({
      ...filters,
      priority: filters.priority === priority ? null : priority,
    });
  };

  const handleCategoryFilter = (categoryId: string | null) => {
    onFilterChange({
      ...filters,
      category_id: filters.category_id === categoryId ? null : categoryId,
    });
  };

  const handleMonthFilter = (month: string | null) => {
    onFilterChange({
      ...filters,
      month: filters.month === month ? null : month,
    });
  };

  const handleBlockedFilter = () => {
    onFilterChange({
      ...filters,
      blocked: filters.blocked === true ? null : true,
    });
  };

  const handleProjectFilter = (project: string | null) => {
    onFilterChange({
      ...filters,
      project: filters.project === project ? null : project,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      category_id: null,
      priority: null,
      month: null,
      blocked: null,
      person: null,
      project: null,
    });
  };

  const hasActiveFilters =
    filters.category_id || filters.priority || filters.month || filters.blocked || filters.person || filters.project;

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      setNewCategoryColor('#6366F1');
      setShowNewCategory(false);
    }
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

  const priorityConfig = [
    { key: 'alta' as Priority, label: 'Alta', color: 'var(--priority-high-text)' },
    { key: 'media' as Priority, label: 'Média', color: 'var(--priority-medium-text)' },
    { key: 'baixa' as Priority, label: 'Baixa', color: 'var(--priority-low-text)' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <LayoutDashboard size={20} />
          <span>Kanban</span>
        </div>
        <button onClick={onToggleSidebar} className="btn btn-icon btn-ghost" title="Ocultar sidebar">
          <PanelLeftClose size={18} />
        </button>
      </div>

      <div className="sidebar__stats">
        <div className="sidebar__stat">
          <span className="sidebar__stat-value">{stats.total}</span>
          <span className="sidebar__stat-label">Tarefas</span>
        </div>
        <div className="sidebar__stat sidebar__stat--value">
          <span className="sidebar__stat-value">{formatValue(stats.totalValue)}</span>
          <span className="sidebar__stat-label">Total</span>
        </div>
      </div>

      <div className="sidebar__content">
        <div className="sidebar__section-header">
          <Filter size={16} />
          <span>Filtros</span>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="sidebar__clear-all-btn">
            <X size={14} />
            Limpar todos os filtros
          </button>
        )}

        {/* Priority Filter */}
        <div className="sidebar__section">
          <button
            className="sidebar__section-toggle"
            onClick={() => toggleSection('priority')}
          >
            {expandedSections.priority ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <AlertTriangle size={16} />
            <span>Prioridade</span>
          </button>

          {expandedSections.priority && (
            <div className="sidebar__section-content">
              {priorityConfig.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => handlePriorityFilter(key)}
                  className={`sidebar__filter-item ${
                    filters.priority === key ? 'sidebar__filter-item--active' : ''
                  }`}
                >
                  <span className="sidebar__filter-dot" style={{ backgroundColor: color }} />
                  <span>{label}</span>
                  <span className="sidebar__filter-count">{stats.byPriority[key]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Filter */}
        <div className="sidebar__section">
          <button
            className="sidebar__section-toggle"
            onClick={() => toggleSection('category')}
          >
            {expandedSections.category ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <Tag size={16} />
            <span>Categoria</span>
          </button>

          {expandedSections.category && (
            <div className="sidebar__section-content">
              {categories.map((cat) => (
                <div key={cat.id} className="sidebar__filter-item-wrapper">
                  <button
                    onClick={() => handleCategoryFilter(cat.id)}
                    className={`sidebar__filter-item ${
                      filters.category_id === cat.id ? 'sidebar__filter-item--active' : ''
                    }`}
                  >
                    <span
                      className="sidebar__filter-dot"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                    <span className="sidebar__filter-count">
                      {stats.byCategory[cat.id] || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="sidebar__delete-btn"
                    title="Excluir categoria"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {showNewCategory ? (
                <form onSubmit={handleAddCategory} className="sidebar__new-category">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="sidebar__color-input"
                  />
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria"
                    className="sidebar__text-input"
                    autoFocus
                  />
                  <button type="submit" className="btn btn-icon btn-ghost btn-sm">
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(false)}
                    className="btn btn-icon btn-ghost btn-sm"
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowNewCategory(true)}
                  className="sidebar__add-category"
                >
                  <Plus size={14} />
                  <span>Nova categoria</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Project Filter */}
        {projects.length > 0 && (
          <div className="sidebar__section">
            <button
              className="sidebar__section-toggle"
              onClick={() => toggleSection('project')}
            >
              {expandedSections.project ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <FolderKanban size={16} />
              <span>Projeto</span>
            </button>

            {expandedSections.project && (
              <div className="sidebar__section-content">
                {projects.map((project) => (
                  <button
                    key={project}
                    onClick={() => handleProjectFilter(project)}
                    className={`sidebar__filter-item ${
                      filters.project === project ? 'sidebar__filter-item--active' : ''
                    }`}
                  >
                    <FolderKanban size={14} />
                    <span>{project}</span>
                    <span className="sidebar__filter-count">
                      {taskCountByProject[project] || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* People Filter */}
        {people.length > 0 && (
          <div className="sidebar__section">
            <button
              className="sidebar__section-toggle"
              onClick={() => toggleSection('people')}
            >
              {expandedSections.people ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <User size={16} />
              <span>Pessoas</span>
            </button>

            {expandedSections.people && (
              <div className="sidebar__section-content">
                {people.map((person) => (
                  <button
                    key={person}
                    onClick={() => onFilterByPerson(person)}
                    className={`sidebar__filter-item ${
                      filters.person === person ? 'sidebar__filter-item--active' : ''
                    }`}
                  >
                    <User size={14} />
                    <span>{person}</span>
                    <span className="sidebar__filter-count">
                      {taskCountByPerson[person] || 0}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Month Filter */}
        {months.length > 0 && (
          <div className="sidebar__section">
            <button
              className="sidebar__section-toggle"
              onClick={() => toggleSection('month')}
            >
              {expandedSections.month ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <Calendar size={16} />
              <span>Mês</span>
            </button>

            {expandedSections.month && (
              <div className="sidebar__section-content">
                {months.map((month) => (
                  <button
                    key={month}
                    onClick={() => handleMonthFilter(month)}
                    className={`sidebar__filter-item ${
                      filters.month === month ? 'sidebar__filter-item--active' : ''
                    }`}
                  >
                    <Calendar size={14} />
                    <span>{formatMonth(month)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Blocked Filter */}
        <button
          onClick={handleBlockedFilter}
          className={`sidebar__blocked-filter ${
            filters.blocked ? 'sidebar__blocked-filter--active' : ''
          }`}
        >
          <Lock size={16} />
          <span>Ver apenas bloqueadas</span>
          <span className="sidebar__filter-count">{stats.blocked}</span>
        </button>
      </div>

      {/* Footer actions */}
      <div className="sidebar__footer">
        <button
          onClick={onToggleDarkMode}
          className="sidebar__footer-btn"
          title={darkMode ? 'Modo claro' : 'Modo escuro'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>

        <div className="sidebar__export-wrapper">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="sidebar__footer-btn"
          >
            <Download size={18} />
            <span>Exportar</span>
          </button>

          {showExportMenu && (
            <>
              <div className="sidebar__export-backdrop" onClick={() => setShowExportMenu(false)} />
              <div className="sidebar__export-menu">
                <button onClick={() => { onExportJSON(); setShowExportMenu(false); }} className="sidebar__export-item">
                  <FileJson size={16} />
                  Exportar JSON
                </button>
                <button onClick={() => { onExportCSV(); setShowExportMenu(false); }} className="sidebar__export-item">
                  <FileSpreadsheet size={16} />
                  Exportar CSV
                </button>
              </div>
            </>
          )}
        </div>

        <label className="sidebar__footer-btn sidebar__import-btn">
          <Upload size={18} />
          <span>Importar</span>
          <input
            type="file"
            accept=".json"
            onChange={onImportJSON}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </aside>
  );
}
