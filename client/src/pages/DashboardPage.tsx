import { useState } from 'react';
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
    const [taskCategoryFilter, setTaskCategoryFilter] = useState<'all' | 'tech' | 'marketing' | 'personal' | 'ops'>('all');

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

    const myTasks = tasks.filter(t => t.status === 'new');

    // Filter my tasks by selected category
    const getProjectCategory = (projectId: string) => {
        const project = projects.find(p => p.id === projectId);
        return project?.category || 'tech';
    };

    const filteredMyTasks = myTasks.filter(task => {
        if (taskCategoryFilter === 'all') return true;
        return getProjectCategory(task.projectId) === taskCategoryFilter;
    });

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
                                <Link to={`/projects/${project.id}`} key={project.id} className={`project-card card category-${project.category}`}>
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

                        {/* Category Filter Tabs */}
                        <div className="task-category-filters">
                            {(['all', 'tech', 'marketing', 'personal', 'ops'] as const).map(cat => (
                                <button
                                    key={cat}
                                    className={`category-filter-btn ${taskCategoryFilter === cat ? 'active' : ''} ${cat !== 'all' ? `filter-${cat}` : ''}`}
                                    onClick={() => setTaskCategoryFilter(cat)}
                                >
                                    {cat === 'all' ? 'All' : cat === 'ops' ? 'Operations' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </button>
                            ))}
                        </div>

                        <div className="tasks-list">
                            {filteredMyTasks.length === 0 ? (
                                <div className="empty-state">
                                    <CheckCircle2 size={32} />
                                    <p>{taskCategoryFilter === 'all' ? 'All caught up! No pending tasks.' : `No pending ${taskCategoryFilter === 'ops' ? 'operations' : taskCategoryFilter} tasks.`}</p>
                                </div>
                            ) : (
                                filteredMyTasks.map(task => (
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
