const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const { File, Project } = require('../models');
const { protect } = require('../middleware');
const supabaseStorage = require('../config/supabase');

const router = express.Router();

// Multer config for memory storage (for Supabase upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    }
});

// All routes require authentication
router.use(protect);

// @route   GET /api/files/project/:projectId
// @desc    Get all files for a project
// @access  Private
router.get('/project/:projectId', async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check membership for non-admin
        if (req.user.role !== 'admin' && !project.isMember(req.user.id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to view files in this project'
            });
        }

        const files = await File.getProjectFiles(req.params.projectId);

        res.json({
            success: true,
            count: files.length,
            data: files
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/files/:id
// @desc    Get single file info
// @access  Private
router.get('/:id', async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // If it's a Supabase file, get a signed URL
        if (file.storageType === 'supabase' && file.storagePath) {
            try {
                const signedUrl = await supabaseStorage.getSignedUrl(file.storagePath);
                file.signedUrl = signedUrl;
            } catch (err) {
                console.error('Failed to get signed URL:', err.message);
            }
        }

        res.json({
            success: true,
            data: file
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/files
// @desc    Upload a file
// @access  Private
router.post('/', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { projectId, description } = req.body;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }

        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        let fileData;

        // Use Supabase storage if configured
        if (supabaseStorage.isConfigured()) {
            const uniqueName = `${Date.now()}-${req.file.originalname}`;
            const uploadResult = await supabaseStorage.uploadFile(
                req.file.buffer,
                uniqueName,
                req.file.mimetype
            );

            fileData = {
                project: projectId,
                name: uniqueName,
                originalName: req.file.originalname,
                description: description || '',
                url: uploadResult.url,
                storagePath: uploadResult.path,
                storageType: 'supabase',
                type: path.extname(req.file.originalname).slice(1) || 'file',
                mimeType: req.file.mimetype,
                size: req.file.size,
                uploadedBy: req.user.id
            };
        } else {
            // Fallback to local storage info (no actual file saved in this version)
            return res.status(500).json({
                success: false,
                error: 'File storage is not configured. Please configure Supabase.'
            });
        }

        const file = await File.create(fileData);

        // Emit socket event
        const io = req.app.get('io');
        io.to(`project:${projectId}`).emit('file_uploaded', file);

        res.status(201).json({
            success: true,
            data: file
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/files/:id
// @desc    Update file info
// @access  Private
router.put('/:id', [
    body('originalName').optional().trim(),
    body('description').optional().trim()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Only uploader or admin can edit
        const uploaderId = file.uploadedBy?.id || file.uploadedBy?._id;
        if (uploaderId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to edit this file'
            });
        }

        const { originalName, description } = req.body;
        const updates = {};

        if (originalName) updates.originalName = originalName;
        if (description !== undefined) updates.description = description;

        const updatedFile = await File.update(req.params.id, updates);

        res.json({
            success: true,
            data: updatedFile
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file
// @access  Private
router.delete('/:id', async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        // Only uploader or admin can delete
        const uploaderId = file.uploadedBy?.id || file.uploadedBy?._id;
        if (uploaderId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this file'
            });
        }

        // Delete from Supabase storage if applicable
        if (file.storageType === 'supabase' && file.storagePath) {
            try {
                await supabaseStorage.deleteFile(file.storagePath);
            } catch (err) {
                console.error('Failed to delete from Supabase:', err.message);
                // Continue with soft delete even if storage deletion fails
            }
        }

        // Soft delete in database
        await File.softDelete(req.params.id);

        res.json({
            success: true,
            message: 'File deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
