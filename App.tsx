import React, { useState, useEffect } from 'react';
import { fetchStanceCards } from './services/geminiService';
import { StanceCard, UserChoice } from './types';
import Card from './components/Card';
import Results from './components/Results';
import AIAssistant from './components/AIAssistant';
import ResearchChatbot from './components/ResearchChatbot';
import { Loader2, AlertCircle, Vote, Sparkles, X, BookOpen } from 'lucide-react';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<StanceCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [userChoices, setUserChoices] = useState<Record<string, UserChoice['choice']>>({});
  const [gameStatus, setGameStatus] = useState<'intro' | 'playing' | 'results'>('intro');
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedCards = await fetchStanceCards();
      setCards(fetchedCards);
    } catch (err) {
      setError("Failed to load candidates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    setGameStatus('playing');
    setCurrentCardIndex(0);
    setUserChoices({});
  };

  const handleVote = (choice: 'supports' | 'opposes' | 'skip') => {
    const currentCard = cards[currentCardIndex];
    setUserChoices(prev => ({
      ...prev,
      [currentCard.stance_id]: choice
    }));

    if (currentCardIndex < cards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    } else {
      setGameStatus('results');
    }
  };

  const handleReset = () => {
    setGameStatus('intro');
    setCurrentCardIndex(0);
    setUserChoices({});
  };

  // --- Background Component ---
  const LivingBackground = () => (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         {/* Base Gradient */}
         <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-100"></div>
         
         {/* Floating Orbs - 3D Parallax Simulation */}
         <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-200/30 rounded-full blur-[100px] mix-blend-multiply animate-float-slow"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-violet-200/30 rounded-full blur-[100px] mix-blend-multiply animate-float-reverse"></div>
         <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-100/40 rounded-full blur-[80px] mix-blend-overlay animate-pulse" style={{animationDuration: '8s'}}></div>
         
         {/* Noise Texture */}
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );

  // --- Policy Modal Component ---
  const PolicyModal = ({ card, onClose }: { card: StanceCard, onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose}></div>
        <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BookOpen size={16} />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-slate-900">Policy Brief</h3>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                    <X size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">The Context</h4>
                     <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {card.context}
                     </p>
                </div>
                <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Analysis (Simplified)</h4>
                     <p className="text-sm text-slate-600 leading-relaxed">
                        {card.analysis}
                     </p>
                </div>
                <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Key Question</h4>
                     <p className="text-lg font-serif font-bold text-slate-900">
                        {card.question}
                     </p>
                </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-colors">
                    Return to Vote
                </button>
            </div>
        </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-900 overflow-hidden relative">
        <LivingBackground />
        <div className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-700">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin relative z-10"></div>
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 tracking-tight mt-8">System Initializing</h2>
          <p className="text-indigo-500 font-mono text-[10px] mt-3 uppercase tracking-[0.2em] font-semibold">Establishing Secure Link</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center relative">
        <LivingBackground />
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-red-100 max-w-md w-full relative z-10 animate-in slide-in-from-bottom-10">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-red-50">
                <AlertCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Connection Failure</h2>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">{error}</p>
            <button 
            onClick={loadCards}
            className="w-full py-4 bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] transition-all duration-200 font-bold text-sm tracking-widest uppercase rounded-xl shadow-lg active:scale-95"
            >
            Retry Connection
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-50 text-slate-900 flex flex-col relative overflow-hidden font-sans">
      
      <LivingBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md border-b border-white/50 shadow-sm"></div>
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transform hover:rotate-3 transition-transform cursor-pointer">
              <Vote size={18} />
            </div>
            <div className="flex flex-col">
                <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">Candidate<span className="text-indigo-600">Chemistry</span></h1>
                <p className="text-[9px] text-slate-400 font-bold tracking-wider">SF 2026</p>
            </div>
          </div>
          
          {gameStatus === 'playing' && (
             <div className="flex flex-col items-end gap-1">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                <div className="flex gap-1.5 p-1 bg-white/50 rounded-full border border-white/50 backdrop-blur-sm">
                    {cards.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                                idx < currentCardIndex ? 'w-2 bg-indigo-500' : 
                                idx === currentCardIndex ? 'w-6 bg-slate-900 shadow-[0_0_10px_rgba(15,23,42,0.3)]' : 
                                'w-2 bg-slate-200'
                            }`}
                        />
                    ))}
                </div>
             </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-md mx-auto px-4 relative z-10 pt-16 pb-4 perspective-1000">
        
        {gameStatus === 'intro' && (
          <div className="w-full text-center animate-in fade-in zoom-in-95 duration-1000 flex flex-col items-center justify-center h-full pb-20">
            
            <div className="relative mb-12 group cursor-default">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-violet-400 blur-[80px] opacity-30 rounded-full group-hover:opacity-50 transition-opacity duration-700"></div>
                <h2 className="text-6xl md:text-8xl font-serif font-black text-slate-900 tracking-tighter relative z-10 leading-[0.85] drop-shadow-2xl">
                Match<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 animate-gradient-x bg-[length:200%_auto]">Maker</span>
                </h2>
                <div className="absolute -top-8 -right-8 text-yellow-500 animate-[bounce_3s_infinite]">
                    <Sparkles size={48} className="drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                </div>
            </div>
            
            <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-3xl shadow-[0_8px_32px_rgba(31,38,135,0.1)] mb-12 max-w-xs mx-auto transform transition-transform hover:scale-105 duration-300">
                <p className="text-sm font-medium text-slate-700 leading-relaxed">
                  Unlock the 2026 Election. Swipe through <strong className="text-indigo-700">{cards.length} key policy vectors</strong> to discover your true political alignment.
                </p>
            </div>
            
            <button 
                onClick={handleStart}
                className="w-full max-w-xs py-5 bg-slate-900 text-white font-bold text-sm tracking-[0.2em] uppercase rounded-2xl hover:bg-indigo-600 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.5)] hover:-translate-y-1 active:translate-y-0 transition-all duration-300 shadow-xl group relative overflow-hidden"
            >
                <span className="relative z-10 group-hover:tracking-[0.3em] transition-all duration-300">Start Simulation</span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </button>
          </div>
        )}

        {gameStatus === 'playing' && cards[currentCardIndex] && (
          <div className="w-full h-full flex flex-col justify-center animate-in fade-in duration-500">
             {/* Card Container */}
             <div className="flex-1 flex items-center justify-center min-h-0 py-4 perspective-1000">
                <Card 
                    key={cards[currentCardIndex].stance_id} 
                    data={cards[currentCardIndex]} 
                    onVote={handleVote} 
                    index={currentCardIndex}
                    total={cards.length}
                    onShowDetails={() => setIsPolicyModalOpen(true)}
                />
             </div>
             
             {/* Helper Text / AI */}
             <div className="h-24 w-full relative z-20">
                <AIAssistant card={cards[currentCardIndex]} />
             </div>
          </div>
        )}

        {gameStatus === 'results' && (
          <Results 
            cards={cards} 
            userChoices={userChoices} 
            onReset={handleReset} 
          />
        )}

        {/* Global Policy Modal Overlay */}
        {isPolicyModalOpen && cards[currentCardIndex] && (
            <PolicyModal card={cards[currentCardIndex]} onClose={() => setIsPolicyModalOpen(false)} />
        )}

      </main>

      {/* Research Chatbot */}
      <ResearchChatbot />
    </div>
  );
};

export default App;