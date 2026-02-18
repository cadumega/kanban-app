import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Lock, Unlock, User, Users, Clock, CalendarClock, Plus, Check, ListTodo, FolderKanban, ExternalLink, Edit3, Eye } from 'lucide-react';
import type { Task, Category, Priority, CreateTaskPayload, ChecklistItem } from '../../types';
import * as api from '../../services/api';
import { ConfirmDialog, useToast } from '../shared';
import './TaskModal.css';

// Componente para renderizar texto com links clicáveis
function RichTextPreview({ text }: { text: string }) {
  if (!text) return <span className="task-modal__description-empty">Sem descrição</span>;

  // Regex para detectar URLs
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

  const parts = text.split(urlRegex);

  return (
    <div className="task-modal__description-preview">
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          // Resetar regex lastIndex
          urlRegex.lastIndex = 0;
          // Extrair domínio para mostrar
          let displayUrl = part;
          try {
            const url = new URL(part);
            displayUrl = url.hostname + (url.pathname !== '/' ? url.pathname.slice(0, 30) + (url.pathname.length > 30 ? '...' : '') : '');
          } catch {
            displayUrl = part.slice(0, 50) + (part.length > 50 ? '...' : '');
          }
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="task-modal__description-link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
              {displayUrl}
            </a>
          );
        }
        // Preservar quebras de linha
        return part.split('\n').map((line, lineIdx) => (
          <span key={`${index}-${lineIdx}`}>
            {lineIdx > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </div>
  );
}

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
  const [startDate, setStartDate] = useState<string>('');
  const [project, setProject] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockedBy, setBlockedBy] = useState('');
  const [blockedReason, setBlockedReason] = useState('');

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const newItemInputRef = useRef<HTMLInputElement>(null);

  // Description edit mode
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // Confirm dialog and toast
  const toast = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      setStartDate(task.start_date || '');
      setProject(task.project || '');
      setIsBlocked(Boolean(task.blocked));
      setBlockedBy(task.blocked_by || '');
      setBlockedReason(task.blocked_reason || '');
      setIsEditingDescription(false); // Start in preview mode for existing tasks
      // Load checklist
      loadChecklist(task.id);
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
      setStartDate('');
      setProject('');
      setIsBlocked(false);
      setBlockedBy('');
      setBlockedReason('');
      setChecklist([]);
      setIsEditingDescription(true); // Start in edit mode for new tasks
    }
  }, [task]);

  // ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const loadChecklist = async (taskId: string) => {
    try {
      const items = await api.getChecklist(taskId);
      setChecklist(items);
    } catch (err) {
      console.error('Erro ao carregar checklist:', err);
    }
  };

  const handleSave = () => {
    if (!title.trim()) return false;

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
        start_date: startDate || null,
        project: project.trim() || null,
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
        start_date: startDate || null,
        project: project.trim() || null,
        blocked: isBlocked,
        blocked_by: isBlocked ? blockedBy : null,
        blocked_reason: isBlocked ? blockedReason : null,
      });
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (handleSave()) {
      onClose();
    }
  };

  // Auto-save on close (for existing tasks or new tasks with content)
  const handleClose = () => {
    if (title.trim()) {
      handleSave();
    }
    onClose();
  };

  const handleDelete = () => {
    if (task) {
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = () => {
    if (task) {
      onDelete(task.id);
      toast.success('Tarefa excluída');
      onClose();
    }
  };

  // Checklist functions
  const handleAddChecklistItem = async () => {
    if (!task || !newItemText.trim()) return;

    try {
      const item = await api.addChecklistItem(task.id, newItemText.trim());
      setChecklist(prev => [...prev, item]);
      setNewItemText('');
      newItemInputRef.current?.focus();
    } catch (err) {
      console.error('Erro ao adicionar item:', err);
    }
  };

  const handleToggleChecklistItem = async (item: ChecklistItem) => {
    if (!task) return;

    try {
      const updated = await api.updateChecklistItem(task.id, item.id, {
        completed: !item.completed
      });
      setChecklist(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      console.error('Erro ao atualizar item:', err);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!task) return;

    try {
      await api.deleteChecklistItem(task.id, itemId);
      setChecklist(prev => prev.filter(i => i.id !== itemId));
    } catch (err) {
      console.error('Erro ao excluir item:', err);
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

  const completedCount = checklist.filter(i => i.completed).length;
  const totalCount = checklist.length;

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal task-modal task-modal--large" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header task-modal__header">
            <h2>{task ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
            <div className="task-modal__header-actions">
              {task && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn btn-ghost btn-danger"
                  title="Excluir tarefa"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button type="button" onClick={handleClose} className="btn btn-ghost" title="Fechar (ESC)">
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="modal-body">
            <div className="task-modal__row">
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
                <label className="label">
                  <FolderKanban size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Projeto
                </label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="input"
                  placeholder="Nome do projeto"
                />
              </div>
            </div>

            <div className="task-modal__description-section">
              <div className="task-modal__description-header">
                <label className="label">Descrição</label>
                <div className="task-modal__description-actions">
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(!isEditingDescription)}
                    className={`btn btn-ghost btn-xs ${isEditingDescription ? 'btn-active' : ''}`}
                    title={isEditingDescription ? 'Ver preview' : 'Editar'}
                  >
                    {isEditingDescription ? <Eye size={14} /> : <Edit3 size={14} />}
                    {isEditingDescription ? 'Preview' : 'Editar'}
                  </button>
                </div>
              </div>

              {isEditingDescription || !task ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input textarea task-modal__description-textarea"
                  placeholder="Adicione detalhes, links, observações...&#10;&#10;Links serão clicáveis no preview (ex: https://exemplo.com)"
                  rows={6}
                  autoFocus={isEditingDescription}
                />
              ) : (
                <div
                  className="task-modal__description-view"
                  onClick={() => setIsEditingDescription(true)}
                >
                  <RichTextPreview text={description} />
                  {!description && (
                    <span className="task-modal__description-hint">
                      Clique para adicionar descrição
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Checklist / Subtarefas - logo após descrição */}
            {task && (
              <div className="task-modal__checklist-section">
                <div className="task-modal__checklist-header">
                  <h3>
                    <ListTodo size={16} />
                    Subtarefas
                    {totalCount > 0 && (
                      <span className="task-modal__checklist-count">
                        {completedCount}/{totalCount}
                      </span>
                    )}
                  </h3>
                  {totalCount > 0 && (
                    <div className="task-modal__checklist-progress">
                      <div
                        className="task-modal__checklist-progress-fill"
                        style={{ width: `${(completedCount / totalCount) * 100}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="task-modal__checklist-items">
                  {checklist.map((item) => (
                    <div
                      key={item.id}
                      className={`task-modal__checklist-item ${item.completed ? 'task-modal__checklist-item--completed' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleChecklistItem(item)}
                        className="task-modal__checklist-checkbox"
                      >
                        {item.completed && <Check size={12} />}
                      </button>
                      <span className="task-modal__checklist-text">{item.text}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklistItem(item.id)}
                        className="task-modal__checklist-delete"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="task-modal__checklist-add">
                  <input
                    ref={newItemInputRef}
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChecklistItem())}
                    className="input"
                    placeholder="Adicionar subtarefa..."
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    disabled={!newItemText.trim()}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="task-modal__row task-modal__row--3col">
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
            </div>

            {/* Valor, Pontos e Data de Início */}
            <div className="task-modal__metrics-section">
              <div className="form-group">
                <label className="label">Valor (R$/mês)</label>
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

              <div className="form-group">
                <label className="label">
                  <CalendarClock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  Data de início
                </label>
                <div className="task-modal__date-input-wrapper">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input task-modal__date-input"
                  />
                  <CalendarClock size={16} className="task-modal__date-icon" />
                </div>
                {startDate && points > 0 && (
                  <small className="task-modal__deadline-hint">
                    Deadline: {new Date(new Date(startDate).getTime() + points * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                  </small>
                )}
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

          <div className="modal-footer task-modal__footer">
            <button type="button" onClick={handleClose} className="btn btn-secondary btn-lg">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary btn-lg">
              {task ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Excluir tarefa?"
          message={`A tarefa "${task?.title}" será excluída permanentemente.`}
          variant="danger"
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
