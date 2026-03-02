import React, { useState } from 'react';
import { MessageSquare, Users, Clock, Search, Send, Paperclip, X, User } from 'lucide-react';

interface Chat {
  id: string;
  customerName: string;
  customerEmail: string;
  agentName?: string;
  status: 'active' | 'waiting' | 'closed';
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const mockChats: Chat[] = [
  {
    id: '1',
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    agentName: 'Sarah Johnson',
    status: 'active',
    lastMessage: 'I need help with my order',
    lastMessageTime: '2 minutes ago',
    unreadCount: 2,
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    status: 'waiting',
    lastMessage: 'Hello, I have a question',
    lastMessageTime: '5 minutes ago',
    unreadCount: 1,
  },
  {
    id: '3',
    customerName: 'Bob Johnson',
    customerEmail: 'bob@example.com',
    agentName: 'Mike Wilson',
    status: 'active',
    lastMessage: 'Thank you for your help!',
    lastMessageTime: '10 minutes ago',
    unreadCount: 0,
  },
];

export default function LiveChatSupport() {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(chats[0]);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChats = chats.filter(
    (chat) =>
      chat.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!message.trim() || !selectedChat) return;
    // Handle send message logic
    console.log('Sending message:', message);
    setMessage('');
  };

  return (
    <div className="flex h-[calc(100vh-250px)] gap-4">
      {/* Chat List */}
      <div className="w-80 rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">
              Active Chats ({chats.filter((c) => c.status === 'active').length})
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {chats.filter((c) => c.status === 'waiting').length} waiting
            </span>
          </div>
        </div>
        <div className="overflow-y-auto scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`w-full border-b border-gray-200 p-4 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50 ${
                selectedChat?.id === chat.id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {chat.customerName}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {chat.customerEmail}
                  </p>
                  <p className="mt-2 line-clamp-1 text-sm text-gray-700 dark:text-gray-300">
                    {chat.lastMessage}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {chat.lastMessageTime}
                    </span>
                    {chat.agentName && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        • {chat.agentName}
                      </span>
                    )}
                  </div>
                </div>
                {chat.unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 rounded-2xl border border-gray-200 bg-white shadow dark:border-gray-800 dark:bg-gray-900">
        {selectedChat ? (
          <>
            <div className="border-b border-gray-200 p-4 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {selectedChat.customerName}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedChat.customerEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      selectedChat.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
                    }`}
                  >
                    {selectedChat.status}
                  </span>
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex h-[calc(100%-180px)] flex-col">
              <div className="flex-1 overflow-y-auto p-4 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:dark:bg-gray-700">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          i % 2 === 0
                            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white'
                            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">
                          {i % 2 === 0
                            ? 'Agent message here...'
                            : 'Customer message here...'}
                        </p>
                        <p className="mt-1 text-xs opacity-70">
                          {new Date(Date.now() - i * 60000).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <button className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-2 text-white shadow-lg hover:shadow-xl"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500 dark:text-gray-400">Select a chat to start</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

