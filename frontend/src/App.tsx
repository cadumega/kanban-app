import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Plus, PanelLeft, Users, FolderKanban, Settings, LogOut, Bell } from 'lucide-react';
import { Board } from './components/Board/Board';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TaskModal } from './components/TaskModal/TaskModal';
import { ContactsPanel } from './components/Contacts/ContactsPanel';
import { FollowupsPanel } from './components/Contacts/FollowupsPanel';
import { RoadmapPanel } from './components/Roadmap/RoadmapPanel';
import { Login } from './components/Login/Login';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { useBoard } from './hooks/useBoard';
import { api, setAuthToken, getCurrentUser } from './services/api';
import type { Task, CreateTaskPayload, User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);

  // Check if token is still valid on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          localStorage.setItem('user', JSON.stringify(currentUser));
        } catch {
          // Token invalid, clear auth
          setAuthToken(null);
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setAuthLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem('user');
    setUser(null);
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="app">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-secondary)' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Carregando...</span>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Authenticated - show main app
  return <AuthenticatedApp user={user} onLogout={handleLogout} />;
}

function AuthenticatedApp({ user, onLogout }: { user: User; onLogout: () => void }) {
  const {
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
    addCategory,
    removeCategory,
    getMonths,
    getStats,
    refresh,
  } = useBoard();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [followupsOpen, setFollowupsOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleExportJSON = async () => {
    const response = await api.get('/tasks/export/json');
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-export.json';
    a.click();
  };

  const handleExportCSV = async () => {
    const response = await api.get('/tasks/export/csv');
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kanban-export.csv';
    a.click();
  };

  const handleFilterByPerson = (person: string) => {
    setFilters({ ...filters, person });
  };

  const handleAddColumn = async () => {
    const title = prompt('Nome da nova coluna:');
    if (title?.trim()) {
      await addColumn(title.trim());
    }
  };

  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedColumnId(task.column_id);
    setModalOpen(true);
  };

  const handleSaveTask = async (payload: CreateTaskPayload) => {
    await addTask(payload);
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    await updateTask(id, updates);
  };

  const handleDeleteTask = async (id: string) => {
    await removeTask(id);
  };

  const handleToggleBlock = async (
    id: string,
    blocked: boolean,
    blocked_by?: string,
    blocked_reason?: string
  ) => {
    await toggleTaskBlock(id, blocked, blocked_by, blocked_reason);
  };

  const handleAddCategory = async (name: string, color: string) => {
    await addCategory(name, color);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Excluir esta categoria? As tarefas não serão excluídas.')) {
      await removeCategory(id);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <Loader2 size={24} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span>Carregando...</span>
        </div>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const filteredColumns = getFilteredColumns();
  const stats = getStats();
  const months = getMonths();

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="app">
      {sidebarVisible && (
        <Sidebar
          categories={categories}
          columns={columns}
          filters={filters}
          months={months}
          stats={stats}
          darkMode={darkMode}
          onFilterChange={setFilters}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          onExportJSON={handleExportJSON}
          onExportCSV={handleExportCSV}
          onToggleSidebar={() => setSidebarVisible(false)}
          onFilterByPerson={handleFilterByPerson}
        />
      )}

      <div className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!sidebarVisible && (
                <button onClick={() => setSidebarVisible(true)} className="btn btn-ghost" title="Mostrar sidebar">
                  <PanelLeft size={18} />
                </button>
              )}
              <h1>Minhas Tarefas</h1>
              {stats.totalValue > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600 }}>
                  {formatValue(stats.totalValue)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setRoadmapOpen(true)} className="btn btn-accent" title="Business Roadmap">
                <FolderKanban size={16} />
                Roadmap
              </button>
              <button onClick={() => setContactsOpen(true)} className="btn" style={{ background: '#0D9488', color: 'white' }} title="Contatos CRM">
                <Users size={16} />
                CRM
              </button>
              <button onClick={() => setFollowupsOpen(true)} className="btn" style={{ background: '#0F766E', color: 'white' }} title="Follow-ups pendentes">
                <Bell size={16} />
              </button>
              {user.role === 'master' && (
                <button onClick={() => setAdminPanelOpen(true)} className="btn btn-ghost" title="Admin">
                  <Settings size={16} />
                </button>
              )}
              <button onClick={refresh} className="btn btn-ghost" title="Atualizar">
                <RefreshCw size={16} />
              </button>
              <button onClick={handleAddColumn} className="btn btn-primary">
                <Plus size={16} />
                Nova Coluna
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8, paddingLeft: 12, borderLeft: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user.name || user.email}</span>
                <button onClick={onLogout} className="btn btn-ghost" title="Sair" style={{ padding: '6px 8px' }}>
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--danger-light)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}
        </header>

        <Board
          columns={filteredColumns}
          onAddColumn={handleAddColumn}
          onAddTask={handleAddTask}
          onEditTask={handleEditTask}
          onUpdateColumn={updateColumn}
          onDeleteColumn={removeColumn}
          onMoveTask={moveTask}
        />
      </div>

      {modalOpen && (
        <TaskModal
          task={editingTask}
          columnId={selectedColumnId}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveTask}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onToggleBlock={handleToggleBlock}
        />
      )}

      <ContactsPanel isOpen={contactsOpen} onClose={() => setContactsOpen(false)} />
      <FollowupsPanel
        isOpen={followupsOpen}
        onClose={() => setFollowupsOpen(false)}
        onOpenContact={(_contactId) => {
          setFollowupsOpen(false);
          setContactsOpen(true);
        }}
      />
      <RoadmapPanel isOpen={roadmapOpen} onClose={() => setRoadmapOpen(false)} />
      {user.role === 'master' && (
        <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
      )}
    </div>
  );
}

export default App;
