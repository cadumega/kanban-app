export type Priority = 'alta' | 'media' | 'baixa';

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  column_id: string;
  position: number;
  priority: Priority;
  category_id: string | null;
  category_name?: string;
  category_color?: string;
  month: string | null;
  assignee: string | null;
  dependent: string | null;
  value: number;
  points: number;
  blocked: number;
  blocked_by: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  color: string;
  created_at: string;
  tasks: Task[];
}

export interface Filters {
  category_id: string | null;
  priority: Priority | null;
  month: string | null;
  blocked: boolean | null;
  person?: string | null;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  column_id: string;
  priority?: Priority;
  category_id?: string | null;
  month?: string | null;
  assignee?: string | null;
  dependent?: string | null;
  value?: number;
  points?: number;
  blocked?: boolean;
  blocked_by?: string | null;
  blocked_reason?: string | null;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  id: string;
}

export interface MoveTaskPayload {
  id: string;
  column_id: string;
  position: number;
}

// CRM Types
export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  notes_count?: number;
  notes?: ContactNote[];
  created_at: string;
  updated_at: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  content: string;
  created_at: string;
}
