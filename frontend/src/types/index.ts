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
  start_date: string | null;
  project: string | null;
  blocked: number;
  blocked_by: string | null;
  blocked_reason: string | null;
  focus: number;
  checklist_total?: number;
  checklist_completed?: number;
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
  project?: string | null;
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
  start_date?: string | null;
  project?: string | null;
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
export type ContactTag = 'lead' | 'qualificado' | 'proposta' | 'negociacao' | 'cliente' | 'perdido' | null;

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  tag: ContactTag;
  city: string | null;
  notes_count?: number;
  notes?: ContactNote[];
  followups?: ContactFollowup[];
  created_at: string;
  updated_at: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  content: string | null;
  image_path: string | null;
  created_at: string;
}

export interface ContactFollowup {
  id: string;
  contact_id: string;
  date: string;
  description: string;
  completed: number;
  completed_at: string | null;
  created_at: string;
  // Populated from join
  contact_name?: string;
  contact_company?: string;
  contact_city?: string;
  contact_tag?: string;
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  text: string;
  completed: number;
  position: number;
  created_at: string;
}

// Auth Types
export type UserRole = 'master' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active?: number;
  created_at?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Roadmap Types
export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  task_count?: number;
  completed_tasks?: number;
  total_value?: number;
  total_points?: number;
  calculated_start?: string | null;
  calculated_end?: string | null;
  created_at: string;
  updated_at: string;
}
