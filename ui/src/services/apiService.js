import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://socketmetrics.onrender.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getLatest: async () => {
    const response = await apiClient.get('/api/metrics/latest');
    return response.data;
  },

  getHistory: async (limit = 50) => {
    const response = await apiClient.get(`/api/metrics/history?limit=${limit}`);
    return response.data;
  },

  getStatus: async () => {
    const response = await apiClient.get('/api/metrics/status');
    return response.data;
  },
};

export default apiClient;
