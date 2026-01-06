const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { protect } = require('../middleware');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Validation middleware
const validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

const validateRegister = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ max: 100 })
        .withMessage('Name cannot exceed 100 characters')
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public (for first user) or Admin only
router.post('/register', validateRegister, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password, name, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User with this email already exists'
            });
        }

        // Check if this is the first user (make them admin)
        const userCount = await User.countDocuments();
        const isFirstUser = userCount === 0;

        // Create user
        const user = await User.create({
            email,
            password,
            name,
            role: isFirstUser ? 'admin' : (role || 'editor')
        });

        // Update login streak
        user.updateLoginStreak();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            data: {
                user: user.toPublicJSON(),
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validateLogin, async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user with password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                error: 'Account is deactivated'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update login streak
        user.updateLoginStreak();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            data: {
                user: user.toPublicJSON(),
                token
            }
        });
    } catch (error) {
        next(error);
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        res.json({
            success: true,
            data: user.toPublicJSON()
        });
    } catch (error) {
        next(error);
    }
});

// @route   PUT /api/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put('/update-profile', protect, [
    body('name').optional().trim().isLength({ max: 100 }),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { name, email } = req.body;
        const user = await User.findById(req.user._id);

        if (name) user.name = name;
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

// @route   PUT /api/auth/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
