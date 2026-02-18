import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Loader2, UserPlus, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api';
import { ConfirmDialog, useToast } from '../shared';
import type { User } from '../../types';
import './AdminPanel.css';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NewUserForm {
  email: string;
  password: string;
  name: string;
}

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>({ email: '', password: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; user: User | null }>({ isOpen: false, user: null });

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const created = await createUser(newUser.email, newUser.password, newUser.name);
      setUsers([created, ...users]);
      setNewUser({ email: '', password: '', name: '' });
      setShowNewUserForm(false);
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
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <header className="admin-header">
          <h2>Gerenciar Usuários</h2>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="admin-content">
          {error && (
            <div className="admin-error">
              {error}
              <button onClick={() => setError('')}><X size={14} /></button>
            </div>
          )}

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
                        <span className="user-email">{user.email}</span>
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
