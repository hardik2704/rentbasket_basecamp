import { Link } from 'react-router-dom';
import {
    FolderKanban,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight,
    TrendingUp
} from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import './DashboardPage.css';

export function DashboardPage() {
    const { projects, tasks } = useApp();
    const { user } = useAuth();

    const activeProjects = projects.filter(p => p.status === 'active' || !p.status); // Handle legacy data without status

    const stats = {
        totalProjects: activeProjects.length,
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
        pendingTasks: tasks.filter(t => t.status === 'new').length
    };

    const recentTasks = tasks
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

    const myTasks = tasks.filter(t => t.assignedTo === user?.id && t.status !== 'done');

    const getCategoryBadge = (category: string) => {
        const classes: Record<string, string> = {
            tech: 'badge-tech',
            marketing: 'badge-marketing',
            ops: 'badge-ops',
            personal: 'badge-personal'
        };
        return classes[category] || 'badge-tech';
    };

    const getStatusBadge = (status: string) => {
        const classes: Record<string, string> = {
            new: 'badge-status-new',
            in_progress: 'badge-status-progress',
            done: 'badge-status-done'
        };
        return classes[status] || 'badge-status-new';
    };

    const formatStatus = (status: string) => {
        return status.replace('_', ' ');
    };

    return (
        <div className="dashboard-page">
            <Header
                title={`Welcome back, ${user?.name.split(' ')[0]}!`}
                subtitle="Here's what's happening with your projects"
            />

            <div className="dashboard-content">
                {/* Stats Grid */}
                <section className="stats-section">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon projects">
                                <FolderKanban size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.totalProjects}</span>
                                <span className="stat-label">Active Projects</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon completed">
                                <CheckCircle2 size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.completedTasks}</span>
                                <span className="stat-label">Completed Tasks</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon progress">
                                <Clock size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.inProgressTasks}</span>
                                <span className="stat-label">In Progress</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-icon pending">
                                <AlertCircle size={24} />
                            </div>
                            <div className="stat-info">
                                <span className="stat-value">{stats.pendingTasks}</span>
                                <span className="stat-label">Pending Tasks</span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="dashboard-grid">
                    {/* Projects Overview */}
                    <section className="dashboard-section">
                        <div className="section-header">
                            <h2>Projects</h2>
                            <Link to="/projects" className="view-all-link">
                                View all <ArrowRight size={16} />
                            </Link>
                        </div>

                        <div className="projects-grid">
                            {activeProjects.map(project => (
                                <Link to={`/projects/${project.id}`} key={project.id} className="project-card card">
                                    <div className="project-card-header">
                                        <span className={`badge ${getCategoryBadge(project.category)}`}>
                                            {project.category}
                                        </span>
                                    </div>
                                    <h3 className="project-name">{project.name}</h3>
                                    <p className="project-description">{project.description}</p>
                                    <div className="project-meta">
                                        <span>{project.taskCount} tasks</span>
                                        <span>{project.memberCount} members</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>

                    {/* My Tasks */}
                    <section className="dashboard-section my-tasks-section">
                        <div className="section-header">
                            <h2>My Tasks</h2>
                            <span className="task-count">{myTasks.length} pending</span>
                        </div>

                        <div className="tasks-list">
                            {myTasks.length === 0 ? (
                                <div className="empty-state">
                                    <CheckCircle2 size={32} />
                                    <p>All caught up! No pending tasks.</p>
                                </div>
                            ) : (
                                myTasks.map(task => (
                                    <div key={task.id} className="task-item">
                                        <div className="task-info">
                                            <span className="task-title">{task.title}</span>
                                            <span className={`badge ${getStatusBadge(task.status)}`}>
                                                {formatStatus(task.status)}
                                            </span>
                                        </div>
                                        {task.dueDate && (
                                            <span className="task-due">
                                                Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Recent Activity */}
                <section className="dashboard-section activity-section">
                    <div className="section-header">
                        <h2>Recent Activity</h2>
                        <TrendingUp size={18} className="text-muted" />
                    </div>

                    <div className="activity-list">
                        {recentTasks.map(task => (
                            <div key={task.id} className="activity-item">
                                <div className="activity-dot" data-status={task.status}></div>
                                <div className="activity-content">
                                    <span className="activity-text">
                                        <strong>{task.title}</strong> was updated
                                    </span>
                                    <span className="activity-time">
                                        {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
