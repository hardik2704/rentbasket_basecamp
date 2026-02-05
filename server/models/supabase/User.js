const bcrypt = require('bcryptjs');
const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * User Service - Supabase PostgreSQL implementation
 */
const User = {
    /**
     * Find a user by ID
     */
    async findById(id, includePassword = false) {
        const columns = includePassword
            ? '*'
            : 'id, email, name, role, avatar, login_streak, last_login, is_active, created_at, updated_at';

        const { data, error } = await supabase
            .from('users')
            .select(columns)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findById');
        return data ? User._formatUser(data) : null;
    },

    /**
     * Find a user by email
     */
    async findOne(query, includePassword = false) {
        const columns = includePassword
            ? '*'
            : 'id, email, name, role, avatar, login_streak, last_login, is_active, created_at, updated_at';

        let queryBuilder = supabase.from('users').select(columns);

        if (query.email) {
            queryBuilder = queryBuilder.eq('email', query.email.toLowerCase());
        }

        const { data, error } = await queryBuilder.single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findOne');
        return data ? User._formatUser(data, includePassword) : null;
    },

    /**
     * Find all users
     */
    async find(query = {}) {
        let queryBuilder = supabase
            .from('users')
            .select('id, email, name, role, avatar, login_streak, last_login, is_active, created_at, updated_at');

        if (query.isActive !== undefined) {
            queryBuilder = queryBuilder.eq('is_active', query.isActive);
        }

        const { data, error } = await queryBuilder.order('name');

        if (error) handleError(error, 'find');
        return (data || []).map(u => User._formatUser(u));
    },

    /**
     * Count all users
     */
    async countDocuments() {
        const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (error) handleError(error, 'countDocuments');
        return count || 0;
    },

    /**
     * Create a new user
     */
    async create(userData) {
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        const { data, error } = await supabase
            .from('users')
            .insert({
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                name: userData.name,
                role: userData.role || 'editor',
                avatar: userData.avatar || null,
                login_streak: userData.loginStreak || 0,
                last_login: userData.lastLogin || null,
                is_active: userData.isActive !== undefined ? userData.isActive : true
            })
            .select()
            .single();

        if (error) handleError(error, 'create');
        return User._formatUser(data);
    },

    /**
     * Update a user
     */
    async update(id, updates) {
        const updateData = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.email !== undefined) updateData.email = updates.email.toLowerCase();
        if (updates.role !== undefined) updateData.role = updates.role;
        if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
        if (updates.loginStreak !== undefined) updateData.login_streak = updates.loginStreak;
        if (updates.lastLogin !== undefined) updateData.last_login = updates.lastLogin;
        if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

        // Handle password update
        if (updates.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updates.password, salt);
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'update');
        return User._formatUser(data);
    },

    /**
     * Compare password
     */
    async comparePassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    },

    /**
     * Update login streak for a user
     */
    calculateLoginStreak(currentStreak, lastLogin) {
        const now = new Date();

        if (!lastLogin) {
            return { loginStreak: 1, lastLogin: now };
        }

        const lastLoginDate = new Date(lastLogin);
        const diffDays = Math.floor((now - lastLoginDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return { loginStreak: currentStreak + 1, lastLogin: now };
        } else if (diffDays > 1) {
            return { loginStreak: 1, lastLogin: now };
        }
        // Same day - no change to streak
        return { loginStreak: currentStreak, lastLogin: now };
    },

    /**
     * Format user object from database to API format
     */
    _formatUser(data, includePassword = false) {
        if (!data) return null;

        const user = {
            id: data.id,
            _id: data.id, // For backwards compatibility
            email: data.email,
            name: data.name,
            role: data.role,
            avatar: data.avatar,
            loginStreak: data.login_streak,
            lastLogin: data.last_login,
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        if (includePassword) {
            user.password = data.password;
        }

        return user;
    },

    /**
     * Get public profile (without sensitive data)
     */
    toPublicJSON(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            loginStreak: user.loginStreak,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt
        };
    }
};

module.exports = User;
