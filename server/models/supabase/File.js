const { supabase, handleError } = require('../../config/supabaseDb');

/**
 * File Service - Supabase PostgreSQL implementation
 * Note: File storage still uses the existing Supabase Storage (config/supabase.js)
 * This service handles file metadata in PostgreSQL
 */
const File = {
    /**
     * Get all files for a project
     */
    async getProjectFiles(projectId) {
        const { data, error } = await supabase
            .from('files')
            .select(`
                *,
                uploaded_by_user:users!files_uploaded_by_fkey(id, name, email, avatar)
            `)
            .eq('project_id', projectId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: false });

        if (error) handleError(error, 'getProjectFiles');
        return (data || []).map(f => File._formatFile(f));
    },

    /**
     * Find a file by ID
     */
    async findById(id) {
        const { data, error } = await supabase
            .from('files')
            .select(`
                *,
                uploaded_by_user:users!files_uploaded_by_fkey(id, name, email, avatar)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') handleError(error, 'findById');
        return data ? File._formatFile(data) : null;
    },

    /**
     * Create a new file record
     */
    async create(fileData) {
        const { data, error } = await supabase
            .from('files')
            .insert({
                project_id: fileData.project || fileData.projectId,
                name: fileData.name,
                original_name: fileData.originalName,
                description: fileData.description || '',
                url: fileData.url,
                storage_path: fileData.storagePath || null,
                storage_type: fileData.storageType || 'local',
                file_type: fileData.type,
                mime_type: fileData.mimeType,
                size: fileData.size,
                uploaded_by: fileData.uploadedBy
            })
            .select()
            .single();

        if (error) handleError(error, 'create');
        return await File.findById(data.id);
    },

    /**
     * Update a file record
     */
    async update(id, updates) {
        const updateData = {};

        if (updates.originalName !== undefined) updateData.original_name = updates.originalName;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.isDeleted !== undefined) updateData.is_deleted = updates.isDeleted;

        const { data, error } = await supabase
            .from('files')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'update');
        return await File.findById(id);
    },

    /**
     * Soft delete a file
     */
    async softDelete(id) {
        const { data, error } = await supabase
            .from('files')
            .update({ is_deleted: true })
            .eq('id', id)
            .select()
            .single();

        if (error) handleError(error, 'softDelete');
        return true;
    },

    /**
     * Get formatted file size
     */
    getFormattedSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Get file type category
     */
    getTypeCategory(mimeType) {
        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        const documentTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const spreadsheetTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

        if (imageTypes.includes(mimeType)) return 'image';
        if (documentTypes.includes(mimeType)) return 'document';
        if (spreadsheetTypes.includes(mimeType)) return 'spreadsheet';
        return 'other';
    },

    /**
     * Format file from database to API format
     */
    _formatFile(data) {
        if (!data) return null;

        const file = {
            id: data.id,
            _id: data.id,
            project: data.project_id,
            name: data.name,
            originalName: data.original_name,
            description: data.description,
            url: data.url,
            storagePath: data.storage_path,
            storageType: data.storage_type,
            type: data.file_type,
            mimeType: data.mime_type,
            size: data.size,
            uploadedBy: data.uploaded_by_user ? {
                _id: data.uploaded_by_user.id,
                id: data.uploaded_by_user.id,
                name: data.uploaded_by_user.name,
                email: data.uploaded_by_user.email,
                avatar: data.uploaded_by_user.avatar
            } : { _id: data.uploaded_by, id: data.uploaded_by },
            isDeleted: data.is_deleted,
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };

        // Add computed properties
        file.formattedSize = File.getFormattedSize(data.size);
        file.typeCategory = File.getTypeCategory(data.mime_type);

        // Add methods for compatibility
        file.getFormattedSize = () => file.formattedSize;
        file.getTypeCategory = () => file.typeCategory;

        return file;
    }
};

module.exports = File;
