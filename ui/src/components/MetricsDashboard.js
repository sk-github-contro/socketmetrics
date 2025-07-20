import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Database, Wifi, WifiOff } from 'lucide-react';
import websocketService from '../services/websocketService';
import { metricsAPI } from '../services/apiService';

const MetricsDashboard = () => {
  const [latestData, setLatestData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);

  useEffect(() => {
    // Initialize WebSocket connection
    websocketService.connect();
    wsRef.current = websocketService.addListener(handleWebSocketMessage);

    // Load initial data
    loadLatestData();
    loadHistoricalData();

    // Set up periodic refresh
    const interval = setInterval(loadLatestData, 30000); // Refresh every 30 seconds

    return () => {
      if (wsRef.current) {
        wsRef.current();
      }
      clearInterval(interval);
      websocketService.disconnect();
    };
  }, []);

  const handleWebSocketMessage = (message) => {
    console.log('📨 WebSocket message received:', message);
    
    if (message.type === 'aggregated_data' || message.type === 'latest_data') {
      setLatestData(message.data);
      setLastUpdate(new Date());
      setIsConnected(true);
      
      // Update historical data
      if (message.type === 'aggregated_data') {
        setHistoricalData(prev => {
          const newData = [...prev, {
            timestamp: new Date(message.data.timestamp).toLocaleTimeString(),
            price: message.data.price,
            volume: message.data.volume,
            movingAverage: message.data.movingAverage
          }];
          
          // Keep only last 50 data points
          return newData.slice(-50);
        });
      }
    }
  };

  const loadLatestData = async () => {
    try {
      setError(null);
      const response = await metricsAPI.getLatest();
      setLatestData(response.data);
      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error('❌ Error loading latest data:', error);
      setError('Failed to load latest data');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalData = async () => {
    try {
      const response = await metricsAPI.getHistory(50);
      if (response && response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map(item => ({
          timestamp: new Date(item.timestamp).toLocaleTimeString(),
          price: item.price,
          volume: item.volume,
          movingAverage: item.movingAverage
        }));
        setHistoricalData(formattedData);
      } else {
        console.log('No historical data available yet');
        setHistoricalData([]);
      }
    } catch (error) {
      console.error('❌ Error loading historical data:', error);
      setHistoricalData([]);
    }
  };

  const getPriceChange = () => {
    if (historicalData.length < 2) return { change: 0, percentage: 0, trend: 'neutral' };
    
    const current = historicalData[historicalData.length - 1]?.price || 0;
    const previous = historicalData[historicalData.length - 2]?.price || 0;
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    return {
      change: change.toFixed(2),
      percentage: percentage.toFixed(2),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const priceChange = getPriceChange();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SocketMetrics Dashboard
          </h1>
          <p className="text-gray-600">
            Real-time cryptocurrency data aggregation and analysis
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
            isConnected 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {isConnected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {lastUpdate && (
            <span className="ml-4 text-sm text-gray-500">
              Last update: {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Latest Data Cards */}
        {latestData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Price Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Current Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${latestData.price?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${
                  priceChange.trend === 'up' ? 'bg-green-100' : 
                  priceChange.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  {priceChange.trend === 'up' ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : priceChange.trend === 'down' ? (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  ) : (
                    <Activity className="w-6 h-6 text-gray-600" />
                  )}
                </div>
              </div>
              <div className="mt-2">
                <span className={`text-sm font-medium ${
                  priceChange.trend === 'up' ? 'text-green-600' : 
                  priceChange.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {priceChange.change > 0 ? '+' : ''}{priceChange.change} ({priceChange.percentage}%)
                </span>
              </div>
            </div>

            {/* Volume Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Volume (24h)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {latestData.volume?.toLocaleString() || 'N/A'}
                  </p>
                </div>
                <Database className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Moving Average Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Moving Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${latestData.movingAverage?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {/* Symbol Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Symbol</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {latestData.symbol || 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <span className="text-blue-600 font-bold">₿</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Price Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Volume Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Moving Average Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price vs Moving Average</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
                name="Price"
              />
              <Line 
                type="monotone" 
                dataKey="movingAverage" 
                stroke="#8B5CF6" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Moving Average"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Data Points</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volume
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Moving Average
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalData.slice(-10).reverse().map((data, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.timestamp}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.price?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {data.volume?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.movingAverage?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard; 