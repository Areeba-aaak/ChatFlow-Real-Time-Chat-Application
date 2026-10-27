import axios from 'axios';


// ============================================================
// API URL
// ============================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';


// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
  baseURL: API_URL,

  headers: {
    'Content-Type': 'application/json',
  },

  withCredentials: true,
});


// ============================================================
// REQUEST INTERCEPTOR
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token');

    if (token) {
      config.headers =
        config.headers || {};

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);


// ============================================================
// RESPONSE INTERCEPTOR
// ============================================================

api.interceptors.response.use(

  // Successful response
  (response) => {
    return response;
  },

  // Error response
  async (error) => {

    const originalRequest =
      error.config;


    // --------------------------------------------------------
    // Network error
    // --------------------------------------------------------

    if (!error.response) {
      console.error(
        'Network error:',
        error.message
      );

      return Promise.reject(error);
    }


    // --------------------------------------------------------
    // Only process 401 responses
    // --------------------------------------------------------

    if (
      error.response.status !== 401 ||
      !originalRequest
    ) {
      return Promise.reject(error);
    }


    // --------------------------------------------------------
    // IMPORTANT:
    // Never refresh tokens for login/register.
    //
    // A 401 from login simply means:
    // - wrong email
    // - wrong password
    // - invalid credentials
    // --------------------------------------------------------

    const requestUrl =
      originalRequest.url || '';

    if (
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }


    // --------------------------------------------------------
    // Prevent infinite retry
    // --------------------------------------------------------

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;


    try {

      const savedRefreshToken =
        localStorage.getItem(
          'refreshToken'
        );


      if (!savedRefreshToken) {

        localStorage.removeItem(
          'token'
        );

        localStorage.removeItem(
          'refreshToken'
        );

        return Promise.reject(error);
      }


      // ------------------------------------------------------
      // Refresh token
      // ------------------------------------------------------

      const refreshResponse =
        await axios.post(
          `${API_URL}/auth/refresh`,
          {
            refreshToken:
              savedRefreshToken,
          },
          {
            withCredentials: true,
          }
        );


      const refreshData =
        refreshResponse.data?.data;


      if (!refreshData?.accessToken) {
        throw new Error(
          'No access token returned from refresh'
        );
      }


      const {
        accessToken,
        refreshToken:
          newRefreshToken,
      } = refreshData;


      // ------------------------------------------------------
      // Save new access token
      // ------------------------------------------------------

      localStorage.setItem(
        'token',
        accessToken
      );


      if (newRefreshToken) {
        localStorage.setItem(
          'refreshToken',
          newRefreshToken
        );
      }


      // ------------------------------------------------------
      // Retry original request
      // ------------------------------------------------------

      originalRequest.headers =
        originalRequest.headers || {};

      originalRequest.headers.Authorization =
        `Bearer ${accessToken}`;


      return api(
        originalRequest
      );

    } catch (refreshError) {

      console.error(
        'Token refresh failed:',
        refreshError
      );


      localStorage.removeItem(
        'token'
      );

      localStorage.removeItem(
        'refreshToken'
      );


      if (
        window.location.pathname !==
        '/auth/login'
      ) {
        window.location.href =
          '/auth/login';
      }


      return Promise.reject(
        refreshError
      );
    }
  }
);


export default api;