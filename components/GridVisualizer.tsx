import React from 'react';

interface GridVisualizerProps {
  rows: number;
  cols: number;
  itemType?: 'circle' | 'square' | 'emoji';
  icon?: string;
  label?: string;
  data?: number[]; // Optional: Flat array of 0s and 1s. 1 = show, 0 = hide (transparent placeholder)
}

export const GridVisualizer: React.FC<GridVisualizerProps> = ({ 
  rows, 
  cols, 
  itemType = 'circle', 
  icon, 
  label,
  data
}) => {
  // Safe limits to prevent rendering issues
  const safeRows = Math.min(Math.max(1, rows || 1), 20);
  const safeCols = Math.min(Math.max(1, cols || 1), 20);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col gap-3">
        {[...Array(safeRows)].map((_, r) => (
          <div key={r} className="flex gap-3 justify-center">
            {[...Array(safeCols)].map((_, c) => {
              // Calculate linear index to check data array
              const index = r * safeCols + c;
              // If data is provided, check if this cell is active (1). If no data, default to true.
              const isVisible = data ? (data[index] === 1) : true;

              return (
                <div 
                  key={`${r}-${c}`} 
                  className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center transition-transform ${isVisible ? 'hover:scale-105' : 'opacity-0 pointer-events-none'}`}
                >
                  {isVisible && (
                    itemType === 'emoji' ? (
                       <span className="text-3xl select-none leading-none filter drop-shadow-sm">{icon || '⚫'}</span>
                    ) : (
                       <div className={`w-full h-full ${itemType === 'square' ? 'rounded-lg' : 'rounded-full'} bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-white via-gray-200 to-gray-300 border border-gray-200/50 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-1px_-1px_2px_rgba(255,255,255,0.8)]`}></div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {label && (
        <div className="mt-6 text-base text-gray-700 font-bold bg-gray-50/80 px-6 py-2 rounded-full border border-gray-100 shadow-sm backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
};