import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChatArea from './components/ChatArea';
import MessageInput, { AVAILABLE_MODELS } from './components/MessageInput';
import { ApiKeysView, UsageView, IntegrationsView, SettingsView, AdminPanelView } from './components/NavigationViews';
import { WorkspaceMode, NavItemId, Message, ModelOption } from './types';
import { X, CheckCircle, Info, MessageSquare, Key, BarChart3, Plug, Settings, Shield, Menu, Clock, Trash2, ChevronDown, ChevronUp, Plus, Code, Layers } from 'lucide-react';
import { auth, signInWithGoogle, logoutGoogle } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import AuthFlow from './components/AuthFlow';
import { motion, AnimatePresence } from 'motion/react';
import SpikeMark from './components/SpikeMark';
import CodingWorkspace from './components/CodingWorkspace';

export default function App() {
  // Conduit Auth State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('conduit_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sidebar and navigation states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavItemId>('chat');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('chat');
  const [credits, setCredits] = useState(0);
  const [adminStats, setAdminStats] = useState<{ totalCreditsProvided: number; totalCreditsUsed: number } | null>(null);

  // Mobile history subcategory expanded states
  const [mobileExpandedCat, setMobileExpandedCat] = useState<'chat' | 'coding' | 'cowork' | null>('chat');

  // Sync credits and user status dynamically with server database
  const fetchUserProfile = async () => {
    if (!currentUser?.email) return;
    try {
      const res = await fetch(`/api/users/profile?email=${encodeURIComponent(currentUser.email)}`);
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
        if (data.isAdmin && data.globalStats) {
          setAdminStats(data.globalStats);
        } else {
          setAdminStats(null);
        }
        setCurrentUser((prev: any) => {
          if (!prev) return null;
          const updated = {
            ...prev,
            credits: data.credits,
            creditsExpiry: data.creditsExpiry,
            rpmLimit: data.rpmLimit
          };
          localStorage.setItem('conduit_current_user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err) {
      console.log('Failed to sync profile credits (transient):', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchUserProfile();
      const timer = setInterval(fetchUserProfile, 12000);
      return () => clearInterval(timer);
    }
  }, [currentUser?.email]);


  // Connection & OAuth states (persisted in localStorage)
  const [googleUser, setGoogleUser] = useState<any>(() => {
    const saved = localStorage.getItem('nx_google_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    return localStorage.getItem('nx_google_access_token');
  });
  const [githubToken, setGithubToken] = useState<string | null>(() => {
    return localStorage.getItem('nx_github_token');
  });

  // Dynamic Chat History Session lists with client-side localStorage persistence
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [loadedUserEmail, setLoadedUserEmail] = useState<string>('');
  const [historyItems, setHistoryItems] = useState<Array<{
    id: string;
    title: string;
    category: WorkspaceMode;
    messages: Message[];
    timestamp: string;
    preview: string;
  }>>([]);

  // Save single chat history item to server-side database (Supabase + Local backup)
  const saveHistoryItemToServer = async (item: {
    id: string;
    title: string;
    category: WorkspaceMode;
    messages: Message[];
    timestamp: string;
    preview: string;
  }) => {
    if (!currentUser?.email) return;
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser.email
        },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          category: item.category,
          messages: item.messages,
          preview: item.preview,
          timestamp: item.timestamp,
          email: currentUser.email
        })
      });
    } catch (err) {
      console.log('Failed to save chat history item on server (transient):', err);
    }
  };

  // Load historyItems from localStorage and synchronize with server database
  useEffect(() => {
    if (currentUser?.email) {
      const emailLower = currentUser.email.toLowerCase();
      if (emailLower !== loadedUserEmail) {
        // 1. Instantly load from localStorage for lightning-fast responsive initial UI
        let savedHistory: any[] = [];
        try {
          const key = `nexusai_chat_history_${emailLower}`;
          const saved = localStorage.getItem(key);
          savedHistory = saved ? JSON.parse(saved) : [];
          setHistoryItems(savedHistory);
        } catch (err) {
          console.error('Failed to load history items from localStorage:', err);
          setHistoryItems([]);
        }

        // Restore active chat if there was one saved
        const activeChatKey = `nexusai_active_id_${emailLower}`;
        const savedActiveId = localStorage.getItem(activeChatKey);
        if (savedActiveId && Array.isArray(savedHistory)) {
          const activeItem = savedHistory.find(item => item.id === savedActiveId);
          if (activeItem) {
            setActiveChatId(activeItem.id);
            setMessages(activeItem.messages || []);
            setCurrentChatTitle(activeItem.title || 'New Chat');
          } else {
            setActiveChatId(null);
            setMessages([]);
            setCurrentChatTitle('New Chat');
          }
        } else {
          setActiveChatId(null);
          setMessages([]);
          setCurrentChatTitle('New Chat');
        }

        setLoadedUserEmail(emailLower);

        // 2. Query server API (which fetches from Supabase matching ONLY this user's email)
        fetch(`/api/history?email=${encodeURIComponent(emailLower)}`, {
          headers: { 'x-user-email': emailLower }
        })
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Server API failed');
          })
          .then(data => {
            if (Array.isArray(data)) {
              setHistoryItems(data);
              // Cache in local storage for subsequent instant loads
              const key = `nexusai_chat_history_${emailLower}`;
              localStorage.setItem(key, JSON.stringify(data));

              // Sync active chat messages if it was updated from server
              const activeChatKey = `nexusai_active_id_${emailLower}`;
              const currentActiveId = localStorage.getItem(activeChatKey);
              if (currentActiveId) {
                const updatedActiveItem = data.find(item => item.id === currentActiveId);
                if (updatedActiveItem) {
                  setMessages(updatedActiveItem.messages || []);
                  setCurrentChatTitle(updatedActiveItem.title || 'New Chat');
                }
              }
            }
          })
          .catch(err => {
            console.warn('[Sync] Could not sync user chat history from server/Supabase:', err);
          });
      }
    } else {
      setHistoryItems([]);
      setLoadedUserEmail('');
    }
  }, [currentUser?.email, loadedUserEmail]);

  // Persist historyItems to localStorage whenever it changes
  useEffect(() => {
    if (currentUser?.email) {
      const emailLower = currentUser.email.toLowerCase();
      // Only persist if the loaded history matches the active logged in user to avoid overwriting
      if (emailLower === loadedUserEmail) {
        try {
          const key = `nexusai_chat_history_${emailLower}`;
          localStorage.setItem(key, JSON.stringify(historyItems));
        } catch (err) {
          console.error('Failed to save history items to localStorage:', err);
        }
      }
    }
  }, [historyItems, currentUser?.email, loadedUserEmail]);

  // Sync activeChatId to localStorage declaratively
  useEffect(() => {
    if (currentUser?.email) {
      const emailLower = currentUser.email.toLowerCase();
      const activeChatKey = `nexusai_active_id_${emailLower}`;
      if (activeChatId) {
        localStorage.setItem(activeChatKey, activeChatId);
      } else {
        localStorage.removeItem(activeChatKey);
      }
    }
  }, [activeChatId, currentUser?.email]);

  // Chat conversation states
  const [selectedModel, setSelectedModel] = useState<ModelOption>(AVAILABLE_MODELS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatTitle, setCurrentChatTitle] = useState('New Chat');

  // Custom toast notification state
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'info' | 'success' }>({
    message: '',
    visible: false,
    type: 'success'
  });

  // Track custom Google OAuth message events
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Validate origin is from AI Studio preview, localhost, Railway, or same origin
      if (
        origin !== window.location.origin && 
        !origin.endsWith('.run.app') && 
        !origin.includes('localhost') && 
        !origin.includes('.up.railway.app')
      ) {
        return;
      }
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS') {
        const { accessToken, user } = event.data;
        setGoogleAccessToken(accessToken);
        setGoogleUser(user);
        localStorage.setItem('nx_google_access_token', accessToken);
        localStorage.setItem('nx_google_user', JSON.stringify(user));
        showToast(`Connected Workspace: ${user?.email || 'Google Account'}!`, 'success');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Show customized toast banner helper
  const showToast = (message: string, type: 'info' | 'success' = 'success') => {
    setToast({ message, visible: true, type });
  };

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Handle addition of credits (+50.0000 credits)
  const handleAddCredits = () => {
    setCredits((prev) => prev + 50.0);
    showToast('Successfully topped up +50.0000 API Gateway Credits!', 'success');
  };

  // Reset chat thread
  const handleResetChat = () => {
    setMessages([]);
    setCurrentChatTitle('New Chat');
    setActiveChatId(null);
    showToast('Started a fresh conversation session', 'info');
  };

  // Select item from history submenus
  const handleSelectHistoryItem = (item: { id: string; title: string; category: WorkspaceMode; messages: Message[] }) => {
    setActiveChatId(item.id);
    setMessages(item.messages);
    setCurrentChatTitle(item.title);
  };

  // Handle preset message click in empty state
  const handleSendPresetMessage = (text: string) => {
    handleSendMessage(text);
  };

  // Connect Google account (Popup custom OAuth with client-id)
  const handleGoogleConnect = async () => {
    try {
      const redirectUri = `${window.location.origin}/api/auth/google/callback`;
      const urlRes = await fetch(`/api/auth/google/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
      if (!urlRes.ok) throw new Error('Failed to fetch auth URL');
      const { url } = await urlRes.json();

      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        'google_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left}`
      );

      if (!popup) {
        showToast('Please allow popups to connect your Google account', 'info');
      }
    } catch (error: any) {
      console.error('Google login error:', error);
      showToast('Connection cancelled or failed', 'info');
    }
  };

  // Disconnect Google account
  const handleGoogleDisconnect = async () => {
    setGoogleUser(null);
    setGoogleAccessToken(null);
    localStorage.removeItem('nx_google_user');
    localStorage.removeItem('nx_google_access_token');
    showToast('Google Workspace disconnected', 'info');
  };

  // Simple UUID v4 generator for standard Supabase UUID columns
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // Handle user typing and sending message with custom live Cohere backend
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = generateUUID();
      setActiveChatId(chatId);
    }

    // Deduce chat title on first message
    let chatTitle = currentChatTitle;
    if (messages.length === 0) {
      chatTitle = text.length > 32 ? text.substring(0, 32) + '...' : text;
      setCurrentChatTitle(chatTitle);
    }

    // 1. Append User Message
    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Dynamic state insertion for history items
    const userHistoryItem = {
      id: chatId!,
      title: chatTitle,
      category: workspaceMode,
      messages: updatedMessages,
      timestamp: 'Just now',
      preview: text.length > 60 ? text.substring(0, 60) + '...' : text,
    };

    setHistoryItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.id === chatId);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = userHistoryItem;
        return copy;
      } else {
        return [userHistoryItem, ...prev];
      }
    });
    saveHistoryItemToServer(userHistoryItem);

    // Charge dynamic credit fraction based on input tokens
    const promptChars = updatedMessages.reduce((sum, m) => sum + (m.content || '').length, 0);
    const estInputTokens = Math.max(1, Math.ceil(promptChars / 4));
    const optimisticInputCost = estInputTokens * 0.00005;
    setCredits((prev) => Math.max(0, parseFloat((prev - optimisticInputCost).toFixed(6))));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          googleAccessToken,
          workspaceMode,
          githubToken,
          model: selectedModel.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: `b-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel.name
        };
        const finalMessages = [...updatedMessages, botMessage];
        setMessages(finalMessages);

        // Update history items with bot response
        const botHistoryItem = {
          id: chatId!,
          title: chatTitle,
          category: workspaceMode,
          messages: finalMessages,
          timestamp: 'Just now',
          preview: data.content.length > 60 ? data.content.substring(0, 60) + '...' : data.content,
        };

        setHistoryItems((prev) => {
          const existingIdx = prev.findIndex((item) => item.id === chatId);
          if (existingIdx >= 0) {
            const copy = [...prev];
            copy[existingIdx] = botHistoryItem;
            return copy;
          }
          return prev;
        });
        saveHistoryItemToServer(botHistoryItem);

        // Sync remaining credits immediately
        if (data.usage && typeof data.usage.creditsRemaining === 'number') {
          setCredits(data.usage.creditsRemaining);
          setCurrentUser((prev: any) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              credits: data.usage.creditsRemaining
            };
            localStorage.setItem('conduit_current_user', JSON.stringify(updated));
            return updated;
          });
        } else {
          fetchUserProfile();
        }
        showToast('Inference completed successfully!', 'success');
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Server returned an error');
      }
    } catch (error: any) {
      const errMessage: Message = {
        id: `b-err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection Error**: Aira.Ai was unable to communicate with the integration engine. Please confirm the dev server is active and try again.\n\n*Error details: ${error.message}*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'Error'
      };
      const finalMessages = [...updatedMessages, errMessage];
      setMessages(finalMessages);

      // Update history items with error message
      const errorHistoryItem = {
        id: chatId!,
        title: chatTitle,
        category: workspaceMode,
        messages: finalMessages,
        timestamp: 'Just now',
        preview: 'Connection Error'
      };

      setHistoryItems((prev) => {
        const existingIdx = prev.findIndex((item) => item.id === chatId);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = errorHistoryItem;
          return copy;
        }
        return prev;
      });
      saveHistoryItemToServer(errorHistoryItem);
    } finally {
      setIsLoading(false);
    }
  };

  // Render main viewport depending on current active nav menu selection
  const renderMainContent = () => {
    switch (activeNav) {
      case 'chat':
      case 'history':
        return (
          <div className="flex-1 flex flex-col min-h-0 relative">
            <ChatArea
              messages={messages}
              workspaceMode={workspaceMode}
              onSendPresetMessage={handleSendPresetMessage}
              isLoading={isLoading}
              onClearChat={handleResetChat}
              selectedModelName={selectedModel.name}
            />
            
            {/* Message Input Bottom container */}
            <MessageInput
              onSendMessage={handleSendMessage}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              isLoading={isLoading}
            />
          </div>
        );
      case 'api-keys':
        return <ApiKeysView showToast={showToast} credits={credits} />;
      case 'usage':
        return <UsageView showToast={showToast} credits={credits} currentUser={currentUser} />;
      case 'integrations':
        return (
          <IntegrationsView
            currentUser={currentUser}
            showToast={showToast}
            googleAccessToken={googleAccessToken}
            googleUser={googleUser}
            onGoogleConnect={handleGoogleConnect}
            onGoogleDisconnect={handleGoogleDisconnect}
            githubToken={githubToken}
            onGithubConnect={(token) => {
              setGithubToken(token);
              localStorage.setItem('nx_github_token', token);
            }}
            onGithubDisconnect={() => {
              setGithubToken(null);
              localStorage.removeItem('nx_github_token');
            }}
          />
        );
      case 'settings':
        return <SettingsView showToast={showToast} credits={credits} />;
      case 'admin':
        return <AdminPanelView showToast={showToast} credits={credits} />;
      default:
        return (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            Section coming soon!
          </div>
        );
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 relative">
        <AuthFlow
          onLoginSuccess={(u) => {
            setCurrentUser(u);
            localStorage.setItem('conduit_current_user', JSON.stringify(u));
            if (u.role === 'admin') {
              setActiveNav('admin');
            } else {
              setActiveNav('chat');
            }
          }}
          showToast={showToast}
        />
        {toast.visible && (
          <div
            id="toast-notification"
            className="fixed bottom-6 right-6 bg-slate-950 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 text-xs font-medium border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
            <span>{toast.message}</span>
            <button
              onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
              className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white ml-2 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  }

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('conduit_current_user');
    setActiveNav('chat');
    showToast('Logged out of session', 'info');
  };

  if (workspaceMode === 'coding' && (activeNav === 'chat' || activeNav === 'history')) {
    return (
      <CodingWorkspace
        messages={messages}
        isLoading={isLoading}
        onSendMessage={handleSendMessage}
        onClearChat={handleResetChat}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
        historyItems={historyItems}
        onSelectHistoryItem={handleSelectHistoryItem}
        onDeleteHistoryItem={async (id) => {
          setHistoryItems((prev) => prev.filter((item) => item.id !== id));
          if (activeChatId === id) {
            handleResetChat();
          }
          if (currentUser?.email) {
            try {
              await fetch(`/api/history/${id}?email=${encodeURIComponent(currentUser.email)}`, {
                method: 'DELETE',
                headers: { 'x-user-email': currentUser.email }
              });
            } catch (err) {
              console.log('Failed to delete history item on server (transient):', err);
            }
          }
          showToast('Removed chat session from history', 'info');
        }}
        currentUser={currentUser}
        credits={credits}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#F8F9FB] font-sans antialiased text-gray-800">
      {/* Sidebar (left-side navigation controls) */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        workspaceMode={workspaceMode}
        setWorkspaceMode={setWorkspaceMode}
        credits={credits}
        onAddCredits={handleAddCredits}
        historyItems={historyItems}
        onSelectHistoryItem={handleSelectHistoryItem}
        onDeleteHistoryItem={async (id) => {
          setHistoryItems((prev) => prev.filter((item) => item.id !== id));
          if (activeChatId === id) {
            handleResetChat();
          }
          if (currentUser?.email) {
            try {
              await fetch(`/api/history/${id}?email=${encodeURIComponent(currentUser.email)}`, {
                method: 'DELETE',
                headers: { 'x-user-email': currentUser.email }
              });
            } catch (err) {
              console.log('Failed to delete history item on server (transient):', err);
            }
          }
          showToast('Removed chat session from history', 'info');
        }}
        showToast={showToast}
        currentUser={currentUser}
        adminStats={adminStats}
      />

      {/* Main Panel Area (TopBar + Content) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TopBar
          workspaceMode={workspaceMode}
          currentChatTitle={currentChatTitle}
          onResetChat={handleResetChat}
          showToast={showToast}
          currentUser={currentUser}
          onLogout={handleLogout}
          onToggleMobileMenu={() => setIsMobileDrawerOpen(true)}
        />

        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto relative">
          {renderMainContent()}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden flex items-center justify-around bg-white border-t border-gray-150 py-1 px-2 pb-safe z-30 shrink-0 shadow-sm">
          {[
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'api-keys', label: 'API Keys', icon: Key },
            { id: 'usage', label: 'Usage', icon: BarChart3 },
            { id: 'integrations', label: 'Integrations', icon: Plug },
            { id: 'settings', label: 'Settings', icon: Settings },
            ...(currentUser?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : [])
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id as any)}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-all relative ${
                  isActive 
                     ? 'text-indigo-600 font-semibold scale-105' 
                     : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className="text-[9px] mt-0.5 tracking-tight font-sans font-medium">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 w-1 h-1 bg-indigo-600 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Drawer Slide-out Sidebar for Chat History */}
      <AnimatePresence>
        {isMobileDrawerOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />

            {/* Slide-out Sidebar Content Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-canvas border-r border-hairline flex flex-col z-50 md:hidden shadow-2xl overflow-y-auto"
            >
              {/* Header with Title and Close button */}
              <div className="h-16 flex items-center justify-between px-4 border-b border-hairline shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    <SpikeMark className="w-6 h-6 text-primary" />
                  </div>
                  <span className="font-sans font-medium text-lg text-ink tracking-tight whitespace-nowrap">
                    Aira.Ai History
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-soft text-muted hover:text-ink transition-colors"
                  title="Close history"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Credits Segment */}
              {!adminStats && (
                <div className="p-4 shrink-0 border-b border-hairline">
                  <div className="p-4 bg-surface-card rounded-xl flex items-center justify-between border border-hairline">
                    <div>
                      <p className="text-[10px] font-semibold text-muted tracking-widest uppercase">CREDITS</p>
                      <p className="text-base font-normal font-mono text-ink mt-0.5">{credits.toFixed(4)}</p>
                    </div>
                    <button
                      onClick={() => {
                        handleAddCredits();
                        setIsMobileDrawerOpen(false);
                      }}
                      className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-primary-active flex items-center justify-center transition-colors shadow-sm"
                      title="Add Credits"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Workspace Mode Switcher Segment */}
              <div className="p-4 shrink-0 border-b border-hairline">
                <p className="text-[10px] font-semibold text-muted tracking-widest uppercase mb-2">WORKSPACE MODE</p>
                <div className="bg-surface-soft p-1 rounded-lg grid grid-cols-3 gap-1">
                  <button
                    id="mobile-ws-mode-chat"
                    onClick={() => {
                      setWorkspaceMode('chat');
                      setActiveNav('chat');
                      showToast('Switched to Chat Workspace');
                    }}
                    className={`py-2 flex flex-col items-center justify-center rounded-md transition-all ${
                      workspaceMode === 'chat'
                        ? 'bg-canvas border border-hairline text-ink font-medium shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-sans">Chat</span>
                  </button>

                  <button
                    id="mobile-ws-mode-coding"
                    onClick={() => {
                      setWorkspaceMode('coding');
                      setActiveNav('chat');
                      showToast('Switched to Coding Workspace');
                    }}
                    className={`py-2 flex flex-col items-center justify-center rounded-md transition-all ${
                      workspaceMode === 'coding'
                        ? 'bg-canvas border border-hairline text-ink font-medium shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Code className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-sans">Coding</span>
                  </button>

                  <button
                    id="mobile-ws-mode-cowork"
                    className="py-2 flex flex-col items-center justify-center rounded-md transition-all opacity-40 cursor-not-allowed text-muted"
                    title="Co-work (Coming Soon)"
                    disabled
                  >
                    <Layers className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-sans">Co-work</span>
                  </button>
                </div>
              </div>

              {/* Grouped chat history */}
              <div className="p-3 flex-1 space-y-3">
                <p className="text-xs font-semibold text-muted tracking-wider uppercase px-2 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Recent Sessions
                </p>

                {/* Subcategories Accordions */}
                <div className="space-y-2">
                  {/* Chat History Subcategory */}
                  <div className="rounded-lg border border-hairline bg-surface-card p-1">
                    <button
                      onClick={() => setMobileExpandedCat(mobileExpandedCat === 'chat' ? null : 'chat')}
                      className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold text-ink hover:bg-surface-soft rounded-lg transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                        Chat History ({historyItems.filter(item => item.category === 'chat').length})
                      </span>
                      {mobileExpandedCat === 'chat' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {mobileExpandedCat === 'chat' && (
                      <div className="pl-2 pr-1 py-1 mt-1 space-y-1 border-t border-hairline max-h-48 overflow-y-auto">
                        {historyItems.filter(item => item.category === 'chat').length === 0 ? (
                          <p className="p-2 text-xs text-muted-soft italic font-sans">No chats yet</p>
                        ) : (
                          historyItems.filter(item => item.category === 'chat').map((h) => (
                            <div key={h.id} className="flex items-center justify-between rounded-lg hover:bg-surface-soft transition-colors pr-1">
                              <button
                                onClick={() => {
                                  handleSelectHistoryItem(h);
                                  setWorkspaceMode(h.category);
                                  setActiveNav('chat');
                                  setIsMobileDrawerOpen(false);
                                  showToast(`Loaded "${h.title}"`);
                                }}
                                className="flex-1 text-left p-2 text-xs text-body hover:text-primary truncate block font-sans font-medium"
                                title={h.title}
                              >
                                {h.title}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setHistoryItems((prev) => prev.filter((item) => item.id !== h.id));
                                  if (activeChatId === h.id) {
                                    handleResetChat();
                                  }
                                  if (currentUser?.email) {
                                    try {
                                      await fetch(`/api/history/${h.id}?email=${encodeURIComponent(currentUser.email)}`, {
                                        method: 'DELETE',
                                        headers: { 'x-user-email': currentUser.email }
                                      });
                                    } catch (err) {
                                      console.log('Failed to delete history item on server:', err);
                                    }
                                  }
                                  showToast('Removed chat session', 'info');
                                }}
                                className="p-1.5 text-muted hover:text-error rounded-lg animate-pulse"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Coding History Subcategory */}
                  <div className="rounded-lg border border-hairline bg-surface-card p-1">
                    <button
                      onClick={() => setMobileExpandedCat(mobileExpandedCat === 'coding' ? null : 'coding')}
                      className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold text-ink hover:bg-surface-soft rounded-lg transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-amber-500" />
                        Coding History ({historyItems.filter(item => item.category === 'coding').length})
                      </span>
                      {mobileExpandedCat === 'coding' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {mobileExpandedCat === 'coding' && (
                      <div className="pl-2 pr-1 py-1 mt-1 space-y-1 border-t border-hairline max-h-48 overflow-y-auto">
                        {historyItems.filter(item => item.category === 'coding').length === 0 ? (
                          <p className="p-2 text-xs text-muted-soft italic font-sans">No coding chats yet</p>
                        ) : (
                          historyItems.filter(item => item.category === 'coding').map((h) => (
                            <div key={h.id} className="flex items-center justify-between rounded-lg hover:bg-surface-soft transition-colors pr-1">
                              <button
                                onClick={() => {
                                  handleSelectHistoryItem(h);
                                  setWorkspaceMode(h.category);
                                  setActiveNav('chat');
                                  setIsMobileDrawerOpen(false);
                                  showToast(`Loaded "${h.title}"`);
                                }}
                                className="flex-1 text-left p-2 text-xs text-body hover:text-primary truncate block font-sans font-medium"
                                title={h.title}
                              >
                                {h.title}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setHistoryItems((prev) => prev.filter((item) => item.id !== h.id));
                                  if (activeChatId === h.id) {
                                    handleResetChat();
                                  }
                                  if (currentUser?.email) {
                                    try {
                                      await fetch(`/api/history/${h.id}?email=${encodeURIComponent(currentUser.email)}`, {
                                        method: 'DELETE',
                                        headers: { 'x-user-email': currentUser.email }
                                      });
                                    } catch (err) {
                                      console.log('Failed to delete history item on server:', err);
                                    }
                                  }
                                  showToast('Removed chat session', 'info');
                                }}
                                className="p-1.5 text-muted hover:text-error rounded-lg"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Co-work History Subcategory */}
                  <div className="rounded-lg border border-hairline bg-surface-card p-1">
                    <button
                      onClick={() => setMobileExpandedCat(mobileExpandedCat === 'cowork' ? null : 'cowork')}
                      className="w-full flex items-center justify-between py-2 px-2 text-xs font-semibold text-ink hover:bg-surface-soft rounded-lg transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-500" />
                        Co-work History ({historyItems.filter(item => item.category === 'cowork').length})
                      </span>
                      {mobileExpandedCat === 'cowork' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {mobileExpandedCat === 'cowork' && (
                      <div className="pl-2 pr-1 py-1 mt-1 space-y-1 border-t border-hairline max-h-48 overflow-y-auto">
                        {historyItems.filter(item => item.category === 'cowork').length === 0 ? (
                          <p className="p-2 text-xs text-muted-soft italic font-sans">No co-work chats yet</p>
                        ) : (
                          historyItems.filter(item => item.category === 'cowork').map((h) => (
                            <div key={h.id} className="flex items-center justify-between rounded-lg hover:bg-surface-soft transition-colors pr-1">
                              <button
                                onClick={() => {
                                  handleSelectHistoryItem(h);
                                  setWorkspaceMode(h.category);
                                  setActiveNav('chat');
                                  setIsMobileDrawerOpen(false);
                                  showToast(`Loaded "${h.title}"`);
                                }}
                                className="flex-1 text-left p-2 text-xs text-body hover:text-primary truncate block font-sans font-medium"
                                title={h.title}
                              >
                                {h.title}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  setHistoryItems((prev) => prev.filter((item) => item.id !== h.id));
                                  if (activeChatId === h.id) {
                                    handleResetChat();
                                  }
                                  if (currentUser?.email) {
                                    try {
                                      await fetch(`/api/history/${h.id}?email=${encodeURIComponent(currentUser.email)}`, {
                                        method: 'DELETE',
                                        headers: { 'x-user-email': currentUser.email }
                                      });
                                    } catch (err) {
                                      console.log('Failed to delete history item on server:', err);
                                    }
                                  }
                                  showToast('Removed chat session', 'info');
                                }}
                                className="p-1.5 text-muted hover:text-error rounded-lg"
                                title="Delete session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modern custom toast notification */}
      {toast.visible && (
        <div
          id="toast-notification"
          className="fixed bottom-6 right-6 bg-slate-950 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 text-xs font-medium border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Info className="w-4.5 h-4.5 text-indigo-400 shrink-0" />
          <span>{toast.message}</span>
          <button
            onClick={() => setToast((prev) => ({ ...prev, visible: false }))}
            className="p-0.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white ml-2 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
