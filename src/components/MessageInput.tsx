import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Send, Check } from 'lucide-react';
import { ModelOption } from '../types';
import SpikeMark from './SpikeMark';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  isLoading: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'claude-opus-4.6', name: 'Claude Opus 4.6', provider: 'Anthropic', tagline: 'Unified intelligence & next-generation reasoning engine', isSpark: true },
  { id: 'claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'Anthropic', tagline: 'Extreme multi-step logic & system reasoning capacity', isSpark: true },
  { id: 'claude-opus-4.8', name: 'Claude Opus 4.8', provider: 'Anthropic', tagline: 'Enterprise-grade cognitive decision modeling', isSpark: false }
];

export default function MessageInput({ onSendMessage, selectedModel, setSelectedModel, isLoading }: MessageInputProps) {
  const [inputText, setInputText] = useState('');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [inputText]);

  // Click outside model dropdown to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
    // Focus back
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectModel = (model: ModelOption) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-6 shrink-0">
      <div
        className={`bg-canvas border rounded-2xl transition-all duration-200 overflow-visible shadow-none ${
          isFocused
            ? 'border-primary ring-[3px] ring-primary/15'
            : 'border-hairline'
        }`}
      >
        {/* Top bar with model selection dropdown */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-canvas border-b border-hairline-soft rounded-t-2xl">
          <span className="text-sm font-medium text-ink font-sans">Model Selection</span>
          
          <div className="relative" ref={dropdownRef}>
            <button
              id="model-selector-btn"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-canvas border border-hairline rounded-full text-xs transition-colors hover:bg-surface-soft cursor-pointer"
              title="Change frontier model"
            >
              <SpikeMark className="w-3 h-3 text-primary shrink-0" />
              <span className="font-mono text-[13px] text-body">{selectedModel.name}</span>
              <ChevronDown className="w-3 h-3 text-muted shrink-0" />
            </button>

            {/* Model Options List */}
            {showModelDropdown && (
              <div className="absolute right-0 mt-1 w-72 bg-canvas border border-hairline rounded-xl py-1.5 z-50 text-xs shadow-lg ring-1 ring-black/5">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => selectModel(m)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-surface-soft flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-ink font-semibold">{m.name}</span>
                        <span className="text-[10px] bg-surface-cream-strong text-muted px-1.5 py-0.5 rounded uppercase font-medium">
                          {m.provider}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-soft mt-1 font-sans leading-relaxed">{m.tagline}</p>
                    </div>
                    {selectedModel.id === m.id && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Text Area and Send Button */}
        <div className="p-3 relative flex flex-col rounded-b-2xl bg-canvas">
          <textarea
            id="chat-textarea"
            ref={textareaRef}
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Message Aira.Ai..."
            className="w-full text-sm text-body placeholder-muted-soft bg-transparent border-0 focus:ring-0 focus:outline-none resize-none min-h-[44px] pb-10 max-h-60 leading-relaxed font-sans"
            disabled={isLoading}
          />
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {isLoading && (
              <span className="text-xs text-muted-soft animate-pulse font-mono mr-1">Aira.Ai is typing...</span>
            )}
            <button
              id="send-message-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || isLoading}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                inputText.trim() && !isLoading
                  ? 'bg-primary text-white hover:bg-primary-active active:bg-primary-active cursor-pointer shadow-none'
                  : 'bg-primary-disabled text-muted-soft cursor-not-allowed'
              }`}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <p id="chat-footer-text" className="text-center text-xs text-muted-soft mt-2.5 font-sans select-none">
        Aira.Ai can make mistakes. Please verify important information.
      </p>
    </div>
  );
}
