import { useChat } from '../context/ChatContext';

export const useConversations = () => {
  const { conversations, setConversations, loading } = useChat();
  return { conversations, setConversations, loading };
};