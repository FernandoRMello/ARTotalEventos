// Criar instância do axios
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://artotaleventos.onrender.com/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Adiciona prefixo /api apenas para rotas de API (exceto /auth)
    if (!config.url.startsWith('/auth')) {
      config.url = `/api${config.url}`;
    }

    console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
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
    let errorMessage = 'Erro desconhecido';

    if (error.response) {
      // Erros com resposta do servidor
      console.error(
        `Response Error: ${error.response.status} - ${error.response.config.url}`,
        error.response.data
      );

      // Mensagens personalizadas por status
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
      console.error('Timeout na requisição');
      errorMessage = 'Tempo limite excedido. Tente novamente.';
    } else if (error.request) {
      console.error('Sem resposta do servidor:', error.request);
      errorMessage = 'Servidor não está respondendo. Verifique sua conexão.';
    } else {
      console.error('Erro ao configurar requisição:', error.message);
      errorMessage = 'Erro na configuração da requisição';
    }

    // Adiciona mensagem de erro personalizada
    const customError = new Error(errorMessage);
    customError.original = error;
    return Promise.reject(customError);
  }
);

export default api;
