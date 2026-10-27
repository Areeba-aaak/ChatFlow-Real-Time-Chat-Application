import { useChat } from '../context/ChatContext';

export const useSocket = () => {
  const { socket } = useChat();
  return socket;
};