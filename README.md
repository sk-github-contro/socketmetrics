# SocketMetrics - Real-Time Data Aggregation System

A high-performance Node.js/Express.js backend that subscribes to cryptocurrency WebSocket feeds, aggregates data in real-time, and provides a beautiful React frontend for monitoring and analysis.

---

## Features

- **Real-time WebSocket Integration**: Connects to Binance WebSocket feed for live cryptocurrency data
- **Data Aggregation**: Calculates 1-minute moving averages and aggregates high-frequency data
- **MongoDB Storage**: Efficiently stores aggregated data with proper indexing
- **REST API**: Exposes endpoints for data retrieval and system status
- **WebSocket Broadcasting**: Pushes real-time updates to all connected frontend clients
- **Beautiful Dashboard**: Modern React frontend with real-time charts and metrics
- **Docker Containerization**: Complete containerized deployment with docker-compose

---

## Tech Stack

- **Backend:** Node.js, Express.js, WebSocket (ws), MongoDB
- **Frontend:** React, Recharts, Tailwind CSS, Lucide React
- **Database:** MongoDB with Mongoose ODM
- **Containerization:** Docker, Docker Compose
- **Real-time:** WebSocket connections for live data streaming

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development)

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd SocketMetrics

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at:
- **Frontend**: http://localhost:3003
- **Backend API**: http://localhost:5002
- **MongoDB**: MongoDB Atlas (cloud)

### Local Development

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (in another terminal)
cd ui
npm install
npm start
```

---

## API Endpoints

### Metrics API

- `GET /api/metrics/latest` - Get latest aggregated data and broadcast to WebSocket clients
- `GET /api/metrics/history?limit=100` - Get historical aggregated data
- `GET /api/metrics/status` - Get WebSocket service status

### WebSocket Events

- `aggregated_data` - New aggregated data available
- `latest_data` - Latest data sent to new clients

---

## Architecture

### Backend Components

1. **WebSocket Service** (`services/websocketService.js`)
   - Connects to Binance WebSocket feed
   - Processes incoming trade data
   - Aggregates data every minute
   - Broadcasts updates to frontend clients

2. **Data Model** (`models/AggregatedData.js`)
   - MongoDB schema for aggregated data
   - Optimized indexes for performance

3. **API Routes** (`routes/metrics.js`)
   - REST endpoints for data retrieval
   - Status monitoring

### Frontend Components

1. **Metrics Dashboard** (`components/MetricsDashboard.js`)
   - Real-time data visualization
   - Interactive charts using Recharts
   - Connection status monitoring

2. **WebSocket Service** (`services/websocketService.js`)
   - Manages WebSocket connection to backend
   - Handles reconnection logic
   - Event listener management

---

## Data Flow

1. **Data Ingestion**: Backend connects to Binance WebSocket feed
2. **Processing**: Incoming trade data is buffered in memory
3. **Aggregation**: Every minute, data is aggregated (price, volume, moving average)
4. **Storage**: Aggregated data is saved to MongoDB Atlas
5. **Broadcasting**: Updates are pushed to all connected frontend clients
6. **Display**: Frontend renders real-time charts and metrics

---

## Configuration

### Environment Variables

**Backend** (`.env`):
```
PORT=5002
MONGODB_URI=mongodb+srv://sohamUlwe305:Soham305Ulwe@clusterulwe.49hjd.mongodb.net/socketmetrics?retryWrites=true&w=majority&appName=clusterUlwe
NODE_ENV=development
```

**Frontend** (`.env`):
```
REACT_APP_API_URL=http://localhost:5002
REACT_APP_WS_URL=ws://localhost:5002
```

### Docker Configuration

- **Backend**: Port 5002, health checks enabled
- **Frontend**: Port 3003, nginx reverse proxy
- **Database**: MongoDB Atlas (cloud)

---

## Monitoring

### Health Checks

All services include health checks:
- Backend: API endpoint availability
- Frontend: Web server responsiveness

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
```

---

## Performance Features

- **In-memory Buffering**: Efficient data processing with configurable buffer size
- **Database Indexing**: Optimized MongoDB queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Error Handling**: Robust error handling and reconnection logic
- **Graceful Shutdown**: Proper cleanup on service termination

---

## Development

### Adding New Data Sources

1. Modify `websocketService.js` to connect to new WebSocket feeds
2. Update data processing logic in `processCryptoData()`
3. Adjust aggregation calculations as needed

### Extending the Dashboard

1. Add new components in `ui/src/components/`
2. Update `MetricsDashboard.js` to include new visualizations
3. Modify WebSocket event handling for new data types

---

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend is running on port 5002
   - Verify firewall settings
   - Check browser console for connection errors

2. **No Data Displayed**
   - Verify MongoDB Atlas connection
   - Check backend logs for aggregation errors
   - Ensure Binance WebSocket feed is accessible

3. **Docker Issues**
   - Check container logs: `docker-compose logs <service>`
   - Verify port availability (5002, 3003)

---

## License

MIT 