require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { checkConnection } = require('./config/supabaseDb');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const messageRoutes = require('./routes/messages');
const fileRoutes = require('./routes/files');
const notificationRoutes = require('./routes/notifications');

// Import socket handlers
const setupSocketHandlers = require('./socket');

const app = express();
const server = http.createServer(app);

const isProduction = process.env.NODE_ENV === 'production';

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Make io accessible to routes
app.set('io', io);

// ============ PRODUCTION MIDDLEWARE ============

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false
}));

// Gzip compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isProduction ? 100 : 1000, // Limit each IP
    message: {
        success: false,
        error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: isProduction ? 10 : 100, // 10 login attempts per hour
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.'
    }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// CORS configuration — allows same-origin requests for monorepo deploys
const buildAllowedOrigins = () => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const origins = clientUrl.split(',').map(o => o.trim());
    // Render sets this automatically — add it so same-origin requests work
    if (process.env.RENDER_EXTERNAL_URL) {
        origins.push(process.env.RENDER_EXTERNAL_URL);
    }
    // Add the server's own URL (for monorepo — frontend served from same server)
    const port = process.env.PORT || 5001;
    origins.push(`http://localhost:${port}`);
    return origins;
};

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (same-origin, mobile apps, Postman)
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = buildAllowedOrigins();

        // Allow if origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // In development, allow any localhost origin
        if (!isProduction && origin.includes('localhost')) {
            return callback(null, true);
        }

        // In production, allow any .onrender.com origin (monorepo deploy)
        if (isProduction && origin.endsWith('.onrender.com')) {
            return callback(null, true);
        }

        // Log and block unknown origins
        console.warn('CORS blocked:', origin, '| Allowed:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Trust proxy for Railway/Heroku
if (isProduction) {
    app.set('trust proxy', 1);
}

// Static files for uploads (local fallback)
app.use('/uploads', express.static('uploads'));

// ============ API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);

// ============ PRODUCTION STATIC ASSETS ============
if (isProduction) {
    const path = require('path');
    const fs = require('fs');
    const clientBuildPath = path.join(__dirname, '../client/dist');
    const indexPath = path.join(clientBuildPath, 'index.html');

    // Check if index.html specifically exists before trying to serve frontend
    if (fs.existsSync(indexPath)) {
        console.log('📦 Production Frontend found. Serving static files.');
        app.use(express.static(clientBuildPath));

        // Handle React routing
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(indexPath);
            } else {
                res.status(404).json({ success: false, error: 'API route not found' });
            }
        });
    } else {
        console.log('ℹ️ Running as API-only server (Static index.html not found).');
    }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const dbConnected = await checkConnection();
    res.json({
        status: dbConnected ? 'ok' : 'degraded',
        message: 'RentBasket API is running',
        database: dbConnected ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
    console.error('Error:', err);

    // Don't leak error details in production
    const errorMessage = isProduction && !err.isOperational
        ? 'Internal Server Error'
        : err.message;

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: isProduction ? undefined : Object.values(err.errors).map(e => e.message)
        });
    }

    // Handle Supabase/PostgreSQL errors
    if (err.code && err.code.startsWith('PGRST')) {
        return res.status(400).json({
            success: false,
            error: 'Database error',
            details: isProduction ? undefined : err.message
        });
    }

    res.status(err.status || 500).json({
        success: false,
        error: errorMessage
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// ============ SERVER STARTUP ============
const PORT = process.env.PORT || 5001;

const startServer = async () => {
    try {
        // Verify Supabase connection
        const isConnected = await checkConnection();
        if (!isConnected) {
            console.warn('⚠️  Supabase connection could not be verified. Tables may not exist yet.');
            console.log('   Run the SQL schema in Supabase Dashboard to create tables.');
        } else {
            console.log('✅ Supabase Database connected');
        }

        // Setup socket handlers
        setupSocketHandlers(io);

        server.listen(PORT, () => {
            const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
            const renderUrl = process.env.RENDER_EXTERNAL_URL || 'not set';
            console.log(`
╔════════════════════════════════════════════╗
║   🚀 RentBasket API Server                 ║
╠════════════════════════════════════════════╣
║   Port: ${PORT}                              ║
║   Mode: ${(process.env.NODE_ENV || 'development').padEnd(20)}║
║   DB:   Supabase PostgreSQL            ║
║   API:  http://localhost:${PORT}/api         ║
╚════════════════════════════════════════════╝
   CORS allowed origins: ${clientUrl}
   Render URL: ${renderUrl}
      `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

module.exports = { app, server, io };
