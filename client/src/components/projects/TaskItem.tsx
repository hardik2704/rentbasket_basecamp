import { formatDistanceToNow } from 'date-fns';
import { Clock, User, MoreVertical } from 'lucide-react';
import type { Task } from '../../types';
import './TaskItem.css';

interface TaskItemProps {
    task: Task;
    onStatusChange?: (task: Task, newStatus: Task['status']) => void;
    onEdit?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    showProject?: boolean;
    projectName?: string;
}

const statusLabels: Record<string, string> = {
    new: 'To Do',
    in_progress: 'In Progress',
    done: 'Done'
};

const statusClasses: Record<string, string> = {
    new: 'badge-status-new',
    in_progress: 'badge-status-progress',
    done: 'badge-status-done'
};

export function TaskItem({
    task,
    onStatusChange,
    onEdit,
    onDelete,
    showProject,
    projectName
}: TaskItemProps) {
    const handleStatusClick = () => {
        if (!onStatusChange) return;

        const statusOrder: Task['status'][] = ['new', 'in_progress', 'done'];
        const currentIndex = statusOrder.indexOf(task.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
        onStatusChange(task, nextStatus);
    };

    return (
        <div className={`task-item ${task.status}`}>
            <div className="task-item-main">
                <div className="task-item-content">
                    <h4 className="task-title">{task.title}</h4>
                    {task.description && (
                        <p className="task-description">{task.description}</p>
                    )}
                    <div className="task-meta">
                        {showProject && projectName && (
                            <span className="task-project">{projectName}</span>
                        )}
                        {task.assigneeName && (
                            <span className="task-assignee">
                                <User size={12} />
                                {task.assigneeName}
                            </span>
                        )}
                        {task.dueDate && (
                            <span className="task-due">
                                <Clock size={12} />
                                {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                            </span>
                        )}
                    </div>
                </div>
                <div className="task-item-actions">
                    <button
                        className={`badge ${statusClasses[task.status]} status-button`}
                        onClick={handleStatusClick}
                        disabled={!onStatusChange}
                    >
                        {statusLabels[task.status]}
                    </button>
                    {(onEdit || onDelete) && (
                        <div className="task-dropdown">
                            <button className="btn btn-ghost btn-icon dropdown-trigger">
                                <MoreVertical size={16} />
                            </button>
                            <div className="dropdown-menu">
                                {onEdit && (
                                    <button onClick={() => onEdit(task)}>Edit</button>
                                )}
                                {onDelete && (
                                    <button onClick={() => onDelete(task)} className="danger">
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
