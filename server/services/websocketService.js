const WebSocket = require('ws');
const { getDb } = require('../database');

class WebSocketService {
  constructor() {
    this.cryptoFeed = null;
    this.clientServer = null;
    this.clients = new Set();
    this.dataBuffer = [];
    this.aggregationInterval = null;
    this.lastAggregationTime = Date.now();
    
    // Configuration
    this.CRYPTO_FEED_URL = 'wss://stream.binance.com:9443/ws/btcusdt@trade';
    this.AGGREGATION_INTERVAL = 60000; // 1 minute
    this.BUFFER_SIZE = 1000; // Max data points to keep in memory
  }

  // Initialize WebSocket connections
  initialize(server) {
    this.setupCryptoFeed();
    this.setupClientServer(server);
    this.startAggregation();
  }

  // Connect to crypto exchange WebSocket feed
  setupCryptoFeed() {
    console.log('🔌 Connecting to crypto feed:', this.CRYPTO_FEED_URL);
    
    this.cryptoFeed = new WebSocket(this.CRYPTO_FEED_URL);

    this.cryptoFeed.on('open', () => {
      console.log('✅ Connected to crypto feed');
    });

    this.cryptoFeed.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        this.processCryptoData(message);
      } catch (error) {
        console.error('❌ Error parsing crypto data:', error);
      }
    });

    this.cryptoFeed.on('error', (error) => {
      console.error('❌ Crypto feed error:', error);
    });

    this.cryptoFeed.on('close', () => {
      console.log('🔌 Crypto feed connection closed, reconnecting...');
      setTimeout(() => this.setupCryptoFeed(), 5000);
    });
  }

  // Setup WebSocket server for frontend clients
  setupClientServer(server) {
    this.clientServer = new WebSocket.Server({ server });

    this.clientServer.on('connection', (ws) => {
      console.log('👤 New client connected');
      this.clients.add(ws);

      // Send current aggregated data to new client
      this.sendLatestDataToClient(ws);

      ws.on('close', () => {
        console.log('👤 Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ Client WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log('✅ Client WebSocket server initialized');
  }

  // Process incoming crypto data
  processCryptoData(data) {
    if (data.e === 'trade') {
      const tradeData = {
        symbol: data.s,
        price: parseFloat(data.p),
        volume: parseFloat(data.q),
        timestamp: new Date(data.T),
        tradeId: data.t
      };

      this.dataBuffer.push(tradeData);

      // Keep buffer size manageable
      if (this.dataBuffer.length > this.BUFFER_SIZE) {
        this.dataBuffer = this.dataBuffer.slice(-this.BUFFER_SIZE);
      }
    }
  }

  // Start periodic aggregation
  startAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.aggregateAndStore();
    }, this.AGGREGATION_INTERVAL);

    console.log('⏰ Data aggregation started (1-minute intervals)');
  }

  // Aggregate data and store in MongoDB
  async aggregateAndStore() {
    if (this.dataBuffer.length === 0) {
      console.log('⚠️ No data to aggregate');
      return;
    }

    try {
      const now = Date.now();
      const oneMinuteAgo = now - this.AGGREGATION_INTERVAL;

      // Filter data from the last minute
      const recentData = this.dataBuffer.filter(
        data => data.timestamp.getTime() >= oneMinuteAgo
      );

      if (recentData.length === 0) {
        console.log('⚠️ No recent data to aggregate');
        return;
      }

      // Calculate aggregates
      const prices = recentData.map(d => d.price);
      const volumes = recentData.map(d => d.volume);
      
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const totalVolume = volumes.reduce((a, b) => a + b, 0);
      const movingAverage = this.calculateMovingAverage(prices);

      const aggregatedData = {
        symbol: recentData[0].symbol,
        price: avgPrice,
        volume: totalVolume,
        movingAverage: movingAverage,
        timestamp: new Date(now),
        dataPoints: recentData.length
      };

      // Use native MongoDB driver
      const db = getDb();
      await db.collection('aggregateddata').insertOne(aggregatedData);
      console.log(`💾 Aggregated data saved: ${recentData.length} data points`);

      // Broadcast to all connected clients
      this.broadcastToClients(aggregatedData);

      // Clear processed data
      this.dataBuffer = this.dataBuffer.filter(
        data => data.timestamp.getTime() >= oneMinuteAgo
      );

    } catch (error) {
      console.error('❌ Error aggregating data:', error);
    }
  }

  // Calculate moving average
  calculateMovingAverage(prices) {
    if (prices.length === 0) return 0;
    
    // Simple moving average over the last 10 data points
    const windowSize = Math.min(10, prices.length);
    const recentPrices = prices.slice(-windowSize);
    return recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  }

  // Send latest data to a specific client
  async sendLatestDataToClient(ws) {
    try {
      const db = getDb();
      const latestData = await db.collection('aggregateddata')
        .find()
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (latestData.length > 0) {
        ws.send(JSON.stringify({
          type: 'latest_data',
          data: latestData[0]
        }));
      }
    } catch (error) {
      console.error('❌ Error sending latest data to client:', error);
    }
  }

  // Broadcast aggregated data to all connected clients
  broadcastToClients(data) {
    const message = JSON.stringify({
      type: 'aggregated_data',
      data: data
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`📡 Broadcasted to ${this.clients.size} clients`);
  }

  // Get latest aggregated data (for REST API)
  async getLatestData() {
    try {
      const db = getDb();
      const latestData = await db.collection('aggregateddata')
        .find()
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      
      return latestData.length > 0 ? latestData[0] : null;
    } catch (error) {
      console.error('❌ Error fetching latest data:', error);
      throw error;
    }
  }

  // Cleanup
  cleanup() {
    if (this.cryptoFeed) {
      this.cryptoFeed.close();
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.clientServer) {
      this.clientServer.close();
    }
  }
}

module.exports = new WebSocketService(); 