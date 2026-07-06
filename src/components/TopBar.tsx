import React, { useState } from 'react';
import { HelpCircle, Bell, ChevronDown, LogOut, Shield, Menu } from 'lucide-react';
import { WorkspaceMode } from '../types';
import SpikeMark from './SpikeMark';

interface TopBarProps {
  workspaceMode: WorkspaceMode;
  currentChatTitle: string;
  onResetChat: () => void;
  showToast: (msg: string, type?: 'info' | 'success') => void;
  currentUser?: any;
  onLogout?: () => void;
  onToggleMobileMenu?: () => void;
}

export default function TopBar({ workspaceMode, currentChatTitle, onResetChat, showToast, currentUser, onLogout, onToggleMobileMenu }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, text: 'Model Opus 4.8 upgraded with 2x speed boost.', read: false, time: '5m ago' },
    { id: 2, text: 'Your monthly usage report is now available.', read: true, time: '2h ago' },
    { id: 3, text: 'New integration: Google Drive connected.', read: true, time: '1d ago' },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read');
  };

  const workspaceDetails = {
    chat: { label: 'Chat', color: 'bg-surface-card text-ink border-hairline' },
    coding: { label: 'Coding', color: 'bg-surface-soft text-body-strong border-hairline' },
    cowork: { label: 'Co-work', color: 'bg-surface-cream-strong text-ink border-hairline' },
  };

  return (
    <header className="h-16 border-b border-hairline bg-canvas flex items-center justify-between px-4 md:px-6 shrink-0 relative z-20">
      {/* Left side: Hamburger button + Pill badge & Breadcrumb */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {onToggleMobileMenu && (
          <button
            id="mobile-hamburger-btn"
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 rounded-lg hover:bg-surface-soft text-muted hover:text-ink transition-colors mr-1 shrink-0"
            title="Open Chat History"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <span id="topbar-badge" className={`px-2.5 md:px-3 py-0.5 rounded-full text-[10px] md:text-xs font-medium border ${workspaceDetails[workspaceMode].color}`}>
          {workspaceDetails[workspaceMode].label}
        </span>
        <span className="text-muted">/</span>
        <span id="topbar-breadcrumb" className="text-sm font-medium text-ink font-sans truncate max-w-[120px] sm:max-w-[200px] md:max-w-[400px]">
          {currentChatTitle}
        </span>
        {currentChatTitle !== 'New Chat' && (
          <button
            onClick={onResetChat}
            className="text-xs text-primary hover:text-primary-active underline ml-2 font-medium"
          >
            New Chat
          </button>
        )}
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-4 relative">
        {/* Help button */}
        <button
          id="help-btn"
          onClick={() => setShowHelpModal(!showHelpModal)}
          className={`w-9 h-9 rounded-full border border-hairline flex items-center justify-center text-ink bg-canvas hover:bg-surface-soft transition-all ${showHelpModal ? 'bg-surface-soft' : ''}`}
          title="Help Center"
        >
          <HelpCircle className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Notification bell */}
        <div className="relative">
          <button
            id="notification-btn"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserDropdown(false);
              setShowHelpModal(false);
            }}
            className={`w-9 h-9 rounded-full border border-hairline flex items-center justify-center text-ink bg-canvas hover:bg-surface-soft transition-all ${showNotifications ? 'bg-surface-soft' : ''}`}
            title="Notifications"
          >
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full ring-2 ring-canvas" />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-canvas border border-hairline rounded-xl py-2 z-50 text-sm">
              <div className="px-4 py-2 border-b border-hairline flex items-center justify-between">
                <span className="font-medium text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="text-xs text-primary hover:text-primary-active">
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={`px-4 py-2.5 hover:bg-surface-soft border-b border-hairline last:border-0 ${!n.read ? 'bg-surface-card' : ''}`}>
                    <p className="text-xs text-body font-sans">{n.text}</p>
                    <p className="text-[10px] text-muted-soft mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Vertical divider */}
        <div className="h-6 w-px bg-hairline" />

        {/* User Profile Dropper */}
        <div className="relative">
          <button
            id="user-profile-menu-btn"
            onClick={() => {
              setShowUserDropdown(!showUserDropdown);
              setShowNotifications(false);
              setShowHelpModal(false);
            }}
            className="flex items-center gap-2 hover:bg-surface-soft p-1.5 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-surface-dark text-on-dark font-medium flex items-center justify-center text-sm">
              {(currentUser?.name?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col items-start text-left">
              <span className="text-xs font-medium text-ink leading-tight">{currentUser?.name || 'User'}</span>
              <span className="text-[10px] text-muted font-normal capitalize">{currentUser?.role || 'Member'}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>

          {/* User Settings Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-canvas border border-hairline rounded-xl py-2 z-50 text-sm">
              <div className="px-4 py-2 border-b border-hairline">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-ink truncate block max-w-[120px]">{currentUser?.name || 'User'}</span>
                  {currentUser?.role === 'admin' && (
                    <span className="text-[9px] bg-primary text-white px-1.5 py-0.5 rounded font-medium uppercase tracking-wider">Admin</span>
                  )}
                </div>
                <p className="text-xs text-muted-soft truncate mt-0.5">{currentUser?.email || 'user@example.com'}</p>
              </div>
              <div className="py-1">
                <div className="px-4 py-1.5 bg-surface-soft m-2 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-muted font-medium">
                    <span>RPM LIMIT</span>
                    <span className="font-mono text-ink">{currentUser?.rpmLimit || 60}/min</span>
                  </div>
                  {currentUser?.creditsExpiry && (
                    <div className="flex justify-between items-center text-[10px] text-muted font-medium">
                      <span>EXPIRY</span>
                      <span className="font-mono text-primary">
                        {new Date(currentUser.creditsExpiry).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-hairline pt-1">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    if (onLogout) {
                      onLogout();
                    } else {
                      showToast('Logged out of session');
                    }
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-surface-soft text-error flex items-center gap-2 font-medium text-xs"
                >
                  <LogOut className="w-4 h-4" /> Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Modal Popup */}
      {showHelpModal && (
        <div className="absolute right-12 top-16 w-96 bg-canvas border border-hairline rounded-xl p-5 z-50 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-hairline mb-3">
            <h4 className="font-medium text-ink flex items-center gap-2">
              <SpikeMark className="w-4 h-4" /> Aira.Ai User Guide
            </h4>
            <button onClick={() => setShowHelpModal(false)} className="text-muted hover:text-ink text-xs font-medium">
              Close
            </button>
          </div>
          <p className="text-xs text-muted leading-relaxed mb-3">
            Welcome to your intelligent orchestrator! Aira.Ai consolidates frontier foundational models into a secure, single-workspace control plane.
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2 text-xs">
              <span className="font-medium bg-surface-card text-ink px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">WORKSPACE</span>
              <span className="text-body leading-relaxed">Switch workspace modes at the bottom-left to target Chat, Coding, or Co-work prompts.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-medium bg-surface-card text-ink px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">MODELS</span>
              <span className="text-body leading-relaxed">Select powerful models like **Opus 4.8** or ultra-fast alternatives using the bottom-right selector.</span>
            </div>
            <div className="flex items-start gap-2 text-xs">
              <span className="font-medium bg-surface-card text-ink px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide">CREDITS</span>
              <span className="text-body leading-relaxed">Track and buy API gateway credits on-the-fly directly inside the Left Sidebar.</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
