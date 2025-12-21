import React from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';

const ChatPage = () => {
  const { chatId } = useParams();

  if (!chatId) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Чат не выбран
          </h2>
          <p className="text-gray-600">
            Выберите чат из списка или создайте новый
          </p>
        </div>
      </div>
    );
  }

  return <ChatWindow />;
};

export default ChatPage;