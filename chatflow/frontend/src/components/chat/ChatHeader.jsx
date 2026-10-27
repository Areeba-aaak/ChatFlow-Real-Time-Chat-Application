import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  FaArrowLeft,
  FaPhone,
  FaVideo,
  FaEllipsisV,
} from 'react-icons/fa';

const sameId = (a, b) =>
  a !== undefined &&
  a !== null &&
  b !== undefined &&
  b !== null &&
  String(a) === String(b);

const ChatHeader = ({ conversation }) => {
  const { user } = useAuth();
  const { onlineUsers, typingUsers } = useChat();

  const otherUser = conversation.is_group
    ? null
    : conversation.members?.find(
        (member) => !sameId(member.id, user?.id)
      );

  const isOnline =
    !conversation.is_group &&
    otherUser &&
    onlineUsers.some((id) =>
      sameId(id, otherUser.id)
    );

  const currentTypingUsers = typingUsers[conversation.id] || [];

  const isTyping =
    currentTypingUsers.length > 0 &&
    (conversation.is_group ||
      currentTypingUsers.some((item) =>
        sameId(typeof item === 'object' ? item.id : item, otherUser?.id)
      ));

  const typingNames = currentTypingUsers
    .map((item) => (typeof item === 'object' ? item.name : 'Someone'))
    .filter(Boolean);

  const groupOnlineCount = conversation.is_group
    ? (conversation.members || []).filter((member) =>
        onlineUsers.some((id) => sameId(id, member.id))
      ).length
    : 0;

  return (
    <div className="bg-white border-b border-gray-200 px-3 sm:px-5 py-3 flex items-center justify-between flex-shrink-0 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="md:hidden p-2 rounded-full hover:bg-gray-100"
          aria-label="Back"
        >
          <FaArrowLeft className="text-gray-600" />
        </button>

        <div className="relative flex-shrink-0">
          <div className="w-11 h-11 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-lg font-semibold overflow-hidden">
            {conversation.is_group ? (
              '👥'
            ) : otherUser?.avatar ? (
              <img
                src={otherUser.avatar}
                alt={otherUser.full_name || 'User'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              otherUser?.full_name?.charAt(0) || 'U'
            )}
          </div>

          {!conversation.is_group && (
            <span
              className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isOnline
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
            />
          )}
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">
            {conversation.is_group
              ? conversation.name
              : otherUser?.full_name ||
                'Unknown User'}
          </h3>

          <div className="text-xs">
            {isTyping ? (
              <span className="text-primary-500 font-medium truncate block max-w-[220px]">
                {conversation.is_group
                  ? `${typingNames.join(', ')} ${typingNames.length === 1 ? 'is' : 'are'} typing...`
                  : 'typing...'}
              </span>
            ) : conversation.is_group ? (
              <span className="text-gray-500">
                {groupOnlineCount} online · {conversation.members?.length || 0} members
              </span>
            ) : isOnline ? (
              <span className="text-green-600 font-medium">
                Online
              </span>
            ) : (
              <span className="text-gray-400">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <button
          type="button"
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
          title="Voice call"
        >
          <FaPhone className="text-gray-500" />
        </button>

        <button
          type="button"
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
          title="Video call"
        >
          <FaVideo className="text-gray-500" />
        </button>

        <button
          type="button"
          className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
          title="More options"
        >
          <FaEllipsisV className="text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
