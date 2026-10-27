import api from './api';

export const conversationService = {
  getConversations: async (page = 1, limit = 50) => {
    const response = await api.get(`/conversations?page=${page}&limit=${limit}`);
    return response.data;
  },

  getConversation: async (id) => {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },

  createPrivate: async (userId) => {
    const response = await api.post('/conversations/private', { userId });
    return response.data;
  },

  createGroup: async (name, participantIds) => {
    const response = await api.post('/conversations/group', { name, participantIds });
    return response.data;
  },

  addMembers: async (conversationId, memberIds) => {
    const response = await api.post(`/conversations/${conversationId}/members`, { memberIds });
    return response.data;
  },

  removeMember: async (conversationId, memberId) => {
    const response = await api.delete(`/conversations/${conversationId}/members/${memberId}`);
    return response.data;
  },

  leaveGroup: async (conversationId) => {
    const response = await api.post(`/conversations/${conversationId}/leave`);
    return response.data;
  },
};