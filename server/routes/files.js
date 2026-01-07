const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { File, Project } = require('../models');
const { protect } = require('../middleware');
const supabaseStorage = require('../config/supabase');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Use memory storage if Supabase is configured, disk storage otherwise
const storage = supabaseStorage.isConfigured()
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
            const uploadPath = process.env.UPLOAD_PATH || './uploads';
            if (!fs.existsSync(uploadPath)) {
                fs.mkdirSync(uploadPath, { recursive: true });
            }
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    });

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024
    }
});

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

        const files = await File.getProjectFiles(req.params.projectId);

        // Generate signed URLs for Supabase files
        const filesWithUrls = await Promise.all(files.map(async (f) => {
            const fileObj = {
                ...f.toObject(),
                id: f._id,
                formattedSize: f.getFormattedSize(),
                typeCategory: f.getTypeCategory()
            };

            // If stored in Supabase and URL is a path, get signed URL
            if (supabaseStorage.isConfigured() && f.storagePath) {
                try {
                    fileObj.url = await supabaseStorage.getSignedUrl(f.storagePath);
                } catch (e) {
                    console.error('Error getting signed URL:', e);
                }
            }

            return fileObj;
        }));

        res.json({
            success: true,
            count: files.length,
            data: filesWithUrls
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
        const file = await File.findById(req.params.id)
            .populate('uploadedBy', 'name email avatar');

        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const fileObj = {
            ...file.toObject(),
            id: file._id,
            formattedSize: file.getFormattedSize(),
            typeCategory: file.getTypeCategory()
        };

        // Get signed URL for Supabase files
        if (supabaseStorage.isConfigured() && file.storagePath) {
            try {
                fileObj.url = await supabaseStorage.getSignedUrl(file.storagePath);
            } catch (e) {
                console.error('Error getting signed URL:', e);
            }
        }

        res.json({
            success: true,
            data: fileObj
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/files/upload
// @desc    Upload a file
// @access  Private
router.post('/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const { projectId, description } = req.body;

        if (!projectId) {
            // Clean up if projectId missing
            if (req.file.path) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                success: false,
                error: 'Project ID is required'
            });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            if (req.file.path) fs.unlinkSync(req.file.path);
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const uniqueName = `${uuidv4()}${path.extname(req.file.originalname)}`;
        let fileUrl, storagePath;

        // Upload to Supabase if configured, otherwise use local storage
        if (supabaseStorage.isConfigured()) {
            try {
                const result = await supabaseStorage.uploadFile(
                    req.file.buffer,
                    uniqueName,
                    req.file.mimetype
                );
                fileUrl = result.url;
                storagePath = result.path;
            } catch (uploadError) {
                return res.status(500).json({
                    success: false,
                    error: `Upload failed: ${uploadError.message}`
                });
            }
        } else {
            // Local storage - file is already saved by multer
            fileUrl = `/uploads/${req.file.filename}`;
            storagePath = null;
        }

        const file = await File.create({
            project: projectId,
            name: supabaseStorage.isConfigured() ? uniqueName : req.file.filename,
            originalName: req.file.originalname,
            description: description || '',
            url: fileUrl,
            storagePath: storagePath,
            storageType: supabaseStorage.isConfigured() ? 'supabase' : 'local',
            type: path.extname(req.file.originalname).slice(1),
            mimeType: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user._id
        });

        await file.populate('uploadedBy', 'name email avatar');

        res.status(201).json({
            success: true,
            data: {
                ...file.toObject(),
                id: file._id,
                formattedSize: file.getFormattedSize(),
                typeCategory: file.getTypeCategory()
            }
        });
    } catch (error) {
        // Clean up on error
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        next(error);
    }
});

// @route   PUT /api/files/:id
// @desc    Update file info (name, description)
// @access  Private
router.put('/:id', async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file || file.isDeleted) {
            return res.status(404).json({
                success: false,
                error: 'File not found'
            });
        }

        const { name, description } = req.body;

        if (name) file.originalName = name;
        if (description !== undefined) file.description = description;

        await file.save();
        await file.populate('uploadedBy', 'name email avatar');

        res.json({
            success: true,
            data: {
                ...file.toObject(),
                id: file._id,
                formattedSize: file.getFormattedSize(),
                typeCategory: file.getTypeCategory()
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file
// @access  Private (uploader or admin)
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
        if (file.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this file'
            });
        }

        // Delete from cloud storage if applicable
        if (file.storageType === 'supabase' && file.storagePath && supabaseStorage.isConfigured()) {
            try {
                await supabaseStorage.deleteFile(file.storagePath);
            } catch (e) {
                console.error('Error deleting from Supabase:', e);
            }
        }

        // Soft delete
        file.isDeleted = true;
        await file.save();

        res.json({
            success: true,
            message: 'File deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
