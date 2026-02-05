import { Link } from 'react-router-dom';
import type { Project } from '../../types';
import './ProjectCard.css';

interface ProjectCardProps {
    project: Project;
    showActions?: boolean;
    onEdit?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

const categoryBadgeClasses: Record<string, string> = {
    tech: 'badge-tech',
    marketing: 'badge-marketing',
    ops: 'badge-ops',
    personal: 'badge-personal'
};

export function ProjectCard({ project, showActions, onEdit, onDelete }: ProjectCardProps) {
    const badgeClass = categoryBadgeClasses[project.category] || 'badge-tech';

    return (
        <div className={`project-card card category-${project.category}`}>
            <Link to={`/projects/${project.id}`} className="project-card-link">
                <div className="project-card-header">
                    <span className={`badge ${badgeClass}`}>
                        {project.category}
                    </span>
                </div>
                <h3 className="project-name">{project.name}</h3>
                <p className="project-description">{project.description}</p>
                <div className="project-meta">
                    <span>{project.taskCount || 0} tasks</span>
                    <span>{project.memberCount || 0} members</span>
                </div>
            </Link>
            {showActions && (onEdit || onDelete) && (
                <div className="project-card-actions">
                    {onEdit && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={(e) => { e.preventDefault(); onEdit(project); }}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            className="btn btn-ghost btn-sm text-danger"
                            onClick={(e) => { e.preventDefault(); onDelete(project); }}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
