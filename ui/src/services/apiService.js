import axios from 'axios';

// Create axios instance with base URL from environment variable
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5002',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const metricsAPI = {
  // Get latest aggregated data
  getLatest: async () => {
    const response = await apiClient.get('/api/metrics/latest');
    return response.data;
  },

  // Get historical data
  getHistory: async (limit = 50) => {
    const response = await apiClient.get(`/api/metrics/history?limit=${limit}`);
    return response.data;
  },

  // Get server status
  getStatus: async () => {
    const response = await apiClient.get('/api/metrics/status');
    return response.data;
  },
};

export default apiClient; 