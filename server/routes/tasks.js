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
        if (dueDate) query.dueDate = dueDate;

        const tasks = await Task.find(query);

        res.json({
            success: true,
            count: tasks.length,
            data: tasks.map(t => ({
                ...t,
                projectId: t.project?.id || t.project?._id,
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
            assignedTo: req.user.id,
            statusNot: 'done'
        });

        res.json({
            success: true,
            count: tasks.length,
            data: tasks.map(t => ({
                ...t,
                projectId: t.project?.id || t.project?._id
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
                    ...t,
                    projectId: t.project?.id || t.project?._id || req.params.projectId,
                    assigneeName: t.assignedTo?.name
                })),
                byStatus: {
                    new: tasksByStatus.new,
                    in_progress: tasksByStatus.in_progress,
                    done: tasksByStatus.done
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
        const task = await Task.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        res.json({
            success: true,
            data: {
                ...task,
                projectId: task.project?.id || task.project?._id,
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
            createdBy: req.user.id
        });

        // If task is assigned, create notification
        if (assignedTo && assignedTo !== req.user.id) {
            await Notification.createNotification({
                user: assignedTo,
                type: 'task_assigned',
                title: 'New Task Assigned',
                message: `You've been assigned to "${title}" in ${project.name}`,
                project: projectId,
                task: task.id,
                triggeredBy: req.user.id
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
                ...task,
                projectId: task.project?.id || projectId,
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

        const currentTask = await Task.findById(req.params.id);

        if (!currentTask) {
            return res.status(404).json({
                success: false,
                error: 'Task not found'
            });
        }

        const { title, description, status, priority, assignedTo, dueDate } = req.body;
        const previousAssignee = currentTask.assignedTo?.id;
        const previousStatus = currentTask.status;

        const updates = {};
        if (title) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status) updates.status = status;
        if (priority) updates.priority = priority;
        if (assignedTo !== undefined) updates.assignedTo = assignedTo || null;
        if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

        const task = await Task.update(req.params.id, updates);

        // Handle notifications for assignment changes
        if (assignedTo && assignedTo !== previousAssignee && assignedTo !== req.user.id) {
            await Notification.createNotification({
                user: assignedTo,
                type: 'task_assigned',
                title: 'Task Assigned',
                message: `You've been assigned to "${task.title}"`,
                project: task.project?.id,
                task: task.id,
                triggeredBy: req.user.id
            });
        }

        // Notify if task completed
        if (status === 'done' && previousStatus !== 'done') {
            const io = req.app.get('io');
            io.to(`project:${task.project?.id}`).emit('task_completed', {
                task: task,
                completedBy: req.user.name
            });
        }

        res.json({
            success: true,
            data: {
                ...task,
                projectId: task.project?.id,
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
        if (req.user.role !== 'admin' && task.createdBy?.id !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this task'
            });
        }

        await Task.delete(req.params.id);

        res.json({
            success: true,
            message: 'Task deleted'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
