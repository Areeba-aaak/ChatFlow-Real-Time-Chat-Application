import api from './api';

const userService = {
  getUsers: async (page = 1, limit = 50, search = '') => {
    const response = await api.get(
      `/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
    );

    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);

    return response.data;
  },

  getOnlineUsers: async () => {
    const response = await api.get('/users/online');

    return response.data;
  },

  searchUsers: async (query) => {
    const response = await api.get(
      `/users/search?q=${encodeURIComponent(query)}`
    );

    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/users/profile', data);

    return response.data;
  },
};

export default userService;