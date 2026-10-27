import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaHome,
  FaUser,
  FaCog,
  FaSignOutAlt,
} from 'react-icons/fa';

const Sidebar = ({ mobile = false, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      icon: FaHome,
      label: 'Chats',
      path: '/chat',
    },
    {
      icon: FaUser,
      label: 'Profile',
      path: '/profile',
    },
    {
      icon: FaCog,
      label: 'Settings',
      path: '/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    if (mobile && onClose) onClose();
  };

  return (
    <div className="w-full h-full min-h-0 bg-primary-600 text-white flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-primary-500 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-xl">
            💬
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-tight">
              ChatFlow
            </p>
            <p className="text-xs text-primary-200">
              Real-time messaging
            </p>
          </div>
        </div>
      </div>

      {/* User */}
      <div className="px-4 py-5 border-b border-primary-500 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full bg-primary-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase() ||
              'U'}
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-primary-600" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-sm text-primary-200 truncate">
              @{user?.username || 'user'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
        <p className="px-3 pt-1 pb-2 text-[11px] uppercase tracking-wider text-primary-300 font-semibold">
          Navigation
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (mobile && onClose) onClose();
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-primary-100 hover:bg-primary-500 hover:text-white'
              }`}
            >
              <Icon className="text-lg flex-shrink-0" />
              <span className="font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary-500 flex-shrink-0">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-primary-100 hover:bg-red-500/90 hover:text-white transition-colors"
        >
          <FaSignOutAlt className="text-lg" />
          <span className="font-medium">
            Logout
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
