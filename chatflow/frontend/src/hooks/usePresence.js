import { useChat } from '../context/ChatContext';

export const usePresence = () => {
  const { onlineUsers, typingUsers } = useChat();
  return { onlineUsers, typingUsers };
};