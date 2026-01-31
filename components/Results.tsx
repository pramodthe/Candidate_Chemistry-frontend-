import React, { useState, useRef, useEffect } from 'react';
import { StanceCard, MatchResult } from '../types';
import { RefreshCcw, ChevronRight, ChevronLeft, Hexagon, Star, X, BookOpen, Quote, Mic, MicOff, Volume2, Loader2, Sparkles, Zap } from 'lucide-react';
import { LiveSession } from '../services/liveApiService';
import { generateCandidatePortrait } from '../services/geminiService';

interface ResultsProps {
  cards: StanceCard[];
  userChoices: Record<string, 'supports' | 'opposes' | 'skip'>;
  onReset: () => void;
}

// --- PIXEL AVATAR COMPONENT ---
const PixelAvatar = ({ name, size }: { name: string, size?: number | string }) => {
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs(hash);
  };

  const seed = hashCode(name);
  // Same logic as before, condensed for brevity
  const skinTones = ['#FFDFC4', '#F0D5BE', '#EECEB3', '#E1B899', '#E5C298', '#FFDCB2', '#E5B887'];
  const hairColors = ['#090806', '#2C222B', '#71635A', '#B7A69E', '#D6C4C2'];
  const clothColors = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b'];
  const bg = '#f8fafc';
  
  const skin = skinTones[seed % skinTones.length];
  const hair = hairColors[(seed >> 2) % hairColors.length];
  const cloth = clothColors[(seed >> 4) % clothColors.length];
  
  const hasGlasses = (seed >> 3) % 5 === 0;
  const hairStyle = (seed >> 5) % 4;

  const pixels: React.ReactNode[] = [];
  const rect = (x:number, y:number, w:number, h:number, c:string) => 
    pixels.push(<rect key={`${x}-${y}-${c}-${pixels.length}`} x={x} y={y} width={w} height={h} fill={c} />);

  rect(0, 0, 12, 12, bg);
  rect(2, 10, 8, 2, cloth); 
  rect(3, 9, 6, 1, skin);
  rect(3, 2, 6, 7, skin); 
  rect(2, 3, 1, 5, skin); 
  rect(9, 3, 1, 5, skin); 
  const eyeColor = '#1e293b';
  rect(4, 5, 1, 1, eyeColor); rect(7, 5, 1, 1, eyeColor);
  if (hasGlasses) { rect(3, 5, 1, 1, '#1e1b4b'); rect(8, 5, 1, 1, '#1e1b4b'); rect(5, 5, 2, 1, '#1e1b4b'); }
  rect(5, 7, 2, 1, '#be8a8b');
  rect(3, 1, 6, 1, hair); rect(2, 2, 1, 2, hair); rect(9, 2, 1, 2, hair);

  return (
    <svg viewBox="0 0 12 12" width={size || "100%"} height={size || "100%"} style={{imageRendering: 'pixelated'}} xmlns="http://www.w3.org/2000/svg">
       {pixels}
    </svg>
  );
};

const Results: React.FC<ResultsProps> = ({ cards, userChoices, onReset }) => {
  const [profileIndex, setProfileIndex] = useState(0);
  const [isBioOpen, setIsBioOpen] = useState(false);
  
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const sessionRef = useRef<LiveSession | null>(null);

  const [generatedPortraits, setGeneratedPortraits] = useState<Record<string, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Tilt State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Handle Tilt Effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage (-1 to 1)
    const xPct = (x / rect.width - 0.5) * 2;
    const yPct = (y / rect.height - 0.5) * 2;
    
    setTilt({ x: xPct * 10, y: -yPct * 10 }); // 10deg max tilt
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // --- Logic & Effects ---
  const scores: Record<string, MatchResult> = {};
  cards.forEach(card => {
    const userChoice = userChoices[card.stance_id];
    if (userChoice === 'skip') return;
    card.candidate_matches.forEach(candidate => {
      if (!scores[candidate.name]) {
        scores[candidate.name] = { candidateName: candidate.name, score: 0, totalAgreements: 0, totalDisagreements: 0, totalPolicies: 0, party: candidate.party, bio: candidate.bio, gender: candidate.gender };
      }
      scores[candidate.name].totalPolicies += 1;
      if (candidate.alignment === userChoice) {
        scores[candidate.name].score += 1;
        scores[candidate.name].totalAgreements += 1;
      } else {
        scores[candidate.name].totalDisagreements += 1;
      }
    });
  });

  const sortedResults = Object.values(scores).sort((a, b) => {
    const aTotal = a.totalAgreements + a.totalDisagreements;
    const aPct = aTotal > 0 ? a.totalAgreements / aTotal : 0;
    const bTotal = b.totalAgreements + b.totalDisagreements;
    const bPct = bTotal > 0 ? b.totalAgreements / bTotal : 0;
    return bPct - aPct;
  });

  const currentMatch = sortedResults[profileIndex];

  useEffect(() => {
    if (currentMatch && !generatedPortraits[currentMatch.candidateName] && !isGeneratingImage) {
        setIsGeneratingImage(true);
        generateCandidatePortrait(currentMatch.candidateName, currentMatch.gender || 'unknown', currentMatch.party || 'Independent')
        .then(url => { if (url) setGeneratedPortraits(prev => ({...prev, [currentMatch.candidateName]: url})); })
        .finally(() => setIsGeneratingImage(false));
    }
  }, [currentMatch, generatedPortraits, isGeneratingImage]);

  useEffect(() => {
    return () => { if (sessionRef.current) { sessionRef.current.disconnect(); sessionRef.current = null; setIsVoiceConnected(false); } };
  }, [profileIndex, isBioOpen]);

  const toggleCandidateVoice = async () => {
    if (isVoiceConnected) {
      await sessionRef.current?.disconnect();
      sessionRef.current = null;
      setIsVoiceConnected(false);
      setIsTalking(false);
    } else {
      if (!currentMatch) return;
      const relevantStances = cards.filter(c => c.candidate_matches.some(m => m.name === currentMatch.candidateName));
      const policyContext = relevantStances.map(c => {
        const match = c.candidate_matches.find(m => m.name === currentMatch.candidateName);
        return `- Issue: "${c.question}". My Stance: I ${match?.alignment} this.`;
      }).join('\n');
      const systemInstruction = `You are ${currentMatch.candidateName}, a ${currentMatch.party}. Bio: ${currentMatch.bio}. Policies: ${policyContext}. Speak passionately in first person.`;
      const voiceName = currentMatch.gender === 'female' ? 'Kore' : 'Puck';
      const session = new LiveSession();
      sessionRef.current = session;
      session.onIsTalking = (talking) => setIsTalking(talking);
      session.onError = (err) => { alert(err); setIsVoiceConnected(false); };
      await session.connect({ systemInstruction, voiceName });
      setIsVoiceConnected(true);
    }
  };
  
  if (!currentMatch) {
     return (
        <div className="w-full h-full flex items-center justify-center p-6 animate-in zoom-in-95">
            <div className="text-center max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                <Sparkles className="text-indigo-400 mx-auto mb-4" size={40}/>
                <h2 className="text-2xl font-serif font-bold mb-2">Insufficient Data</h2>
                <button onClick={onReset} className="mt-4 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs">Reset</button>
            </div>
        </div>
     );
  }

  const matchPercentage = Math.round((currentMatch.totalAgreements / (currentMatch.totalPolicies || 1)) * 100);
  const portraitUrl = generatedPortraits[currentMatch.candidateName];

  return (
    <div className="w-full h-full flex flex-col relative animate-in zoom-in-95 duration-700 max-h-[85vh] perspective-1000">
      
      {/* Navigation Header */}
      <div className="flex justify-between items-center mb-4 px-2">
         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Zap size={10} className="text-yellow-500 fill-yellow-500" /> Match Analysis
         </span>
         <div className="flex gap-1.5">
            {sortedResults.slice(0, 5).map((_, idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === profileIndex ? 'w-6 bg-indigo-600' : 'w-1.5 bg-slate-300'}`}></div>
            ))}
         </div>
      </div>

      {/* TILT CARD CONTAINER */}
      <div 
         ref={cardRef}
         onMouseMove={handleMouseMove}
         onMouseLeave={handleMouseLeave}
         className="flex-1 relative group perspective-1000"
      >
        <div 
            className="w-full h-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col relative transition-transform duration-100 ease-out"
            style={{
                transform: `rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) scale(1)`,
                transformStyle: 'preserve-3d',
            }}
        >
            {/* Holographic Shine Overlay */}
            <div 
                className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-40 transition-opacity duration-500 mix-blend-soft-light bg-gradient-to-tr from-transparent via-white to-transparent"
                style={{ transform: `translateX(${tilt.x * 2}%) translateY(${tilt.y * 2}%)` }}
            ></div>

            {/* Top Section - Profile */}
            <div className="h-[45%] min-h-[220px] relative bg-slate-50 flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-slate-900 z-0">
                    <div className="absolute inset-0 opacity-30 holo-foil"></div>
                </div>
                
                {/* Avatar Circle */}
                <div 
                    className="relative z-10 w-44 h-44 group-hover:scale-105 transition-transform duration-500 cursor-pointer rounded-full p-1 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl"
                    onClick={() => setIsBioOpen(true)}
                    style={{ transform: 'translateZ(30px)' }}
                >
                    <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-900 bg-slate-800 relative">
                        {portraitUrl ? (
                            <img src={portraitUrl} alt={currentMatch.candidateName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                <PixelAvatar name={currentMatch.candidateName} size="80%" />
                            </div>
                        )}
                        {isGeneratingImage && !portraitUrl && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                <Loader2 className="animate-spin text-white" size={24} />
                             </div>
                        )}
                    </div>
                    {/* Floating Badge */}
                    <div 
                        className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-slate-900 px-4 py-1.5 rounded-full text-lg font-black tracking-tighter shadow-xl border border-slate-100 flex items-center gap-1 min-w-max"
                        style={{ transform: 'translateZ(50px) translateX(-50%)' }}
                    >
                        <span className="text-indigo-600">{matchPercentage}%</span> Match
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-8 flex flex-col bg-white" style={{ transform: 'translateZ(20px)' }}>
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 mb-2 leading-none">{currentMatch.candidateName}</h2>
                    <div className="flex justify-center gap-2 mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
                            {currentMatch.party || 'Independent'}
                        </span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 text-center transform hover:-translate-y-1 transition-transform">
                        <span className="block text-2xl font-black text-green-600">{currentMatch.totalAgreements}</span>
                        <span className="text-[9px] uppercase font-bold text-green-800/60 tracking-wider">Agreements</span>
                    </div>
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center transform hover:-translate-y-1 transition-transform">
                        <span className="block text-2xl font-black text-red-600">{currentMatch.totalDisagreements}</span>
                        <span className="text-[9px] uppercase font-bold text-red-800/60 tracking-wider">Disagreements</span>
                    </div>
                </div>

                <button 
                    onClick={() => setIsBioOpen(true)}
                    className="w-full py-4 border border-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center justify-center gap-2 group/btn"
                >
                    <BookOpen size={16} className="group-hover/btn:scale-110 transition-transform"/> View Full Dossier
                </button>
            </div>

            {/* Bottom Nav */}
            <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50/80 backdrop-blur-sm">
                <button onClick={(e) => { e.stopPropagation(); if (profileIndex > 0) setProfileIndex(prev => prev - 1); }} disabled={profileIndex === 0} className="p-4 rounded-xl bg-white border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 transition-all active:scale-95">
                    <ChevronLeft size={20} className="text-slate-600" />
                </button>
                <button onClick={onReset} className="flex-1 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2 active:scale-95">
                    <RefreshCcw size={16} /> Restart
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (profileIndex < sortedResults.length - 1) setProfileIndex(prev => prev + 1); }} disabled={profileIndex === sortedResults.length - 1} className="p-4 rounded-xl bg-white border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 transition-all active:scale-95">
                    <ChevronRight size={20} className="text-slate-600" />
                </button>
            </div>
        </div>
      </div>

      {/* BIO MODAL */}
      {isBioOpen && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsBioOpen(false)}></div>
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl relative z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                  <h3 className="text-xl font-serif font-bold text-slate-900">Dossier Access</h3>
                  <button onClick={() => setIsBioOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"><X size={20} /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-8">
                  <div className="flex gap-6 mb-8 items-start">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 shadow-inner relative">
                        {portraitUrl ? <img src={portraitUrl} className="w-full h-full object-cover" /> : <PixelAvatar name={currentMatch.candidateName} />}
                        {isVoiceConnected && isTalking && <div className="absolute inset-0 bg-indigo-500/30 flex items-center justify-center"><Volume2 className="text-white animate-pulse" /></div>}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{currentMatch.candidateName}</h4>
                        <p className="text-sm text-slate-500 leading-relaxed mt-2">{currentMatch.bio}</p>
                      </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-6 border border-indigo-100 mb-6 relative overflow-hidden">
                      <div className="relative z-10 flex items-center justify-between">
                          <div>
                              <h4 className="font-bold text-slate-900 text-sm mb-1">Direct Line</h4>
                              <p className="text-xs text-slate-500">AI-simulated interview</p>
                          </div>
                          <button 
                            onClick={toggleCandidateVoice}
                            className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm ${isVoiceConnected ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' : 'bg-white text-indigo-600 border border-indigo-100 hover:shadow-md hover:scale-105'}`}
                          >
                             {isVoiceConnected ? <><MicOff size={14}/> End</> : <><Mic size={14}/> Connect</>}
                          </button>
                      </div>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default Results;