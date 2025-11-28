import React from 'react';

interface EmojiCounterProps {
  icon: string;
  count: number;
  label?: string;
}

export const EmojiCounter: React.FC<EmojiCounterProps> = ({ icon, count, label }) => {
  // Limit count to prevent rendering massive amounts of DOM nodes if AI hallucinates a large number
  const safeCount = Math.min(Math.max(1, count), 100);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
        {[...Array(safeCount)].map((_, i) => (
          <span 
            key={i} 
            className="text-3xl select-none hover:scale-125 transition-transform cursor-pointer leading-none" 
            role="img" 
            aria-label={label || "item"}
          >
            {icon}
          </span>
        ))}
      </div>
      {label && (
        <div className="mt-3 text-sm text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          {label}
        </div>
      )}
    </div>
  );
};