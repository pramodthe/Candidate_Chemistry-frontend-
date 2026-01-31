import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, MessageSquare, Sparkles, X, Send, Bot } from 'lucide-react';
import { LiveSession } from '../services/liveApiService';
import { StanceCard } from '../types';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

interface AIAssistantProps {
  card: StanceCard;
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Enhanced 3D Avatar Component ---
const Avatar3D = ({ isTalking, isListening, isConnected }: { isTalking: boolean; isListening: boolean; isConnected: boolean }) => (
  <div className="relative w-14 h-14 flex items-center justify-center cursor-pointer group">
    
    {/* Ambient Glow */}
    <div className={`absolute inset-0 bg-indigo-400 rounded-full blur-xl opacity-0 transition-opacity duration-500 ${isConnected ? 'opacity-40 animate-pulse' : 'group-hover:opacity-20'}`}></div>

    {/* Head Container - Floating Animation */}
    <div className={`w-full h-full relative z-10 transition-transform duration-500 ${isTalking ? 'scale-110' : 'scale-100'} ${!isConnected ? 'animate-[float_6s_ease-in-out_infinite]' : ''}`}>
      
      {/* Head Shape */}
      <div className={`w-full h-full rounded-[28%] shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] border border-white/50 flex items-center justify-center relative overflow-hidden z-10 transition-colors duration-300
        ${isConnected 
            ? isTalking ? 'bg-gradient-to-b from-indigo-50 to-indigo-100 ring-2 ring-indigo-300' : 'bg-gradient-to-b from-green-50 to-green-100 ring-2 ring-green-300' 
            : 'bg-gradient-to-b from-white to-slate-100'
        }
      `}>
         
         {/* Gloss Reflection */}
         <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/80 to-transparent opacity-80 rounded-t-[28%] pointer-events-none"></div>

         {/* Face Screen */}
         <div className={`bg-slate-900 rounded-lg flex items-center justify-center gap-[3px] relative overflow-hidden transition-all duration-300 shadow-inner ${isConnected ? 'w-8 h-5' : 'w-8 h-5'}`}>
            
            {/* Eyes */}
            <div className={`bg-cyan-400 rounded-full w-1.5 h-1.5 shadow-[0_0_5px_rgba(34,211,238,0.8)] ${isTalking ? 'animate-[bounce_0.2s_infinite]' : 'animate-[blink_4s_infinite]'}`}></div>
            <div className={`bg-cyan-400 rounded-full w-1.5 h-1.5 shadow-[0_0_5px_rgba(34,211,238,0.8)] ${isTalking ? 'animate-[bounce_0.2s_infinite]' : 'animate-[blink_4s_infinite]'}`} style={{ animationDelay: '0.1s' }}></div>
            
            {/* Mouth (only appears when talking) */}
            {isTalking && (
                <div className="absolute bottom-1 w-2 h-0.5 bg-cyan-400 rounded-full animate-pulse"></div>
            )}
         </div>

         {/* Connection Indicator Dot */}
         <div className={`absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isConnected ? 'bg-green-500 shadow-[0_0_5px_rgba(34,199,89,1)]' : 'bg-slate-300'}`}></div>
      </div>
    </div>
  </div>
);

// --- Audio Waveform Visualizer ---
const AudioVisualizer = () => (
    <div className="flex items-center gap-0.5 h-6">
        {[...Array(8)].map((_, i) => (
            <div 
                key={i} 
                className="w-1 bg-indigo-500 rounded-full animate-[music-bar_0.8s_ease-in-out_infinite]"
                style={{ 
                    animationDelay: `${i * 0.1}s`,
                    height: '20%' // Base height, animation scales Y
                }} 
            />
        ))}
        <style>{`
            @keyframes music-bar {
                0%, 100% { height: 20%; opacity: 0.5; }
                50% { height: 80%; opacity: 1; }
            }
        `}</style>
    </div>
);

// --- CHAT MODAL ---
interface Message {
    role: 'user' | 'model';
    text: string;
}

const ChatModal = ({ card, onClose }: { card: StanceCard, onClose: () => void }) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: `Hi! I can answer questions about the policy: "${card.question}". What would you like to know?` }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const chatSessionRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize chat session
    useEffect(() => {
        const systemInstruction = `You are a helpful, objective policy expert for the San Francisco 2026 election app. 
        Context:
        Policy: ${card.question}
        Background: ${card.context}
        Analysis: ${card.analysis}
        
        Your goal is to answer user questions about this specific policy. 
        Keep answers short (under 50 words), neutral, and easy to understand.
        Do not express personal opinions.`;

        chatSessionRef.current = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: { systemInstruction }
        });
    }, [card]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!input.trim() || !chatSessionRef.current) return;
        
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsTyping(true);

        try {
            const response = await chatSessionRef.current.sendMessage({ message: userMsg });
            const text = response.text || "I'm having trouble analyzing that right now.";
            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'model', text: "Sorry, connection error. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
             <div className="bg-white w-full max-w-sm h-[600px] max-h-[85vh] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-md">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                             <Bot size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Policy Chat</h3>
                            <p className="text-[10px] text-slate-500">Powered by Gemini</p>
                        </div>
                     </div>
                     <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X size={18}/></button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                m.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md shadow-indigo-200' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm shadow-sm'
                            }`}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2">
                        <input 
                            type="text" 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question..." 
                            className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isTyping}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
             </div>
        </div>
    );
};

const AIAssistant: React.FC<AIAssistantProps> = ({ card }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTalking, setIsTalking] = useState(false); 
  const [showChat, setShowChat] = useState(false);
  
  // Voice Mode State
  const [isConnected, setIsConnected] = useState(false);
  const sessionRef = useRef<LiveSession | null>(null);

  // Initialize typing effect (text mode)
  useEffect(() => {
    if (isConnected) return; // Don't type text if voice mode is on
    
    // Use simplified analysis for the preview text
    const text = card.analysis;
    setDisplayedText('');
    setIsTalking(true);
    let i = 0;
    const speed = 20; 
    
    const startDelay = setTimeout(() => {
        const timer = setInterval(() => {
        if (i < text.length) {
            setDisplayedText(prev => prev + text.charAt(i));
            i++;
        } else {
            clearInterval(timer);
            setIsTalking(false);
        }
        }, speed);
        return () => clearInterval(timer);
    }, 500);

    return () => clearTimeout(startDelay);
  }, [card, isConnected]);

  // Handle Voice Connection
  const toggleVoiceMode = async () => {
    if (isConnected) {
        await sessionRef.current?.disconnect();
        sessionRef.current = null;
        setIsConnected(false);
        setIsTalking(false);
    } else {
        const session = new LiveSession();
        sessionRef.current = session;
        
        session.onIsTalking = (talking) => setIsTalking(talking);
        session.onError = (err) => { alert(err); setIsConnected(false); };
        
        await session.connect({
          systemInstruction: `You are a helpful, neutral, and futuristic policy guide. 
          Explain complex policies in simple "Explain Like I'm 5" terms.
          Keep responses concise (under 2 sentences).
          Current Policy Context: "${card.question} - ${card.analysis}".`,
          voiceName: 'Zephyr'
        }); 
        setIsConnected(true);
    }
  };

  useEffect(() => {
    return () => { sessionRef.current?.disconnect(); };
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none px-2">
      {/* Floating Smart Capsule */}
      <div className="pointer-events-auto relative w-full max-w-[360px] bg-white/90 backdrop-blur-xl rounded-[2.5rem] p-2 pl-3 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] border border-white/50 ring-1 ring-slate-900/5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] group">
        
        {/* Avatar Section */}
        <div onClick={toggleVoiceMode} className="shrink-0 relative z-10">
            <Avatar3D 
                isTalking={isTalking} 
                isListening={isConnected && !isTalking} 
                isConnected={isConnected} 
            />
            {/* Pulsing Ring for Voice Mode */}
            {isConnected && (
                <div className="absolute inset-0 rounded-full border border-indigo-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
            )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col justify-center h-12 pr-1">
            {/* Header */}
            <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${isConnected ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {isConnected ? (
                        <>
                           <Sparkles size={8} /> Live Policy Guide
                        </>
                    ) : (
                        "Policy Analysis"
                    )}
                </span>
            </div>

            {/* Dynamic Content Display */}
            <div className="relative h-8 flex items-center">
                {isConnected ? (
                    isTalking ? (
                        <div className="w-full flex items-center gap-3">
                            <AudioVisualizer />
                            <span className="text-xs font-bold text-indigo-600 animate-pulse">Speaking...</span>
                        </div>
                    ) : (
                        <div className="text-xs font-medium text-slate-500 italic flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            Listening...
                        </div>
                    )
                ) : (
                    <div className="w-full text-xs text-slate-700 font-medium leading-tight line-clamp-2 mix-blend-multiply" onClick={() => setShowChat(true)}>
                        {displayedText}
                        <span className="inline-block w-0.5 h-3 bg-indigo-400 ml-0.5 animate-pulse align-middle"></span>
                    </div>
                )}
            </div>
        </div>

        {/* Interaction Buttons */}
        <div className="flex items-center gap-1">
            {/* Text Chat Button */}
            {!isConnected && (
                <button 
                    onClick={() => setShowChat(true)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 bg-slate-50 border border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100"
                    title="Chat about this policy"
                >
                    <MessageSquare size={16} strokeWidth={2.5} />
                </button>
            )}

            {/* Voice Mode Button */}
            <button 
                onClick={toggleVoiceMode}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${
                    isConnected 
                    ? 'bg-white border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rotate-0' 
                    : 'bg-slate-900 border-transparent text-white hover:bg-indigo-600 hover:scale-105 rotate-0'
                }`}
                title={isConnected ? "End Conversation" : "Start Voice Chat"}
            >
                {isConnected ? (
                    <X size={18} strokeWidth={2.5} />
                ) : (
                    <Mic size={18} strokeWidth={2.5} />
                )}
            </button>
        </div>

      </div>

      {/* Chat Modal */}
      {showChat && <ChatModal card={card} onClose={() => setShowChat(false)} />}
    </div>
  );
};

export default AIAssistant;