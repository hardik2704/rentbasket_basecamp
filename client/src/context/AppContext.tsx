import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Project, Task, Message, Notification, User } from '../types';
import { projectsAPI, tasksAPI, messagesAPI, notificationsAPI, usersAPI } from '../services/api';

interface AppState {
    projects: Project[];
    tasks: Task[];
    messages: Record<string, Message[]>;
    files: any[];
    documents: any[];
    notifications: Notification[];
    users: User[];
    loading: boolean;
}

interface AppContextType extends AppState {
    // Project actions
    addProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'memberCount'>) => Promise<void>;
    updateProject: (id: string, project: Partial<Project>) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;

    // Task actions
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateTask: (id: string, task: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    getProjectTasks: (projectId: string) => Task[];

    // Message actions
    addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => Promise<void>;
    getProjectMessages: (projectId: string) => Message[];
    fetchProjectMessages: (projectId: string) => Promise<void>;

    // File actions
    addFile: (file: Omit<any, 'id' | 'uploadedAt' | 'uploadedBy'>) => void;
    deleteFile: (id: string) => void;
    getProjectFiles: (projectId: string) => any[];

    // Document actions
    addDocument: (doc: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => void;
    updateDocument: (id: string, doc: Partial<any>) => void;
    deleteDocument: (id: string) => void;

    // Notification actions
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    unreadCount: number;

    // Refresh data
    refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
    children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
    const [state, setState] = useState<AppState>({
        projects: [],
        tasks: [],
        messages: {},
        files: [],
        documents: [],
        notifications: [],
        users: [],
        loading: true
    });

    // Fetch all data on mount
    const fetchData = async () => {
        try {
            const token = localStorage.getItem('rentbasket_token');
            if (!token) {
                setState(prev => ({ ...prev, loading: false }));
                return;
            }

            const [projectsRes, tasksRes, notificationsRes, usersRes] = await Promise.all([
                projectsAPI.getAll().catch(() => ({ success: false, count: 0, data: [] })),
                tasksAPI.getAll().catch(() => ({ success: false, count: 0, data: [] })),
                notificationsAPI.getAll().catch(() => ({ success: false, count: 0, data: [] })),
                usersAPI.getAll().catch(() => ({ success: false, count: 0, data: [] }))
            ]);

            setState(prev => ({
                ...prev,
                projects: projectsRes.data || [],
                tasks: tasksRes.data || [],
                notifications: notificationsRes.data || [],
                users: usersRes.data || [],
                loading: false
            }));
        } catch (error) {
            console.error('Failed to fetch data:', error);
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const refreshData = async () => {
        setState(prev => ({ ...prev, loading: true }));
        await fetchData();
    };

    // Project actions
    const addProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'taskCount' | 'memberCount'>) => {
        try {
            const response = await projectsAPI.create(project as any);
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    projects: [...prev.projects, response.data]
                }));
            }
        } catch (error) {
            console.error('Failed to create project:', error);
            throw error;
        }
    };

    const updateProject = async (id: string, updates: Partial<Project>) => {
        try {
            const response = await projectsAPI.update(id, updates);
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    projects: prev.projects.map(p =>
                        p.id === id ? response.data : p
                    )
                }));
            }
        } catch (error) {
            console.error('Failed to update project:', error);
            throw error;
        }
    };

    const deleteProject = async (id: string) => {
        try {
            await projectsAPI.delete(id);
            setState(prev => ({
                ...prev,
                projects: prev.projects.filter(p => p.id !== id),
                tasks: prev.tasks.filter(t => t.projectId !== id)
            }));
        } catch (error) {
            console.error('Failed to delete project:', error);
            throw error;
        }
    };

    // Task actions
    const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            const response = await tasksAPI.create(task);
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    tasks: [...prev.tasks, response.data],
                    projects: prev.projects.map(p =>
                        p.id === task.projectId ? { ...p, taskCount: (p.taskCount || 0) + 1 } : p
                    )
                }));
            }
        } catch (error) {
            console.error('Failed to create task:', error);
            throw error;
        }
    };

    const updateTask = async (id: string, updates: Partial<Task>) => {
        try {
            const response = await tasksAPI.update(id, updates);
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    tasks: prev.tasks.map(t =>
                        t.id === id ? response.data : t
                    )
                }));
            }
        } catch (error) {
            console.error('Failed to update task:', error);
            throw error;
        }
    };

    const deleteTask = async (id: string) => {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;

        try {
            await tasksAPI.delete(id);
            setState(prev => ({
                ...prev,
                tasks: prev.tasks.filter(t => t.id !== id),
                projects: prev.projects.map(p =>
                    p.id === task.projectId ? { ...p, taskCount: Math.max(0, (p.taskCount || 1) - 1) } : p
                )
            }));
        } catch (error) {
            console.error('Failed to delete task:', error);
            throw error;
        }
    };

    const getProjectTasks = (projectId: string) => {
        return state.tasks.filter(t => t.projectId === projectId);
    };

    // Message actions
    const fetchProjectMessages = async (projectId: string) => {
        try {
            const response = await messagesAPI.getByProject(projectId);
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    messages: {
                        ...prev.messages,
                        [projectId]: response.data
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const addMessage = async (message: Omit<Message, 'id' | 'timestamp'>) => {
        try {
            const response = await messagesAPI.send({
                projectId: message.projectId,
                content: message.content,
                mentions: message.mentions
            });
            if (response.data) {
                setState(prev => ({
                    ...prev,
                    messages: {
                        ...prev.messages,
                        [message.projectId]: [...(prev.messages[message.projectId] || []), response.data]
                    }
                }));
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            throw error;
        }
    };

    const getProjectMessages = (projectId: string) => {
        return state.messages[projectId] || [];
    };

    // File actions (keeping local for now - can be extended to use API)
    const addFile = (file: Omit<any, 'id' | 'uploadedAt' | 'uploadedBy'>) => {
        const newFile = {
            ...file,
            id: Date.now().toString(),
            uploadedBy: '1',
            uploadedAt: new Date().toISOString()
        };
        setState(prev => ({
            ...prev,
            files: [...prev.files, newFile]
        }));
    };

    const deleteFile = (id: string) => {
        setState(prev => ({
            ...prev,
            files: prev.files.filter(f => f.id !== id)
        }));
    };

    const getProjectFiles = (projectId: string) => {
        return state.files.filter(f => f.projectId === projectId);
    };

    // Document actions (keeping local for now)
    const addDocument = (doc: Omit<any, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newDoc = {
            ...doc,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        setState(prev => ({
            ...prev,
            documents: [...prev.documents, newDoc]
        }));
    };

    const updateDocument = (id: string, updates: Partial<any>) => {
        setState(prev => ({
            ...prev,
            documents: prev.documents.map(d =>
                d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
            )
        }));
    };

    const deleteDocument = (id: string) => {
        setState(prev => ({
            ...prev,
            documents: prev.documents.filter(d => d.id !== id)
        }));
    };

    // Notification actions
    const markNotificationRead = async (id: string) => {
        try {
            await notificationsAPI.markRead(id);
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                )
            }));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const markAllNotificationsRead = async () => {
        try {
            await notificationsAPI.markAllRead();
            setState(prev => ({
                ...prev,
                notifications: prev.notifications.map(n => ({ ...n, read: true }))
            }));
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const unreadCount = state.notifications.filter(n => !n.read).length;

    const value: AppContextType = {
        ...state,
        addProject,
        updateProject,
        deleteProject,
        addTask,
        updateTask,
        deleteTask,
        getProjectTasks,
        addMessage,
        getProjectMessages,
        fetchProjectMessages,
        addFile,
        deleteFile,
        getProjectFiles,
        addDocument,
        updateDocument,
        deleteDocument,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
        refreshData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp(): AppContextType {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
}

