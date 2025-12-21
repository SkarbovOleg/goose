import React, { useState, useRef } from 'react';
import { FiSend, FiPaperclip, FiSmile, FiImage, FiX } from 'react-icons/fi';

const MessageInput = ({
  onSend,
  placeholder = 'Введите сообщение...',
  disabled = false,
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() && attachments.length === 0) return;

    onSend({
      text: message.trim(),
      attachments: attachments.map(a => a.file)
    });

    setMessage('');
    setAttachments([]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    const newAttachments = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
      type: file.type.startsWith('image/') ? 'image' : 'file'
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Прикрепленные файлы */}
      {attachments.length > 0 && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Прикреплено файлов: {attachments.length}
            </span>
            <button
              type="button"
              onClick={() => setAttachments([])}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Очистить все
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className="relative bg-white border rounded-lg p-2 group"
              >
                {attachment.type === 'image' ? (
                  <div className="aspect-square overflow-hidden rounded">
                    <img
                      src={attachment.preview}
                      alt={attachment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="p-2">
                    <div className="flex items-center">
                      <FiPaperclip className="text-gray-400 mr-2" />
                      <div className="truncate">
                        <p className="text-sm font-medium truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Форма ввода */}
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Прикрепить файл"
          >
            <FiPaperclip size={20} />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            disabled={disabled}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 relative"
            title="Эмодзи"
          >
            <FiSmile size={20} />
          </button>
        </div>

        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          
          {/* Счетчик символов */}
          {message.length > 0 && (
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
              {message.length}/2000
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className={`p-3 rounded-full ${
            message.trim() || attachments.length > 0
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          } disabled:opacity-50 transition-colors`}
          title="Отправить"
        >
          <FiSend size={20} />
        </button>
      </form>

      {/* Подсказки */}
      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
        <span>Enter — отправить</span>
        <span>Shift + Enter — новая строка</span>
        <span>Макс. размер файла: 10MB</span>
      </div>

      {/* Эмодзи пикер */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 bg-white border rounded-lg shadow-lg p-2">
          <div className="grid grid-cols-8 gap-1">
            {['😀', '😂', '🥰', '😎', '🤔', '👍', '❤️', '🎉'].map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setMessage(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageInput;