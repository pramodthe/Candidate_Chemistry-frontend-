import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import {
  getCandidates,
  startResearch,
  getResearchStatus,
  getResearchResults,
  getActiveResearch,
  cancelResearch
} from '../services/researchService';
import { ChatMessage, ResearchStatus } from '../types';

const ResearchChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your Candidate Research Assistant. Try commands like:\n• `list` - See all candidates\n• `research <name>` - Research a candidate\n• `compare <name1>, <name2>` - Compare candidates\n• `status <id>` - Check research status',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeResearch, setActiveResearch] = useState<Map<string, ResearchStatus>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (content: string, role: 'user' | 'assistant', type: ChatMessage['type'] = 'text') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      type
    }]);
  };

  const handleCommand = async (cmd: string) => {
    const args = cmd.trim().split(/\s+/);
    const command = args[0].toLowerCase();
    const rest = args.slice(1).join(' ');

    setIsLoading(true);

    try {
      switch (command) {
        case 'help':
          addMessage('Available commands:\n• list - List all candidates\n• research <name> - Start research on a candidate\n• compare <name1>, <name2> - Compare multiple candidates\n• status <id> - Check research status\n• cancel <id> - Cancel research\n• active - Show active research', 'assistant');
          break;

        case 'list':
          const candidates = await getCandidates();
          addMessage(`**Available Candidates:**\n\n${candidates.map(c => `• ${c.name}`).join('\n')}\n\nType "research <name>" to research any candidate.`, 'assistant');
          break;

        case 'research':
          if (!rest) {
            addMessage('Please provide a candidate name. Example: `research London Breed`', 'assistant', 'error');
            break;
          }
          const session = await startResearch(rest);
          addMessage(`Research started for **${rest}**\n\nResearch ID: \`${session.id}\`\n\nUse \`status ${session.id}\` to check progress.`, 'assistant');
          // Start polling for status
          pollStatus(session.id);
          break;

        case 'compare':
          const names = rest.split(',').map(n => n.trim()).filter(Boolean);
          if (names.length < 2) {
            addMessage('Please provide at least 2 candidates to compare. Example: `compare London Breed, Aaron Peskin`', 'assistant', 'error');
            break;
          }
          addMessage(`Starting comparison of: ${names.join(', ')}...\n\nThis may take a moment.`, 'assistant', 'loading');
          const comparison = await startResearch(names[0]); // Simplified for now
          addMessage(`Comparison complete!\n\n**${names.join(' vs ')}**\n\nSee individual research results for detailed stance comparisons.`, 'assistant');
          break;

        case 'status':
          if (!rest) {
            addMessage('Please provide a research ID. Example: `status research_123abc`', 'assistant', 'error');
            break;
          }
          const status = await getResearchStatus(rest);
          if (!status) {
            addMessage('Research session not found.', 'assistant', 'error');
            break;
          }
          const statusEmoji = status.status === 'completed' ? '✅' : status.status === 'failed' ? '❌' : status.status === 'in_progress' ? '🔄' : '⏳';
          addMessage(`${statusEmoji} **Research Status**\n\nID: \`${status.id}\`\nProgress: ${status.progress}%\n\n${status.message || ''}`, 'assistant');
          break;

        case 'active':
          const active = await getActiveResearch();
          if (active.length === 0) {
            addMessage('No active research sessions.', 'assistant');
          } else {
            addMessage(`**Active Research:**\n\n${active.map(s => `• ${s.candidate_name} (${s.progress}%) - \`${s.id}\``).join('\n')}`, 'assistant');
          }
          break;

        case 'cancel':
          if (!rest) {
            addMessage('Please provide a research ID to cancel.', 'assistant', 'error');
            break;
          }
          await cancelResearch(rest);
          addMessage(`Research \`${rest}\` cancelled.`, 'assistant');
          break;

        case 'result':
        case 'results':
          if (!rest) {
            addMessage('Please provide a research ID.', 'assistant', 'error');
            break;
          }
          const result = await getResearchResults(rest);
          if (!result) {
            addMessage('Results not found. Research may still be in progress.', 'assistant', 'error');
            break;
          }
          addMessage(`**Research Results: ${result.candidate_name}**\n\n${result.summary}\n\n**Stances:**\n${result.stances.map(s => `• ${s.question}: ${s.candidate_matches[0]?.alignment}`).join('\n')}`, 'assistant');
          break;

        default:
          addMessage(`Unknown command: \`${command}\`\n\nType \`help\` for available commands.`, 'assistant', 'error');
      }
    } catch (error) {
      addMessage('An error occurred. Please try again.', 'assistant', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const pollStatus = async (id: string) => {
    const poll = async () => {
      const status = await getResearchStatus(id);
      if (status) {
        setActiveResearch(prev => new Map(prev).set(id, status));

        if (status.status === 'completed' || status.status === 'failed') {
          addMessage(`Research ${status.status}: \`${id}\``, 'assistant');
          return true; // Stop polling
        }
      }
      return false;
    };

    // Poll for up to 30 seconds
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const done = await poll();
      if (done) break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const command = input.trim();
    setInput('');
    addMessage(command, 'user');
    handleCommand(command);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[32rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <span className="text-white font-semibold text-sm">Research Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-800'
                }`}>
                  {msg.role === 'user' ? (
                    <User size={14} className="text-white" />
                  ) : (
                    <Bot size={14} className="text-indigo-400" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : msg.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : msg.type === 'loading'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}>
                  {msg.type === 'loading' && (
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs font-medium">Processing...</span>
                    </div>
                  )}
                  <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                  <Bot size={14} className="text-indigo-400" />
                </div>
                <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-110'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
};

export default ResearchChatbot;
