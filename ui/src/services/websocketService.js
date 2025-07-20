class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Set();
    this.serverUrl = 'wss://socketmetrics.onrender.com';
  }

  connect() {
    try {
      console.log('🔌 Connecting to WebSocket server:', this.serverUrl);
      this.ws = new WebSocket(this.serverUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.isConnected = false;
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  handleMessage(data) {
    console.log('📨 Received WebSocket message:', data.type);
    
    this.listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('❌ Error in WebSocket listener:', error);
      }
    });
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  send(message) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
    }
  }
}

export default new WebSocketService();
