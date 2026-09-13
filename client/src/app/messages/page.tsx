'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { useConversations, useConversation } from '@/hooks/useNotificationsAndMessages';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Send, Phone, Info, Search, Loader2 } from 'lucide-react';

const MessagesPage: FC = () => {
  const { user } = useAuth();
  const { data: conversationsData } = useConversations({ limit: 50 });
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const { data: conversationData } = useConversation(selectedConversation?.id);
  const { joinConversation, sendMessage, notifyTyping, markAsRead, isConnected, typingUsers, onlineUsers } = useSocket();

  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Conversations list
  const conversations = conversationsData?.data || [];

  // Messages for selected conversation
  const messages = conversationData?.data || [];

  // Join conversation when selected
  useEffect(() => {
    if (!selectedConversation?.id || !isConnected) return;

    const handleJoin = async () => {
      try {
        await joinConversation(selectedConversation.id);
        await markAsRead(selectedConversation.id);
      } catch (error) {
        console.error('Failed to join conversation:', error);
      }
    };

    handleJoin();
  }, [selectedConversation?.id, isConnected]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      notifyTyping(selectedConversation?.id, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      notifyTyping(selectedConversation?.id, false);
    }, 1500);
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedConversation) {
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(selectedConversation.id, messageText.trim());
      setMessageText('');
      setIsTyping(false);
      notifyTyping(selectedConversation?.id, false);
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const isUserOnline = (userId: string) => onlineUsers.has(userId);
  const isUserTyping = (appId: string) => typingUsers.some((t) => t.applicationId === appId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Conversations Sidebar */}
      <div className="w-96 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            conversations.map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-3 cursor-pointer border-b transition-colors ${
                  selectedConversation?.id === conv.id
                    ? 'bg-blue-50 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conv.otherParty.avatar} />
                      <AvatarFallback>{conv.otherParty.name?.[0]}</AvatarFallback>
                    </Avatar>
                    {isUserOnline(conv.otherParty.email) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold truncate">{conv.otherParty.name}</h3>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-blue-600 text-white">{conv.unreadCount}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="p-4 border-b flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={selectedConversation.otherParty.avatar} />
                  <AvatarFallback>{selectedConversation.otherParty.name?.[0]}</AvatarFallback>
                </Avatar>
                {isUserOnline(selectedConversation.otherParty.email) && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <h2 className="font-semibold">{selectedConversation.otherParty.name}</h2>
                <p className="text-xs text-gray-500">
                  {isUserOnline(selectedConversation.otherParty.email) ? 'Active now' : 'Offline'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Info className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {!messages || messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((message: any, index: number) => {
                const isOwn = message.sender.id === user?.id;
                const showAvatar = 
                  !messages[index + 1] || 
                  messages[index + 1].sender.id !== message.sender.id;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isOwn && (
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={message.sender.photoUrl} />
                        <AvatarFallback>{message.sender.name?.[0]}</AvatarFallback>
                      </Avatar>
                    )}

                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-300 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div
                        className={`text-xs mt-1 flex items-center gap-1 ${
                          isOwn ? 'text-blue-100' : 'text-gray-600'
                        }`}
                      >
                        <span>
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isOwn && message.isRead && '✓✓'}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {isUserTyping(selectedConversation?.id) && (
              <div className="flex gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedConversation.otherParty.avatar} />
                  <AvatarFallback>{selectedConversation.otherParty.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="bg-gray-300 px-4 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={handleInputChange}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1"
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || isSending || !isConnected}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-600 mb-2">
              Select a conversation
            </h2>
            <p className="text-gray-500">Choose a conversation to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;