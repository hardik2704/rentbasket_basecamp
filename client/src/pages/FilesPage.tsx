import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Upload,
    FolderOpen,
    File,
    FileText,
    Image,
    FileSpreadsheet,
    Download,
    Trash2,
    MoreVertical,
    Grid,
    List,
    Search,
    Plus,
    X,
    Eye,
    Edit2,
    ArrowLeft
} from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import './FilesPage.css';

// File type to icon mapping
const getFileIcon = (type: string) => {
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const documentTypes = ['pdf', 'doc', 'docx'];
    const spreadsheetTypes = ['xls', 'xlsx', 'csv'];

    if (imageTypes.includes(type.toLowerCase())) return Image;
    if (documentTypes.includes(type.toLowerCase())) return FileText;
    if (spreadsheetTypes.includes(type.toLowerCase())) return FileSpreadsheet;
    return File;
};

// Format file size
const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FilesPage() {
    const { projectId } = useParams<{ projectId?: string }>();
    const { projects, files, addFile, deleteFile } = useApp();
    const { isAdmin } = useAuth();
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState(projectId || '');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter files based on project and search
    const filteredFiles = files.filter(file => {
        const matchesProject = !selectedProject || file.projectId === selectedProject;
        const matchesSearch = !searchQuery ||
            file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            file.description?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesProject && matchesSearch;
    });

    // Group by project if no project selected
    const filesByProject = selectedProject ? null : projects.reduce((acc, project) => {
        const projectFiles = filteredFiles.filter(f => f.projectId === project.id);
        if (projectFiles.length > 0) {
            acc[project.id] = { project, files: projectFiles };
        }
        return acc;
    }, {} as Record<string, { project: any; files: any[] }>);

    // Handle drag and drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (fileList: FileList) => {
        // For now, just simulate upload with demo data
        // This will be replaced with actual API calls later
        const targetProject = selectedProject || projects[0]?.id;

        Array.from(fileList).forEach(file => {
            const extension = file.name.split('.').pop() || '';
            addFile({
                name: file.name,
                type: extension,
                size: file.size,
                projectId: targetProject,
                description: '',
                url: URL.createObjectURL(file) // Temp URL for preview
            });
        });

        setShowUploadModal(false);
    };

    const openPreview = (file: any) => {
        setSelectedFile(file);
        setShowPreviewModal(true);
    };

    const currentProject = projects.find(p => p.id === selectedProject);

    return (
        <div className="files-page">
            <Header
                title={currentProject ? `${currentProject.name} - Files` : 'All Files'}
                subtitle={`${filteredFiles.length} files`}
                actions={
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                        <Upload size={18} />
                        Upload Files
                    </button>
                }
            />

            <div className="files-content">
                {/* Toolbar */}
                <div className="files-toolbar">
                    <div className="toolbar-left">
                        {projectId && (
                            <Link to="/files" className="back-link">
                                <ArrowLeft size={18} />
                                All Files
                            </Link>
                        )}

                        {!projectId && (
                            <div className="project-filter">
                                <select
                                    value={selectedProject}
                                    onChange={(e) => setSelectedProject(e.target.value)}
                                    className="form-input"
                                >
                                    <option value="">All Projects</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="toolbar-center">
                        <div className="search-box">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button className="search-clear" onClick={() => setSearchQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="toolbar-right">
                        <div className="view-toggle">
                            <button
                                className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid size={18} />
                            </button>
                            <button
                                className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Files Display */}
                {filteredFiles.length === 0 ? (
                    <div className="empty-files">
                        <FolderOpen size={64} className="empty-icon" />
                        <h3>No files found</h3>
                        <p>Upload files to get started</p>
                        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                            <Upload size={18} />
                            Upload Files
                        </button>
                    </div>
                ) : viewMode === 'grid' ? (
                    /* Grid View */
                    selectedProject || !filesByProject ? (
                        <div className="files-grid">
                            {filteredFiles.map(file => (
                                <FileCard
                                    key={file.id}
                                    file={file}
                                    onPreview={() => openPreview(file)}
                                    onDelete={() => deleteFile(file.id)}
                                    isAdmin={isAdmin}
                                />
                            ))}
                        </div>
                    ) : (
                        /* Grouped by Project */
                        Object.values(filesByProject).map(({ project, files: projectFiles }) => (
                            <div key={project.id} className="project-file-group">
                                <div className="group-header">
                                    <Link to={`/projects/${project.id}/files`} className="group-title">
                                        <FolderOpen size={18} />
                                        {project.name}
                                    </Link>
                                    <span className="file-count">{projectFiles.length} files</span>
                                </div>
                                <div className="files-grid">
                                    {projectFiles.slice(0, 4).map(file => (
                                        <FileCard
                                            key={file.id}
                                            file={file}
                                            onPreview={() => openPreview(file)}
                                            onDelete={() => deleteFile(file.id)}
                                            isAdmin={isAdmin}
                                        />
                                    ))}
                                    {projectFiles.length > 4 && (
                                        <Link to={`/projects/${project.id}/files`} className="view-more-card">
                                            <Plus size={24} />
                                            <span>View {projectFiles.length - 4} more</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    /* List View */
                    <div className="files-list">
                        <table className="files-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Project</th>
                                    <th>Size</th>
                                    <th>Uploaded</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFiles.map(file => {
                                    const FileIcon = getFileIcon(file.type);
                                    const project = projects.find(p => p.id === file.projectId);
                                    return (
                                        <tr key={file.id}>
                                            <td className="file-name-cell">
                                                <FileIcon size={20} className={`file-icon ${file.type}`} />
                                                <span>{file.name}</span>
                                            </td>
                                            <td>{project?.name || 'Unknown'}</td>
                                            <td>{formatFileSize(file.size)}</td>
                                            <td>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</td>
                                            <td>
                                                <div className="row-actions">
                                                    <button className="action-btn" onClick={() => openPreview(file)} title="Preview">
                                                        <Eye size={16} />
                                                    </button>
                                                    <button className="action-btn" title="Download">
                                                        <Download size={16} />
                                                    </button>
                                                    {isAdmin && (
                                                        <button className="action-btn danger" onClick={() => deleteFile(file.id)} title="Delete">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                    <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Upload Files</h2>
                            <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {!selectedProject && (
                                <div className="form-group">
                                    <label className="form-label">Select Project</label>
                                    <select
                                        className="form-input"
                                        value={selectedProject}
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                    >
                                        <option value="">Choose a project...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div
                                className={`drop-zone ${dragActive ? 'active' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload size={48} className="drop-icon" />
                                <p className="drop-text">Drag and drop files here</p>
                                <p className="drop-subtext">or click to browse</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileInput}
                                    className="file-input-hidden"
                                />
                            </div>

                            <div className="upload-info">
                                <p>Supported: Images, PDFs, Documents, Spreadsheets</p>
                                <p>Max file size: 10MB</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && selectedFile && (
                <FilePreviewModal
                    file={selectedFile}
                    onClose={() => setShowPreviewModal(false)}
                    projects={projects}
                />
            )}
        </div>
    );
}

// File Card Component
interface FileCardProps {
    file: any;
    onPreview: () => void;
    onDelete: () => void;
    isAdmin: boolean;
}

function FileCard({ file, onPreview, onDelete, isAdmin }: FileCardProps) {
    const [showMenu, setShowMenu] = useState(false);
    const FileIcon = getFileIcon(file.type);
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(file.type.toLowerCase());

    return (
        <div className="file-card">
            <div className="file-preview" onClick={onPreview}>
                {isImage && file.url ? (
                    <img src={file.url} alt={file.name} className="preview-image" />
                ) : (
                    <div className="preview-icon">
                        <FileIcon size={48} />
                    </div>
                )}
            </div>

            <div className="file-info">
                <span className="file-name" title={file.name}>{file.name}</span>
                <span className="file-meta">
                    {formatFileSize(file.size)} • {file.type.toUpperCase()}
                </span>
            </div>

            <div className="file-actions">
                <button className="action-btn" onClick={() => setShowMenu(!showMenu)}>
                    <MoreVertical size={16} />
                </button>
                {showMenu && (
                    <div className="action-menu">
                        <button onClick={onPreview}>
                            <Eye size={14} /> Preview
                        </button>
                        <button>
                            <Download size={14} /> Download
                        </button>
                        <button>
                            <Edit2 size={14} /> Edit Info
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
    );
}

// File Preview Modal
interface FilePreviewModalProps {
    file: any;
    onClose: () => void;
    projects: any[];
}

function FilePreviewModal({ file, onClose, projects }: FilePreviewModalProps) {
    const project = projects.find(p => p.id === file.projectId);
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.type.toLowerCase());
    const isPDF = file.type.toLowerCase() === 'pdf';

    return (
        <div className="modal-overlay preview-overlay" onClick={onClose}>
            <div className="preview-modal" onClick={e => e.stopPropagation()}>
                <div className="preview-header">
                    <div className="preview-title">
                        <h2>{file.name}</h2>
                        <span className="preview-project">{project?.name}</span>
                    </div>
                    <div className="preview-actions">
                        <button className="btn btn-secondary">
                            <Download size={18} />
                            Download
                        </button>
                        <button className="modal-close" onClick={onClose}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="preview-content">
                    {isImage ? (
                        <img src={file.url} alt={file.name} className="full-preview-image" />
                    ) : isPDF ? (
                        <div className="pdf-preview">
                            <FileText size={64} />
                            <p>PDF Preview</p>
                            <span className="placeholder-text">(PDF viewer will be integrated with backend)</span>
                        </div>
                    ) : (
                        <div className="generic-preview">
                            {React.createElement(getFileIcon(file.type), { size: 64 })}
                            <p>{file.type.toUpperCase()} File</p>
                            <span className="placeholder-text">Preview not available for this file type</span>
                        </div>
                    )}
                </div>

                <div className="preview-sidebar">
                    <h3>File Details</h3>
                    <dl className="file-details">
                        <dt>Type</dt>
                        <dd>{file.type.toUpperCase()}</dd>
                        <dt>Size</dt>
                        <dd>{formatFileSize(file.size)}</dd>
                        <dt>Uploaded</dt>
                        <dd>{formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}</dd>
                        <dt>Project</dt>
                        <dd>{project?.name || 'Unknown'}</dd>
                    </dl>

                    {file.description && (
                        <>
                            <h3>Description</h3>
                            <p className="file-description">{file.description}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
