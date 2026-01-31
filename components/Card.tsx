import React, { useEffect, useState, useRef } from 'react';
import { StanceCard } from '../types';
import { Check, X, Quote, Layers, Info } from 'lucide-react';

interface CardProps {
  data: StanceCard;
  onVote: (choice: 'supports' | 'opposes' | 'skip') => void;
  index: number;
  total: number;
  onShowDetails?: () => void;
}

const Card: React.FC<CardProps> = ({ data, onVote, index, total, onShowDetails }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'bottom' | null>(null);

  // Swipe / Drag State
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const isDragging = !!dragStart;
  const SWIPE_THRESHOLD = 120;
  const ROTATION_FACTOR = 0.1; // Deg per pixel
  
  // Refs for animation performance
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle Global Pointer Events
  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!dragStart) return;
      e.preventDefault(); 
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      setDragOffset({
        x: currentX - dragStart.x,
        y: currentY - dragStart.y
      });
    };

    const handlePointerUp = () => {
      if (Math.abs(dragOffset.x) > SWIPE_THRESHOLD) {
        handleVote(dragOffset.x > 0 ? 'supports' : 'opposes');
      } else {
        // Reset spring animation
        setDragOffset({ x: 0, y: 0 });
      }
      setDragStart(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, dragStart, dragOffset]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || exitDirection) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if ((e.target as HTMLElement).closest('.scroll-container')) return; // Allow scrolling interaction
    if ((e.target as HTMLElement).closest('.interactive-header')) return; // Allow header click
    
    e.preventDefault();
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleVote = (choice: 'supports' | 'opposes' | 'skip') => {
    setDragStart(null);
    
    if (choice === 'supports') setExitDirection('right');
    else if (choice === 'opposes') setExitDirection('left');
    else setExitDirection('bottom');

    setTimeout(() => onVote(choice), 400); // Wait for exit animation
  };

  // --- Physics & Style Calculations ---
  
  // 3D Rotation Calculation
  const rotateY = dragOffset.x * ROTATION_FACTOR; 
  const rotateX = -dragOffset.y * (ROTATION_FACTOR * 0.5); 
  
  let transformString = '';
  let opacity = isVisible ? 1 : 0;
  let transition = isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.3s';

  if (exitDirection) {
    const xDir = exitDirection === 'right' ? 1200 : exitDirection === 'left' ? -1200 : 0;
    const yDir = exitDirection === 'bottom' ? 800 : dragOffset.y; 
    const rot = exitDirection === 'right' ? 45 : exitDirection === 'left' ? -45 : 0;
    
    transformString = `translate3d(${xDir}px, ${yDir}px, 0) rotateZ(${rot}deg)`;
    opacity = 0;
  } else {
    // Idle or Dragging state
    const scale = isVisible ? 1 : 0.9;
    transformString = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotateY(${rotateY}deg) rotateX(${rotateX}deg) rotateZ(${dragOffset.x * 0.05}deg) scale(${scale})`;
  }

  // Glare Effect Calculation
  const glareX = 50 - (dragOffset.x / 5);
  const glareY = 50 - (dragOffset.y / 5);

  const cardStyle = {
    transform: transformString,
    transition: transition,
    opacity: opacity,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none' as const,
  };

  // Stamp Opacity
  const yesOpacity = isDragging && dragOffset.x > 0 ? Math.min(dragOffset.x / (SWIPE_THRESHOLD * 0.5), 1) : 0;
  const noOpacity = isDragging && dragOffset.x < 0 ? Math.min(Math.abs(dragOffset.x) / (SWIPE_THRESHOLD * 0.5), 1) : 0;

  return (
    <div className="relative w-full max-w-[340px] aspect-[3/4.2] perspective-1000">
      
      {/* 3D Background Deck Effect */}
      {index < total - 1 && !exitDirection && (
         <>
            {/* Card 2 */}
            <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-lg transform translate-y-3 scale-[0.96] -z-10 opacity-60 border border-slate-200 transition-transform duration-500"></div>
            {/* Card 3 */}
            <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-md transform translate-y-6 scale-[0.92] -z-20 opacity-30 border border-slate-200 transition-transform duration-500"></div>
         </>
      )}

      {/* Main 3D Card */}
      <div 
        ref={cardRef}
        className="w-full h-full relative preserve-3d will-change-transform"
        onPointerDown={onPointerDown}
        style={cardStyle}
      >
        <div className="absolute inset-0 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white/60 overflow-hidden backface-hidden flex flex-col">
            
            {/* Background Pattern - Base Layer z-0 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

            {/* Holographic Glare Overlay - z-40 */}
            <div 
                className="absolute inset-0 pointer-events-none z-40 mix-blend-soft-light opacity-60 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.8) 0%, transparent 60%)`,
                    opacity: isDragging ? 0.8 : 0
                }}
            ></div>

            {/* STAMP: AGREE - z-50 */}
            <div 
                className="absolute top-12 right-12 z-50 pointer-events-none transform -rotate-12 border-[6px] border-green-500 rounded-lg px-4 py-2 opacity-0"
                style={{ opacity: yesOpacity, transform: `scale(${0.5 + yesOpacity*0.5}) rotate(-12deg)` }}
            >
                <span className="text-4xl font-black text-green-500 uppercase tracking-widest">Agree</span>
            </div>

            {/* STAMP: DISAGREE - z-50 */}
            <div 
                className="absolute top-12 left-12 z-50 pointer-events-none transform rotate-12 border-[6px] border-red-500 rounded-lg px-4 py-2 opacity-0"
                style={{ opacity: noOpacity, transform: `scale(${0.5 + noOpacity*0.5}) rotate(12deg)` }}
            >
                <span className="text-4xl font-black text-red-500 uppercase tracking-widest">Disagree</span>
            </div>

            {/* Card Content Header - z-20 */}
            <div className="flex-none p-6 pb-4 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm z-20">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                         </div>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             Vector
                         </span>
                    </div>
                    <button 
                        onClick={() => handleVote('skip')}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        Skip
                    </button>
                </div>
                
                {/* Interactive Context Box */}
                <div 
                    onClick={(e) => {
                        e.stopPropagation();
                        onShowDetails?.();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="interactive-header flex gap-3 items-start p-3 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:bg-indigo-50/30 hover:border-indigo-100 transition-all group active:scale-[0.98]"
                >
                    <Layers size={14} className="text-indigo-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">
                            {data.context}
                        </p>
                        <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 duration-200">
                             <Info size={10} /> Read Policy Details
                        </p>
                    </div>
                </div>
            </div>

            {/* Card Content Body - Scrollable - z-10 */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 scroll-container w-full" onPointerDown={(e) => e.stopPropagation()}>
                <div className="min-h-full w-full flex flex-col items-center justify-center p-8 text-center relative">
                    <Quote className="text-indigo-100 w-32 h-32 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 opacity-50" />
                    
                    <h2 className="text-2xl md:text-[28px] font-serif font-bold text-slate-900 leading-tight drop-shadow-sm select-text">
                        {data.question}
                    </h2>
                </div>
            </div>

            {/* Card Footer Controls - z-30 */}
            <div className="flex-none p-6 bg-white border-t border-slate-100 relative z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between gap-4">
                    
                    {/* No Button */}
                    <button 
                        onPointerDown={(e) => e.stopPropagation()} 
                        onClick={() => handleVote('opposes')}
                        className="flex-1 group h-14 rounded-2xl border-2 border-slate-100 bg-white hover:border-red-100 hover:bg-red-50 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        aria-label="Disagree"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-red-200 group-hover:text-red-600 flex items-center justify-center transition-colors">
                            <X size={18} strokeWidth={3} />
                        </div>
                    </button>

                    {/* Yes Button */}
                    <button 
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => handleVote('supports')}
                        className="flex-1 group h-14 rounded-2xl border-2 border-slate-100 bg-white hover:border-green-100 hover:bg-green-50 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                        aria-label="Agree"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 group-hover:bg-green-200 group-hover:text-green-600 flex items-center justify-center transition-colors">
                            <Check size={18} strokeWidth={3} />
                        </div>
                    </button>

                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Card;