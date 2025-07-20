require('dotenv').config();
console.log('🚨🚨🚨 SOCKETMETRICS SERVER STARTING 🚨🚨🚨');
console.log('=== REAL-TIME DATA AGGREGATION SYSTEM ===');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

// Import the database connection function
const { connectToDatabase, getDb } = require('./database');
const websocketService = require('./services/websocketService');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Initialize database connection
let db;
connectToDatabase()
  .then((database) => {
    db = database;
    console.log('✅ Database connected successfully');
    
    // Make database available to routes
    app.locals.db = db;
    
    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Register routes after database is connected
    console.log('Registering /api/metrics route');
    app.use('/api/metrics', require('./routes/metrics'));

    app.get('/', (req, res) => res.json({
      message: 'SocketMetrics API running',
      endpoints: {
        metrics: '/api/metrics/latest',
        status: '/api/metrics/status',
        history: '/api/metrics/history'
      }
    }));

    // Catch-all for unmatched routes
    app.use((req, res, next) => {
      console.log(`Unmatched request: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ message: 'Not found' });
    });

    const PORT = process.env.PORT || 5002;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready for client connections`);
      console.log(`🔌 Crypto feed connection established`);
      console.log(`⏰ Data aggregation running every minute`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  websocketService.cleanup();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  websocketService.cleanup();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
