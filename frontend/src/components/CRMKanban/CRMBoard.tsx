import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Plus, Loader2 } from 'lucide-react';
import { CRMColumn } from './CRMColumn';
import { ContactCardOverlay } from './ContactCard';
import { MoveContactModal } from './MoveContactModal';
import type { CRMColumn as CRMColumnType, Contact } from '../../types';
import './CRMBoard.css';

interface PendingMove {
  contact: Contact;
  fromColumn: CRMColumnType;
  toColumn: CRMColumnType;
  position: number;
}

interface CRMBoardProps {
  columns: CRMColumnType[];
  loading: boolean;
  onContactClick: (contact: Contact) => void;
  onAddContact: (columnId: string) => void;
  onMoveContact: (contactId: string, columnId: string, position: number, note?: string) => Promise<void>;
  onAddColumn: () => void;
  onUpdateColumn: (id: string, updates: { title?: string; color?: string }) => void;
  onDeleteColumn: (id: string) => void;
}

export function CRMBoard({
  columns,
  loading,
  onContactClick,
  onAddContact,
  onMoveContact,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
}: CRMBoardProps) {
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const findContact = (id: string): Contact | undefined => {
    for (const column of columns) {
      const contact = column.contacts.find((c) => c.id === id);
      if (contact) return contact;
    }
    return undefined;
  };

  const findColumn = (id: string): CRMColumnType | undefined => {
    // Check if id is a column id
    const column = columns.find((c) => c.id === id);
    if (column) return column;

    // Check if id is a contact id
    for (const col of columns) {
      if (col.contacts.some((c) => c.id === id)) {
        return col;
      }
    }
    return undefined;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const contact = findContact(event.active.id as string);
    if (contact) {
      setActiveContact(contact);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveContact(null);
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = findColumn(activeId);
    const overColumn = findColumn(overId);

    if (!activeColumn || !overColumn) {
      setActiveContact(null);
      return;
    }

    // If dropped on the same position, do nothing
    if (activeId === overId) {
      setActiveContact(null);
      return;
    }

    // If moving to a different column, show confirmation modal
    if (activeColumn.id !== overColumn.id) {
      const contact = findContact(activeId);
      if (!contact) {
        setActiveContact(null);
        return;
      }

      // Find target position
      let newPosition = 0;
      const overContact = findContact(overId);
      if (overContact) {
        newPosition = overColumn.contacts.findIndex((c) => c.id === overId);
      } else {
        newPosition = overColumn.contacts.length;
      }

      setPendingMove({
        contact,
        fromColumn: activeColumn,
        toColumn: overColumn,
        position: newPosition,
      });
    } else {
      // Same column, just reorder (no confirmation needed)
      const overContact = findContact(overId);
      const newPosition = overContact
        ? overColumn.contacts.findIndex((c) => c.id === overId)
        : overColumn.contacts.length;

      onMoveContact(activeId, overColumn.id, newPosition);
    }

    setActiveContact(null);
  };

  const handleConfirmMove = async (note?: string) => {
    if (!pendingMove) return;

    await onMoveContact(
      pendingMove.contact.id,
      pendingMove.toColumn.id,
      pendingMove.position,
      note
    );
    setPendingMove(null);
  };

  const handleCancelMove = () => {
    setPendingMove(null);
  };

  if (loading) {
    return (
      <div className="crm-board crm-board--loading">
        <Loader2 size={32} className="spin" />
        <span>Carregando CRM...</span>
      </div>
    );
  }

  return (
    <div className="crm-board">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="crm-board__columns">
          {columns.map((column) => (
            <CRMColumn
              key={column.id}
              column={column}
              onContactClick={onContactClick}
              onAddContact={onAddContact}
              onUpdateColumn={onUpdateColumn}
              onDeleteColumn={onDeleteColumn}
            />
          ))}

          <button onClick={onAddColumn} className="crm-board__add-column">
            <Plus size={20} />
            <span>Nova coluna</span>
          </button>
        </div>

        <DragOverlay>
          {activeContact && (
            <div className="crm-board__drag-overlay">
              <ContactCardOverlay contact={activeContact} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <MoveContactModal
          isOpen={true}
          contact={pendingMove.contact}
          fromColumn={pendingMove.fromColumn}
          toColumn={pendingMove.toColumn}
          onConfirm={handleConfirmMove}
          onCancel={handleCancelMove}
        />
      )}
    </div>
  );
}
