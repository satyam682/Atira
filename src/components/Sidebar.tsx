import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Key,
  BarChart3,
  Plug,
  Settings,
  Clock,
  Shield,
  Plus,
  Code,
  Layers,
  ChevronDown,
  ChevronUp,
  Trash2
} from 'lucide-react';
import { WorkspaceMode, NavItemId } from '../types';
import SpikeMark from './SpikeMark';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  activeNav: NavItemId;
  setActiveNav: (val: NavItemId) => void;
  workspaceMode: WorkspaceMode;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
  credits: number;
  onAddCredits: () => void;
  historyItems: Array<{
    id: string;
    title: string;
    category: WorkspaceMode;
    messages: any[];
    timestamp: string;
    preview: string;
  }>;
  onSelectHistoryItem: (item: { id: string; title: string; category: WorkspaceMode; messages: any[] }) => void;
  onDeleteHistoryItem: (id: string) => void;
  showToast: (msg: string) => void;
  currentUser?: any;
  adminStats?: { totalCreditsProvided: number; totalCreditsUsed: number } | null;
}

export default function Sidebar({
  isCollapsed,
  setIsCollapsed,
  activeNav,
  setActiveNav,
  workspaceMode,
  setWorkspaceMode,
  credits,
  onAddCredits,
  historyItems,
  onSelectHistoryItem,
  onDeleteHistoryItem,
  showToast,
  currentUser,
  adminStats
}: SidebarProps) {
  // Manage submenus for history
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [expandedHistoryCategory, setExpandedHistoryCategory] = useState<'chat' | 'coding' | 'cowork' | null>(null);

  // Group history items dynamically
  const groupedHistory = {
    chat: historyItems.filter(item => item.category === 'chat'),
    coding: historyItems.filter(item => item.category === 'coding'),
    cowork: historyItems.filter(item => item.category === 'cowork')
  };

  const menuItems = [
    { id: 'chat' as NavItemId, label: 'Chat', icon: MessageSquare },
    { id: 'api-keys' as NavItemId, label: 'API Keys', icon: Key },
    { id: 'usage' as NavItemId, label: 'Usage', icon: BarChart3 },
    { id: 'integrations' as NavItemId, label: 'Integrations', icon: Plug },
    { id: 'settings' as NavItemId, label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id: NavItemId) => {
    setActiveNav(id);
    if (id === 'history') {
      setIsHistoryExpanded(!isHistoryExpanded);
    } else {
      setIsHistoryExpanded(false);
    }
  };

  const handleHistorySubcategoryClick = (category: 'chat' | 'coding' | 'cowork', e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedHistoryCategory(expandedHistoryCategory === category ? null : category);
  };

  const handleHistoryItemSelect = (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectHistoryItem(item);
    setWorkspaceMode(item.category);
    setActiveNav('chat');
    showToast(`Loaded "${item.title}"`);
  };

  return (
    <motion.aside
      id="nexus-sidebar"
      className="hidden md:flex bg-canvas border-r border-hairline flex-col h-screen shrink-0 relative z-30 overflow-y-auto"
      animate={{ width: isCollapsed ? 76 : 260 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Top Brand Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-hairline">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <SpikeMark className="w-6 h-6 text-primary" />
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-sans font-medium text-lg text-ink tracking-tight whitespace-nowrap"
            >
              Aira.Ai
            </motion.span>
          )}
        </div>

        <button
          id="toggle-sidebar-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-surface-soft text-muted hover:text-ink transition-colors"
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Credits Card */}
      {!adminStats && (
        <div className="p-4">
          {isCollapsed ? (
            <div className="flex justify-center">
              {currentUser?.role === 'admin' ? (
                <button
                  id="credits-add-collapsed-btn"
                  onClick={onAddCredits}
                  className="w-10 h-10 rounded-xl bg-surface-card text-primary flex items-center justify-center hover:bg-surface-cream-strong transition-colors"
                  title="Add Credits"
                >
                  <Plus className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-surface-card text-muted flex items-center justify-center font-mono text-[10px] font-semibold border border-hairline" title={`${credits.toFixed(4)} credits`}>
                  {credits.toFixed(0)}
                </div>
              )}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-surface-card rounded-xl flex items-center justify-between border border-hairline"
            >
              <div>
                <p className="text-[12px] font-medium text-muted tracking-widest uppercase">CREDITS</p>
                <p className="text-lg font-normal font-mono text-ink mt-0.5">{credits.toFixed(4)}</p>
              </div>
              {currentUser?.role === 'admin' && (
                <button
                  id="add-credits-btn"
                  onClick={onAddCredits}
                  className="w-8 h-8 rounded-lg bg-primary text-white hover:bg-primary-active flex items-center justify-center transition-colors"
                  title="Buy Credits"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* Nav Menu */}
      <div className="px-3 py-2 flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => handleNavClick(item.id)}
              className={`w-full h-10 flex items-center gap-3 px-3 rounded-lg transition-all duration-200 text-left ${
                isActive
                  ? 'bg-surface-card text-ink font-medium'
                  : 'text-muted hover:bg-surface-soft hover:text-ink'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              {!isCollapsed && (
                <span className="text-sm tracking-tight whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* History Nav Item - Expandable */}
        <div>
          <button
            id="nav-history"
            onClick={() => handleNavClick('history')}
            className={`w-full h-10 flex items-center justify-between px-3 rounded-lg transition-all duration-200 text-left ${
              activeNav === 'history'
                ? 'bg-surface-card text-ink font-medium'
                : 'text-muted hover:bg-surface-soft hover:text-ink'
            }`}
          >
            <div className="flex items-center gap-3">
              <Clock className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              {!isCollapsed && (
                <span className="text-sm tracking-tight whitespace-nowrap">History</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center gap-1.5">
                <span className="bg-surface-cream-strong text-muted text-xs font-normal px-2 py-0.5 rounded-full">
                  {historyItems.length}
                </span>
                {isHistoryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            )}
          </button>

          {/* History Submenus: interactive dropdown accordions */}
          <AnimatePresence>
            {isHistoryExpanded && !isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pl-6 pr-2 py-1 space-y-1 overflow-hidden"
              >
                {/* 1. Chat History Dropdown */}
                <div className="rounded-lg">
                  <button
                    onClick={(e) => handleHistorySubcategoryClick('chat', e)}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-soft rounded"
                  >
                    <span>Chat History</span>
                    {expandedHistoryCategory === 'chat' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedHistoryCategory === 'chat' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-2 pr-1 py-1 space-y-1">
                      {groupedHistory.chat.length === 0 ? (
                        <p className="p-1.5 text-xs text-muted-soft italic font-sans">No chats yet</p>
                      ) : (
                        groupedHistory.chat.map((h) => (
                          <div key={h.id} className="group/item flex items-center justify-between rounded hover:bg-surface-soft transition-colors pr-1">
                            <button
                              onClick={(e) => handleHistoryItemSelect(h, e)}
                              className="flex-1 text-left p-1.5 text-xs text-body hover:text-primary truncate block font-sans"
                              title={h.title}
                            >
                              {h.title}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistoryItem(h.id);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-1 text-muted hover:text-error rounded transition-all"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 2. Coding History Dropdown */}
                <div className="rounded-lg">
                  <button
                    onClick={(e) => handleHistorySubcategoryClick('coding', e)}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-soft rounded"
                  >
                    <span>Coding History</span>
                    {expandedHistoryCategory === 'coding' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedHistoryCategory === 'coding' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-2 pr-1 py-1 space-y-1">
                      {groupedHistory.coding.length === 0 ? (
                        <p className="p-1.5 text-xs text-muted-soft italic font-sans">No coding chats yet</p>
                      ) : (
                        groupedHistory.coding.map((h) => (
                          <div key={h.id} className="group/item flex items-center justify-between rounded hover:bg-surface-soft transition-colors pr-1">
                            <button
                              onClick={(e) => handleHistoryItemSelect(h, e)}
                              className="flex-1 text-left p-1.5 text-xs text-body hover:text-primary truncate block font-sans"
                              title={h.title}
                            >
                              {h.title}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistoryItem(h.id);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-1 text-muted hover:text-error rounded transition-all"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 3. Co-work History Dropdown */}
                <div className="rounded-lg">
                  <button
                    onClick={(e) => handleHistorySubcategoryClick('cowork', e)}
                    className="w-full flex items-center justify-between py-1.5 px-2 text-xs font-medium text-muted hover:text-ink hover:bg-surface-soft rounded"
                  >
                    <span>Co-work History</span>
                    {expandedHistoryCategory === 'cowork' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {expandedHistoryCategory === 'cowork' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pl-2 pr-1 py-1 space-y-1">
                      {groupedHistory.cowork.length === 0 ? (
                        <p className="p-1.5 text-xs text-muted-soft italic font-sans">No co-work chats yet</p>
                      ) : (
                        groupedHistory.cowork.map((h) => (
                          <div key={h.id} className="group/item flex items-center justify-between rounded hover:bg-surface-soft transition-colors pr-1">
                            <button
                              onClick={(e) => handleHistoryItemSelect(h, e)}
                              className="flex-1 text-left p-1.5 text-xs text-body hover:text-primary truncate block font-sans"
                              title={h.title}
                            >
                              {h.title}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteHistoryItem(h.id);
                              }}
                              className="opacity-0 group-hover/item:opacity-100 p-1 text-muted hover:text-error rounded transition-all"
                              title="Delete session"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="h-px bg-hairline my-2" />

        {/* Admin Panel Link */}
        {currentUser?.role === 'admin' && (
          <button
            id="nav-admin"
            onClick={() => handleNavClick('admin')}
            className="w-full h-10 flex items-center gap-3 px-3 rounded-lg transition-all duration-200 text-left text-primary hover:text-primary-active"
          >
            <Shield className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            {!isCollapsed && (
              <span className="text-sm font-medium tracking-tight whitespace-nowrap">Admin Panel</span>
            )}
          </button>
        )}
      </div>

      {/* Workspace Mode Section */}
      <div className="p-4 border-t border-hairline">
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setWorkspaceMode('chat')}
              className={`p-2 rounded-lg transition-colors ${workspaceMode === 'chat' ? 'bg-surface-card text-ink' : 'text-muted hover:text-ink hover:bg-surface-soft'}`}
              title="Chat Mode"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            {currentUser?.role === 'admin' ? (
              <button
                onClick={() => setWorkspaceMode('coding')}
                className={`p-2 rounded-lg transition-colors ${workspaceMode === 'coding' ? 'bg-surface-card text-ink' : 'text-muted hover:text-ink hover:bg-surface-soft'}`}
                title="Coding Mode"
              >
                <Code className="w-4 h-4" />
              </button>
            ) : (
              <button
                className="p-2 rounded-lg opacity-40 cursor-not-allowed text-muted"
                title="Coding (Under Maintenance)"
                disabled
              >
                <Code className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-2 rounded-lg opacity-40 cursor-not-allowed text-muted"
              title="Co-work (Coming Soon)"
              disabled
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[12px] font-medium text-muted tracking-widest uppercase">WORKSPACE MODE</p>
            <div className="bg-surface-soft p-1 rounded-lg grid grid-cols-3 gap-1 relative">
              <button
                id="ws-mode-chat"
                onClick={() => setWorkspaceMode('chat')}
                className={`relative py-1.5 flex flex-col items-center justify-center rounded-md transition-all ${
                  workspaceMode === 'chat'
                    ? 'bg-canvas border border-hairline text-ink'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <MessageSquare className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-medium font-sans">Chat</span>
              </button>

              {currentUser?.role === 'admin' ? (
                <button
                  id="ws-mode-coding"
                  onClick={() => setWorkspaceMode('coding')}
                  className={`relative py-1.5 flex flex-col items-center justify-center rounded-md transition-all ${
                    workspaceMode === 'coding'
                      ? 'bg-canvas border border-hairline text-ink'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <Code className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-medium font-sans">Coding</span>
                </button>
              ) : (
                <button
                  id="ws-mode-coding"
                  className="relative py-1.5 flex flex-col items-center justify-center rounded-md opacity-40 cursor-not-allowed text-muted"
                  title="Coding (Under Maintenance)"
                  disabled
                >
                  <Code className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-medium font-sans">Coding</span>
                </button>
              )}

              <button
                id="ws-mode-cowork"
                className="relative py-1.5 flex flex-col items-center justify-center rounded-md opacity-40 cursor-not-allowed text-muted"
                title="Co-work (Coming Soon)"
                disabled
              >
                <Layers className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] font-medium font-sans">Co-work</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-hairline flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-surface-dark text-on-dark font-medium flex items-center justify-center text-sm shrink-0">
            {(currentUser?.name?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-ink truncate leading-tight">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-muted-soft truncate leading-none mt-1" title={currentUser?.email || 'user@example.com'}>
                {currentUser?.email || 'user@example.com'}
              </p>
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="text-[10px] bg-primary text-white px-2.5 py-0.5 rounded font-medium uppercase tracking-wider">
            {currentUser?.role || 'Member'}
          </div>
        )}
      </div>
    </motion.aside>
  );
}
