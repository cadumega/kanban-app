import { useState, useEffect, useCallback } from 'react';
import { getCRMKanbanColumns, moveContact, createColumn, updateColumn, deleteColumn } from '../../services/api';
import type { CRMColumn, Contact } from '../../types';

export function useCRMKanban(boardId?: string) {
  const [columns, setColumns] = useState<CRMColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadColumns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCRMKanbanColumns(boardId);
      setColumns(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao carregar CRM');
      console.error('Error loading CRM columns:', err);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const handleMoveContact = useCallback(
    async (contactId: string, columnId: string, position: number, note?: string) => {
      // Optimistic update
      setColumns((prevColumns) => {
        const newColumns = prevColumns.map((col) => ({
          ...col,
          contacts: col.contacts.filter((c) => c.id !== contactId),
        }));

        // Find the contact
        let contact: Contact | undefined;
        for (const col of prevColumns) {
          const found = col.contacts.find((c) => c.id === contactId);
          if (found) {
            contact = found;
            break;
          }
        }

        if (!contact) return prevColumns;

        // Add to new column
        const targetColumnIndex = newColumns.findIndex((c) => c.id === columnId);
        if (targetColumnIndex === -1) return prevColumns;

        const updatedContact = { ...contact, column_id: columnId, position };
        const targetContacts = [...newColumns[targetColumnIndex].contacts];
        targetContacts.splice(position, 0, updatedContact);

        newColumns[targetColumnIndex] = {
          ...newColumns[targetColumnIndex],
          contacts: targetContacts.map((c, idx) => ({ ...c, position: idx })),
        };

        return newColumns;
      });

      try {
        await moveContact(contactId, { column_id: columnId, position, note });
      } catch (err) {
        console.error('Error moving contact:', err);
        // Reload on error
        loadColumns();
      }
    },
    [loadColumns]
  );

  const handleAddColumn = useCallback(async () => {
    try {
      const boardIdToUse = boardId || columns[0]?.board_id;
      if (!boardIdToUse) return;

      const newColumn = await createColumn('Nova Coluna', '#6366F1', boardIdToUse);
      setColumns((prev) => [
        ...prev,
        { ...newColumn, board_id: boardIdToUse, contacts: [] } as CRMColumn,
      ]);
    } catch (err) {
      console.error('Error creating column:', err);
    }
  }, [boardId, columns]);

  const handleUpdateColumn = useCallback(
    async (id: string, updates: { title?: string; color?: string }) => {
      // Optimistic update
      setColumns((prev) =>
        prev.map((col) => (col.id === id ? { ...col, ...updates } : col))
      );

      try {
        await updateColumn(id, updates);
      } catch (err) {
        console.error('Error updating column:', err);
        loadColumns();
      }
    },
    [loadColumns]
  );

  const handleDeleteColumn = useCallback(
    async (id: string) => {
      if (columns.length <= 1) {
        alert('Não é possível excluir a única coluna');
        return;
      }

      const column = columns.find((c) => c.id === id);
      if (column && column.contacts.length > 0) {
        const confirmed = window.confirm(
          `Esta coluna tem ${column.contacts.length} contato(s). Ao excluir, os contatos serão movidos para a primeira coluna. Continuar?`
        );
        if (!confirmed) return;
      }

      // Optimistic update
      setColumns((prev) => prev.filter((col) => col.id !== id));

      try {
        await deleteColumn(id);
        // Reload to get updated contacts
        loadColumns();
      } catch (err) {
        console.error('Error deleting column:', err);
        loadColumns();
      }
    },
    [columns, loadColumns]
  );

  // Update a contact in columns (for when ContactDetailModal updates it)
  const updateContactInColumns = useCallback((updatedContact: Contact) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        contacts: col.contacts.map((c) =>
          c.id === updatedContact.id ? { ...c, ...updatedContact } : c
        ),
      }))
    );
  }, []);

  // Remove a contact from columns
  const removeContactFromColumns = useCallback((contactId: string) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        contacts: col.contacts.filter((c) => c.id !== contactId),
      }))
    );
  }, []);

  // Add a new contact to columns (after creation)
  const addContactToColumns = useCallback((contact: Contact, columnId: string) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === columnId) {
          return {
            ...col,
            contacts: [...col.contacts, contact],
          };
        }
        return col;
      })
    );
  }, []);

  return {
    columns,
    loading,
    error,
    reload: loadColumns,
    moveContact: handleMoveContact,
    addColumn: handleAddColumn,
    updateColumn: handleUpdateColumn,
    deleteColumn: handleDeleteColumn,
    updateContactInColumns,
    removeContactFromColumns,
    addContactToColumns,
  };
}
