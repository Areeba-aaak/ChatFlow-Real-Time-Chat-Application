import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaSearch, FaUser, FaUsers } from 'react-icons/fa';
import userService from '../../services/userService';
import { conversationService } from '../../services/conversationService';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const NewConversationModal = ({ isOpen, onClose, onSelectUser, onGroupCreated }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('private');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectingUser, setSelectingUser] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode('private');
    setGroupName('');
    setSelectedUsers([]);
    setSearchTerm('');
    loadUsers();
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userService.getUsers(1, 50);
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      setUsers(data.filter((item) => String(item.id) !== String(currentUser?.id)));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error(error?.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (user) => user?.full_name || user?.username || 'Unknown User';
  const getInitial = (user) => getUserName(user).charAt(0).toUpperCase();

  const filteredUsers = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    if (!search) return users;

    return users.filter((item) => {
      const fullName = item?.full_name || '';
      const username = item?.username || '';
      const email = item?.email || '';
      return (
        fullName.toLowerCase().includes(search) ||
        username.toLowerCase().includes(search) ||
        email.toLowerCase().includes(search)
      );
    });
  }, [users, searchTerm]);

  const isSelected = (userId) =>
    selectedUsers.some((id) => String(id) === String(userId));

  const toggleUser = (selectedUser) => {
    if (!selectedUser?.id) return;

    setSelectedUsers((prev) => {
      if (prev.some((id) => String(id) === String(selectedUser.id))) {
        return prev.filter((id) => String(id) !== String(selectedUser.id));
      }
      return [...prev, selectedUser.id];
    });
  };

  const handlePrivateUser = async (selectedUser) => {
    if (!selectedUser?.id || selectingUser) return;

    try {
      setSelectingUser(true);
      await onSelectUser?.(selectedUser);
    } catch (error) {
      console.error('Error selecting user:', error);
    } finally {
      setSelectingUser(false);
    }
  };

  const handleCreateGroup = async () => {
    const name = groupName.trim();

    if (!name) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedUsers.length < 2) {
      toast.error('Select at least 2 people for a group');
      return;
    }

    try {
      setSelectingUser(true);
      const response = await conversationService.createGroup(name, selectedUsers);
      const conversation =
        response?.data?.conversation ||
        response?.data ||
        response?.conversation ||
        response;

      if (!conversation?.id) {
        throw new Error('Group was created but no conversation was returned');
      }

      toast.success('Group created successfully');
      await onGroupCreated?.(conversation);
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to create group');
    } finally {
      setSelectingUser(false);
    }
  };

  const handleClose = () => {
    if (selectingUser) return;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">New Conversation</h2>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'private' ? 'Select a user to start chatting' : 'Create a group conversation'}
            </p>
          </div>
          <button type="button" onClick={handleClose} disabled={selectingUser} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <FaTimes />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 pt-4">
          <button
            type="button"
            onClick={() => setMode('private')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'private' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <FaUser /> Private
          </button>
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${mode === 'group' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            <FaUsers /> Group
          </button>
        </div>

        {mode === 'group' && (
          <div className="px-5 pt-4">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              maxLength={100}
              disabled={selectingUser}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            {selectedUsers.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">{selectedUsers.length} people selected</p>
            )}
          </div>
        )}

        <div className="px-5 pt-4">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users..."
              disabled={loading || selectingUser}
              className="w-full rounded-lg bg-gray-100 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No users found</div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((item) => {
                const selected = isSelected(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => mode === 'private' ? handlePrivateUser(item) : toggleUser(item)}
                    disabled={selectingUser}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors disabled:opacity-60 ${selected ? 'bg-primary-50 ring-1 ring-primary-300' : 'hover:bg-gray-100'}`}
                  >
                    {item.avatar_url || item.avatar ? (
                      <img src={item.avatar_url || item.avatar} alt={getUserName(item)} className="h-11 w-11 flex-shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-semibold text-primary-600">
                        {getInitial(item)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-gray-800">{getUserName(item)}</p>
                      <p className="truncate text-sm text-gray-500">@{item.username || 'user'}</p>
                    </div>

                    {mode === 'group' ? (
                      <span className={`h-5 w-5 rounded-full border-2 ${selected ? 'border-primary-500 bg-primary-500' : 'border-gray-300'}`}>
                        {selected && <span className="block text-center text-xs leading-4 text-white">✓</span>}
                      </span>
                    ) : item.is_online ? (
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-green-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3">
          {mode === 'group' ? (
            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={selectingUser}
              className="w-full rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {selectingUser ? 'Creating...' : 'Create Group'}
            </button>
          ) : (
            <button type="button" onClick={handleClose} disabled={selectingUser} className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewConversationModal;
