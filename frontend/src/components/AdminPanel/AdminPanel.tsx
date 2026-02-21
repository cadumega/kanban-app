import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, UserPlus, Eye, EyeOff, ToggleLeft, ToggleRight, Users, History, Share2 } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser, getAuditLogs } from '../../services/api';
import { ConfirmDialog, useToast } from '../shared';
import type { User, AuditLog } from '../../types';
import './AdminPanel.css';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewUserForm {
  email: string;
  password: string;
  name: string;
  shareWorkspace: boolean;
}

type TabType = 'users' | 'history';

const ACTION_LABELS: Record<string, string> = {
  create: 'criou',
  update: 'atualizou',
  delete: 'excluiu',
};

const ENTITY_LABELS: Record<string, string> = {
  contact: 'contato',
  task: 'tarefa',
  board: 'board',
  column: 'coluna',
  note: 'nota',
  followup: 'follow-up',
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'agora';
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('pt-BR');
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({ email: '', password: '', name: '', shareWorkspace: false });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditUsers, setAuditUsers] = useState<{ user_email: string; user_name: string | null }[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilter, setAuditFilter] = useState<{ user: string; entity_type: string }>({ user: '', entity_type: '' });

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      loadAuditLogs();
    }
  }, [isOpen, activeTab, auditFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const filters: { user?: string; entity_type?: string; limit?: number } = { limit: 50 };
      if (auditFilter.user) filters.user = auditFilter.user;
      if (auditFilter.entity_type) filters.entity_type = auditFilter.entity_type;

      const data = await getAuditLogs(filters);
      setAuditLogs(data.logs);
      setAuditTotal(data.total);
      setAuditUsers(data.users);
    } catch (err: any) {
      console.error('Error loading audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const created = await createUser(newUser.email, newUser.password, newUser.name, newUser.shareWorkspace);
      setUsers([created, ...users]);
      setNewUser({ email: '', password: '', name: '', shareWorkspace: false });
      setShowNewUserForm(false);
      toast.success('Usuário criado com sucesso');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar usuário');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const updated = await updateUser(user.id, { active: user.active ? 0 : 1 });
      setUsers(users.map(u => u.id === user.id ? updated : u));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar usuário');
    }
  };

  const handleStartEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditPassword('');
    setShowEditPassword(false);
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      const updates: { name?: string; password?: string } = {};
      if (editName !== users.find(u => u.id === userId)?.name) {
        updates.name = editName;
      }
      if (editPassword) {
        updates.password = editPassword;
      }
      if (Object.keys(updates).length > 0) {
        const updated = await updateUser(userId, updates);
        setUsers(users.map(u => u.id === userId ? updated : u));
      }
      setEditingId(null);
      setEditName('');
      setEditPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteConfirm({ isOpen: true, user });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirm.user) return;
    try {
      await deleteUser(deleteConfirm.user.id);
      setUsers(users.filter(u => u.id !== deleteConfirm.user!.id));
      toast.success('Usuário excluído');
      setDeleteConfirm({ isOpen: false, user: null });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao excluir usuário');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="admin-overlay" onClick={onClose}>
      <div className="admin-panel admin-panel--wide" onClick={(e) => e.stopPropagation()}>
        <header className="admin-header">
          <h2>Painel Administrativo</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            Usuários
          </button>
          <button
            className={`admin-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
            Histórico
          </button>
        </div>

        <div className="admin-content">
          {error && (
            <div className="admin-error">
              {error}
              <button onClick={() => setError('')}><X size={14} /></button>
            </div>
          )}

          {activeTab === 'users' && (
            <>
              {!showNewUserForm ? (
                <button className="btn btn-primary add-user-btn" onClick={() => setShowNewUserForm(true)}>
                  <UserPlus size={16} />
                  Novo Usuário
                </button>
              ) : (
                <form className="new-user-form" onSubmit={handleCreateUser}>
                  <h3>Criar Novo Usuário</h3>
                  <div className="form-row">
                    <input
                      type="email"
                      placeholder="Email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Nome (opcional)"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    />
                  </div>
                  <div className="form-row password-row">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Senha"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      required
                    />
                    <button type="button" className="btn btn-ghost toggle-password" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <label className="admin-checkbox">
                    <input
                      type="checkbox"
                      checked={newUser.shareWorkspace}
                      onChange={(e) => setNewUser({ ...newUser, shareWorkspace: e.target.checked })}
                    />
                    <span className="admin-checkbox__label">
                      <Share2 size={14} />
                      Compartilhar meu workspace
                    </span>
                    <small className="admin-checkbox__hint">Usuário acessará seus dados (CRM + Kanban)</small>
                  </label>
                  <div className="form-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setShowNewUserForm(false)}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={creating}>
                      {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                      Criar
                    </button>
                  </div>
                </form>
              )}

              {loading ? (
                <div className="admin-loading">
                  <Loader2 size={24} className="spin" />
                  <span>Carregando...</span>
                </div>
              ) : (
                <div className="users-list">
                  <h3>Usuários ({users.length})</h3>
                  {users.map((user) => (
                    <div key={user.id} className={`user-item ${!user.active ? 'inactive' : ''}`}>
                      {editingId === user.id ? (
                        <div className="user-edit-form">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nome"
                          />
                          <div className="password-row">
                            <input
                              type={showEditPassword ? 'text' : 'password'}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              placeholder="Nova senha (deixe vazio para manter)"
                            />
                            <button type="button" className="btn btn-ghost toggle-password" onClick={() => setShowEditPassword(!showEditPassword)}>
                              {showEditPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          <div className="edit-actions">
                            <button className="btn btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={() => handleSaveEdit(user.id)}>
                              <Check size={14} /> Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="user-info">
                            <div className="user-info__header">
                              <span className="user-email">{user.email}</span>
                              {user.delegated_to && (
                                <span className="user-badge user-badge--shared" title="Compartilha workspace">
                                  <Share2 size={12} />
                                  Compartilhado
                                </span>
                              )}
                            </div>
                            <span className="user-name">{user.name || '(sem nome)'}</span>
                            <span className={`user-role ${user.role}`}>{user.role}</span>
                          </div>
                          <div className="user-actions">
                            {user.role !== 'master' && (
                              <>
                                <button
                                  className={`btn btn-ghost toggle-active ${user.active ? 'active' : ''}`}
                                  onClick={() => handleToggleActive(user)}
                                  title={user.active ? 'Desativar' : 'Ativar'}
                                >
                                  {user.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                </button>
                                <button className="btn btn-ghost" onClick={() => handleStartEdit(user)} title="Editar">
                                  <Edit2 size={16} />
                                </button>
                                <button className="btn btn-ghost btn-danger" onClick={() => handleDeleteUser(user)} title="Excluir">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="audit-section">
              <div className="audit-filters">
                <select
                  value={auditFilter.user}
                  onChange={(e) => setAuditFilter({ ...auditFilter, user: e.target.value })}
                >
                  <option value="">Todos os usuários</option>
                  {auditUsers.map((u) => (
                    <option key={u.user_email} value={u.user_email}>
                      {u.user_name || u.user_email}
                    </option>
                  ))}
                </select>
                <select
                  value={auditFilter.entity_type}
                  onChange={(e) => setAuditFilter({ ...auditFilter, entity_type: e.target.value })}
                >
                  <option value="">Todos os tipos</option>
                  <option value="contact">Contatos</option>
                  <option value="task">Tarefas</option>
                  <option value="board">Boards</option>
                  <option value="column">Colunas</option>
                  <option value="note">Notas</option>
                  <option value="followup">Follow-ups</option>
                </select>
              </div>

              {auditLoading ? (
                <div className="admin-loading">
                  <Loader2 size={24} className="spin" />
                  <span>Carregando histórico...</span>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="audit-empty">
                  <History size={48} />
                  <p>Nenhuma atividade registrada</p>
                  <small>As ações dos usuários aparecerão aqui</small>
                </div>
              ) : (
                <>
                  <div className="audit-count">
                    Mostrando {auditLogs.length} de {auditTotal} atividades
                  </div>
                  <div className="audit-list">
                    {auditLogs.map((log) => (
                      <div key={log.id} className={`audit-item audit-item--${log.action}`}>
                        <div className="audit-item__content">
                          <span className="audit-item__user">{log.user_name || log.user_email}</span>
                          <span className="audit-item__action">{ACTION_LABELS[log.action] || log.action}</span>
                          <span className="audit-item__entity-type">{ENTITY_LABELS[log.entity_type] || log.entity_type}</span>
                          {log.entity_name && (
                            <span className="audit-item__entity-name">"{log.entity_name}"</span>
                          )}
                        </div>
                        <span className="audit-item__time">{formatRelativeTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          title="Excluir usuário?"
          message={`O usuário "${deleteConfirm.user?.email}" será excluído permanentemente. Esta ação não pode ser desfeita.`}
          variant="danger"
          confirmLabel="Excluir"
          onConfirm={confirmDeleteUser}
          onCancel={() => setDeleteConfirm({ isOpen: false, user: null })}
        />
      </div>
    </div>
  );
}
