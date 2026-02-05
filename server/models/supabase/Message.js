const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * Message Service - Supabase PostgreSQL implementation
 */
const Message = {
    /**
     * Get messages for a project with pagination
     */
    async getProjectMessages(projectId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;

        // Get messages
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, name, email, avatar)
            `)
            .eq('project_id', projectId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) handleError(error, 'getProjectMessages');

        // Get total count
        const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('is_deleted', false);

        if (countError) handleError(countError, 'getProjectMessages count');

        // Format and reverse to get chronological order
        const messages = (data || []).map(m => Message._formatMessage(m)).reverse();

        return {
            messages,
            total: count || 0,
            page,
            pages: Math.ceil((count || 0) / limit)
        };
    },

    /**
     * Find a message by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:users!messages_sender_id_fkey(id, name, email, avatar)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findById');
        return data ? Message._formatMessage(data) : null;
    },

    /**
     * Create a new message
     */
    async create(messageData) {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                project_id: messageData.project || messageData.projectId,
                sender_id: messageData.sender || messageData.senderId,
                content: messageData.content,
                mentions: messageData.mentions || [],
                attachments: messageData.attachments || []
            })
            .select()
            .single();

        if (error) handleError(error, 'create');
        return await Message.findById(data.id);
    },

    /**
     * Update a message
     */
    async update(id, updates) {
        const updateData = {};

        if (updates.content !== undefined) {
            updateData.content = updates.content;
            updateData.is_edited = true;
            updateData.edited_at = new Date().toISOString();
        }
        if (updates.mentions !== undefined) updateData.mentions = updates.mentions;
        if (updates.isDeleted !== undefined) {
            updateData.is_deleted = updates.isDeleted;
            if (updates.isDeleted) {
                updateData.content = 'This message has been deleted';
            }
        }

        const { data, error } = await supabase
            .from('messages')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'update');
        return await Message.findById(id);
    },

    /**
     * Parse mentions from content
     */
    parseMentions(content, users) {
        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;

        while ((match = mentionRegex.exec(content)) !== null) {
            const username = match[1].toLowerCase();
            const user = users.find(u =>
                u.name.toLowerCase().includes(username) ||
                u.email.toLowerCase().split('@')[0].includes(username)
            );
            if (user && !mentions.includes(user.id)) {
                mentions.push(user.id);
            }
        }

        return mentions;
    },

    /**
     * Format message from database to API format
     */
    _formatMessage(data) {
        if (!data) return null;

        return {
            id: data.id,
            _id: data.id,
            project: data.project_id,
            sender: data.sender ? {
                _id: data.sender.id,
                id: data.sender.id,
                name: data.sender.name,
                email: data.sender.email,
                avatar: data.sender.avatar
            } : { _id: data.sender_id, id: data.sender_id },
            content: data.content,
            mentions: data.mentions || [],
            attachments: data.attachments || [],
            isEdited: data.is_edited,
            editedAt: data.edited_at,
            isDeleted: data.is_deleted,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
};

module.exports = Message;
