const express = require('express');
const { body, validationResult } = require('express-validator');
const { Task, Project, Notification } = require('../models');
const { protect } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/tasks
// @desc    Get all tasks (with optional filters)
// @access  Private
router.get('/', async (req, res, next) => {
    try {
        const { project, status, assignedTo, dueDate } = req.query;

        const query = {};
        if (project) query.project = project;
        if (status) query.status = status;
        if (assignedTo) query.assignedTo = assignedTo;
        if (dueDate) {
            // Tasks due on or before this date
            query.dueDate = { $lte: new Date(dueDate) };
        }

        const tasks = await Task.find(query)
            .populate('project', 'name category')
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email')
            .sort({ order: 1, createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks.map(t => ({
                ...t.toObject(),
                id: t._id,
                projectId: t.project?._id,
                assigneeName: t.assignedTo?.name
            }))
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/tasks/my-tasks
// @desc    Get tasks assigned to current user
// @access  Private
router.get('/my-tasks', async (req, res, next) => {
    try {
        const tasks = await Task.find({
            assignedTo: req.user._id,
            status: { $ne: 'done' }
        })
            .populate('project', 'name category')
            .sort({ dueDate: 1, createdAt: -1 });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks.map(t => ({
                ...t.toObject(),
                id: t._id,
                projectId: t.project?._id
            }))
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/tasks/project/:projectId
// @desc    Get all tasks for a project (grouped by status)
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

        const tasksByStatus = await Task.getByStatus(req.params.projectId);
        const allTasks = [...tasksByStatus.new, ...tasksByStatus.in_progress, ...tasksByStatus.done];

        res.json({
            success: true,
            count: allTasks.length,
            data: {
                all: allTasks.map(t => ({
                    ...t.toObject(),
                    id: t._id,
                    projectId: t.project,
                    assigneeName: t.assignedTo?.name
                })),
                byStatus: {
                    new: tasksByStatus.new.map(t => ({ ...t.toObject(), id: t._id })),
                    in_progress: tasksByStatus.in_progress.map(t => ({ ...t.toObject(), id: t._id })),
                    done: tasksByStatus.done.map(t => ({ ...t.toObject(), id: t._id }))
                }
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id)
            .populate('project', 'name category')
            .populate('assignedTo', 'name email avatar')
            .populate('createdBy', 'name email');

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...task.toObject(),
                id: task._id,
                projectId: task.project?._id,
                assigneeName: task.assignedTo?.name
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', [
    body('projectId').notEmpty().withMessage('Project ID is required'),
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('description').optional().trim(),
    body('status').optional().isIn(['new', 'in_progress', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('assignedTo').optional(),
    body('dueDate').optional()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { projectId, title, description, status, priority, assignedTo, dueDate } = req.body;

        // Verify project exists
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found'
            });
        }

        const task = await Task.create({
            project: projectId,
            title,
            description,
            status: status || 'new',
            priority: priority || 'medium',
            assignedTo: assignedTo || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            createdBy: req.user._id
        });

        await task.populate('assignedTo', 'name email avatar');
        await task.populate('createdBy', 'name email');

        // If task is assigned, create notification
        if (assignedTo && assignedTo !== req.user._id.toString()) {
            await Notification.createNotification({
                user: assignedTo,
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `You've been assigned to "${title}" in ${project.name}`,
                project: projectId,
                task: task._id,
                triggeredBy: req.user._id
            });

            // Emit socket event
            const io = req.app.get('io');
            io.to(`user:${assignedTo}`).emit('notification', {
                type: 'task_assigned',
                task: task,
                message: `New task assigned: ${title}`
            });
        }

        res.status(201).json({
            success: true,
            data: {
                ...task.toObject(),
                id: task._id,
                projectId: task.project,
                assigneeName: task.assignedTo?.name
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('status').optional().isIn(['new', 'in_progress', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('assignedTo').optional(),
    body('dueDate').optional()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const task = await Task.findById(req.params.id)
            .populate('project', 'name');

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        const { title, description, status, priority, assignedTo, dueDate } = req.body;
        const previousAssignee = task.assignedTo?.toString();
        const previousStatus = task.status;

        if (title) task.title = title;
        if (description !== undefined) task.description = description;
        if (status) task.status = status;
        if (priority) task.priority = priority;
        if (assignedTo !== undefined) task.assignedTo = assignedTo || null;
        if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;

        await task.save();
        await task.populate('assignedTo', 'name email avatar');
        await task.populate('createdBy', 'name email');

        // Handle notifications for assignment changes
        if (assignedTo && assignedTo !== previousAssignee && assignedTo !== req.user._id.toString()) {
            await Notification.createNotification({
                user: assignedTo,
                type: 'task_assigned',
                title: 'Task Assigned',
                message: `You've been assigned to "${task.title}"`,
                project: task.project._id,
                task: task._id,
                triggeredBy: req.user._id
            });
        }

        // Notify if task completed
        if (status === 'done' && previousStatus !== 'done') {
            const io = req.app.get('io');
            io.to(`project:${task.project._id}`).emit('task_completed', {
                task: task,
                completedBy: req.user.name
            });
        }

        res.json({
            success: true,
            data: {
                ...task.toObject(),
                id: task._id,
                projectId: task.project._id,
                assigneeName: task.assignedTo?.name
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', async (req, res, next) => {
    try {
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        // Only admin or task creator can delete
        if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this task'
            });
        }

        await task.deleteOne();

        res.json({
            success: true,
            message: 'Task deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
