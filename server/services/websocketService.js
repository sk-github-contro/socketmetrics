const WebSocket = require("ws");
const https = require("https");
const { getDb } = require("../database");

class WebSocketService {
  constructor() {
    this.cryptoFeed = null;
    this.clientServer = null;
    this.clients = new Set();
    this.dataBuffer = [];
    this.aggregationInterval = null;
    this.lastAggregationTime = Date.now();
    this.fallbackInterval = null;
    
    this.API_OPTIONS = [
      {
        name: "CoinGecko",
        url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true",
        type: "REST"
      },
      {
        name: "CryptoCompare", 
        url: "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD",
        type: "REST"
      }
    ];
    
    this.currentApiIndex = 0;
    this.AGGREGATION_INTERVAL = 60000;
    this.BUFFER_SIZE = 1000;
    this.FALLBACK_INTERVAL = 30000;
  }

  initialize(server) {
    this.setupCryptoFeed();
    this.setupClientServer(server);
    this.startAggregation();
  }

  setupCryptoFeed() {
    console.log("🔌 Setting up crypto data feed with fallback options");
    this.tryWebSocketConnection();
  }

  tryWebSocketConnection() {
    const wsUrl = "wss://stream.binance.com:9443/ws/btcusdt@trade";
    console.log("🔌 Attempting WebSocket connection:", wsUrl);
    
    this.cryptoFeed = new WebSocket(wsUrl);

    this.cryptoFeed.on("open", () => {
      console.log("✅ WebSocket connected to crypto feed");
      if (this.fallbackInterval) {
        clearInterval(this.fallbackInterval);
        this.fallbackInterval = null;
      }
    });

    this.cryptoFeed.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.processCryptoData(message);
      } catch (error) {
        console.error("❌ Error parsing crypto data:", error);
      }
    });

    this.cryptoFeed.on("error", (error) => {
      console.error("❌ WebSocket crypto feed error:", error);
      this.startFallbackDataFeed();
    });

    this.cryptoFeed.on("close", () => {
      console.log("🔌 WebSocket connection closed, starting fallback...");
      this.startFallbackDataFeed();
    });

    setTimeout(() => {
      if (this.cryptoFeed && this.cryptoFeed.readyState !== WebSocket.OPEN) {
        console.log("⏰ WebSocket connection timeout, starting fallback...");
        this.startFallbackDataFeed();
      }
    }, 10000);
  }

  startFallbackDataFeed() {
    console.log("🔄 Starting fallback REST API data feed");
    
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }

    this.fallbackInterval = setInterval(() => {
      this.fetchCryptoDataFromAPI();
    }, this.FALLBACK_INTERVAL);

    this.fetchCryptoDataFromAPI();
  }

  async fetchCryptoDataFromAPI() {
    const apiOption = this.API_OPTIONS[this.currentApiIndex];
    console.log(`📡 Fetching from ${apiOption.name}: ${apiOption.url}`);

    try {
      const data = await this.makeHttpRequest(apiOption.url);
      this.processRestApiData(data, apiOption.name);
    } catch (error) {
      console.error(`❌ Error fetching from ${apiOption.name}:`, error);
      this.rotateToNextApi();
    }
  }

  makeHttpRequest(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = "";
        
        res.on("data", (chunk) => {
          data += chunk;
        });
        
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            reject(new Error("Invalid JSON response"));
          }
        });
      }).on("error", (error) => {
        reject(error);
      });
    });
  }

  processRestApiData(data, source) {
    let tradeData = null;

    try {
      if (source === "CoinGecko" && data.bitcoin) {
        tradeData = {
          symbol: "BTCUSD",
          price: data.bitcoin.usd,
          volume: data.bitcoin.usd_24h_vol || 0,
          timestamp: new Date(),
          tradeId: Date.now(),
          source: "CoinGecko"
        };
      } else if (source === "CryptoCompare" && data.USD) {
        tradeData = {
          symbol: "BTCUSD",
          price: data.USD,
          volume: 0,
          timestamp: new Date(),
          tradeId: Date.now(),
          source: "CryptoCompare"
        };
      }

      if (tradeData) {
        this.processCryptoData(tradeData);
        console.log(`✅ Data received from ${source}: $${tradeData.price}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${source} data:`, error);
      this.rotateToNextApi();
    }
  }

  rotateToNextApi() {
    this.currentApiIndex = (this.currentApiIndex + 1) % this.API_OPTIONS.length;
    console.log(`🔄 Rotating to next API: ${this.API_OPTIONS[this.currentApiIndex].name}`);
  }

  setupClientServer(server) {
    this.clientServer = new WebSocket.Server({ server });

    this.clientServer.on("connection", (ws) => {
      console.log("👤 New client connected");
      this.clients.add(ws);
      this.sendLatestDataToClient(ws);

      ws.on("close", () => {
        console.log("👤 Client disconnected");
        this.clients.delete(ws);
      });

      ws.on("error", (error) => {
        console.error("❌ Client WebSocket error:", error);
        this.clients.delete(ws);
      });
    });

    console.log("✅ Client WebSocket server initialized");
  }

  processCryptoData(data) {
    if (data.e === "trade") {
      const tradeData = {
        symbol: data.s,
        price: parseFloat(data.p),
        volume: parseFloat(data.q),
        timestamp: new Date(data.T),
        tradeId: data.t,
        source: "WebSocket"
      };
      this.addToBuffer(tradeData);
    } else if (data.symbol) {
      this.addToBuffer(data);
    }
  }

  addToBuffer(tradeData) {
    this.dataBuffer.push(tradeData);
    if (this.dataBuffer.length > this.BUFFER_SIZE) {
      this.dataBuffer = this.dataBuffer.slice(-this.BUFFER_SIZE);
    }
  }

  startAggregation() {
    this.aggregationInterval = setInterval(() => {
      this.aggregateAndStore();
    }, this.AGGREGATION_INTERVAL);
    console.log("⏰ Data aggregation started (1-minute intervals)");
  }

  async aggregateAndStore() {
    if (this.dataBuffer.length === 0) {
      console.log("⚠️ No data to aggregate");
      return;
    }

    try {
      const now = Date.now();
      const oneMinuteAgo = now - this.AGGREGATION_INTERVAL;
      const recentData = this.dataBuffer.filter(
        data => data.timestamp.getTime() >= oneMinuteAgo
      );

      if (recentData.length === 0) {
        console.log("⚠️ No recent data to aggregate");
        return;
      }

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
        dataPoints: recentData.length,
        source: recentData[0].source || "Unknown"
      };

      const db = getDb();
      await db.collection("aggregateddata").insertOne(aggregatedData);
      console.log(`💾 Aggregated data saved: ${recentData.length} data points from ${aggregatedData.source}`);

      this.broadcastToClients(aggregatedData);

      this.dataBuffer = this.dataBuffer.filter(
        data => data.timestamp.getTime() >= oneMinuteAgo
      );

    } catch (error) {
      console.error("❌ Error aggregating data:", error);
    }
  }

  calculateMovingAverage(prices) {
    if (prices.length === 0) return 0;
    const windowSize = Math.min(10, prices.length);
    const recentPrices = prices.slice(-windowSize);
    return recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  }

  async sendLatestDataToClient(ws) {
    try {
      const db = getDb();
      const latestData = await db.collection("aggregateddata")
        .find()
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();

      if (latestData.length > 0) {
        ws.send(JSON.stringify({
          type: "latest_data",
          data: latestData[0]
        }));
      }
    } catch (error) {
      console.error("❌ Error sending latest data to client:", error);
    }
  }

  broadcastToClients(data) {
    const message = JSON.stringify({
      type: "aggregated_data",
      data: data
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });

    console.log(`📡 Broadcasted to ${this.clients.size} clients`);
  }

  async getLatestData() {
    try {
      const db = getDb();
      const latestData = await db.collection("aggregateddata")
        .find()
        .sort({ timestamp: -1 })
        .limit(1)
        .toArray();
      
      return latestData.length > 0 ? latestData[0] : null;
    } catch (error) {
      console.error("❌ Error fetching latest data:", error);
      throw error;
    }
  }

  cleanup() {
    if (this.cryptoFeed) {
      this.cryptoFeed.close();
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
    }
    if (this.clientServer) {
      this.clientServer.close();
    }
  }
}

module.exports = new WebSocketService();
