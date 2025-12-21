import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import { FiLogOut, FiUser, FiMessageSquare } from 'react-icons/fi';
import socketService from '../services/socket';

const HomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Подключаем WebSocket при загрузке домашней страницы
    if (user) {
      const token = localStorage.getItem('goose_token');
      if (token) {
        socketService.connect(token);
      }
    }

    return () => {
      socketService.disconnect();
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Верхняя панель */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Логотип и название */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">🦢</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 hidden md:block">
              Goose Messenger
            </h1>
            <span className="text-sm text-gray-500 hidden md:block">
              Добро пожаловать, {user?.username}!
            </span>
          </div>

          {/* Действия пользователя */}
          <div className="flex items-center space-x-2">
            {/* Профиль */}
            <button
              onClick={handleProfile}
              className="p-2 hover:bg-gray-100 rounded-full"
              title="Профиль"
            >
              <FiUser size={20} />
            </button>

            {/* Выход */}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-full text-red-500"
              title="Выход"
            >
              <FiLogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Основной контент */}
      <div className="flex-1 flex overflow-hidden">
        {/* Список чатов (скрыт на мобильных при открытом чате) */}
        <div className="hidden md:block">
          <ChatList />
        </div>

        {/* Чат или заглушка */}
        <div className="flex-1 flex">
          <Routes>
            <Route path="/" element={
              <div className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-md text-center">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FiMessageSquare className="text-blue-500" size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Добро пожаловать в Goose!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Выберите чат из списка слева или создайте новый, чтобы начать общение.
                    Все сообщения защищены end-to-end шифрованием.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={() => navigate('/new-chat')}
                      className="py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Новый чат
                    </button>
                    <button
                      onClick={handleProfile}
                      className="py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Настройки профиля
                    </button>
                  </div>
                </div>
              </div>
            } />
            <Route path="/chat/:chatId" element={<ChatWindow />} />
          </Routes>
        </div>
      </div>

      {/* Мобильная навигация */}
      <div className="md:hidden border-t bg-white">
        <div className="flex justify-around py-2">
          <button
            onClick={() => navigate('/')}
            className="flex flex-col items-center p-2 text-blue-500"
          >
            <FiMessageSquare size={24} />
            <span className="text-xs mt-1">Чаты</span>
          </button>
          <button
            onClick={handleProfile}
            className="flex flex-col items-center p-2 text-gray-500"
          >
            <FiUser size={24} />
            <span className="text-xs mt-1">Профиль</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center p-2 text-red-500"
          >
            <FiLogOut size={24} />
            <span className="text-xs mt-1">Выход</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;