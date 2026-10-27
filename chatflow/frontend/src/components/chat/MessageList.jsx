import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { format } from 'date-fns';
import {
  FaCheck,
  FaCheckDouble,
} from 'react-icons/fa';

const sameId = (a, b) =>
  a !== undefined &&
  a !== null &&
  b !== undefined &&
  b !== null &&
  String(a) === String(b);

const MessageList = ({ messages = [] }) => {
  const { user } = useAuth();
  const { onlineUsers, currentConversation, typingUsers } = useChat();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const getOtherUserId = () => {
    if (currentConversation?.is_group) return null;

    const otherUser =
      currentConversation?.members?.find(
        (member) => !sameId(member.id, user?.id)
      );

    return otherUser?.id || null;
  };

  const isRecipientOnline = () => {
    const otherUserId = getOtherUserId();

    return Boolean(
      otherUserId &&
      onlineUsers.some((id) => sameId(id, otherUserId))
    );
  };

  /*
   * WhatsApp-style status requested for ChatFlow:
   *
   * ✓       = sent, recipient offline
   * ✓✓      = recipient online / delivered
   * ✓✓ blue = recipient read the message
   */
  const getMessageStatus = (message) => {
    if (!sameId(message.sender_id, user?.id)) {
      return null;
    }

    const hasBeenRead =
      Array.isArray(message.reads) &&
      message.reads.some(
        (read) => !sameId(read.user_id, user?.id)
      );

    if (hasBeenRead) {
      return (
        <FaCheckDouble
          className="text-sky-400 text-[11px]"
          title="Read"
        />
      );
    }

    if (
      message.delivered ||
      isRecipientOnline()
    ) {
      return (
        <FaCheckDouble
          className="text-white/80 text-[11px]"
          title="Delivered"
        />
      );
    }

    return (
      <FaCheck
        className="text-white/70 text-[11px]"
        title="Sent"
      />
    );
  };

  const formatMessageTime = (date) => {
    try {
      return format(new Date(date), 'h:mm a');
    } catch {
      return '';
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};

    messages.forEach((msg) => {
      const date = format(
        new Date(msg.created_at),
        'MMMM d, yyyy'
      );

      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });

    return groups;
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-5 bg-[#f5f7fb]">
      {Object.entries(groupedMessages).map(
        ([date, msgs]) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <span className="px-4 py-1.5 bg-white border border-gray-200 text-gray-500 text-[11px] font-medium rounded-full shadow-sm">
                {date}
              </span>
            </div>

            {msgs.map((message, index) => {
              const isOwn = sameId(
                message.sender_id,
                user?.id
              );

              const showAvatar =
                index === 0 ||
                !sameId(
                  msgs[index - 1]?.sender_id,
                  message.sender_id
                );

              return (
                <div
                  key={message.id || index}
                  className={`flex ${
                    isOwn
                      ? 'justify-end'
                      : 'justify-start'
                  } mb-1.5`}
                >
                  <div
                    className={`flex ${
                      isOwn
                        ? 'flex-row-reverse'
                        : 'flex-row'
                    } items-end gap-2 max-w-[78%] sm:max-w-[70%]`}
                  >
                    {!isOwn && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {message.sender_name?.charAt(0) ||
                          'U'}
                      </div>
                    )}

                    {!isOwn && !showAvatar && (
                      <div className="w-8 flex-shrink-0" />
                    )}

                    <div
                      className={`${
                        isOwn
                          ? 'bg-primary-500 text-white rounded-2xl rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'
                      } px-3.5 py-2 relative min-w-[70px]`}
                    >
                      {message.reply_to_id && (
                        <div className="mb-1 text-xs border-l-2 border-current pl-2 opacity-70">
                          {message.reply_content ||
                            'Reply'}
                        </div>
                      )}

                      {message.type === 'image' && (
                        <img
                          src={message.file_url}
                          alt="Image"
                          className="max-w-[250px] rounded-xl"
                        />
                      )}

                      {message.type === 'file' && (
                        <div
                          className={`flex items-center gap-2 ${
                            isOwn
                              ? 'bg-white/10'
                              : 'bg-gray-100'
                          } rounded-lg p-2`}
                        >
                          <span className="text-2xl">
                            📎
                          </span>
                          <div>
                            <p className="text-sm font-medium">
                              {message.file_name}
                            </p>
                            <p
                              className={`text-xs ${
                                isOwn
                                  ? 'text-white/70'
                                  : 'text-gray-500'
                              }`}
                            >
                              {message.file_size
                                ? `${(
                                    message.file_size /
                                    1024
                                  ).toFixed(1)} KB`
                                : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {message.type === 'voice' && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            🎤
                          </span>
                          <div className="w-32 h-8 bg-black/10 rounded-full flex items-center px-2">
                            <div className="w-full h-1 bg-current rounded-full opacity-50" />
                          </div>
                          <span className="text-xs">
                            {message.file_name ||
                              '0:42'}
                          </span>
                        </div>
                      )}

                      {message.type === 'text' && (
                        <p className="text-sm whitespace-pre-wrap break-words leading-5">
                          {message.content}
                        </p>
                      )}

                      {message.reactions?.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {message.reactions.map(
                            (reaction, idx) => (
                              <span
                                key={idx}
                                className="text-sm"
                              >
                                {reaction.emoji}
                              </span>
                            )
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] opacity-70">
                          {formatMessageTime(
                            message.created_at
                          )}
                        </span>

                        {getMessageStatus(message)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {(typingUsers[currentConversation?.id] || []).length > 0 && (
        <div className="mt-2 flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-white border border-gray-100 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
          <span className="text-xs text-gray-500">
            {(typingUsers[currentConversation?.id] || [])
              .map((item) => typeof item === 'object' ? item.name : 'Someone')
              .join(', ')} {((typingUsers[currentConversation?.id] || []).length === 1) ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
