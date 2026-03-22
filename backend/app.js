// src/app.js
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path'); // ✅ add this
const apiRoutes = require('./routes/api');
const { connect, close } = require('./db');

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

    // CORS setup
    const origins = (process.env.CORS_ORIGINS || '*').split(',');
    app.use(
      cors({
        origin: origins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );

    // Mount API
    app.use('/api', apiRoutes);

    // Health check route
    app.get('/', (req, res) => res.send('School platform API running'));

    const server = app.listen(PORT, () => {
      console.log(`✅ Server listening on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down...');
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
