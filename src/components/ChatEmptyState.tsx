import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Code, Layers, Play, Zap, Flame, Terminal } from 'lucide-react';
import { WorkspaceMode } from '../types';
import SpikeMark from './SpikeMark';

interface ChatEmptyStateProps {
  workspaceMode: WorkspaceMode;
  onSendPresetMessage: (msg: string) => void;
}

export default function ChatEmptyState({ workspaceMode, onSendPresetMessage }: ChatEmptyStateProps) {
  // Preset prompts depending on workspace mode
  const promptsByMode = {
    chat: [
      { text: 'Analyze market opportunities in retail tech', icon: Flame },
      { text: 'Draft an introduction email for a Senior Product Manager', icon: Zap },
      { text: 'Explain quantum computing in three sentences', icon: Sparkles }
    ],
    coding: [
      { text: 'Write a TypeScript debounce function with generics', icon: Terminal },
      { text: 'Optimize an Express middleware chain for memory leak defense', icon: Code },
      { text: 'Configure a Tailwind v4 theme with a modern retro styling schema', icon: Play }
    ],
    cowork: [
      { text: 'Help align product goals for our Q3 sprint schedule', icon: Layers },
      { text: 'Create an interactive feedback matrix template', icon: Sparkles },
      { text: 'Synthesize raw interview transcripts into action points', icon: Zap }
    ]
  };

  const currentPrompts = promptsByMode[workspaceMode];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-4xl mx-auto">
      {/* Decorative center icon layout */}
      <div className="mb-8">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex items-center justify-center"
        >
          <SpikeMark className="w-14 h-14 text-primary" />
        </motion.div>
      </div>

      {/* Texts */}
      <h2
        id="empty-state-heading"
        className="font-display text-[32px] md:text-[48px] font-normal tracking-tight text-ink mb-4 leading-[1.1]"
      >
        How can I help you?
      </h2>
      
      <p
        id="empty-state-subtitle"
        className="text-muted font-sans text-base max-w-md mx-auto mb-12 leading-relaxed"
      >
        Ask anything, or pick a suggestion to get started.
      </p>

      {/* Quick starter chips */}
      <div className="w-full max-w-3xl px-4">
        <p className="text-xs font-medium text-muted tracking-[1.5px] uppercase mb-4">
          SUGGESTED FOR THIS WORKSPACE
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentPrompts.map((prompt, idx) => {
            const PromptIcon = prompt.icon;
            return (
              <motion.button
                key={idx}
                onClick={() => onSendPresetMessage(prompt.text)}
                className="p-6 bg-surface-card hover:bg-surface-cream-strong rounded-xl text-left text-[15px] font-medium text-ink transition-all duration-200 flex flex-col justify-between min-h-[120px] shadow-none border-0"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div className="w-7 h-7 rounded bg-surface-soft flex items-center justify-center text-primary shrink-0 mb-3">
                  <PromptIcon className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <span className="leading-snug text-ink">{prompt.text}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
