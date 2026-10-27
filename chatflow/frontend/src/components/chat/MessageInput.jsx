import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { FaSmile, FaPaperclip, FaPaperPlane, FaTimes } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const MessageInput = () => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);
  const { currentConversation, sendMessage, sendTyping } = useChat();
  const { user } = useAuth();
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentConversation) {
      inputRef.current?.focus();
    }
  }, [currentConversation]);

  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Typing indicator
    if (value.length > 0) {
      sendTyping(currentConversation?.id, true);
      clearTimeout(typingTimeoutRef.current);
    } else {
      sendTyping(currentConversation?.id, false);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(currentConversation?.id, false);
    }, 3000);
  };

  const handleSend = async () => {
    if (!message.trim() && !file) return;

    setUploading(true);

    try {
      let fileData = null;
      if (file) {
        // In production, upload to server
        const reader = new FileReader();
        const fileContent = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        });

        fileData = {
          fileUrl: fileContent,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        };
      }

      const result = await sendMessage({
        content: message.trim(),
        type: file ? getFileType(file) : 'text',
        ...fileData,
      });

      if (result.success) {
        setMessage('');
        setFile(null);
        sendTyping(currentConversation?.id, false);
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setUploading(false);
    }
  };

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'voice';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setFile(file);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'video/*': ['.mp4', '.webm', '.mov'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const removeFile = () => setFile(null);

  if (!currentConversation) return null;

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3">
      {/* File Preview */}
      {file && (
        <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {file.type.startsWith('image/') ? '🖼️' : '📎'}
            </span>
            <div>
              <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji Picker */}
        <div className="relative">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
          >
            <FaSmile className="text-xl" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-10">
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  setMessage(prev => prev + emoji.emoji);
                  setShowEmojiPicker(false);
                }}
                theme="light"
                searchPlaceholder="Search emojis..."
                width={320}
                height={400}
              />
            </div>
          )}
        </div>

        {/* File Attachment */}
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
            <FaPaperclip className="text-xl" />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Write a message..."
            className="w-full px-4 py-2 bg-gray-100 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={1}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            disabled={uploading}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !file) || uploading}
          className={`p-2 rounded-full transition-colors ${
            (!message.trim() && !file) || uploading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          }`}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FaPaperPlane className="text-xl" />
          )}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;