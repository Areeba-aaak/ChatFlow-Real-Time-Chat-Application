import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import ConversationList from '../components/conversation/ConversationList';
import NotificationPanel from '../components/notification/NotificationPanel';
import { useChat } from '../context/ChatContext';

const ChatLayout = () => {
  const {
    currentConversation,
    setCurrentConversation,
  } = useChat();

  const [showMobileMenu, setShowMobileMenu] =
    useState(false);
  const [showNotifications, setShowNotifications] =
    useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-gray-50">
      {/* Main navigation sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 h-full">
        <Sidebar />
      </aside>

      {/* Mobile navigation */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 md:hidden"
          onClick={() => setShowMobileMenu(false)}
        >
          <aside
            className="w-72 max-w-[85vw] h-full bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              mobile
              onClose={() => setShowMobileMenu(false)}
            />
          </aside>
        </div>
      )}

      {/* Conversation list */}
      <aside className="w-full md:w-80 lg:w-96 flex-shrink-0 h-full border-r border-gray-200 bg-white">
        <ConversationList
          onSelect={setCurrentConversation}
          selectedId={currentConversation?.id}
          onMenuToggle={() => setShowMobileMenu(true)}
          onNotificationToggle={() =>
            setShowNotifications((value) => !value)
          }
        />
      </aside>

      {/* Chat */}
      <main className="flex-1 min-w-0 min-h-0 h-full flex flex-col">
        <Outlet />
      </main>

      {/* Notifications */}
      {showNotifications && (
        <div className="fixed right-0 top-0 h-[100dvh] w-96 max-w-[90vw] bg-white shadow-2xl z-[70]">
          <NotificationPanel
            onClose={() => setShowNotifications(false)}
          />
        </div>
      )}
    </div>
  );
};

export default ChatLayout;
