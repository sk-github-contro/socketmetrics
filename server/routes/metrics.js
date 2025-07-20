const express = require('express');
const router = express.Router();
const websocketService = require('../services/websocketService');
const { getDb } = require('../database');

// GET /api/metrics/latest - Get latest aggregated data and broadcast to WebSocket clients
router.get('/latest', async (req, res) => {
  try {
    // Get latest aggregated data from MongoDB
    const latestData = await websocketService.getLatestData();
    
    if (!latestData) {
      return res.status(404).json({
        success: false,
        message: 'No aggregated data available'
      });
    }

    // Broadcast the same data to all connected WebSocket clients
    websocketService.broadcastToClients(latestData);

    res.json({
      success: true,
      message: 'Latest data retrieved and broadcasted to all clients',
      data: latestData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /api/metrics/latest:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/metrics/history - Get historical aggregated data
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const db = getDb();
    
    const history = await db.collection('aggregateddata')
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    res.json({
      success: true,
      data: history,
      count: history.length
    });

  } catch (error) {
    console.error('❌ Error in /api/metrics/history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// GET /api/metrics/status - Get WebSocket service status
router.get('/status', (req, res) => {
  const status = {
    cryptoFeedConnected: websocketService.cryptoFeed && 
                        websocketService.cryptoFeed.readyState === 1,
    clientConnections: websocketService.clients.size,
    dataBufferSize: websocketService.dataBuffer.length,
    lastAggregation: websocketService.lastAggregationTime,
    uptime: Date.now() - websocketService.lastAggregationTime
  };

  res.json({
    success: true,
    status: status
  });
});

module.exports = router; 