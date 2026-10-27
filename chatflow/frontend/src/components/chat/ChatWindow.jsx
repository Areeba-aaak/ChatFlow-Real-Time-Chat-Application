import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

const ChatWindow = () => {
  const { currentConversation, messages, markConversationAsRead } = useChat();
  const { user } = useAuth();

  useEffect(() => {
    if (currentConversation) {
      markConversationAsRead(currentConversation.id);
    }
  }, [currentConversation]);

  if (!currentConversation) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <ChatHeader conversation={currentConversation} />
      <MessageList messages={messages} />
      <MessageInput />
    </div>
  );
};

export default ChatWindow;