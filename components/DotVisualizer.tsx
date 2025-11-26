import React from 'react';

interface DotVisualizerProps {
  highlightSection: 'A' | 'B' | 'NONE';
}

export const DotVisualizer: React.FC<DotVisualizerProps> = ({ highlightSection }) => {
  const rows = 3;
  const colsA = 10;
  const colsB = 3;

  return (
    <div className="flex flex-col items-center gap-2 my-4">
      <div className="flex gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Section A */}
        <div className={`flex flex-col gap-2 p-2 rounded transition-all duration-300 ${highlightSection === 'A' ? 'bg-blue-100 ring-2 ring-blue-400' : ''}`}>
           <span className="text-xs text-center text-gray-400 font-bold mb-1">A 部分 (10列)</span>
           {[...Array(rows)].map((_, r) => (
             <div key={`a-row-${r}`} className="flex gap-2">
                {[...Array(colsA)].map((_, c) => (
                  <div key={`a-dot-${r}-${c}`} className="w-4 h-4 rounded-full bg-blue-500"></div>
                ))}
             </div>
           ))}
        </div>

        {/* Divider */}
        <div className="w-px bg-gray-300 mx-1 self-stretch"></div>

        {/* Section B */}
        <div className={`flex flex-col gap-2 p-2 rounded transition-all duration-300 ${highlightSection === 'B' ? 'bg-green-100 ring-2 ring-green-400' : ''}`}>
           <span className="text-xs text-center text-gray-400 font-bold mb-1">B 部分 (3列)</span>
           {[...Array(rows)].map((_, r) => (
             <div key={`b-row-${r}`} className="flex gap-2">
                {[...Array(colsB)].map((_, c) => (
                  <div key={`b-dot-${r}-${c}`} className="w-4 h-4 rounded-full bg-green-500"></div>
                ))}
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};