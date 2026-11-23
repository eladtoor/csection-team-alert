const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./config/database');
const casesRouter = require('./routes/cases');
const responsesRouter = require('./routes/responses');
const teamRouter = require('./routes/team');
const analyticsRouter = require('./routes/analytics');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io available to routes
app.set('io', io);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/cases', casesRouter);
app.use('/api/responses', responsesRouter);
app.use('/api/team', teamRouter);
app.use('/api/analytics', analyticsRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join case room for real-time updates
    socket.on('join-case', (caseUuid) => {
        socket.join(`case-${caseUuid}`);
        console.log(`Socket ${socket.id} joined case room: ${caseUuid}`);
    });

    // Join admin dashboard room
    socket.on('join-admin', () => {
        socket.join('admin-dashboard');
        console.log(`Socket ${socket.id} joined admin dashboard`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Initialize database connection and start server
const PORT = process.env.PORT || 3002;

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        console.log('✅ Database ready');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, io };
