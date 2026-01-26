import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Plus,
    MoreVertical,
    CheckCircle2,
    Circle,
    Clock,
    Trash2,
    Edit2,
    X,
    MessageSquare,
    FileText,
    ArrowLeft
} from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Task, CreateTaskForm, TaskStatus } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import './ProjectPage.css';

export function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { projects, tasks, addTask, updateTask, deleteTask, users } = useApp();
    const { user, isAdmin } = useAuth();
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [activeTab, setActiveTab] = useState<'tasks' | 'chat' | 'files'>('tasks');

    const project = projects.find(p => p.id === projectId);
    const projectTasks = tasks.filter(t => t.projectId === projectId);

    const [taskForm, setTaskForm] = useState<CreateTaskForm>({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: ''
    });

    if (!project) {
        return (
            <div className="project-page">
                <Header title="Project Not Found" />
                <div className="project-content">
                    <div className="empty-state">
                        <p>The project you're looking for doesn't exist.</p>
                        <Link to="/projects" className="btn btn-primary">
                            <ArrowLeft size={18} />
                            Back to Projects
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const getCategoryBadge = (category: string) => {
        const classes: Record<string, string> = {
            tech: 'badge-tech',
            marketing: 'badge-marketing',
            ops: 'badge-ops',
            personal: 'badge-personal'
        };
        return classes[category] || 'badge-tech';
    };

    const handleSubmitTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskForm.title.trim()) return;

        const assignee = users.find(u => u.id === taskForm.assignedTo);

        if (editingTask) {
            updateTask(editingTask.id, {
                ...taskForm,
                assigneeName: assignee?.name
            });
        } else {
            addTask({
                projectId: project.id,
                title: taskForm.title,
                description: taskForm.description,
                status: 'new',
                assignedTo: taskForm.assignedTo || undefined,
                assigneeName: assignee?.name,
                dueDate: taskForm.dueDate || undefined,
                createdBy: user?.id || ''
            });
        }

        setShowTaskModal(false);
        setEditingTask(null);
        setTaskForm({ title: '', description: '', assignedTo: '', dueDate: '' });
    };

    const openEditModal = (task: Task) => {
        setEditingTask(task);
        setTaskForm({
            title: task.title,
            description: task.description,
            assignedTo: task.assignedTo || '',
            dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''
        });
        setShowTaskModal(true);
    };

    const toggleTaskStatus = (task: Task) => {
        const statusFlow: Record<TaskStatus, TaskStatus> = {
            new: 'in_progress',
            in_progress: 'done',
            done: 'new'
        };
        updateTask(task.id, { status: statusFlow[task.status] });
    };

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case 'done':
                return <CheckCircle2 size={20} className="status-icon done" />;
            case 'in_progress':
                return <Clock size={20} className="status-icon progress" />;
            default:
                return <Circle size={20} className="status-icon new" />;
        }
    };

    const tasksByStatus = {
        new: projectTasks.filter(t => t.status === 'new'),
        in_progress: projectTasks.filter(t => t.status === 'in_progress'),
        done: projectTasks.filter(t => t.status === 'done')
    };

    return (
        <div className="project-page">
            <Header
                title={project.name}
                subtitle={project.description}
                actions={
                    <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
                        <Plus size={18} />
                        New Task
                    </button>
                }
            />

            <div className="project-content">
                {/* Project Header */}
                <div className="project-header-card card">
                    <div className="project-info">
                        <span className={`badge ${getCategoryBadge(project.category)}`}>
                            {project.category}
                        </span>
                        <span className="project-meta-text">
                            Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </span>
                    </div>

                    <div className="project-tabs">
                        <button
                            className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                            onClick={() => setActiveTab('tasks')}
                        >
                            <CheckCircle2 size={18} />
                            Tasks ({projectTasks.length})
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={18} />
                            Chat
                        </button>
                        <button
                            className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                            onClick={() => setActiveTab('files')}
                        >
                            <FileText size={18} />
                            Files
                        </button>
                    </div>
                </div>

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                    <div className="tasks-board">
                        {/* New Column */}
                        <div className="task-column">
                            <div className="column-header">
                                <Circle size={16} className="column-icon new" />
                                <h3>To Do</h3>
                                <span className="column-count">{tasksByStatus.new.length}</span>
                            </div>
                            <div className="task-list">
                                {tasksByStatus.new.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={() => toggleTaskStatus(task)}
                                        onEdit={() => openEditModal(task)}
                                        onDelete={() => deleteTask(task.id)}
                                        getStatusIcon={getStatusIcon}
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* In Progress Column */}
                        <div className="task-column">
                            <div className="column-header">
                                <Clock size={16} className="column-icon progress" />
                                <h3>In Progress</h3>
                                <span className="column-count">{tasksByStatus.in_progress.length}</span>
                            </div>
                            <div className="task-list">
                                {tasksByStatus.in_progress.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={() => toggleTaskStatus(task)}
                                        onEdit={() => openEditModal(task)}
                                        onDelete={() => deleteTask(task.id)}
                                        getStatusIcon={getStatusIcon}
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Done Column */}
                        <div className="task-column">
                            <div className="column-header">
                                <CheckCircle2 size={16} className="column-icon done" />
                                <h3>Done</h3>
                                <span className="column-count">{tasksByStatus.done.length}</span>
                            </div>
                            <div className="task-list">
                                {tasksByStatus.done.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={() => toggleTaskStatus(task)}
                                        onEdit={() => openEditModal(task)}
                                        onDelete={() => deleteTask(task.id)}
                                        getStatusIcon={getStatusIcon}
                                        isAdmin={isAdmin}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Tab Placeholder */}
                {activeTab === 'chat' && (
                    <div className="chat-placeholder card">
                        <MessageSquare size={48} className="text-muted" />
                        <h3>Team Chat</h3>
                        <p>Chat with your team about this project. Coming soon!</p>
                        <Link to="/chat" className="btn btn-secondary">
                            Go to Team Chat
                        </Link>
                    </div>
                )}

                {/* Files Tab Placeholder */}
                {activeTab === 'files' && (
                    <div className="files-placeholder card">
                        <FileText size={48} className="text-muted" />
                        <h3>Project Files</h3>
                        <p>Upload and manage files for this project. Coming soon!</p>
                        <button className="btn btn-secondary">
                            <Plus size={18} />
                            Upload File
                        </button>
                    </div>
                )}
            </div>

            {/* Task Modal */}
            {showTaskModal && (
                <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
                            <button className="modal-close" onClick={() => setShowTaskModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitTask} className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter task title"
                                    value={taskForm.title}
                                    onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Describe the task..."
                                    value={taskForm.description}
                                    onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Assign To</label>
                                    <select
                                        className="form-input"
                                        value={taskForm.assignedTo}
                                        onChange={e => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Due Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={taskForm.dueDate}
                                        onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {editingTask ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Task Card Component
interface TaskCardProps {
    task: Task;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    getStatusIcon: (status: TaskStatus) => React.ReactNode;
    isAdmin: boolean;
}

function TaskCard({ task, onToggle, onEdit, onDelete, getStatusIcon, isAdmin }: TaskCardProps) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className={`task-card ${task.status === 'done' ? 'completed' : ''}`}>
            <div className="task-card-header">
                <button className="status-toggle" onClick={onToggle}>
                    {getStatusIcon(task.status)}
                </button>
                <div className="task-card-actions">
                    <button className="action-btn" onClick={() => setShowMenu(!showMenu)}>
                        <MoreVertical size={16} />
                    </button>
                    {showMenu && (
                        <div className="action-menu">
                            <button onClick={() => { onEdit(); setShowMenu(false); }}>
                                <Edit2 size={14} /> Edit
                            </button>
                            {isAdmin && (
                                <button className="danger" onClick={() => { onDelete(); setShowMenu(false); }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <h4 className="task-card-title">{task.title}</h4>

            {task.description && (
                <p className="task-card-description">{task.description}</p>
            )}

            <div className="task-card-footer">
                {task.assigneeName && (
                    <div className="task-assignee">
                        <div className="avatar avatar-sm">
                            {task.assigneeName.charAt(0).toUpperCase()}
                        </div>
                        <span>{task.assigneeName.split(' ')[0]}</span>
                    </div>
                )}
                {task.dueDate && (
                    <span className="task-due-date">
                        {format(new Date(task.dueDate), 'MMM d')}
                    </span>
                )}
            </div>
        </div>
    );
}
