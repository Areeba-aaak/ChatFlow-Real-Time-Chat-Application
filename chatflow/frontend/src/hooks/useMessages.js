import { useChat } from '../context/ChatContext';

export const useMessages = () => {
  const { messages, setMessages, sendMessage } = useChat();
  return { messages, setMessages, sendMessage };
};