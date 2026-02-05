const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * Project Service - Supabase PostgreSQL implementation
 */
const Project = {
    /**
     * Find all projects with optional filters
     */
    async find(query = {}) {
        let queryBuilder = supabase
            .from('projects')
            .select(`
                *,
                created_by_user:users!projects_created_by_fkey(id, name, email),
                project_members(
                    id,
                    role,
                    added_at,
                    user:users(id, name, email, avatar)
                )
            `);

        if (query.status) {
            queryBuilder = queryBuilder.eq('status', query.status);
        }
        if (query.category) {
            queryBuilder = queryBuilder.eq('category', query.category);
        }
        if (query.memberId) {
            // Filter by member - need to use a subquery approach
            const { data: memberProjects } = await supabase
                .from('project_members')
                .select('project_id')
                .eq('user_id', query.memberId);

            if (memberProjects && memberProjects.length > 0) {
                const projectIds = memberProjects.map(mp => mp.project_id);
                queryBuilder = queryBuilder.in('id', projectIds);
            } else {
                return []; // No projects for this member
            }
        }

        const { data, error } = await queryBuilder.order('updated_at', { ascending: false });

        if (error) handleError(error, 'find');
        return (data || []).map(p => Project._formatProject(p));
    },

    /**
     * Find a project by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('projects')
            .select(`
                *,
                created_by_user:users!projects_created_by_fkey(id, name, email),
                project_members(
                    id,
                    role,
                    added_at,
                    user:users(id, name, email, avatar)
                )
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findById');
        return data ? Project._formatProject(data) : null;
    },

    /**
     * Create a new project
     */
    async create(projectData) {
        // Create the project
        const { data: project, error: projectError } = await supabase
            .from('projects')
            .insert({
                name: projectData.name,
                description: projectData.description || '',
                category: projectData.category || 'tech',
                status: projectData.status || 'active',
                created_by: projectData.createdBy
            })
            .select()
            .single();

        if (projectError) handleError(projectError, 'create project');

        // Add creator as owner
        const { error: memberError } = await supabase
            .from('project_members')
            .insert({
                project_id: project.id,
                user_id: projectData.createdBy,
                role: 'owner'
            });

        if (memberError) handleError(memberError, 'add project owner');

        // Fetch with all relations
        return await Project.findById(project.id);
    },

    /**
     * Update a project
     */
    async update(id, updates) {
        const updateData = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.category !== undefined) updateData.category = updates.category;
        if (updates.status !== undefined) updateData.status = updates.status;

        const { data, error } = await supabase
            .from('projects')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'update');
        return await Project.findById(id);
    },

    /**
     * Delete a project (soft delete by changing status)
     */
    async softDelete(id) {
        const { data, error } = await supabase
            .from('projects')
            .update({ status: 'completed' })
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'softDelete');
        return await Project.findById(id);
    },

    /**
     * Add a member to project
     */
    async addMember(projectId, userId, role = 'member') {
        const { data, error } = await supabase
            .from('project_members')
            .insert({
                project_id: projectId,
                user_id: userId,
                role
            })
            .select()
            .single();

        if (error) handleError(error, 'addMember');
        return await Project.findById(projectId);
    },

    /**
     * Remove a member from project
     */
    async removeMember(projectId, userId) {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId);

        if (error) handleError(error, 'removeMember');
        return await Project.findById(projectId);
    },

    /**
     * Check if user is a member
     */
    async isMember(projectId, userId) {
        const { data, error } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'isMember');
        return !!data;
    },

    /**
     * Check if user is the owner
     */
    async isOwner(projectId, userId) {
        const { data, error } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .eq('role', 'owner')
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'isOwner');
        return !!data;
    },

    /**
     * Get member by userId from project
     */
    async getMember(projectId, userId) {
        const { data, error } = await supabase
            .from('project_members')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'getMember');
        return data;
    },

    /**
     * Format project from database to API format
     */
    _formatProject(data) {
        if (!data) return null;

        const members = (data.project_members || []).map(m => ({
            user: m.user ? {
                _id: m.user.id,
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                avatar: m.user.avatar
            } : null,
            role: m.role,
            addedAt: m.added_at
        }));

        return {
            id: data.id,
            _id: data.id,
            name: data.name,
            description: data.description,
            category: data.category,
            status: data.status,
            createdBy: data.created_by_user ? {
                _id: data.created_by_user.id,
                id: data.created_by_user.id,
                name: data.created_by_user.name,
                email: data.created_by_user.email
            } : { _id: data.created_by, id: data.created_by },
            members,
            createdAt: data.created_at,
            updatedAt: data.updated_at,

            // Methods for compatibility
            isMember(userId) {
                return members.some(m => m.user && m.user.id === userId);
            },
            isOwner(userId) {
                return members.some(m => m.user && m.user.id === userId && m.role === 'owner');
            },
            getMemberCount() {
                return members.length;
            }
        };
    }
};

module.exports = Project;
