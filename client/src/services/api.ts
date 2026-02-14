// API Configuration
const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5001')) + '/api';

// Log the resolved API URL in development/debug
if (!import.meta.env.PROD) {
    console.log('[API] Base URL:', API_BASE_URL);
}

// Custom error class for API errors
export class ApiError extends Error {
    status?: number;
    code?: string;

    constructor(message: string, status?: number, code?: string) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}

// Helper function to get auth headers
const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('rentbasket_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Generic API call wrapper with improved error handling
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers,
            },
        });

        // Read body as text first to avoid JSON parse crash on empty/invalid responses
        const text = await response.text();

        let data: any;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            // Server returned non-JSON (e.g. HTML error page)
            if (!response.ok) {
                throw new ApiError(
                    `Server error (${response.status}): received non-JSON response`,
                    response.status
                );
            }
            throw new ApiError(
                `Unexpected server response (not JSON)`,
                response.status
            );
        }

        if (!response.ok) {
            throw new ApiError(
                data.error || `Request failed with status ${response.status}`,
                response.status,
                data.code
            );
        }

        return data as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        // Network-level error (CORS, DNS, connection refused, etc.)
        const message = error instanceof Error ? error.message : 'Network error';
        console.error(`[API] Network error calling ${url}:`, message);
        throw new ApiError(
            `Cannot connect to server. Please check your connection. (${message})`,
            0,
            'NETWORK_ERROR'
        );
    }
}

// ============ AUTH API ============
export const authAPI = {
    login: (email: string, password: string) =>
        apiCall<{ success: boolean; data: { token: string; user: any } }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    register: (data: { name: string; email: string; password: string }) =>
        apiCall<{ success: boolean; data: { token: string; user: any } }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getMe: () =>
        apiCall<{ success: boolean; data: { user: any } }>('/auth/me'),

    updateProfile: (data: { name?: string; email?: string }) =>
        apiCall<{ success: boolean; data: { user: any } }>('/auth/update-profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    changePassword: (data: { currentPassword: string; newPassword: string }) =>
        apiCall<{ success: boolean }>('/auth/change-password', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// ============ PROJECTS API ============
export const projectsAPI = {
    getAll: () =>
        apiCall<{ success: boolean; count: number; data: any[] }>('/projects'),

    getById: (id: string) =>
        apiCall<{ success: boolean; data: any }>(`/projects/${id}`),

    create: (data: { name: string; description: string; category: string }) =>
        apiCall<{ success: boolean; data: any }>('/projects', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<any>) =>
        apiCall<{ success: boolean; data: any }>(`/projects/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiCall<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
};

// ============ TASKS API ============
export const tasksAPI = {
    getAll: (filters?: { projectId?: string; status?: string }) => {
        const params = new URLSearchParams(filters as Record<string, string>).toString();
        return apiCall<{ success: boolean; count: number; data: any[] }>(`/tasks?${params}`);
    },

    getMyTasks: () =>
        apiCall<{ success: boolean; count: number; data: any[] }>('/tasks/my-tasks'),

    getByProject: (projectId: string) =>
        apiCall<{ success: boolean; count: number; data: any[] }>(`/tasks/project/${projectId}`),

    create: (data: any) =>
        apiCall<{ success: boolean; data: any }>('/tasks', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<any>) =>
        apiCall<{ success: boolean; data: any }>(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiCall<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
};

// ============ MESSAGES API ============
export const messagesAPI = {
    getByProject: (projectId: string) =>
        apiCall<{ success: boolean; count: number; data: any[] }>(`/messages/project/${projectId}`),

    send: (data: { projectId: string; content: string; mentions?: string[] }) =>
        apiCall<{ success: boolean; data: any }>('/messages', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, content: string) =>
        apiCall<{ success: boolean; data: any }>(`/messages/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    delete: (id: string) =>
        apiCall<{ success: boolean }>(`/messages/${id}`, { method: 'DELETE' }),
};

// ============ NOTIFICATIONS API ============
export const notificationsAPI = {
    getAll: () =>
        apiCall<{ success: boolean; count: number; data: any[] }>('/notifications'),

    getUnreadCount: () =>
        apiCall<{ success: boolean; count: number }>('/notifications/unread-count'),

    markRead: (id: string) =>
        apiCall<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PUT' }),

    markAllRead: () =>
        apiCall<{ success: boolean }>('/notifications/mark-all-read', { method: 'PUT' }),
};

// ============ FILES API ============
export const filesAPI = {
    getByProject: (projectId: string) =>
        apiCall<{ success: boolean; files: any[] }>(`/files/project/${projectId}`),

    upload: async (projectId: string, file: File, description?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', projectId);
        if (description) formData.append('description', description);

        const token = localStorage.getItem('rentbasket_token');
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(errorData.error || 'Upload failed', response.status);
        }

        return response.json();
    },

    delete: (id: string) =>
        apiCall<{ success: boolean }>(`/files/${id}`, { method: 'DELETE' }),
};

// ============ USERS API (Admin) ============
export const usersAPI = {
    getAll: () =>
        apiCall<{ success: boolean; count: number; data: any[] }>('/users'),

    create: (data: { name: string; email: string; password: string; role: string }) =>
        apiCall<{ success: boolean; data: any }>('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, data: Partial<any>) =>
        apiCall<{ success: boolean; data: any }>(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        apiCall<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};
