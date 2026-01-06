const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Protect routes - require authentication
const protect = async (req, res, next) => {
    try {
        let token;

        // Get token from header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized to access this route'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }

            if (!user.isActive) {
                return res.status(401).json({
                    success: false,
                    error: 'User account is deactivated'
                });
            }

            // Attach user to request
            req.user = user;
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'Invalid token'
            });
        }
    } catch (error) {
        next(error);
    }
};

// Restrict to certain roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: `User role '${req.user.role}' is not authorized to access this route`
            });
        }

        next();
    };
};

// Optional auth - attach user if token exists but don't require it
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                if (user && user.isActive) {
                    req.user = user;
                }
            } catch (err) {
                // Token invalid, but that's okay for optional auth
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    protect,
    authorize,
    optionalAuth
};
