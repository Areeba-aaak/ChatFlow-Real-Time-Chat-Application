import React from 'react';
import { useChat } from '../context/ChatContext';
import ChatWindow from '../components/chat/ChatWindow';

const Chat = () => {
  const { currentConversation } = useChat();

  if (!currentConversation) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💬</span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Welcome to ChatFlow</h2>
          <p className="text-gray-500 mt-2">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return <ChatWindow conversation={currentConversation} />;
};

export default Chat;