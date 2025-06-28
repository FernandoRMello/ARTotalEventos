// src/lib/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://artotaleventos.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para responses (mantido para tratamento de erros)
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [${response.status}] ${response.config.url}`);
    return response;
  },
  (error) => {
    let errorMessage = 'Erro desconhecido';

    if (error.response) {
      console.error(`❌ [${error.response.status}] ${error.response.config.url}`, error.response.data);

      switch (error.response.status) {
        case 400:
          errorMessage = 'Requisição inválida';
          break;
        case 401:
          errorMessage = 'Não autorizado - faça login novamente';
          break;
        case 403:
          errorMessage = 'Acesso proibido';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          break;
        default:
          errorMessage = `Erro ${error.response.status}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('⏱️ Timeout na requisição');
      errorMessage = 'Tempo limite excedido. Tente novamente.';
    } else if (error.request) {
      console.error('🚫 Sem resposta do servidor:', error.request);
      errorMessage = 'Servidor não está respondendo.';
    } else {
      console.error('⚙️ Erro de configuração:', error.message);
      errorMessage = 'Erro de configuração da requisição';
    }

    const customError = new Error(errorMessage);
    customError.original = error;
    return Promise.reject(customError);
  }
);

export default api;
