import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Trash2, X } from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { CreateProjectForm, ProjectCategory } from '../types';
import { formatDistanceToNow } from 'date-fns';
import './ProjectsPage.css';

export function ProjectsPage() {
    const { projects, addProject, deleteProject } = useApp();
    const { user, isAdmin } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter] = useState<ProjectCategory | 'all' | 'completed'>('all');

    const [form, setForm] = useState<CreateProjectForm>({
        name: '',
        description: '',
        category: 'tech'
    });

    // Calculate active projects for header count
    const activeProjectsCount = projects.filter(p => p.status === 'active' || !p.status).length;

    const filteredProjects = projects.filter(p => {
        // Special case for completed filter
        if (filter === 'completed') {
            return p.status === 'completed' || p.status === 'archived';
        }

        // For other filters, only show active projects
        if (p.status === 'completed' || p.status === 'archived') return false;

        // Category filter
        if (filter === 'all') return true;
        return p.category === filter;
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;

        await addProject({
            name: form.name,
            description: form.description,
            category: form.category,
            status: 'active',
            createdBy: user?.id || ''
        });

        // Switch filter to show the new project
        setFilter(form.category);

        setShowModal(false);
        setForm({ name: '', description: '', category: 'tech' });
    };

    const getCategoryBadge = (category: string) => {
        const classes: Record<string, string> = {
            tech: 'badge-tech',
            marketing: 'badge-marketing',
            ops: 'badge-ops',
            personal: 'badge-personal'
        };
        return classes[category] || 'badge-tech';
    };

    return (
        <div className="projects-page">
            <Header
                title="Projects"
                subtitle={`${activeProjectsCount} active projects`}
                actions={
                    isAdmin && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={18} />
                            New Project
                        </button>
                    )
                }
            />

            <div className="projects-content">
                {/* Filters */}
                <div className="projects-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'tech' ? 'active' : ''}`}
                        onClick={() => setFilter('tech')}
                    >
                        Tech
                    </button>
                    <button
                        className={`filter-btn ${filter === 'marketing' ? 'active' : ''}`}
                        onClick={() => setFilter('marketing')}
                    >
                        Marketing
                    </button>
                    <button
                        className={`filter-btn ${filter === 'ops' ? 'active' : ''}`}
                        onClick={() => setFilter('ops')}
                    >
                        Operations
                    </button>
                    <button
                        className={`filter-btn ${filter === 'personal' ? 'active' : ''}`}
                        onClick={() => setFilter('personal')}
                    >
                        Personal
                    </button>
                    <div className="filter-divider"></div>
                    <button
                        className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                        onClick={() => setFilter('completed')}
                    >
                        Completed
                    </button>
                </div>

                {/* Projects Grid */}
                <div className="projects-grid">
                    {filteredProjects.length === 0 ? (
                        <div className="empty-state card">
                            <FolderKanban size={48} className="text-muted" />
                            <h3>No projects found</h3>
                            <p>Create your first project to get started.</p>
                            {isAdmin && (
                                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    <Plus size={18} />
                                    New Project
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredProjects.map(project => (
                            <div key={project.id} className="project-card card">
                                <Link to={`/projects/${project.id}`} className="project-link">
                                    <div className="project-card-header">
                                        <span className={`badge ${getCategoryBadge(project.category)}`}>
                                            {project.category}
                                        </span>
                                        {isAdmin && (
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    if (confirm('Are you sure you want to delete this project?')) {
                                                        deleteProject(project.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <h3 className="project-name">{project.name}</h3>
                                    <p className="project-description">{project.description}</p>
                                </Link>
                                <div className="project-footer">
                                    <span className="project-task-count">{project.taskCount} tasks</span>
                                    <span className="project-updated-time">Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Project</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Project Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter project name"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Describe your project..."
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-input"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value as ProjectCategory })}
                                >
                                    <option value="tech">Tech Development</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="ops">Operations</option>
                                    <option value="personal">Personal Project</option>
                                </select>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
