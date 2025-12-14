// src/app.js
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');
const { connect, close } = require('./db');
const { startSessionCleanup, stopSessionCleanup } = require('./controllers/authController');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connect();
    const app = express();

    app.use(express.json({ limit: '5mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());

    // ✅ Serve uploaded files (so profile pictures are accessible)
    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // CORS setup - Support for Netlify subdomains and localhost subdomains
    const corsOrigins = process.env.CORS_ORIGINS || '*';
    const allowedOrigins = corsOrigins.split(',').map(o => o.trim());
    
    app.use(
      cors({
        origin: function (origin, callback) {
          // Allow requests with no origin (mobile apps, Postman, etc.)
          if (!origin) {
            return callback(null, true);
          }
          
          // If '*' is specified, allow all origins
          if (allowedOrigins.includes('*')) {
            return callback(null, true);
          }
          
          // Check exact matches
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          
          // Check for localhost subdomain pattern (*.localhost)
          // Allow any subdomain of localhost for local development
          // Examples: localhost:3000, dps.localhost:3000, school1.localhost:3000
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return callback(null, true);
          }
          
          // Check for Netlify subdomain pattern (*.netlify.app)
          // Allow any subdomain of netlify.app
          if (origin.includes('.netlify.app')) {
            return callback(null, true);
          }
          
          // Check for wildcard patterns in allowedOrigins
          for (const allowed of allowedOrigins) {
            if (allowed.includes('*')) {
              // Convert wildcard pattern to regex
              // Example: "https://*.example.com" -> /^https:\/\/[^.]+\.example\.com$/
              const pattern = allowed
                .replace(/\./g, '\\.')
                .replace(/\*/g, '[^.]+');
              const regex = new RegExp(`^${pattern}$`);
              if (regex.test(origin)) {
                return callback(null, true);
              }
            }
          }
          
          // Origin not allowed
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant'],
      })
    );

    // Mount API
    app.use('/api', apiRoutes);

    // Health check route
    app.get('/', (req, res) => res.send('School platform API running'));

    const server = app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}`);
      
      // Start session cleanup AFTER server is running
      startSessionCleanup();
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
      stopSessionCleanup(); // Stop the cleanup interval
      server.close(async () => {
        await close();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();