const express = require('express');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect, authorize } = require('../middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/users
// @desc    Get all users
// @access  Private
router.get('/', async (req, res, next) => {
    try {
        const users = await User.find({ isActive: true })
            .select('-password')
            .sort({ name: 1 });

        res.json({
            success: true,
            count: users.length,
            data: users.map(u => u.toPublicJSON())
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user.toPublicJSON()
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/users
// @desc    Create a new user (admin only)
// @access  Private/Admin
router.post('/', authorize('admin'), [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').optional().isIn(['admin', 'editor'])
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, name, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        const user = await User.create({
            email,
            password,
            name,
            role: role || 'editor'
        });

        res.status(201).json({
            success: true,
            data: user.toPublicJSON()
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', authorize('admin'), [
    body('name').optional().trim().isLength({ max: 100 }),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'editor']),
    body('isActive').optional().isBoolean()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const { name, email, role, isActive } = req.body;

        if (name) user.name = name;
        if (role) user.role = role;
        if (typeof isActive === 'boolean') user.isActive = isActive;

        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
            user.email = email;
        }

        await user.save();

        res.json({
            success: true,
            data: user.toPublicJSON()
        });
    } catch (error) {
        next(error);
    }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate user (admin only)
// @access  Private/Admin
router.delete('/:id', authorize('admin'), async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Prevent deleting yourself
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                error: 'You cannot deactivate your own account'
            });
        }

        // Soft delete
        user.isActive = false;
        await user.save();

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
