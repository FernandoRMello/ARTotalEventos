import axios from 'axios';

useEffect(() => {
  axios.get(import.meta.env.VITE_API_URL + '/pessoas')
    .then(res => setPessoas(res.data))
    .catch(console.error);
}, []);

// URL base do backend hospedado no Render
const baseURL = 'https://artotaleventos.onrender.com';

// Criar instância do axios
const api = axios.create({
  baseURL,
  timeout: 30000, // 30 segundos
});

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    // Adiciona prefixo /api apenas para rotas de API (exceto /auth)
    if (!config.url.startsWith('/auth') && !config.url.startsWith('/api')) {
      config.url = `/api${config.url}`;
    }
    
    // Não define Content-Type para FormData (o navegador define automaticamente)
    if (!(config.data instanceof FormData)) {
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json'
      };
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
    let errorCode = 'UNKNOWN_ERROR';
    
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
          errorCode = 'BAD_REQUEST';
          break;
        case 401:
          errorMessage = 'Não autorizado - faça login novamente';
          errorCode = 'UNAUTHORIZED';
          break;
        case 403:
          errorMessage = 'Acesso proibido';
          errorCode = 'FORBIDDEN';
          break;
        case 404:
          errorMessage = 'Recurso não encontrado';
          errorCode = 'NOT_FOUND';
          break;
        case 413:
          errorMessage = 'Arquivo muito grande';
          errorCode = 'PAYLOAD_TOO_LARGE';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          errorCode = 'SERVER_ERROR';
          break;
        default:
          errorMessage = `Erro ${error.response.status}`;
          errorCode = `HTTP_${error.response.status}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('Timeout na requisição');
      errorMessage = 'Tempo limite excedido. Tente novamente.';
      errorCode = 'TIMEOUT';
    } else if (error.message === 'Network Error') {
      console.error('Erro de rede:', error);
      errorMessage = 'Falha na conexão. Verifique sua internet.';
      errorCode = 'NETWORK_ERROR';
    } else if (error.request) {
      console.error('Sem resposta do servidor:', error.request);
      errorMessage = 'Servidor não está respondendo. Tente novamente mais tarde.';
      errorCode = 'NO_RESPONSE';
    } else {
      console.error('Erro ao configurar requisição:', error.message);
      errorMessage = 'Erro na configuração da requisição';
      errorCode = 'CONFIG_ERROR';
    }
    
    // Adiciona mensagem de erro personalizada
    const customError = new Error(errorMessage);
    customError.code = errorCode;
    customError.original = error;
    return Promise.reject(customError);
  }
);

export default api;
