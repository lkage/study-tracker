import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const client = axios.create({
  baseURL,
  timeout: 10000,
});

// 요청 인터셉터: localStorage의 토큰을 자동 첨부
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 발생 시 자동 로그아웃
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료/무효 → localStorage 정리 + 로그인 페이지로
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
