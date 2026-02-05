import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, AtSign } from 'lucide-react';
import { Header } from '../components/layout';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { format, isToday, isYesterday } from 'date-fns';
import './ChatPage.css';

export function ChatPage() {
    const { projects, getProjectMessages, addMessage, users } = useApp();
    const { user } = useAuth();
    const [projectStatusFilter, setProjectStatusFilter] = useState<'active' | 'completed'>('active');
    const [selectedProject, setSelectedProject] = useState(projects[0]?.id || '');
    const [messageText, setMessageText] = useState('');
    const [showMentions, setShowMentions] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Filter projects by status
    const filteredProjects = projects.filter(p => {
        if (projectStatusFilter === 'active') {
            return p.status === 'active' || !p.status;
        }
        return p.status === 'completed' || p.status === 'archived';
    });

    const messages = selectedProject ? getProjectMessages(selectedProject) : [];
    const currentProject = projects.find(p => p.id === selectedProject);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim() || !selectedProject || !user) return;

        // Parse @mentions
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match: RegExpExecArray | null;
        while ((match = mentionRegex.exec(messageText)) !== null) {
            const mentionedUser = users.find(u =>
                u.name.toLowerCase().includes(match![1].toLowerCase())
            );
            if (mentionedUser) mentions.push(mentionedUser.id);
        }

        addMessage({
            projectId: selectedProject,
            userId: user.id,
            userName: user.name,
            content: messageText,
            mentions: mentions.length > 0 ? mentions : undefined
        });

        setMessageText('');
    };

    const insertMention = (userName: string) => {
        setMessageText(prev => prev + `@${userName.split(' ')[0]} `);
        setShowMentions(false);
    };

    const formatMessageTime = (timestamp: string) => {
        const date = new Date(timestamp);
        if (isToday(date)) {
            return format(date, 'h:mm a');
        } else if (isYesterday(date)) {
            return 'Yesterday ' + format(date, 'h:mm a');
        }
        return format(date, 'MMM d, h:mm a');
    };

    const highlightMentions = (content: string) => {
        return content.replace(
            /@(\w+)/g,
            '<span class="mention">@$1</span>'
        );
    };

    return (
        <div className="chat-page">
            <Header
                title="Team Chat"
                subtitle={currentProject ? `#${currentProject.name}` : 'Select a project'}
            />

            <div className="chat-container">
                {/* Project Channels */}
                <aside className="channels-sidebar">
                    <div className="channels-header">
                        <h3>Channels</h3>
                        <div className="channel-status-filters">
                            <button
                                className={`channel-filter-btn ${projectStatusFilter === 'active' ? 'active' : ''}`}
                                onClick={() => setProjectStatusFilter('active')}
                            >
                                Active
                            </button>
                            <button
                                className={`channel-filter-btn ${projectStatusFilter === 'completed' ? 'active' : ''}`}
                                onClick={() => setProjectStatusFilter('completed')}
                            >
                                Completed
                            </button>
                        </div>
                    </div>
                    <ul className="channel-list">
                        {filteredProjects.length === 0 ? (
                            <li className="no-channels">
                                No {projectStatusFilter} projects
                            </li>
                        ) : (
                            filteredProjects.map(project => (
                                <li key={project.id}>
                                    <button
                                        className={`channel-btn ${selectedProject === project.id ? 'active' : ''}`}
                                        onClick={() => setSelectedProject(project.id)}
                                    >
                                        <span className="channel-hash">#</span>
                                        <span className="channel-name">{project.name}</span>
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>

                    <div className="team-section">
                        <h3>Team</h3>
                        <ul className="team-list">
                            {users.map(u => (
                                <li key={u.id} className="team-member">
                                    <div className="avatar avatar-sm">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span>{u.name}</span>
                                    {u.id === user?.id && <span className="you-badge">you</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Chat Area */}
                <main className="chat-main">
                    {selectedProject ? (
                        <>
                            <div className="messages-container">
                                {messages.length === 0 ? (
                                    <div className="empty-chat">
                                        <h3>No messages yet</h3>
                                        <p>Be the first to start the conversation in #{currentProject?.name}!</p>
                                    </div>
                                ) : (
                                    messages.map(message => (
                                        <div
                                            key={message.id}
                                            className={`message ${message.userId === user?.id ? 'own' : ''}`}
                                        >
                                            <div className="avatar">
                                                {message.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="message-content">
                                                <div className="message-header">
                                                    <span className="message-author">{message.userName}</span>
                                                    <span className="message-time">{formatMessageTime(message.timestamp)}</span>
                                                </div>
                                                <p
                                                    className="message-text"
                                                    dangerouslySetInnerHTML={{ __html: highlightMentions(message.content) }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            <form className="message-form" onSubmit={handleSendMessage}>
                                <div className="message-input-wrapper">
                                    <button
                                        type="button"
                                        className="input-action-btn"
                                        onClick={() => setShowMentions(!showMentions)}
                                    >
                                        <AtSign size={18} />
                                    </button>

                                    {showMentions && (
                                        <div className="mentions-dropdown">
                                            {users.map(u => (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    className="mention-option"
                                                    onClick={() => insertMention(u.name)}
                                                >
                                                    <div className="avatar avatar-sm">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span>{u.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <input
                                        type="text"
                                        placeholder={`Message #${currentProject?.name}...`}
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        className="message-input"
                                    />

                                    <button type="button" className="input-action-btn">
                                        <Smile size={18} />
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="send-btn btn btn-primary"
                                    disabled={!messageText.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="no-channel">
                            <h3>Select a channel</h3>
                            <p>Choose a project channel from the sidebar to start chatting.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
