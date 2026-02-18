import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Edit2, Trash2, Check, X, LayoutDashboard } from 'lucide-react';
import type { Board, BoardLimitInfo } from '../../services/api';
import { ConfirmDialog, useToast } from '../shared';

interface BoardSelectorProps {
  boards: Board[];
  currentBoard: Board | undefined;
  boardLimitInfo: BoardLimitInfo | null;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (name: string) => Promise<any>;
  onUpdateBoard: (id: string, name: string) => Promise<any>;
  onDeleteBoard: (id: string) => Promise<void>;
}

export function BoardSelector({
  boards,
  currentBoard,
  boardLimitInfo,
  onSelectBoard,
  onCreateBoard,
  onUpdateBoard,
  onDeleteBoard,
}: BoardSelectorProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [newBoardName, setNewBoardName] = useState('');
  const [editName, setEditName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; boardId: string; boardName: string }>({ isOpen: false, boardId: '', boardName: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsCreating(false);
        setIsEditing(null);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if ((isCreating || isEditing) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating, isEditing]);

  const handleCreate = async () => {
    if (!newBoardName.trim()) return;
    try {
      setError(null);
      await onCreateBoard(newBoardName.trim());
      setNewBoardName('');
      setIsCreating(false);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setError(null);
      await onUpdateBoard(id, editName.trim());
      setIsEditing(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, boardId: id, boardName: name });
  };

  const confirmDeleteBoard = async () => {
    try {
      setError(null);
      await onDeleteBoard(deleteConfirm.boardId);
      toast.success('Board excluído');
      setDeleteConfirm({ isOpen: false, boardId: '', boardName: '' });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditing = (board: Board) => {
    setIsEditing(board.id);
    setEditName(board.name);
    setError(null);
  };

  const canCreate = boardLimitInfo?.canCreate ?? true;

  return (
    <div className="board-selector" ref={dropdownRef}>
      <button
        className="board-selector__trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <LayoutDashboard size={18} />
        <span className="board-selector__name">{currentBoard?.name || 'Selecionar Board'}</span>
        <ChevronDown size={16} className={`board-selector__chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="board-selector__dropdown">
          {error && (
            <div className="board-selector__error">{error}</div>
          )}

          <div className="board-selector__list">
            {boards.map(board => (
              <div key={board.id} className="board-selector__item">
                {isEditing === board.id ? (
                  <div className="board-selector__edit-form">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleUpdate(board.id);
                        if (e.key === 'Escape') setIsEditing(null);
                      }}
                      className="board-selector__input"
                    />
                    <button onClick={() => handleUpdate(board.id)} className="board-selector__btn board-selector__btn--success">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setIsEditing(null)} className="board-selector__btn">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      className={`board-selector__board ${currentBoard?.id === board.id ? 'active' : ''}`}
                      onClick={() => {
                        onSelectBoard(board.id);
                        setIsOpen(false);
                      }}
                    >
                      <span>{board.name}</span>
                      {board.tasks_count !== undefined && (
                        <span className="board-selector__count">{board.tasks_count}</span>
                      )}
                    </button>
                    <div className="board-selector__actions">
                      <button onClick={() => startEditing(board)} className="board-selector__btn" title="Renomear">
                        <Edit2 size={14} />
                      </button>
                      {boards.length > 1 && (
                        <button onClick={() => handleDelete(board.id, board.name)} className="board-selector__btn board-selector__btn--danger" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {isCreating ? (
            <div className="board-selector__create-form">
              <input
                ref={inputRef}
                type="text"
                placeholder="Nome do board..."
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewBoardName('');
                  }
                }}
                className="board-selector__input"
              />
              <button onClick={handleCreate} className="board-selector__btn board-selector__btn--success">
                <Check size={14} />
              </button>
              <button onClick={() => { setIsCreating(false); setNewBoardName(''); }} className="board-selector__btn">
                <X size={14} />
              </button>
            </div>
          ) : canCreate ? (
            <button
              className="board-selector__add"
              onClick={() => { setIsCreating(true); setError(null); }}
            >
              <Plus size={16} />
              Novo Board
            </button>
          ) : (
            <div className="board-selector__limit">
              Limite de {boardLimitInfo?.limit} boards atingido
            </div>
          )}

          {boardLimitInfo && !boardLimitInfo.isMaster && (
            <div className="board-selector__info">
              {boardLimitInfo.current}/{boardLimitInfo.limit} boards
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Excluir board?"
        message={`O board "${deleteConfirm.boardName}" e todas as colunas e tarefas serão excluídos permanentemente.`}
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={confirmDeleteBoard}
        onCancel={() => setDeleteConfirm({ isOpen: false, boardId: '', boardName: '' })}
      />
    </div>
  );
}
