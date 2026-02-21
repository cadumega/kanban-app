import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreVertical, Edit2, Trash2, Palette } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { ContactCard } from './ContactCard';
import type { CRMColumn as CRMColumnType, Contact } from '../../types';
import './CRMColumn.css';

interface CRMColumnProps {
  column: CRMColumnType;
  onContactClick: (contact: Contact) => void;
  onAddContact: (columnId: string) => void;
  onUpdateColumn?: (id: string, updates: { title?: string; color?: string }) => void;
  onDeleteColumn?: (id: string) => void;
}

const COLUMN_COLORS = [
  '#71717A', // zinc
  '#3B82F6', // blue
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#22C55E', // green
  '#14B8A6', // teal
];

export function CRMColumn({
  column,
  onContactClick,
  onAddContact,
  onUpdateColumn,
  onDeleteColumn,
}: CRMColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(column.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Calculate total value in column
  const totalValue = column.contacts.reduce((sum, c) => sum + (c.valor_mensal || 0), 0);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowColorPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTitleSubmit = () => {
    if (editTitle.trim() && editTitle !== column.title) {
      onUpdateColumn?.(column.id, { title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    onUpdateColumn?.(column.id, { color });
    setShowColorPicker(false);
    setShowMenu(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`crm-column ${isOver ? 'crm-column--over' : ''}`}
    >
      <header className="crm-column__header">
        <div className="crm-column__header-left">
          <div
            className="crm-column__color-indicator"
            style={{ backgroundColor: column.color }}
          />
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') {
                  setEditTitle(column.title);
                  setIsEditing(false);
                }
              }}
              className="crm-column__title-input"
            />
          ) : (
            <h3 className="crm-column__title" onDoubleClick={() => setIsEditing(true)}>
              {column.title}
            </h3>
          )}
          <span className="crm-column__count">{column.contacts.length}</span>
        </div>

        <div className="crm-column__header-right" ref={menuRef}>
          <button
            className="crm-column__menu-btn"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={16} />
          </button>

          {showMenu && (
            <div className="crm-column__menu">
              <button onClick={() => { setIsEditing(true); setShowMenu(false); }}>
                <Edit2 size={14} />
                Renomear
              </button>
              <button onClick={() => setShowColorPicker(!showColorPicker)}>
                <Palette size={14} />
                Cor
              </button>
              {showColorPicker && (
                <div className="crm-column__color-picker">
                  {COLUMN_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`crm-column__color-option ${color === column.color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(color)}
                    />
                  ))}
                </div>
              )}
              <button
                className="danger"
                onClick={() => {
                  onDeleteColumn?.(column.id);
                  setShowMenu(false);
                }}
              >
                <Trash2 size={14} />
                Excluir
              </button>
            </div>
          )}
        </div>
      </header>

      {totalValue > 0 && (
        <div className="crm-column__value">
          R$ {totalValue.toLocaleString('pt-BR')}/mês
        </div>
      )}

      <div className="crm-column__content">
        <SortableContext
          items={column.contacts.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onClick={() => onContactClick(contact)}
            />
          ))}
        </SortableContext>

        {column.contacts.length === 0 && (
          <div className="crm-column__empty">
            Arraste contatos aqui
          </div>
        )}
      </div>

      <button
        className="crm-column__add-btn"
        onClick={() => onAddContact(column.id)}
      >
        <Plus size={16} />
        <span>Novo contato</span>
      </button>
    </div>
  );
}
