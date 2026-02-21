import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, PanelLeft, Users, FolderKanban, Settings, LogOut, Bell, LayoutDashboard } from 'lucide-react';
import { CRMBoard, useCRMKanban } from './components/CRMKanban';
import { ContactsPanel } from './components/Contacts/ContactsPanel';
import { ContactDetailModal } from './components/Contacts/ContactDetailModal';
import { FollowupsPanel } from './components/Contacts/FollowupsPanel';
import { RoadmapPanel } from './components/Roadmap/RoadmapPanel';
import { Login } from './components/Login/Login';
import { AdminPanel } from './components/AdminPanel/AdminPanel';
import { setAuthToken, getCurrentUser, getPendingFollowups } from './services/api';
import { ConfirmDialog } from './components/shared';
import type { User, Contact } from './types';

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
  // CRM Kanban hook
  const {
    columns,
    loading,
    error,
    reload,
    moveContact,
    addColumn,
    updateColumn,
    deleteColumn,
    updateContactInColumns,
    removeContactFromColumns,
    addContactToColumns,
  } = useCRMKanban();

  // UI State
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [followupsOpen, setFollowupsOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState(0);

  // Contact detail modal state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [addingToColumnId, setAddingToColumnId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', variant: 'warning', onConfirm: () => {} });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Fetch pending follow-ups count
  useEffect(() => {
    const fetchPendingFollowups = async () => {
      try {
        const followups = await getPendingFollowups();
        // Count follow-ups that are due today or overdue
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const dueCount = followups.filter(f => new Date(f.date) <= today).length;
        setPendingFollowupsCount(dueCount);
      } catch (err) {
        console.error('Error fetching pending followups:', err);
      }
    };
    fetchPendingFollowups();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPendingFollowups, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // CRM Handlers
  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact);
    setContactDetailOpen(true);
  };

  const handleAddContact = (columnId: string) => {
    setAddingToColumnId(columnId);
    setContactsOpen(true);
  };

  const handleContactUpdated = (updatedContact: Contact) => {
    updateContactInColumns(updatedContact);
  };

  const handleContactDeleted = (contactId: string) => {
    removeContactFromColumns(contactId);
    setContactDetailOpen(false);
  };

  // Calculate CRM stats
  const crmStats = {
    totalContacts: columns.reduce((sum, col) => sum + col.contacts.length, 0),
    totalValue: columns.reduce(
      (sum, col) => sum + col.contacts.reduce((s, c) => s + (c.valor_implementacao || 0) + (c.valor_mensal || 0), 0),
      0
    ),
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
    <div className="app">
      <aside className="sidebar-collapsed">
        <button onClick={() => setSidebarVisible(!sidebarVisible)} className="sidebar-collapsed__btn" title="Menu">
          <PanelLeft size={20} />
        </button>
        <div className="sidebar-collapsed__divider" />
        <button className="sidebar-collapsed__btn sidebar-collapsed__btn--active" title="CRM Pipeline">
          <LayoutDashboard size={20} />
        </button>
        <button onClick={() => setContactsOpen(true)} className="sidebar-collapsed__btn" title="Todos os Contatos">
          <Users size={20} />
        </button>
        <button onClick={() => setRoadmapOpen(true)} className="sidebar-collapsed__btn" title="Roadmap">
          <FolderKanban size={20} />
        </button>
        <button onClick={() => setFollowupsOpen(true)} className="sidebar-collapsed__btn" title="Follow-ups" style={{ position: 'relative' }}>
          <Bell size={20} />
          {pendingFollowupsCount > 0 && (
            <span className="notification-badge notification-badge--small">{pendingFollowupsCount}</span>
          )}
        </button>
      </aside>

      <div className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                CRM Pipeline
              </h1>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {crmStats.totalContacts} contato{crmStats.totalContacts !== 1 ? 's' : ''}
              </span>
              {crmStats.totalValue > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600 }}>
                  {formatValue(crmStats.totalValue)}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setContactsOpen(true)} className="btn" style={{ background: '#0D9488', color: 'white' }} title="Todos os Contatos">
                <Users size={16} />
                Contatos
              </button>
              <button onClick={() => setRoadmapOpen(true)} className="btn btn-accent" title="Business Roadmap">
                <FolderKanban size={16} />
                Roadmap
              </button>
              <button onClick={() => setFollowupsOpen(true)} className="btn btn-notification" style={{ background: '#0F766E', color: 'white', position: 'relative' }} title="Follow-ups pendentes">
                <Bell size={16} />
                {pendingFollowupsCount > 0 && (
                  <span className="notification-badge">{pendingFollowupsCount}</span>
                )}
              </button>
              {user.role === 'master' && (
                <button onClick={() => setAdminPanelOpen(true)} className="btn btn-ghost" title="Admin">
                  <Settings size={16} />
                </button>
              )}
              <button onClick={reload} className="btn btn-ghost" title="Atualizar">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="btn btn-ghost" title={darkMode ? 'Modo claro' : 'Modo escuro'}>
                {darkMode ? '☀️' : '🌙'}
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

        <CRMBoard
          columns={columns}
          loading={loading}
          onContactClick={handleContactClick}
          onAddContact={handleAddContact}
          onMoveContact={moveContact}
          onAddColumn={addColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
        />
      </div>

      <ContactsPanel
        isOpen={contactsOpen}
        onClose={() => {
          setContactsOpen(false);
          setAddingToColumnId(null);
        }}
        onContactCreated={addingToColumnId ? (contact) => {
          addContactToColumns(contact, addingToColumnId);
          setContactsOpen(false);
          setAddingToColumnId(null);
        } : undefined}
      />

      <FollowupsPanel
        isOpen={followupsOpen}
        onClose={() => setFollowupsOpen(false)}
        onOpenContact={(contactId) => {
          setFollowupsOpen(false);
          // Find the contact and open detail modal
          for (const col of columns) {
            const contact = col.contacts.find(c => c.id === contactId);
            if (contact) {
              setSelectedContact(contact);
              setContactDetailOpen(true);
              break;
            }
          }
        }}
      />

      <RoadmapPanel isOpen={roadmapOpen} onClose={() => setRoadmapOpen(false)} />

      {user.role === 'master' && (
        <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
      )}

      <ContactDetailModal
        contact={selectedContact}
        isOpen={contactDetailOpen}
        onClose={() => {
          setContactDetailOpen(false);
          setSelectedContact(null);
        }}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}

export default App;
