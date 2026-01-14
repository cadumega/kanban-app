import axios from 'axios';
import type { Column, Task, Category, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload, Contact, ContactNote } from '../types';

export const api = axios.create({
  baseURL: '/api',
});

// Columns
export const getColumns = async (): Promise<Column[]> => {
  const { data } = await api.get('/columns');
  return data;
};

export const createColumn = async (title: string, color?: string): Promise<Column> => {
  const { data } = await api.post('/columns', { title, color });
  return data;
};

export const updateColumn = async (id: string, updates: { title?: string; color?: string }): Promise<Column> => {
  const { data } = await api.put(`/columns/${id}`, updates);
  return data;
};

export const deleteColumn = async (id: string): Promise<void> => {
  await api.delete(`/columns/${id}`);
};

export const reorderColumns = async (columns: { id: string }[]): Promise<void> => {
  await api.put('/columns/reorder/batch', { columns });
};

// Tasks
export const createTask = async (payload: CreateTaskPayload): Promise<Task> => {
  const { data } = await api.post('/tasks', payload);
  return data;
};

export const updateTask = async (id: string, payload: Partial<UpdateTaskPayload>): Promise<Task> => {
  const { data } = await api.put(`/tasks/${id}`, payload);
  return data;
};

export const moveTask = async (payload: MoveTaskPayload): Promise<Task> => {
  const { data } = await api.put(`/tasks/${payload.id}/move`, {
    column_id: payload.column_id,
    position: payload.position,
  });
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await api.delete(`/tasks/${id}`);
};

export const toggleTaskBlock = async (
  id: string,
  blocked: boolean,
  blocked_by?: string,
  blocked_reason?: string
): Promise<Task> => {
  const { data } = await api.put(`/tasks/${id}/block`, {
    blocked,
    blocked_by,
    blocked_reason,
  });
  return data;
};

// Categories
export const getCategories = async (): Promise<Category[]> => {
  const { data } = await api.get('/categories');
  return data;
};

export const createCategory = async (name: string, color?: string): Promise<Category> => {
  const { data } = await api.post('/categories', { name, color });
  return data;
};

export const updateCategory = async (id: string, updates: { name?: string; color?: string }): Promise<Category> => {
  const { data } = await api.put(`/categories/${id}`, updates);
  return data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/categories/${id}`);
};

// Contacts
export const getContacts = async (): Promise<Contact[]> => {
  const { data } = await api.get('/contacts');
  return data;
};

export const getContact = async (id: string): Promise<Contact> => {
  const { data } = await api.get(`/contacts/${id}`);
  return data;
};

export const createContact = async (contact: Partial<Contact>): Promise<Contact> => {
  const { data } = await api.post('/contacts', contact);
  return data;
};

export const updateContact = async (id: string, updates: Partial<Contact>): Promise<Contact> => {
  const { data } = await api.put(`/contacts/${id}`, updates);
  return data;
};

export const deleteContact = async (id: string): Promise<void> => {
  await api.delete(`/contacts/${id}`);
};

export const addContactNote = async (contactId: string, content: string): Promise<ContactNote> => {
  const { data } = await api.post(`/contacts/${contactId}/notes`, { content });
  return data;
};

export const deleteContactNote = async (contactId: string, noteId: string): Promise<void> => {
  await api.delete(`/contacts/${contactId}/notes/${noteId}`);
};
