import { useChat } from '../context/ChatContext';

export const useTyping = () => {
  const { isTyping, sendTyping } = useChat();
  return { isTyping, sendTyping };
};