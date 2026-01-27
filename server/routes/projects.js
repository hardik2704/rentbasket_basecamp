const express = require('express');
const { body, validationResult } = require('express-validator');
const { Project, Task, Notification } = require('../models');
const { protect, authorize } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/projects
// @desc    Get all projects for user
// @access  Private
router.get('/', async (req, res, next) => {
    try {
        const { status, category } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        // For non-admin users, only show projects they're members of
        if (req.user.role !== 'admin') {
            query['members.user'] = req.user._id;
        }

        const projects = await Project.find(query)
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email avatar')
            .sort({ updatedAt: -1 });

        // Get task counts for each project
        const projectsWithCounts = await Promise.all(
            projects.map(async (project) => {
                const taskCount = await Task.countDocuments({ project: project._id });
                const completedCount = await Task.countDocuments({
                    project: project._id,
                    status: 'done'
                });

                return {
                    ...project.toObject(),
                    id: project._id,
                    taskCount,
                    completedCount,
                    memberCount: project.members.length
                };
            })
        );

        res.json({
            success: true,
            count: projectsWithCounts.length,
            data: projectsWithCounts
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('members.user', 'name email avatar');

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check access for non-admin
        if (req.user.role !== 'admin' && !project.isMember(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to access this project'
            });
        }

        // Get task counts
        const taskCount = await Task.countDocuments({ project: project._id });
        const tasksByStatus = await Task.getByStatus(project._id);

        res.json({
            success: true,
            data: {
                ...project.toObject(),
                id: project._id,
                taskCount,
                tasksByStatus,
                memberCount: project.members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private/Admin
router.post('/', authorize('admin'), [
    body('name').trim().notEmpty().withMessage('Project name is required'),
    body('description').optional().trim(),
    body('category').optional().isIn(['tech', 'marketing', 'ops'])
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, description, category } = req.body;

        const project = await Project.create({
            name,
            description,
            category,
            createdBy: req.user._id
        });

        await project.populate('createdBy', 'name email');
        await project.populate('members.user', 'name email avatar');

        res.status(201).json({
            success: true,
            data: {
                ...project.toObject(),
                id: project._id,
                taskCount: 0,
                memberCount: project.members.length
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private/Admin or Owner
router.put('/:id', [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('category').optional().isIn(['tech', 'marketing', 'ops']),
    body('status').optional().isIn(['active', 'archived', 'completed'])
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check authorization
        if (req.user.role !== 'admin' && !project.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to update this project'
            });
        }

        const { name, description, category, status } = req.body;

        if (name) project.name = name;
        if (description !== undefined) project.description = description;
        if (category) project.category = category;
        if (status) project.status = status;

        await project.save();
        await project.populate('createdBy', 'name email');
        await project.populate('members.user', 'name email avatar');

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/projects/:id
// @desc    Soft delete project (mark as completed)
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Soft delete: Mark as completed instead of deleting
        project.status = 'completed';
        await project.save();

        res.json({
            success: true,
            message: 'Project archived successfully',
            data: project // Return updated project so frontend can update state if needed
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/projects/:id/members
// @desc    Add member to project
// @access  Private/Admin or Owner
router.post('/:id/members', [
    body('userId').notEmpty().withMessage('User ID is required')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check authorization
        if (req.user.role !== 'admin' && !project.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to add members'
            });
        }

        const { userId } = req.body;

        // Check if already a member
        if (project.isMember(userId)) {
            return res.status(400).json({
                success: false,
                error: 'User is already a member of this project'
            });
        }

        project.members.push({ user: userId, role: 'member' });
        await project.save();
        await project.populate('members.user', 'name email avatar');

        // Create notification for added user
        await Notification.createNotification({
            user: userId,
            type: 'project_member_added',
            title: 'Added to Project',
            message: `You've been added to project "${project.name}"`,
            project: project._id,
            triggeredBy: req.user._id
        });

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/projects/:id/members/:userId
// @desc    Remove member from project
// @access  Private/Admin or Owner
router.delete('/:id/members/:userId', async (req, res, next) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        // Check authorization
        if (req.user.role !== 'admin' && !project.isOwner(req.user._id)) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to remove members'
            });
        }

        // Can't remove owner
        const memberToRemove = project.members.find(
            m => m.user.toString() === req.params.userId
        );

        if (memberToRemove && memberToRemove.role === 'owner') {
            return res.status(400).json({
                success: false,
                error: 'Cannot remove project owner'
            });
        }

        project.members = project.members.filter(
            m => m.user.toString() !== req.params.userId
        );

        await project.save();
        await project.populate('members.user', 'name email avatar');

        res.json({
            success: true,
            data: project
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
