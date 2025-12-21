import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  FiSend, 
  FiPaperclip, 
  FiChevronLeft,
  FiMoreVertical,
  FiImage,
  FiSmile
} from 'react-icons/fi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { chatAPI } from '../services/api';
import socketService from '../services/socket';
import { useAuth } from '../context/AuthContext';

const ChatWindow = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chatInfo, setChatInfo] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { data: chatData, isLoading: chatLoading } = useQuery(
    ['chat', chatId],
    () => chatAPI.getChat(chatId),
    {
      enabled: !!chatId,
      staleTime: 30000
    }
  );

  const { data: messagesData, isLoading: messagesLoading } = useQuery(
    ['messages', chatId],
    () => chatAPI.getMessages(chatId),
    {
      enabled: !!chatId,
      staleTime: 0
    }
  );

  const sendMessageMutation = useMutation(
    (content) => chatAPI.sendMessage(chatId, content),
    {
      onSuccess: () => {
        setNewMessage('');
        queryClient.invalidateQueries(['messages', chatId]);
      }
    }
  );

  useEffect(() => {
    if (chatData?.data) {
      setChatInfo(chatData.data.chat);
    }
  }, [chatData]);

  useEffect(() => {
    if (messagesData?.data) {
      setMessages(messagesData.data.messages || []);
    }
  }, [messagesData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const unsubscribeNewMessage = socketService.addMessageListener(chatId, handleNewMessage);
    const unsubscribeTyping = socketService.addTypingListener(chatId, handleTyping);

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
    };
  }, [chatId]);

  const handleNewMessage = (data) => {
    setMessages(prev => [...prev, data.message]);
    queryClient.invalidateQueries(['messages', chatId]);
  };

  const handleTyping = (data) => {
    if (data.isTyping) {
      setTypingUsers(prev => {
        if (!prev.includes(data.username)) {
          return [...prev, data.username];
        }
        return prev;
      });
    } else {
      setTypingUsers(prev => prev.filter(user => user !== data.username));
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate(newMessage.trim());
    socketService.typingStop(chatId);
  };

  const handleTypingStart = () => {
    socketService.typingStart(chatId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = () => {
    if (!chatInfo) return 'Загрузка...';
    
    if (chatInfo.type === 'group') {
      return chatInfo.name || `Группа (${chatInfo.participants?.length || 0})`;
    } else {
      const otherUser = chatInfo.participants?.find(p => p.id !== user?.id);
      return otherUser?.username || 'Пользователь';
    }
  };

  const getChatAvatar = () => {
    if (!chatInfo) return '';
    
    if (chatInfo.type === 'group') {
      return chatInfo.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatInfo.name || 'Group')}&background=random`;
    } else {
      const otherUser = chatInfo.participants?.find(p => p.id !== user?.id);
      return otherUser?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || 'User')}&background=random`;
    }
  };

  const renderMessage = (message) => {
    const isOwn = message.sender_id === user?.id;
    
    return (
      <div
        key={message.id}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-xs md:max-w-md lg:max-w-lg ${isOwn ? 'ml-auto' : 'mr-auto'}`}>
          {!isOwn && (
            <div className="flex items-center mb-1">
              <img
                src={message.sender_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender_username)}&background=random`}
                alt={message.sender_username}
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="font-medium text-sm">
                {message.sender_username}
              </span>
            </div>
          )}
          
          <div
            className={`rounded-lg px-4 py-2 ${
              isOwn
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }`}
          >
            {message.message_type === 'image' ? (
              <img
                src={message.content}
                alt="Изображение"
                className="max-w-full rounded"
              />
            ) : message.message_type === 'file' ? (
              <div className="flex items-center">
                <FiPaperclip className="mr-2" />
                <span>{message.content}</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )}
            
            <div className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>
              {format(new Date(message.sent_at), 'HH:mm', { locale: ru })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (chatLoading || messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Заголовок чата */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="md:hidden mr-3 text-gray-600 hover:text-gray-900"
          >
            <FiChevronLeft size={20} />
          </button>
          <div className="flex items-center">
            <img
              src={getChatAvatar()}
              alt={getChatName()}
              className="w-10 h-10 rounded-full mr-3"
            />
            <div>
              <h3 className="font-semibold text-gray-900">{getChatName()}</h3>
              {typingUsers.length > 0 && (
                <p className="text-sm text-blue-500">
                  {typingUsers.join(', ')} печатает...
                </p>
              )}
            </div>
          </div>
        </div>
        
        <button className="p-2 hover:bg-gray-100 rounded-full">
          <FiMoreVertical size={20} />
        </button>
      </div>

      {/* Сообщения */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Начните общение первым!</p>
            <p className="text-sm mt-1">Напишите сообщение ниже</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Форма отправки сообщения */}
      <form onSubmit={handleSendMessage} className="border-t p-4 bg-white">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <FiPaperclip size={20} />
          </button>
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <FiImage size={20} />
          </button>
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <FiSmile size={20} />
          </button>
          
          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTypingStart();
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Введите сообщение..."
              className="w-full border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isLoading}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50"
          >
            <FiSend size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;