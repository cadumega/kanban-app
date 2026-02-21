import axios from 'axios';
import type { Column, Task, Category, CreateTaskPayload, UpdateTaskPayload, MoveTaskPayload, Contact, ContactNote, ContactFollowup, ChecklistItem, Project, User, LoginResponse, AuditLogsResponse, CRMColumn, MoveContactPayload } from '../types';

// Use environment variable for API URL, fallback to relative path for dev proxy
const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_URL,
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

export const createUser = async (email: string, password: string, name?: string, shareWorkspace?: boolean): Promise<User> => {
  const { data } = await api.post('/auth/users', { email, password, name, share_workspace: shareWorkspace });
  return data;
};

export const updateUser = async (id: string, updates: { name?: string; password?: string; active?: number; share_workspace?: boolean }): Promise<User> => {
  const { data } = await api.put(`/auth/users/${id}`, updates);
  return data;
};

export const getAuditLogs = async (filters?: { user?: string; entity_type?: string; limit?: number; offset?: number }): Promise<AuditLogsResponse> => {
  const { data } = await api.get('/auth/audit-logs', { params: filters });
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/auth/users/${id}`);
};

// Boards
export interface Board {
  id: string;
  name: string;
  position: number;
  columns_count?: number;
  tasks_count?: number;
  created_at: string;
  updated_at: string;
}

export interface BoardLimitInfo {
  current: number;
  limit: number;
  canCreate: boolean;
  isMaster: boolean;
}

export const getBoards = async (): Promise<Board[]> => {
  const { data } = await api.get('/boards');
  return data;
};

export const getBoard = async (id: string): Promise<Board> => {
  const { data } = await api.get(`/boards/${id}`);
  return data;
};

export const createBoard = async (name: string): Promise<Board> => {
  const { data } = await api.post('/boards', { name });
  return data;
};

export const updateBoard = async (id: string, name: string): Promise<Board> => {
  const { data } = await api.put(`/boards/${id}`, { name });
  return data;
};

export const deleteBoard = async (id: string): Promise<void> => {
  await api.delete(`/boards/${id}`);
};

export const getBoardLimitInfo = async (): Promise<BoardLimitInfo> => {
  const { data } = await api.get('/boards/limit/info');
  return data;
};

// Columns
export const getColumns = async (boardId?: string): Promise<Column[]> => {
  const params = boardId ? { board_id: boardId } : {};
  const { data } = await api.get('/columns', { params });
  return data;
};

export const createColumn = async (title: string, color?: string, boardId?: string): Promise<Column> => {
  const { data } = await api.post('/columns', { title, color, board_id: boardId });
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

export const toggleTaskFocus = async (id: string, focus: boolean): Promise<Task> => {
  const { data } = await api.put(`/tasks/${id}/focus`, { focus });
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

export const addContactNote = async (contactId: string, content: string, image?: File, noteDate?: string): Promise<ContactNote> => {
  const formData = new FormData();
  if (content) {
    formData.append('content', content);
  }
  if (image) {
    formData.append('image', image);
  }
  if (noteDate) {
    formData.append('note_date', noteDate);
  }
  const { data } = await api.post(`/contacts/${contactId}/notes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const getContactImageUrl = (imagePath: string): string => {
  const token = localStorage.getItem('token');
  const baseUrl = `/api/contacts/images/${imagePath}`;
  return token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
};

export const updateContactNote = async (contactId: string, noteId: string, content: string): Promise<ContactNote> => {
  const { data } = await api.put(`/contacts/${contactId}/notes/${noteId}`, { content });
  return data;
};

export const deleteContactNote = async (contactId: string, noteId: string): Promise<void> => {
  await api.delete(`/contacts/${contactId}/notes/${noteId}`);
};

// Contact Follow-ups
export const getPendingFollowups = async (): Promise<ContactFollowup[]> => {
  const { data } = await api.get('/contacts/followups/pending');
  return data;
};

export const getContactFollowups = async (contactId: string): Promise<ContactFollowup[]> => {
  const { data } = await api.get(`/contacts/${contactId}/followups`);
  return data;
};

export const createFollowup = async (contactId: string, date: string, description?: string): Promise<ContactFollowup> => {
  const { data } = await api.post(`/contacts/${contactId}/followups`, { date, description });
  return data;
};

export const updateFollowup = async (
  contactId: string,
  followupId: string,
  updates: { date?: string; description?: string; completed?: boolean }
): Promise<ContactFollowup> => {
  const { data } = await api.put(`/contacts/${contactId}/followups/${followupId}`, updates);
  return data;
};

export const deleteFollowup = async (contactId: string, followupId: string): Promise<void> => {
  await api.delete(`/contacts/${contactId}/followups/${followupId}`);
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

// Reports / Statistics
export const getReportsStatistics = async () => {
  const { data } = await api.get('/contacts/reports/statistics');
  return data;
};

// Weekly Digest
export interface LeadIntelligence {
  score: number;
  classification: {
    label: 'HOT' | 'WARM' | 'COLD' | 'AT_RISK';
    color: string;
    priority: string;
  };
  alerts: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    category?: string;
    message: string;
  }[];
  signals: {
    type: string;
    category: string;
    keyword: string;
  }[];
  daysSinceContact: number;
}

export interface WeeklyDigestAlert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  category?: string;
  message: string;
  contact_id: string;
  contact_name: string;
  contact_company: string | null;
}

export interface WeeklyDigestContact {
  contact_id: string;
  contact_name: string;
  contact_company: string | null;
  contact_role: string | null;
  contact_city: string | null;
  contact_tag: string | null;
  contact_segments: string | null;
  valor_implementacao: number;
  valor_mensal: number;
  followups: {
    id: string;
    date: string;
    description: string;
  }[];
  notes: {
    content: string;
    created_at: string;
  }[];
  intelligence?: LeadIntelligence;
}

export interface WeeklyDigestResponse {
  period: {
    start: string;
    end: string;
  };
  summary: {
    total_contacts: number;
    total_followups: number;
    overdue: number;
    today: number;
    upcoming: number;
    hot_leads?: number;
    at_risk_leads?: number;
  };
  alerts?: WeeklyDigestAlert[];
  hot_leads?: WeeklyDigestContact[];
  at_risk_leads?: WeeklyDigestContact[];
  by_segment: Record<string, WeeklyDigestContact[]>;
}

export const getWeeklyDigest = async (): Promise<WeeklyDigestResponse> => {
  const { data } = await api.get('/contacts/reports/weekly-digest');
  return data;
};

// Analytics Dashboard
export interface AnalyticsFunnelStage {
  tag: string | null;
  label: string;
  color: string;
  count: number;
  percentage: number;
  valor_mensal: number;
  valor_implementacao: number;
}

export interface AnalyticsVelocity {
  tag: string;
  label: string;
  color: string;
  avg_days: number | null;
  transitions: number;
}

export interface AnalyticsMonth {
  month: string;
  notes: number;
  followups: number;
  new_contacts: number;
  conversions: number;
}

export interface AnalyticsSegment {
  name: string;
  count: number;
  won: number;
  lost: number;
  conversion_rate: number;
  valor_mensal: number;
}

export interface AnalyticsActivity {
  type: 'note' | 'followup' | 'tag_change';
  id: string;
  description: string | null;
  date: string;
  contact_id: string;
  contact_name: string;
  contact_company: string | null;
  contact_tag: string | null;
}

export interface AnalyticsHotContact {
  id: string;
  name: string;
  company: string | null;
  tag: string | null;
  valor_mensal: number;
  notes_count: number;
  last_note_date: string | null;
}

export interface AnalyticsResponse {
  overview: {
    total_contacts: number;
    active_deals: number;
    won_deals: number;
    lost_deals: number;
    conversion_rate: number;
    total_valor_mensal: number;
    total_valor_impl: number;
    avg_deal_value: number;
  };
  funnel: AnalyticsFunnelStage[];
  velocity: AnalyticsVelocity[];
  months: AnalyticsMonth[];
  segments: AnalyticsSegment[];
  recent_activity: AnalyticsActivity[];
  hot_contacts: AnalyticsHotContact[];
}

export const getAnalytics = async (): Promise<AnalyticsResponse> => {
  const { data } = await api.get('/contacts/reports/analytics');
  return data;
};

// Insights / AI Assistant
export interface InsightContact {
  id: string;
  name: string;
  company: string | null;
  tag: string | null;
  valor_mensal?: number;
  valor_implementacao?: number;
  days?: number;
  keywords?: string;
  objections?: string;
  note_preview?: string;
  message?: string;
  notes_count?: number;
  completed_followups?: number;
  last_note?: string;
  followup_description?: string;
  scheduled_date?: string;
}

export interface Insight {
  id: string;
  type: string;
  priority: number; // 1=critical, 2=high, 3=medium, 4=low
  title: string;
  description: string;
  contacts: InsightContact[];
  action: string;
  created_at: string;
}

export interface InsightsResponse {
  generated_at: string;
  summary: {
    total_insights: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  insights: Insight[];
}

export const getInsights = async (): Promise<InsightsResponse> => {
  const { data } = await api.get('/contacts/reports/insights');
  return data;
};

// ============================================
// CRM Kanban API
// ============================================

// Get columns with contacts for Kanban view
export const getCRMKanbanColumns = async (boardId?: string): Promise<CRMColumn[]> => {
  const params = boardId ? { board_id: boardId } : {};
  const { data } = await api.get('/contacts/kanban/columns', { params });
  return data;
};

// Move contact to another column
export const moveContact = async (contactId: string, payload: MoveContactPayload): Promise<Contact> => {
  const { data } = await api.put(`/contacts/${contactId}/move`, payload);
  return data;
};

// Reorder contacts within a column
export const reorderContacts = async (columnId: string, contactIds: string[]): Promise<void> => {
  await api.put('/contacts/kanban/reorder', { column_id: columnId, contacts: contactIds });
};
