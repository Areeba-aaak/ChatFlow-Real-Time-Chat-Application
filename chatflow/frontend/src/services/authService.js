
import api from './api';

const authService = {

  // ==========================================================
  // REGISTER
  // ==========================================================

  register: async (userData) => {
    const response = await api.post(
      '/auth/register',
      userData
    );

    return response.data.data;
  },


  // ==========================================================
  // CREATE USER FROM INTERNAL UI
  // ==========================================================

  createInternalUser: async (userData) => {
    const response = await api.post('/auth/internal-users', userData);
    return response.data.data;
  },


  // ==========================================================
  // LOGIN
  // ==========================================================

  login: async (email, password) => {

    const response = await api.post(
      '/auth/login',
      {
        email,
        password,
      }
    );

    return response.data.data;
  },


  // ==========================================================
  // REFRESH TOKEN
  // ==========================================================

  refreshToken: async (refreshToken) => {

    const response = await api.post(
      '/auth/refresh',
      {
        refreshToken,
      }
    );

    return response.data.data;
  },


  // ==========================================================
  // LOGOUT
  // ==========================================================

  logout: async (refreshToken) => {

    const response = await api.post(
      '/auth/logout',
      {
        refreshToken,
      }
    );

    return response.data;
  },


  // ==========================================================
  // CURRENT USER
  // ==========================================================

  getCurrentUser: async () => {

    const response = await api.get(
      '/auth/me'
    );

    return response.data.data;
  },

};


export default authService;
export { authService };
