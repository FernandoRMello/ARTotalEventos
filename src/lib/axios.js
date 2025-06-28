import axios from 'axios';

// Configuração da URL base da API
const baseURL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'VITE_API_URL=https://archeckin.onrender.com/api' );

// Criar instância do axios
const api = axios.create({
  baseURL,
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para responses
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.data);
    
    // Tratamento de erros específicos
    if (error.response?.status === 404) {
      console.warn('Recurso não encontrado');
    } else if (error.response?.status >= 500) {
      console.error('Erro interno do servidor');
    } else if (error.code === 'ECONNABORTED') {
      console.error('Timeout na requisição');
    } else if (!error.response) {
      console.error('Erro de rede - servidor não está respondendo');
    }
    
    return Promise.reject(error);
  }
);

export default api;

