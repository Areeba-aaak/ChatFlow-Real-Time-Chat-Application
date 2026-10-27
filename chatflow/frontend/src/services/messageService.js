import api from './api';

export const messageService = {
  getMessages: async (conversationId, page = 1, limit = 50) => {
    const response = await api.get(`/messages/${conversationId}?page=${page}&limit=${limit}`);
    return response.data;
  },

  markAsRead: async (messageId) => {
    const response = await api.put(`/messages/${messageId}/read`);
    return response.data;
  },

  markConversationAsRead: async (conversationId) => {
    const response = await api.put(`/messages/conversation/${conversationId}/read`);
    return response.data;
  },

  editMessage: async (messageId, content) => {
    const response = await api.put(`/messages/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId) => {
    const response = await api.delete(`/messages/${messageId}`);
    return response.data;
  },

  addReaction: async (messageId, emoji) => {
    const response = await api.post(`/messages/${messageId}/reactions`, { emoji });
    return response.data;
  },

  removeReaction: async (messageId) => {
    const response = await api.delete(`/messages/${messageId}/reactions`);
    return response.data;
  },
};