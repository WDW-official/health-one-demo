'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, MessageCircle, Minimize2, RefreshCw, Search, Send, Users } from 'lucide-react';

import { ApiClient } from '@/lib/api-client';
import { getCurrentUser } from '@/lib/auth';
import { ChatMessage, ChatUser, User } from '@/lib/types';
import { getErrorMessage } from '@/lib/error-message';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/loading-state';
import { toast } from '@/hooks/use-toast';

const CHAT_LIMIT = 75;
const CHAT_USER_POLL_MS = 10 * 1000;
const ACTIVE_CHAT_POLL_MS = 5 * 1000;

function formatMessageTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardChatPage() {
  const [user] = useState<User | null>(() => getCurrentUser());
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentUserId = user?.id;
  const selectedUserId = selectedUser?.id;
  const displayedChatUsers = selectedUser && !chatUsers.some((chatUser) => chatUser.id === selectedUser.id)
    ? [selectedUser, ...chatUsers]
    : chatUsers;
  const totalUnread = chatUsers.reduce((sum, chatUser) => sum + (chatUser.unreadCount || 0), 0);

  const loadUsers = useCallback(async () => {
    try {
      const response = await ApiClient.getChatUsers({ search: searchTerm.trim() || undefined });
      const users = (response?.data || response?.users || []).filter(
        (chatUser: ChatUser) => chatUser.id !== currentUserId
      );
      setChatUsers(users);
      setSelectedUser((current) => {
        if (!current) return users[0] || null;
        const refreshedCurrent = users.find((chatUser: ChatUser) => chatUser.id === current.id);
        return refreshedCurrent ? { ...refreshedCurrent, unreadCount: current.unreadCount || 0 } : current;
      });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUserId, searchTerm]);

  const loadMessages = useCallback(async (recipientId: string) => {
    try {
      const response = await ApiClient.getChatMessages({ limit: CHAT_LIMIT, recipientId });
      setMessages(response?.data || response?.messages || []);
      setChatUsers((current) =>
        current.map((chatUser) =>
          chatUser.id === recipientId ? { ...chatUser, unreadCount: 0 } : chatUser
        )
      );
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    const searchDelay = window.setTimeout(() => {
      setIsLoadingUsers(true);
      void loadUsers();
    }, 250);

    return () => window.clearTimeout(searchDelay);
  }, [loadUsers]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void loadUsers();
    }, CHAT_USER_POLL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadUsers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }

    const initialLoad = window.setTimeout(() => {
      setIsLoadingMessages(true);
      void loadMessages(selectedUserId);
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void loadMessages(selectedUserId);
    }, ACTIVE_CHAT_POLL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void loadMessages(selectedUserId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadMessages, selectedUserId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages.length, selectedUser?.id]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const maxHeight = 112;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [draft]);

  const handleSelectUser = (chatUser: ChatUser) => {
    if (chatUser.id === currentUserId) {
      setError('Choose another user to chat with.');
      return;
    }

    setSelectedUser({ ...chatUser, unreadCount: 0 });
    setChatUsers((current) =>
      current.map((item) => (item.id === chatUser.id ? { ...item, unreadCount: 0 } : item))
    );
    setDraft('');
    setMessages([]);
  };

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !selectedUser) return;
    if (selectedUser.id === currentUserId) {
      setError('Choose another user to chat with.');
      return;
    }

    try {
      setIsSending(true);
      setError('');
      const response = await ApiClient.sendChatMessage(message, selectedUser.id);
      const sentMessage = response?.data || response?.chatMessage;
      if (sentMessage?.id) {
        setMessages((current) => [...current, sentMessage].slice(-CHAT_LIMIT));
        setChatUsers((current) =>
          current
            .map((chatUser) =>
              chatUser.id === selectedUser.id
                ? {
                    ...chatUser,
                    latestMessage: message,
                    latestAt: sentMessage.createdAt,
                  }
                : chatUser
            )
            .sort((a, b) => {
              const aTime = a.latestAt ? new Date(a.latestAt).getTime() : 0;
              const bTime = b.latestAt ? new Date(b.latestAt).getTime() : 0;
              if (aTime !== bTime) return bTime - aTime;
              return a.name.localeCompare(b.name);
            })
        );
      } else {
        await loadMessages(selectedUser.id);
      }
      setDraft('');
      await loadMessages(selectedUser.id);
      void loadUsers();
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to send message');
      setError(message);
      toast({ title: 'Message not sent', description: message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Chat</h1>
          <p className="mt-1 text-gray-600">
            Pick a user and chat privately between the two of you.
            {totalUnread > 0 && (
              <span className="ml-2 inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {totalUnread} new
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsLoadingUsers(true);
            void loadUsers();
            if (selectedUser) {
              setIsLoadingMessages(true);
              void loadMessages(selectedUser.id);
            }
          }}
          disabled={isLoadingUsers || isLoadingMessages}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="lg:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-teal-700" />
            Choose who to message
          </CardTitle>
          <CardDescription>Search and select a private conversation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search users..."
              className="pl-9"
            />
          </div>
          <select
            value={selectedUser?.id || ''}
            onChange={(event) => {
              const nextUser = chatUsers.find((chatUser) => chatUser.id === event.target.value);
              if (nextUser) handleSelectUser(nextUser);
            }}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={isLoadingUsers || displayedChatUsers.length === 0}
          >
            <option value="">Select user</option>
            {displayedChatUsers.map((chatUser) => (
              <option key={chatUser.id} value={chatUser.id}>
                {chatUser.unreadCount ? `(${chatUser.unreadCount} new) ` : ''}
                {chatUser.name} - {chatUser.role}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="hidden overflow-hidden lg:block">
          <CardHeader className="border-b bg-white">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-teal-700" />
              Users
            </CardTitle>
            <CardDescription>Choose who to message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search users..."
                className="pl-9"
              />
            </div>

            {isLoadingUsers ? (
              <LoadingState label="Loading users" />
            ) : displayedChatUsers.length === 0 ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No users found.
              </div>
            ) : (
              <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                {displayedChatUsers.map((chatUser) => {
                  const isSelected = selectedUser?.id === chatUser.id;
                  return (
                    <button
                      key={chatUser.id}
                      type="button"
                      onClick={() => handleSelectUser(chatUser)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        isSelected
                          ? 'border-teal-300 bg-teal-50 text-teal-950'
                          : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{chatUser.name}</p>
                          <p className="truncate text-xs text-slate-500">{chatUser.email}</p>
                          {chatUser.latestMessage && (
                            <p className="mt-1 truncate text-xs text-slate-500">{chatUser.latestMessage}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {Boolean(chatUser.unreadCount) && (
                            <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                              {chatUser.unreadCount}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600">
                            {chatUser.role}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card
          className={`flex w-full overflow-hidden ${
            isChatExpanded
              ? 'fixed inset-x-2 bottom-2 top-2 z-50 min-h-0 lg:static lg:h-[calc(100vh-9rem)]'
              : 'h-[70svh] min-h-[520px] max-h-[760px] lg:h-[calc(100vh-9rem)] lg:max-h-none'
          }`}
        >
          <div className="flex h-full min-h-0 w-full flex-1 flex-col">
          <CardHeader className="shrink-0 border-b bg-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-teal-700" />
                  {selectedUser ? selectedUser.name : 'Select a user'}
                </CardTitle>
                <CardDescription>
                  {selectedUser
                    ? `Private conversation with ${selectedUser.email}`
                    : 'Choose a user from the list to start chatting.'}
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                onClick={() => setIsChatExpanded((current) => !current)}
                title={isChatExpanded ? 'Collapse chat area' : 'Expand chat area'}
              >
                {isChatExpanded ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isChatExpanded ? 'Collapse chat area' : 'Expand chat area'}
                </span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex h-full min-h-0 flex-1 flex-col p-0">
            <div
              ref={listRef}
              className="flex min-h-0 flex-1 basis-0 flex-col gap-3 overflow-y-auto bg-slate-50 p-4"
            >
              {!selectedUser ? (
                <div className="flex min-h-full flex-1 items-center justify-center p-6 text-sm text-slate-500">
                  Select a user to view your private messages.
                </div>
              ) : isLoadingMessages ? (
                <div className="flex min-h-full flex-1 items-center justify-center">
                  <LoadingState label="Loading messages" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex min-h-full flex-1 items-center justify-center text-sm text-slate-500">
                  No messages between you yet.
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderId === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg border px-4 py-3 shadow-sm md:max-w-[68%] ${
                          isMine
                            ? 'border-teal-200 bg-teal-600 text-white'
                            : 'border-slate-200 bg-white text-slate-900'
                        }`}
                      >
                        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={isMine ? 'font-semibold text-white' : 'font-semibold text-slate-900'}>
                            {isMine ? 'You' : message.senderName}
                          </span>
                          <span className={isMine ? 'text-teal-50/80' : 'text-slate-500'}>
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form onSubmit={handleSendMessage} className="mt-auto shrink-0 border-t bg-white px-3 pt-3 shadow-[0_-10px_24px_-20px_rgba(15,23,42,0.7)] md:px-4">
              <div className="flex gap-2 md:items-end">
                <label className="flex-1">
                  <span className="sr-only">Message</span>
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    disabled={isSending || !selectedUser}
                    rows={1}
                    maxLength={2000}
                    placeholder={selectedUser ? `Message ${selectedUser.name}...` : 'Select a user first'}
                    className="max-h-[112px] min-h-11 w-full resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-2 text-sm leading-6 shadow-sm transition-[height] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
                <Button type="submit" disabled={isSending || !draft.trim() || !selectedUser} className="h-11 shrink-0">
                  <Send className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{isSending ? 'Sending...' : 'Send'}</span>
                </Button>
              </div>
            </form>
          </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}
