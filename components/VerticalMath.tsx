import React from 'react';

export interface Highlight {
  row: 'top' | 'bottom' | 'result' | 'step';
  rowIndex?: number; // for steps
  colIndex: number; // 0 for ones place, 1 for tens, etc.
  color?: string; // default red
}

interface VerticalMathProps {
  top: string;
  bottom: string;
  steps?: { val: string; label?: string; active?: boolean }[];
  result?: string;
  highlights?: Highlight[];
  className?: string;
}

export const VerticalMath: React.FC<VerticalMathProps> = ({ 
  top, 
  bottom, 
  steps, 
  result, 
  highlights = [],
  className = ""
}) => {
  
  const renderDigits = (numStr: string, rowType: Highlight['row'], rowIndex?: number) => {
    // Split into chars
    const chars = numStr.split('');
    const totalChars = chars.length;

    return (
      <div className="flex justify-end">
        {chars.map((char, index) => {
          // Calculate column index (0 is the last char/ones place)
          const colIndex = totalChars - 1 - index;
          
          const highlight = highlights.find(h => 
            h.row === rowType && 
            h.colIndex === colIndex &&
            (h.rowIndex === undefined || h.rowIndex === rowIndex)
          );

          return (
            <div key={index} className="relative w-[0.6em] md:w-[0.7em] text-center">
              <span className={`relative z-10 ${highlight ? 'font-bold text-red-600' : 'text-inherit'}`}>
                {char}
              </span>
              {highlight && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.4em] h-[1.4em] border-2 border-red-500 rounded-full md:w-[1.6em] md:h-[1.6em]"></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`inline-block font-mono text-3xl md:text-4xl bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 select-none ${className}`}>
      {/* Top Number */}
      <div className="mb-1 text-gray-800 font-bold tracking-widest">
        {renderDigits(top, 'top')}
      </div>
      
      {/* Operator and Bottom Number */}
      <div className="flex justify-between items-end border-b-2 border-gray-800 pb-2 mb-2">
        <span className="mr-2 text-gray-400 text-2xl">×</span>
        <div className="font-bold text-gray-800 tracking-widest">
          {renderDigits(bottom, 'bottom')}
        </div>
      </div>

      {/* Intermediate Steps */}
      {steps && steps.map((step, idx) => (
        <div 
          key={idx} 
          className={`relative flex justify-end mb-1 transition-colors duration-300 tracking-widest ${step.active ? 'bg-yellow-50 text-blue-700 font-bold -mx-2 px-2 rounded' : 'text-gray-500'}`}
        >
          {renderDigits(step.val, 'step', idx)}
          {step.label && (
             <span className="absolute -right-16 md:-right-24 top-1/2 -translate-y-1/2 text-sm font-sans text-red-500 font-bold whitespace-nowrap">
               ← {step.label}
             </span>
          )}
        </div>
      ))}

      {/* Final Result */}
      {result && (
        <div className="border-t-2 border-gray-800 pt-2 flex justify-end font-bold text-gray-900 tracking-widest">
          {renderDigits(result, 'result')}
        </div>
      )}
    </div>
  );
};