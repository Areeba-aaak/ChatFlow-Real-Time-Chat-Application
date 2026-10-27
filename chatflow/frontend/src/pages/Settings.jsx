import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaBell, FaMoon, FaGlobe, FaLock, FaChevronRight, FaSignOutAlt } from 'react-icons/fa';

const Settings = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'English',
    twoFactor: false
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-xl font-bold text-primary-600">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-800">{user?.full_name}</p>
            <p className="text-sm text-gray-500">@{user?.username}</p>
          </div>
          <FaChevronRight className="text-gray-400" />
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Preferences
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaBell className="text-gray-400" />
                <span className="text-gray-700">Notifications</span>
              </div>
              <button
                onClick={() => toggleSetting('notifications')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.notifications ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.notifications ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaMoon className="text-gray-400" />
                <span className="text-gray-700">Dark Mode</span>
              </div>
              <button
                onClick={() => toggleSetting('darkMode')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.darkMode ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.darkMode ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Security
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaLock className="text-gray-400" />
                <span className="text-gray-700">Two-Factor Authentication</span>
              </div>
              <button
                onClick={() => toggleSetting('twoFactor')}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  settings.twoFactor ? 'bg-primary-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  settings.twoFactor ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
            Language
          </h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaGlobe className="text-gray-400" />
              <span className="text-gray-700">App Language</span>
            </div>
            <select className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </button>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-medium text-red-500 uppercase tracking-wider mb-3">
            Danger Zone
          </h2>
          <button className="w-full text-left text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;