import React, { useState, useEffect } from 'react';

import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

import NewConversationModal from '../chat/NewConversationModal';
import AddUserModal from '../chat/AddUserModal';

import {
  FaSearch,
  FaPlus,
  FaCircle,
  FaBell,
  FaUserPlus,
} from 'react-icons/fa';

import toast from 'react-hot-toast';
import { conversationService } from '../../services/conversationService';

const ConversationList = ({
  onSelect,
  selectedId,
  onMenuToggle,
  onNotificationToggle,
}) => {
  const {
    conversations,
    onlineUsers,
    unreadCounts,
    unreadNotificationCount,
    loading,
    fetchConversations,
    setCurrentConversation,
  } = useChat();

  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] =
    useState([]);

  const [showNewConversationModal, setShowNewConversationModal] =
    useState(false);

  const [showAddUserModal, setShowAddUserModal] =
    useState(false);

  const [creatingConversation, setCreatingConversation] =
    useState(false);

  /*
   * Filter conversations when search text changes
   */
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = conversations.filter((conv) => {
        const name = conv.is_group
          ? conv.name
          : conv.members?.find(
              (member) => member.id !== user?.id
            )?.full_name || '';

        return name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      });

      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchQuery, conversations, user]);

  /*
   * Get conversation name
   */
  const getConversationName = (conversation) => {
    if (conversation.is_group) {
      return conversation.name;
    }

    const otherUser = conversation.members?.find(
      (member) => member.id !== user?.id
    );

    return otherUser?.full_name || 'Unknown User';
  };

  /*
   * Get conversation avatar
   */
  const getConversationAvatar = (conversation) => {
    if (conversation.is_group) {
      return '👥';
    }

    const otherUser = conversation.members?.find(
      (member) => member.id !== user?.id
    );

    return (
      otherUser?.avatar ||
      otherUser?.full_name?.charAt(0) ||
      'U'
    );
  };

  /*
   * Check whether the other user is online
   */
  const isUserOnline = (conversation) => {
    if (conversation.is_group) {
      return false;
    }

    const otherUser = conversation.members?.find(
      (member) => member.id !== user?.id
    );

    return (
      otherUser &&
      onlineUsers.some(
        (id) => String(id) === String(otherUser.id)
      )
    );
  };

  /*
   * Get last message time
   */
  const getLastMessageTime = (conversation) => {
    if (!conversation.last_message_at) {
      return '';
    }

    return formatDistanceToNow(
      new Date(conversation.last_message_at),
      {
        addSuffix: true,
      }
    );
  };

  /*
   * Get last message preview
   */
  const getLastMessagePreview = (conversation) => {
    if (!conversation.last_message) {
      return 'No messages yet';
    }

    const msg = conversation.last_message;

    if (msg.type === 'image') {
      return '📷 Photo';
    }

    if (msg.type === 'file') {
      return `📎 ${msg.file_name || 'File'}`;
    }

    if (msg.type === 'voice') {
      return '🎤 Voice message';
    }

    if (msg.type === 'video') {
      return '🎥 Video';
    }

    return msg.content || 'Message';
  };

  /*
   * Open New Conversation modal
   */
  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  /*
   * Close New Conversation modal
   */
  const handleCloseNewConversation = () => {
    if (creatingConversation) {
      return;
    }

    setShowNewConversationModal(false);
  };

  /*
   * Create private conversation
   */
  const handleSelectUser = async (selectedUser) => {
    if (!selectedUser?.id) {
      toast.error('Invalid user selected');
      return;
    }

    if (
      Number(selectedUser.id) === Number(user?.id)
    ) {
      toast.error(
        'You cannot start a conversation with yourself'
      );
      return;
    }

    try {
      setCreatingConversation(true);

      /*
       * Create private conversation through backend
       */
      const response =
        await conversationService.createPrivate(
          selectedUser.id
        );

      console.log(
        'Private conversation response:',
        response
      );

      /*
       * Try to get conversation from API response
       */
      let newConversation =
        response?.data ||
        response?.conversation ||
        response;

      /*
       * If response contains:
       * { data: { conversation: {...} } }
       */
      if (
        newConversation &&
        !newConversation.id &&
        newConversation.conversation
      ) {
        newConversation =
          newConversation.conversation;
      }

      /*
       * Refresh conversation list
       */
      await fetchConversations();

      /*
       * If backend did not return the complete
       * conversation, fetch the latest conversations
       * directly and find it.
       */
      if (!newConversation?.id) {
        const latestResponse =
          await conversationService.getConversations();

        const latestConversations =
          Array.isArray(latestResponse?.data)
            ? latestResponse.data
            : Array.isArray(latestResponse)
            ? latestResponse
            : [];

        const foundConversation =
          latestConversations.find((conversation) => {
            if (conversation.is_group) {
              return false;
            }

            return conversation.members?.some(
              (member) =>
                Number(member.id) ===
                Number(selectedUser.id)
            );
          });

        if (foundConversation) {
          newConversation = foundConversation;
        }
      }

      /*
       * Open the newly created conversation
       */
      if (newConversation?.id) {
        setCurrentConversation(newConversation);

        if (onSelect) {
          onSelect(newConversation);
        }

        setShowNewConversationModal(false);

        toast.success('Conversation started');
      } else {
        /*
         * Conversation was created but could not
         * be identified on the frontend.
         */
        setShowNewConversationModal(false);

        toast.success(
          'Conversation created. Please select it from the list.'
        );
      }
    } catch (error) {
      console.error(
        'Error creating conversation:',
        error
      );

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Failed to create conversation';

      toast.error(message);
    } finally {
      setCreatingConversation(false);
    }
  };

  /*
   * Loading conversations
   */
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>

          <p className="mt-3 text-gray-500">
            Loading conversations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">
            ChatFlow
          </h2>

          <p className="text-sm text-gray-500">
            {conversations.length} conversations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Notifications */}
          <button
            type="button"
            onClick={onNotificationToggle}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
          >
            <FaBell className="text-gray-600" />

            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Add User */}
          <button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Add user"
            aria-label="Add user"
          >
            <FaUserPlus className="text-gray-600" />
          </button>

          {/* Mobile menu */}
          <button
            type="button"
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(e.target.value)
            }
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Online users summary */}
      <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span><strong className="text-gray-700">{onlineUsers.length}</strong> users online</span>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">
              No conversations found
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const isSelected =
              selectedId === conversation.id;

            const unreadCount =
              unreadCounts[conversation.id] || 0;

            const avatar =
              getConversationAvatar(conversation);

            return (
              <div
                key={conversation.id}
                className={`sidebar-item ${
                  isSelected
                    ? 'sidebar-item-active'
                    : ''
                }`}
                onClick={() =>
                  onSelect(conversation)
                }
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold overflow-hidden">
                    {typeof avatar === 'string' &&
                    avatar.startsWith('http') ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      avatar
                    )}
                  </div>

                  {!conversation.is_group &&
                    isUserOnline(conversation) && (
                      <span
                        className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white"
                        title="Online"
                      />
                    )}
                </div>

                {/* Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800 truncate">
                      {getConversationName(
                        conversation
                      )}
                    </span>

                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                      {getLastMessageTime(
                        conversation
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 truncate flex-1">
                      {getLastMessagePreview(
                        conversation
                      )}
                    </span>

                    {unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-primary-500 text-white text-xs rounded-full flex-shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Conversation Button */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          type="button"
          onClick={() => setShowAddUserModal(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary-500 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
        >
          <FaUserPlus />
          Add User
        </button>
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={creatingConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FaPlus />
          New Conversation
        </button>
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={showNewConversationModal}
        onClose={handleCloseNewConversation}
        onSelectUser={handleSelectUser}
        onGroupCreated={async (conversation) => {
          await fetchConversations();
          setCurrentConversation(conversation);
        }}
      />

      <AddUserModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        onUserAdded={async (createdUser) => {
          await fetchConversations();
          if (createdUser?.id) {
            await handleSelectUser(createdUser);
          }
        }}
      />
    </div>
  );
};

export default ConversationList;