// User Types
export type UserRole = 'admin' | 'editor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  loginStreak: number;
  lastLogin: string;
  createdAt: string;
}

// Project Types
export type ProjectCategory = 'tech' | 'marketing' | 'ops' | 'personal';

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  memberCount: number;
}

// Task Types
export type TaskStatus = 'new' | 'in_progress' | 'done';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo?: string;
  assigneeName?: string;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Message Types
export interface Message {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  mentions?: string[];
  timestamp: string;
}

// File Types
export interface ProjectFile {
  id: string;
  projectId: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedByName: string;
  description?: string;
  uploadedAt: string;
}

// Notification Types
export type NotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'task_due_soon'
  | 'message_mention'
  | 'file_uploaded'
  | 'project_created';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  projectId?: string;
  projectName?: string;
  read: boolean;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface CreateProjectForm {
  name: string;
  description: string;
  category: ProjectCategory;
}

export interface CreateTaskForm {
  title: string;
  description: string;
  assignedTo?: string;
  dueDate?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}
