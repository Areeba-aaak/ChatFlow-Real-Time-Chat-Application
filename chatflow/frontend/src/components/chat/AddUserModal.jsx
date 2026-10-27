import React, { useEffect, useState } from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';
import toast from 'react-hot-toast';
import authService from '../../services/authService';

const initialForm = {
  fullName: '',
  username: '',
  email: '',
  password: '',
};

const AddUserModal = ({ isOpen, onClose, onUserAdded }) => {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initialForm);
      setSaving(false);
    }
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.fullName.trim() || !form.username.trim() || !form.email.trim() || !form.password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSaving(true);
      const createdUser = await authService.createInternalUser({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      toast.success(`${createdUser?.full_name || form.fullName} was added successfully`);
      await onUserAdded?.(createdUser);
      onClose();
    } catch (error) {
      console.error('Error adding user:', error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          'Failed to add user'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <FaUserPlus className="text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-800">Add User</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Add a person to ChatFlow as a normal user.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              maxLength={100}
              autoFocus
              disabled={saving}
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              maxLength={30}
              disabled={saving}
              placeholder="john_doe"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-400">Letters, numbers and underscores only.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              disabled={saving}
              placeholder="john@example.com"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Initial password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              disabled={saving}
              placeholder="Create a password for this user"
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-400">Use at least 6 characters, including uppercase, lowercase, number and special character.</p>
          </div>

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
            >
              {saving ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
