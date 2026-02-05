const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * Task Service - Supabase PostgreSQL implementation
 */
const Task = {
    /**
     * Find all tasks with optional filters
     */
    async find(query = {}) {
        let queryBuilder = supabase
            .from('tasks')
            .select(`
                *,
                project:projects(id, name, category),
                assigned_to_user:users!tasks_assigned_to_fkey(id, name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, name, email)
            `);

        if (query.project) {
            queryBuilder = queryBuilder.eq('project_id', query.project);
        }
        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }
        if (query.assignedTo) {
            queryBuilder = queryBuilder.eq('assigned_to', query.assignedTo);
        }
        if (query.dueDate) {
            queryBuilder = queryBuilder.lte('due_date', query.dueDate);
        }
        if (query.statusNot) {
            queryBuilder = queryBuilder.neq('status', query.statusNot);
        }

        const { data, error } = await queryBuilder
            .order('order_index')
            .order('created_at', { ascending: false });

        if (error) handleError(error, 'find');
        return (data || []).map(t => Task._formatTask(t));
    },

    /**
     * Find a task by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('tasks')
            .select(`
                *,
                project:projects(id, name, category),
                assigned_to_user:users!tasks_assigned_to_fkey(id, name, email, avatar),
                created_by_user:users!tasks_created_by_fkey(id, name, email)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findById');
        return data ? Task._formatTask(data) : null;
    },

    /**
     * Get tasks grouped by status for a project
     */
    async getByStatus(projectId) {
        const tasks = await Task.find({ project: projectId });

        return {
            new: tasks.filter(t => t.status === 'new'),
            in_progress: tasks.filter(t => t.status === 'in_progress'),
            done: tasks.filter(t => t.status === 'done')
        };
    },

    /**
     * Count tasks
     */
    async countDocuments(query = {}) {
        let countQuery = supabase.from('tasks').select('*', { count: 'exact', head: true });

        if (query.project) {
            countQuery = countQuery.eq('project_id', query.project);
        }
        if (query.status) {
            countQuery = countQuery.eq('status', query.status);
        }

        const { count, error } = await countQuery;

        if (error) handleError(error, 'countDocuments');
        return count || 0;
    },

    /**
     * Create a new task
     */
    async create(taskData) {
        const insertData = {
            project_id: taskData.project || taskData.projectId,
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'new',
            priority: taskData.priority || 'medium',
            assigned_to: taskData.assignedTo || null,
            due_date: taskData.dueDate || null,
            created_by: taskData.createdBy,
            order_index: taskData.order || 0,
            tags: taskData.tags || []
        };

        // Set completed_at if status is done
        if (insertData.status === 'done') {
            insertData.completed_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('tasks')
            .insert(insertData)
            .select()
            .single();

        if (error) handleError(error, 'create');
        return await Task.findById(data.id);
    },

    /**
     * Update a task
     */
    async update(id, updates) {
        // First get the current task to check status change
        const currentTask = await Task.findById(id);

        const updateData = {};

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.status !== undefined) {
            updateData.status = updates.status;
            // Handle completed_at
            if (updates.status === 'done' && currentTask.status !== 'done') {
                updateData.completed_at = new Date().toISOString();
            } else if (updates.status !== 'done') {
                updateData.completed_at = null;
            }
        }
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo || null;
        if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
        if (updates.order !== undefined) updateData.order_index = updates.order;
        if (updates.tags !== undefined) updateData.tags = updates.tags;

        const { data, error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'update');
        return await Task.findById(id);
    },

    /**
     * Delete a task
     */
    async delete(id) {
        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

        if (error) handleError(error, 'delete');
        return true;
    },

    /**
     * Format task from database to API format
     */
    _formatTask(data) {
        if (!data) return null;

        return {
            id: data.id,
            _id: data.id,
            project: data.project ? {
                _id: data.project.id,
                id: data.project.id,
                name: data.project.name,
                category: data.project.category
            } : { _id: data.project_id, id: data.project_id },
            title: data.title,
            description: data.description,
            status: data.status,
            priority: data.priority,
            assignedTo: data.assigned_to_user ? {
                _id: data.assigned_to_user.id,
                id: data.assigned_to_user.id,
                name: data.assigned_to_user.name,
                email: data.assigned_to_user.email,
                avatar: data.assigned_to_user.avatar
            } : null,
            dueDate: data.due_date,
            completedAt: data.completed_at,
            createdBy: data.created_by_user ? {
                _id: data.created_by_user.id,
                id: data.created_by_user.id,
                name: data.created_by_user.name,
                email: data.created_by_user.email
            } : { _id: data.created_by, id: data.created_by },
            order: data.order_index,
            tags: data.tags || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,

            // Methods for compatibility
            isOverdue() {
                if (!data.due_date || data.status === 'done') return false;
                return new Date() > new Date(data.due_date);
            }
        };
    }
};

module.exports = Task;
