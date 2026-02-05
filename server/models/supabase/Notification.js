const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * Notification Service - Supabase PostgreSQL implementation
 */
const Notification = {
    /**
     * Get notifications for a user with pagination
     */
    async getUserNotifications(userId, page = 1, limit = 20) {
        const offset = (page - 1) * limit;

        // Get notifications
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                project:projects(id, name),
                task:tasks(id, title),
                triggered_by_user:users!notifications_triggered_by_fkey(id, name, avatar)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) handleError(error, 'getUserNotifications');

        // Get total count
        const { count: total } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // Get unread count
        const { count: unreadCount } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        return {
            notifications: (data || []).map(n => Notification._formatNotification(n)),
            total: total || 0,
            unreadCount: unreadCount || 0,
            page,
            pages: Math.ceil((total || 0) / limit)
        };
    },

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) handleError(error, 'getUnreadCount');
        return count || 0;
    },

    /**
     * Find a notification by ID for a specific user
     */
    async findOne(query) {
        let queryBuilder = supabase
            .from('notifications')
            .select(`
                *,
                project:projects(id, name),
                task:tasks(id, title),
                triggered_by_user:users!notifications_triggered_by_fkey(id, name, avatar)
            `);

        if (query._id || query.id) {
            queryBuilder = queryBuilder.eq('id', query._id || query.id);
        }
        if (query.user) {
            queryBuilder = queryBuilder.eq('user_id', query.user);
        }

        const { data, error } = await queryBuilder.single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findOne');
        return data ? Notification._formatNotification(data) : null;
    },

    /**
     * Create a notification
     */
    async createNotification(notificationData) {
        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: notificationData.user,
                type: notificationData.type,
                title: notificationData.title,
                message: notificationData.message,
                project_id: notificationData.project || null,
                task_id: notificationData.task || null,
                triggered_by: notificationData.triggeredBy || null
            })
            .select()
            .single();

        if (error) handleError(error, 'createNotification');
        return Notification._formatNotification(data);
    },

    /**
     * Mark a notification as read
     */
    async markAsRead(id) {
        const { data, error } = await supabase
            .from('notifications')
            .update({
                read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'markAsRead');
        return Notification._formatNotification(data);
    },

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        const { data, error } = await supabase
            .from('notifications')
            .update({
                read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('read', false);

        if (error) handleError(error, 'markAllAsRead');
        return { modifiedCount: data?.length || 0 };
    },

    /**
     * Delete a notification
     */
    async findOneAndDelete(query) {
        let queryBuilder = supabase.from('notifications').delete();

        if (query._id || query.id) {
            queryBuilder = queryBuilder.eq('id', query._id || query.id);
        }
        if (query.user) {
            queryBuilder = queryBuilder.eq('user_id', query.user);
        }

        const { data, error } = await queryBuilder.select().single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findOneAndDelete');
        return data ? Notification._formatNotification(data) : null;
    },

    /**
     * Delete all notifications for a user
     */
    async deleteMany(query) {
        let queryBuilder = supabase.from('notifications').delete();

        if (query.user) {
            queryBuilder = queryBuilder.eq('user_id', query.user);
        }

        const { data, error } = await queryBuilder.select();

        if (error) handleError(error, 'deleteMany');
        return { deletedCount: data?.length || 0 };
    },

    /**
     * Count documents (for compatibility)
     */
    async countDocuments() {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true });

        if (error) handleError(error, 'countDocuments');
        return count || 0;
    },

    /**
     * Format notification from database to API format
     */
    _formatNotification(data) {
        if (!data) return null;

        return {
            id: data.id,
            _id: data.id,
            user: data.user_id,
            type: data.type,
            title: data.title,
            message: data.message,
            project: data.project ? {
                _id: data.project.id,
                id: data.project.id,
                name: data.project.name
            } : null,
            task: data.task ? {
                _id: data.task.id,
                id: data.task.id,
                title: data.task.title
            } : null,
            triggeredBy: data.triggered_by_user ? {
                _id: data.triggered_by_user.id,
                id: data.triggered_by_user.id,
                name: data.triggered_by_user.name,
                avatar: data.triggered_by_user.avatar
            } : null,
            read: data.read,
            readAt: data.read_at,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }
};

module.exports = Notification;
