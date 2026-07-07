import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Terminal, Copy, Check, RefreshCw } from 'lucide-react';
import { Message, WorkspaceMode } from '../types';
import ChatEmptyState from './ChatEmptyState';
import SpikeMark from './SpikeMark';

interface ChatAreaProps {
  messages: Message[];
  workspaceMode: WorkspaceMode;
  onSendPresetMessage: (msg: string) => void;
  isLoading: boolean;
  onClearChat: () => void;
  selectedModelName: string;
}

export default function ChatArea({
  messages,
  workspaceMode,
  onSendPresetMessage,
  isLoading,
  onClearChat,
  selectedModelName
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(blockId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col justify-center bg-canvas">
        <ChatEmptyState workspaceMode={workspaceMode} onSendPresetMessage={onSendPresetMessage} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-canvas px-6 py-8 flex flex-col space-y-6">
      <div className="max-w-3xl w-full mx-auto flex-1 space-y-8">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const messageId = msg.id || `msg-${index}`;
          
          return (
            <motion.div
              key={messageId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar for bot */}
              {!isUser && (
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <SpikeMark className="w-5 h-5 text-primary" />
                </div>
              )}

              {/* Message Content Container */}
              <div className={isUser ? 'max-w-[85%]' : 'flex-1'}>
                {isUser ? (
                  /* User Bubble */
                  <div className="bg-surface-card border border-hairline rounded-xl p-4 text-body font-sans text-sm font-normal shadow-none">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-muted">
                        YOU
                      </span>
                      <span className="text-[10px] text-muted-soft">{msg.timestamp}</span>
                    </div>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  /* Assistant Flat Text */
                  <div className="text-body font-sans text-sm">
                    {/* Meta Row */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-primary">
                        NEXUSAI
                      </span>
                      <span className="text-[10px] text-muted font-mono bg-surface-soft px-1.5 py-0.5 rounded">
                        {msg.modelUsed || selectedModelName}
                      </span>
                      <span className="text-[10px] text-muted-soft ml-auto">{msg.timestamp}</span>
                    </div>

                    {/* Message Body Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {renderMessageContent(msg, (code) => copyToClipboard(code, messageId), copiedId === messageId, onSendPresetMessage)}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar for user */}
              {isUser && (
                <div className="w-9 h-9 rounded-full bg-surface-dark text-on-dark font-medium flex items-center justify-center shrink-0 text-sm">
                  U
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Loading Bubble Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 justify-start"
          >
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <SpikeMark className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="bg-canvas border border-hairline rounded-xl p-4 max-w-[85%] flex items-center gap-2 shadow-none">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Floating control to reset or clear */}
      {messages.length > 0 && (
        <div className="flex justify-center pb-2 select-none shrink-0">
          <button
            onClick={onClearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-canvas hover:bg-surface-soft border border-hairline rounded-full text-xs text-muted hover:text-primary transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear conversation</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Simple layout formatting for messages (handling bold texts, bullets, code blocks)
function formatMessageContent(content: string, onCopy: (txt: string) => void, isCopied: boolean) {
  if (typeof content !== 'string') {
    if (content === null || content === undefined) return '';
    return String(content);
  }

  // Check if content has markdown backticks
  if (content.includes('```')) {
    const parts = content.split('```');
    return (
      <div className="space-y-4">
        {parts.map((part, idx) => {
          if (idx % 2 === 1) {
            // It's a code block
            const lines = part.split('\n');
            const language = lines[0].trim() || 'code';
            const code = lines.slice(1).join('\n').trim();

            return (
              <div key={idx} className="bg-surface-dark border-0 rounded-xl overflow-hidden my-4">
                <div className="bg-surface-dark-soft px-4 py-2 border-b border-hairline/10 flex items-center justify-between text-xs font-mono text-on-dark-soft">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Terminal className="w-3.5 h-3.5 text-primary" />
                    {language}
                  </span>
                  <button
                    onClick={() => { onCopy(code); }}
                    className="bg-surface-dark-elevated text-on-dark hover:text-white px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors active:scale-95"
                    title="Copy code"
                  >
                    {isCopied ? 'Copied' : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-6 text-sm text-on-dark overflow-x-auto font-mono leading-relaxed bg-surface-dark-soft">
                  <code>{code}</code>
                </pre>
              </div>
            );
          } else {
            // Standard text blocks
            return formatMarkdownInline(part);
          }
        })}
      </div>
    );
  }

  return formatMarkdownInline(content);
}

// Parse simple markdown-like elements like **bold** or bullet lists
function formatMarkdownInline(text: string) {
  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    const trimmed = line.trim();
    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const cleanLine = trimmed.substring(2);
      return (
        <div key={lIdx} className="flex items-start gap-2 ml-2 my-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
          <span className="text-sm text-body">{parseBoldText(cleanLine)}</span>
        </div>
      );
    }
    // Numbered points
    if (/^\d+\.\s/.test(trimmed)) {
      const dotIdx = trimmed.indexOf('.');
      const num = trimmed.substring(0, dotIdx + 1);
      const cleanLine = trimmed.substring(dotIdx + 1).trim();
      return (
        <div key={lIdx} className="flex items-start gap-2 ml-2 my-1.5">
          <span className="text-primary font-mono font-medium text-xs mt-0.5 shrink-0">{num}</span>
          <span className="text-sm text-body">{parseBoldText(cleanLine)}</span>
        </div>
      );
    }
    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const cleanLine = trimmed.substring(2);
      return (
        <blockquote key={lIdx} className="border-l-4 border-primary bg-surface-soft px-4 py-2 my-3 rounded-r-md text-sm italic text-body">
          {parseBoldText(cleanLine)}
        </blockquote>
      );
    }
    // Standard paragraph line
    return (
      <p key={lIdx} className="text-sm text-body my-1.5 min-h-[1.25rem] leading-relaxed">
        {parseBoldText(line)}
      </p>
    );
  });
}

function parseBoldText(text: string) {
  if (!text.includes('**')) return text;

  const parts = text.split('**');
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <strong key={index} className="font-semibold text-ink">{part}</strong>;
    }
    return part;
  });
}

function parseClarificationCard(content: string) {
  try {
    const marker = "[ASK_TOPIC_CLARIFICATION]";
    if (content.includes(marker)) {
      const jsonStart = content.indexOf('{', content.indexOf(marker));
      if (jsonStart !== -1) {
        const jsonStr = content.substring(jsonStart).trim();
        const data = JSON.parse(jsonStr);
        if (data && data.ask_topic) {
          const preamble = content.split(marker)[0].trim();
          return {
            isClarification: true,
            preamble,
            options: data.options || []
          };
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return null;
}

function renderMessageContent(msg: Message, onCopy: (txt: string) => void, isCopied: boolean, onSendPresetMessage: (msg: string) => void) {
  const clarification = parseClarificationCard(msg.content);
  if (clarification) {
    return (
      <div className="space-y-4">
        {clarification.preamble && (
          <p className="text-sm text-body">{clarification.preamble}</p>
        )}
        <div className="bg-surface-card border border-hairline/80 rounded-xl p-5 shadow-sm space-y-4 max-w-md">
          <div className="flex items-center gap-2.5 text-primary text-xs font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Select a Document Topic
          </div>
          <div className="flex flex-col gap-2">
            {clarification.options.map((opt: string, oIdx: number) => (
              <button
                key={oIdx}
                onClick={() => onSendPresetMessage(`Create a document with topic: ${opt}`)}
                className="w-full text-left px-4 py-3 bg-canvas hover:bg-surface-soft border border-hairline hover:border-primary/45 rounded-lg text-sm text-body hover:text-primary transition-all active:scale-[0.98] flex items-center justify-between"
              >
                <span>{opt}</span>
                <span className="text-xs text-muted-soft font-medium uppercase font-mono">Use Topic →</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return formatMessageContent(msg.content, onCopy, isCopied);
}
