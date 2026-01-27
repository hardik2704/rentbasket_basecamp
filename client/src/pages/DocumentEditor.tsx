import { useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save,
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Heading1,
    Heading2,
    Quote,
    Code,
    Undo,
    Redo,
    FileText,
    Clock
} from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import './DocumentEditor.css';

export function DocumentEditor() {
    const { documentId } = useParams<{ documentId?: string }>();
    const navigate = useNavigate();
    const { projects, documents, addDocument, updateDocument } = useApp();
    const { user } = useAuth();
    const editorRef = useRef<HTMLDivElement>(null);

    const existingDoc = documentId ? documents.find(d => d.id === documentId) : null;

    const [title, setTitle] = useState(existingDoc?.title || '');
    const [selectedProject, setSelectedProject] = useState(existingDoc?.projectId || projects[0]?.id || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(existingDoc ? new Date(existingDoc.updatedAt) : null);

    // Execute formatting command
    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    }, []);

    // Format buttons config
    const formatButtons = [
        { icon: Bold, command: 'bold', title: 'Bold (Ctrl+B)' },
        { icon: Italic, command: 'italic', title: 'Italic (Ctrl+I)' },
        { icon: Underline, command: 'underline', title: 'Underline (Ctrl+U)' },
        { divider: true },
        { icon: Heading1, command: 'formatBlock', value: 'h1', title: 'Heading 1' },
        { icon: Heading2, command: 'formatBlock', value: 'h2', title: 'Heading 2' },
        { divider: true },
        { icon: List, command: 'insertUnorderedList', title: 'Bullet List' },
        { icon: ListOrdered, command: 'insertOrderedList', title: 'Numbered List' },
        { divider: true },
        { icon: AlignLeft, command: 'justifyLeft', title: 'Align Left' },
        { icon: AlignCenter, command: 'justifyCenter', title: 'Align Center' },
        { icon: AlignRight, command: 'justifyRight', title: 'Align Right' },
        { divider: true },
        { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Quote' },
        { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code Block' },
        { divider: true },
        { icon: LinkIcon, command: 'createLink', prompt: true, title: 'Insert Link' },
    ];

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Please enter a document title');
            return;
        }

        setIsSaving(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const content = editorRef.current?.innerHTML || '';

        if (existingDoc) {
            updateDocument(existingDoc.id, {
                title,
                content,
                projectId: selectedProject
            });
        } else {
            addDocument({
                title,
                content,
                projectId: selectedProject,
                createdBy: user?.id || ''
            });
        }

        setLastSaved(new Date());
        setIsSaving(false);
    };

    const handleLinkInsert = () => {
        const url = prompt('Enter URL:');
        if (url) {
            execCommand('createLink', url);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Save on Ctrl+S
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div className="document-editor-page">
            <Header
                title={existingDoc ? 'Edit Document' : 'New Document'}
                subtitle={lastSaved ? `Last saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}` : 'Not saved yet'}
                actions={
                    <div className="header-actions">
                        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                            Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            <Save size={18} />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                }
            />

            <div className="editor-container">
                {/* Document Meta */}
                <div className="editor-meta">
                    <input
                        type="text"
                        className="document-title-input"
                        placeholder="Document title..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <div className="meta-row">
                        <div className="meta-item">
                            <label>Project:</label>
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="form-input project-select"
                            >
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {lastSaved && (
                            <div className="meta-item save-status">
                                <Clock size={14} />
                                <span>Saved {formatDistanceToNow(lastSaved, { addSuffix: true })}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                <div className="editor-toolbar">
                    <button className="toolbar-btn" onClick={() => execCommand('undo')} title="Undo">
                        <Undo size={18} />
                    </button>
                    <button className="toolbar-btn" onClick={() => execCommand('redo')} title="Redo">
                        <Redo size={18} />
                    </button>

                    <div className="toolbar-divider" />

                    {formatButtons.map((btn, idx) =>
                        btn.divider ? (
                            <div key={idx} className="toolbar-divider" />
                        ) : (
                            <button
                                key={idx}
                                className="toolbar-btn"
                                onClick={() => btn.prompt ? handleLinkInsert() : execCommand(btn.command!, btn.value)}
                                title={btn.title}
                            >
                                {btn.icon && <btn.icon size={18} />}
                            </button>
                        )
                    )}
                </div>

                {/* Editor */}
                <div
                    ref={editorRef}
                    className="editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    onKeyDown={handleKeyDown}
                    dangerouslySetInnerHTML={{ __html: existingDoc?.content || '<p>Start writing your document...</p>' }}
                />

                {/* Footer with tips */}
                <div className="editor-footer">
                    <span className="tip">💡 Tip: Use Ctrl+S to save, Ctrl+B for bold, Ctrl+I for italic</span>
                    <span className="placeholder-note">
                        (Rich text editor - will sync with backend when connected)
                    </span>
                </div>
            </div>
        </div>
    );
}

// Documents List Page
export function DocumentsPage() {
    const { projects, documents, deleteDocument } = useApp();
    const { isAdmin } = useAuth();
    const [selectedProject, setSelectedProject] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const filteredDocs = documents.filter(doc => {
        const matchesProject = !selectedProject || doc.projectId === selectedProject;
        const matchesSearch = !searchQuery ||
            doc.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesProject && matchesSearch;
    });

    return (
        <div className="documents-page">
            <Header
                title="Documents"
                subtitle={`${documents.length} documents`}
                actions={
                    <Link to="/documents/new" className="btn btn-primary">
                        <FileText size={18} />
                        New Document
                    </Link>
                }
            />

            <div className="documents-content">
                {/* Filters */}
                <div className="documents-filters">
                    <div className="filter-group">
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

                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {/* Documents List */}
                {filteredDocs.length === 0 ? (
                    <div className="empty-documents">
                        <FileText size={64} className="empty-icon" />
                        <h3>No documents found</h3>
                        <p>Create your first document to get started</p>
                        <Link to="/documents/new" className="btn btn-primary">
                            <FileText size={18} />
                            New Document
                        </Link>
                    </div>
                ) : (
                    <div className="documents-list">
                        {filteredDocs.map(doc => {
                            const project = projects.find(p => p.id === doc.projectId);
                            return (
                                <div key={doc.id} className="document-card">
                                    <Link to={`/documents/${doc.id}`} className="document-link">
                                        <div className="document-icon">
                                            <FileText size={24} />
                                        </div>
                                        <div className="document-info">
                                            <h3 className="document-title">{doc.title}</h3>
                                            <div className="document-meta">
                                                <span className="project-name">{project?.name}</span>
                                                <span className="separator">•</span>
                                                <span className="updated-at">
                                                    Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            {doc.content && (
                                                <p className="document-preview">
                                                    {doc.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                    {isAdmin && (
                                        <button
                                            className="delete-btn"
                                            onClick={() => {
                                                if (confirm('Delete this document?')) {
                                                    deleteDocument(doc.id);
                                                }
                                            }}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
