import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5001');

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect(token?: string) {
        if (this.socket?.connected) return;

        this.socket = io(SOCKET_URL, {
            auth: token ? { token } : undefined,
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error.message);
        });

        // Forward all events to listeners
        this.setupEventForwarding();
    }

    private setupEventForwarding() {
        const events = [
            'new_message',
            'message_updated',
            'message_deleted',
            'user_typing',
            'user_stopped_typing',
            'user_online',
            'user_offline',
            'notification',
            'task_completed',
            'project_updated',
            'task_updated'
        ];

        events.forEach(event => {
            this.socket?.on(event, (data: any) => {
                this.emit(event, data);
            });
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.listeners.clear();
    }

    // Join a project room for real-time updates
    joinProject(projectId: string) {
        this.socket?.emit('join_project', projectId);
    }

    // Leave a project room
    leaveProject(projectId: string) {
        this.socket?.emit('leave_project', projectId);
    }

    // Emit typing indicator
    startTyping(projectId: string) {
        this.socket?.emit('typing_start', projectId);
    }

    stopTyping(projectId: string) {
        this.socket?.emit('typing_stop', projectId);
    }

    // Subscribe to events
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(event)?.delete(callback);
        };
    }

    // Emit to local listeners
    private emit(event: string, data: any) {
        this.listeners.get(event)?.forEach(callback => callback(data));
    }

    // Check connection status
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }
}

// Export singleton instance
export const socketService = new SocketService();
