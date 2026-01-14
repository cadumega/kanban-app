import { useState, useEffect } from 'react';
import { X, Trash2, Lock, Unlock, User, Users, DollarSign, Clock } from 'lucide-react';
import type { Task, Category, Priority, CreateTaskPayload } from '../../types';
import './TaskModal.css';

interface TaskModalProps {
  task: Task | null;
  columnId: string;
  categories: Category[];
  onClose: () => void;
  onSave: (payload: CreateTaskPayload) => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggleBlock: (id: string, blocked: boolean, blocked_by?: string, blocked_reason?: string) => void;
}

export function TaskModal({
  task,
  columnId,
  categories,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  onToggleBlock,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [month, setMonth] = useState<string>('');
  const [assignee, setAssignee] = useState('');
  const [dependent, setDependent] = useState('');
  const [value, setValue] = useState<number>(0);
  const [points, setPoints] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState('');
  const [blockedReason, setBlockedReason] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setCategoryId(task.category_id);
      setMonth(task.month || '');
      setAssignee(task.assignee || '');
      setDependent(task.dependent || '');
      setValue(task.value || 0);
      setPoints(task.points || 0);
      setIsBlocked(Boolean(task.blocked));
      setBlockedBy(task.blocked_by || '');
      setBlockedReason(task.blocked_reason || '');
    } else {
      // Reset for new task
      setTitle('');
      setDescription('');
      setPriority('media');
      setCategoryId(null);
      setMonth('');
      setAssignee('');
      setDependent('');
      setValue(0);
      setPoints(0);
      setIsBlocked(false);
      setBlockedBy('');
      setBlockedReason('');
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    if (task) {
      onUpdate(task.id, {
        title: title.trim(),
        description: description.trim(),
        priority,
        category_id: categoryId,
        month: month || null,
        assignee: assignee.trim() || null,
        dependent: dependent.trim() || null,
        value,
        points,
      });

      // Handle block status separately
      if (isBlocked !== Boolean(task.blocked)) {
        onToggleBlock(task.id, isBlocked, blockedBy, blockedReason);
      } else if (isBlocked && (blockedBy !== task.blocked_by || blockedReason !== task.blocked_reason)) {
        onToggleBlock(task.id, isBlocked, blockedBy, blockedReason);
      }
    } else {
      onSave({
        title: title.trim(),
        description: description.trim(),
        column_id: columnId,
        priority,
        category_id: categoryId,
        month: month || null,
        assignee: assignee.trim() || null,
        dependent: dependent.trim() || null,
        value,
        points,
        blocked: isBlocked,
        blocked_by: isBlocked ? blockedBy : null,
        blocked_reason: isBlocked ? blockedReason : null,
      });
    }

    onClose();
  };

  const handleDelete = () => {
    if (task && confirm('Excluir esta tarefa?')) {
      onDelete(task.id);
      onClose();
    }
  };

  // Generate months for select (current + 12 future months)
  const getMonthOptions = () => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
          <button onClick={onClose} className="btn btn-icon btn-ghost">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="label">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Digite o título da tarefa"
                autoFocus
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input textarea"
                placeholder="Adicione detalhes sobre a tarefa..."
                rows={3}
              />
            </div>

            <div className="task-modal__row">
              <div className="form-group">
                <label className="label">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="input select"
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Categoria</label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value || null)}
                  className="input select"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Mês (opcional)</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="input select"
              >
                <option value="">Sem mês definido</option>
                {getMonthOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor e Pontos */}
            <div className="task-modal__metrics-section">
              <div className="form-group">
                <label className="label">
                  <DollarSign size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Valor (R$/mês)
                </label>
                <input
                  type="number"
                  value={value || ''}
                  onChange={(e) => setValue(Number(e.target.value) || 0)}
                  className="input"
                  placeholder="0"
                  min="0"
                  step="100"
                />
              </div>

              <div className="form-group">
                <label className="label">
                  <Clock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Pontos de complexidade
                </label>
                <div className="task-modal__points-selector">
                  {[1, 3, 5, 7].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPoints(points === p ? 0 : p)}
                      className={`task-modal__point-btn ${points === p ? 'task-modal__point-btn--active' : ''}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="task-modal__people-section">
              <div className="form-group">
                <label className="label">
                  <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Responsável
                </label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="input"
                  placeholder="Quem vai executar esta tarefa?"
                />
              </div>

              <div className="form-group">
                <label className="label">
                  <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Quem depende desta tarefa
                </label>
                <input
                  type="text"
                  value={dependent}
                  onChange={(e) => setDependent(e.target.value)}
                  className="input"
                  placeholder="Pessoa/equipe que aguarda a conclusão"
                />
              </div>
            </div>

            <div className="task-modal__block-section">
              <div className="task-modal__block-header">
                <div className="task-modal__block-toggle">
                  {isBlocked ? (
                    <Lock size={16} className="task-modal__block-icon task-modal__block-icon--active" />
                  ) : (
                    <Unlock size={16} className="task-modal__block-icon" />
                  )}
                  <span>Tarefa bloqueada</span>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={isBlocked}
                    onChange={(e) => setIsBlocked(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {isBlocked && (
                <div className="task-modal__block-fields">
                  <div className="form-group">
                    <label className="label">Aguardando (pessoa/equipe)</label>
                    <input
                      type="text"
                      value={blockedBy}
                      onChange={(e) => setBlockedBy(e.target.value)}
                      className="input"
                      placeholder="Ex: João, Time de Design"
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Motivo do bloqueio</label>
                    <input
                      type="text"
                      value={blockedReason}
                      onChange={(e) => setBlockedReason(e.target.value)}
                      className="input"
                      placeholder="Ex: Aguardando aprovação do layout"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            {task && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn btn-ghost btn-danger"
              >
                <Trash2 size={16} />
                Excluir
              </button>
            )}
            <div className="task-modal__footer-right">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                {task ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
