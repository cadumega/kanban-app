import axios from 'axios';
import type { Column, Task, Category, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload, Contact, ContactNote, ChecklistItem, Project, User, LoginResponse } from '../types';

export const api = axios.create({
  baseURL: '/api',
});

// Auth token management
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// Initialize token from localStorage on load
const storedToken = localStorage.getItem('token');
if (storedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Intercept 401 errors to clear auth state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
};

export const getCurrentUser = async (): Promise<User> => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const getUsers = async (): Promise<User[]> => {
  const { data } = await api.get('/auth/users');
  return data;
};

export const createUser = async (email: string, password: string, name?: string): Promise<User> => {
  const { data } = await api.post('/auth/users', { email, password, name });
  return data;
};

export const updateUser = async (id: string, updates: { name?: string; password?: string; active?: number }): Promise<User> => {
  const { data } = await api.put(`/auth/users/${id}`, updates);
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/auth/users/${id}`);
};

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

export const addContactNote = async (contactId: string, content: string, image?: File): Promise<ContactNote> => {
  const formData = new FormData();
  if (content) {
    formData.append('content', content);
  }
  if (image) {
    formData.append('image', image);
  }
  const { data } = await api.post(`/contacts/${contactId}/notes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const getContactImageUrl = (imagePath: string): string => {
  return `/api/contacts/images/${imagePath}`;
};

export const deleteContactNote = async (contactId: string, noteId: string): Promise<void> => {
  await api.delete(`/contacts/${contactId}/notes/${noteId}`);
};

// Checklist (Subtarefas)
export const getChecklist = async (taskId: string): Promise<ChecklistItem[]> => {
  const { data } = await api.get(`/tasks/${taskId}/checklist`);
  return data;
};

export const addChecklistItem = async (taskId: string, text: string): Promise<ChecklistItem> => {
  const { data } = await api.post(`/tasks/${taskId}/checklist`, { text });
  return data;
};

export const updateChecklistItem = async (
  taskId: string,
  itemId: string,
  updates: { completed?: boolean; text?: string }
): Promise<ChecklistItem> => {
  const { data } = await api.put(`/tasks/${taskId}/checklist/${itemId}`, updates);
  return data;
};

export const deleteChecklistItem = async (taskId: string, itemId: string): Promise<void> => {
  await api.delete(`/tasks/${taskId}/checklist/${itemId}`);
};

// Projects (Roadmap)
export const getProjects = async (): Promise<Project[]> => {
  const { data } = await api.get('/projects');
  return data;
};

export const getProject = async (id: string): Promise<Project & { tasks: Task[] }> => {
  const { data } = await api.get(`/projects/${id}`);
  return data;
};

export const getRoadmapTimeline = async (): Promise<{ projects: Project[] }> => {
  const { data } = await api.get('/projects/roadmap/timeline');
  return data;
};

export const createProject = async (project: Partial<Project>): Promise<Project> => {
  const { data } = await api.post('/projects', project);
  return data;
};

export const updateProject = async (id: string, updates: Partial<Project>): Promise<Project> => {
  const { data } = await api.put(`/projects/${id}`, updates);
  return data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/projects/${id}`);
};
