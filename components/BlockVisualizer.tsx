import React from 'react';

interface BlockVisualizerProps {
  rows: number;
  tensPerRow: number;
  onesPerRow: number;
  highlightTens?: boolean;
  highlightOnes?: boolean;
}

export const BlockVisualizer: React.FC<BlockVisualizerProps> = ({ 
  rows, 
  tensPerRow, 
  onesPerRow,
  highlightTens,
  highlightOnes
}) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-white border border-gray-200 rounded-xl shadow-sm my-4">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex items-center gap-4">
          <div className="text-gray-400 text-xs font-mono w-4">{r+1}</div>
          {/* Tens Bars */}
          <div className={`flex gap-1 p-1 rounded ${highlightTens ? 'bg-blue-100 ring-1 ring-blue-300' : ''}`}>
            {[...Array(tensPerRow)].map((_, t) => (
              <div key={t} className="flex flex-col gap-[1px]">
                 <div className="w-2 h-10 border border-blue-600 bg-blue-400 rounded-sm shadow-sm relative overflow-hidden">
                    {/* Lines to look like 10 blocks */}
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className="w-full h-[10%] border-b border-blue-500/50 absolute top-[10%]" style={{top: `${(i+1)*10}%`}}></div>
                    ))}
                 </div>
              </div>
            ))}
          </div>

          {/* Ones Cubes */}
          <div className={`flex gap-1 p-1 rounded ${highlightOnes ? 'bg-green-100 ring-1 ring-green-300' : ''}`}>
             <div className="grid grid-cols-4 gap-1">
                {[...Array(onesPerRow)].map((_, o) => (
                  <div key={o} className="w-2 h-2 border border-green-600 bg-green-400 rounded-sm shadow-sm"></div>
                ))}
             </div>
          </div>
        </div>
      ))}
      <div className="text-center text-xs text-gray-500 mt-2">
         {rows} 行，每行 {tensPerRow} 个十 和 {onesPerRow} 个一
      </div>
    </div>
  );
};