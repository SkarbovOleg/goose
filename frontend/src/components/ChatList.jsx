import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { 
  FiSearch, 
  FiEdit, 
  FiCheckCircle,
  FiClock,
  FiMessageSquare
} from 'react-icons/fi';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { chatAPI } from '../services/api';
import socketService from '../services/socket';

const ChatList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState([]);

  const { 
    data: chatsData, 
    isLoading: chatsLoading,
    error: chatsError 
  } = useQuery('chats', () => chatAPI.getChats(), {
    refetchOnWindowFocus: false,
    staleTime: 30000
  });

  useEffect(() => {
    if (chatsData?.data?.chats) {
      const filtered = chatsData.data.chats.filter(chat => {
        const chatName = chat.type === 'group' 
          ? chat.name || `Группа ${chat.members_count}`
          : chat.other_user?.username || 'Пользователь';
        
        return chatName.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (chat.last_message?.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      });
      setFilteredChats(filtered);
    }
  }, [chatsData, searchQuery]);

  useEffect(() => {
    const unsubscribe = socketService.on('new_message', () => {
      queryClient.invalidateQueries('chats');
    });

    return () => unsubscribe();
  }, [queryClient]);

  const getChatName = (chat) => {
    if (chat.type === 'group') {
      return chat.name || `Группа (${chat.members_count})`;
    } else {
      return chat.other_user?.username || 'Пользователь';
    }
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') {
      return chat.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || 'Group')}&background=random`;
    } else {
      return chat.other_user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.other_user?.username || 'User')}&background=random`;
    }
  };

  const getLastMessageText = (chat) => {
    if (chat.last_message) {
      const message = chat.last_message;
      if (message.message_type === 'image') {
        return '📷 Изображение';
      } else if (message.message_type === 'file') {
        return '📎 Файл';
      } else {
        return message.content?.substring(0, 50) || '';
      }
    }
    return 'Нет сообщений';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 24 * 60 * 60 * 1000) {
        return format(date, 'HH:mm');
      } else if (diff < 7 * 24 * 60 * 60 * 1000) {
        return format(date, 'EEE', { locale: ru });
      } else {
        return format(date, 'dd.MM.yy');
      }
    } catch {
      return '';
    }
  };

  const handleCreateChat = () => {
    navigate('/new-chat');
  };

  if (chatsLoading) {
    return (
      <div className="w-80 border-r h-full bg-white">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Чаты</h1>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <FiEdit size={20} />
            </button>
          </div>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              disabled
            />
          </div>
        </div>
        <div className="p-4 text-center text-gray-500">
          Загрузка чатов...
        </div>
      </div>
    );
  }

  if (chatsError) {
    return (
      <div className="w-80 border-r h-full bg-white">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-gray-900">Чаты</h1>
        </div>
        <div className="p-4 text-center text-red-500">
          Ошибка загрузки чатов
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-r h-full bg-white flex flex-col">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-gray-900">Чаты</h1>
          <button
            onClick={handleCreateChat}
            className="p-2 hover:bg-gray-100 rounded-full"
            title="Новый чат"
          >
            <FiEdit size={20} />
          </button>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <FiMessageSquare className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 mb-2">Чатов пока нет</p>
            <button
              onClick={handleCreateChat}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Создать первый чат
            </button>
          </div>
        ) : (
          filteredChats.map(chat => (
            <Link
              key={chat.id}
              to={`/chat/${chat.id}`}
              className="flex items-center p-4 hover:bg-gray-50 border-b"
            >
              <div className="relative">
                <img
                  src={getChatAvatar(chat)}
                  alt={getChatName(chat)}
                  className="w-12 h-12 rounded-full object-cover"
                />
                {chat.type === 'private' && chat.other_user?.status === 'online' && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {getChatName(chat)}
                  </h3>
                  {chat.last_message_at && (
                    <span className="text-xs text-gray-500">
                      {formatTime(chat.last_message_at)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center">
                  {chat.unread_count > 0 ? (
                    <FiCheckCircle className="text-blue-500 mr-2" size={14} />
                  ) : (
                    <FiCheck className="text-gray-400 mr-2" size={14} />
                  )}
                  <p className="text-sm text-gray-600 truncate">
                    {getLastMessageText(chat)}
                  </p>
                </div>
                
                {chat.unread_count > 0 && (
                  <div className="mt-1">
                    <span className="inline-block bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {chat.unread_count} новое
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;