import React from 'react';
import { GridItem } from '../types';

interface GridVisualizerProps {
  rows: number;
  cols: number;
  itemType?: 'circle' | 'square' | 'emoji'; // Default fallback
  icon?: string; // Default icon
  label?: string;
  data?: (number | GridItem)[]; // Support simple 0/1 or rich GridItem objects
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

  // Helper to render specific shape SVG
  const renderShape = (item: GridItem) => {
    const size = 40;
    const strokeColor = item.color || '#374151'; // Gray-700
    const fillColor = 'white';
    const strokeWidth = 2;

    let shapeEl = null;

    switch (item.shape) {
      case 'square':
        shapeEl = (
          <rect x="4" y="4" width="32" height="32" rx="4" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        );
        break;
      case 'triangle':
        // Equilateralish triangle
        shapeEl = (
          <polygon points="20,4 36,34 4,34" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
        );
        break;
      case 'circle':
      default:
        shapeEl = (
          <circle cx="20" cy="20" r="16" fill={fillColor} stroke={strokeColor} strokeWidth={strokeWidth} />
        );
        break;
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative w-10 h-10 flex items-center justify-center">
           <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
             {item.shape !== 'none' && shapeEl}
           </svg>
           {item.content && (
             <span className="relative z-10 text-lg select-none leading-none">{item.content}</span>
           )}
        </div>
        {item.label && (
          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 rounded-full leading-tight">{item.label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4 animate-in fade-in zoom-in duration-300">
      <div className="flex flex-col gap-3">
        {[...Array(safeRows)].map((_, r) => (
          <div key={r} className="flex gap-3 justify-center">
            {[...Array(safeCols)].map((_, c) => {
              // Calculate linear index to check data array
              const index = r * safeCols + c;
              
              // Default values
              let isVisible = true;
              let richItem: GridItem | null = null;

              if (data && index < data.length) {
                  const val = data[index];
                  if (typeof val === 'number') {
                      isVisible = val === 1;
                  } else if (typeof val === 'object') {
                      richItem = val;
                      isVisible = val.visible !== false;
                  }
              }

              return (
                <div 
                  key={`${r}-${c}`} 
                  className={`flex items-center justify-center transition-transform ${isVisible ? 'hover:scale-105' : 'opacity-0 pointer-events-none'}`}
                  style={{ width: 48, height: 60 }} // Fixed cell size to align grid
                >
                  {isVisible && (
                    richItem ? (
                        renderShape(richItem)
                    ) : (
                        // Fallback to simple rendering
                        itemType === 'emoji' ? (
                           <span className="text-3xl select-none leading-none filter drop-shadow-sm">{icon || '⚫'}</span>
                        ) : (
                           <div className={`w-10 h-10 ${itemType === 'square' ? 'rounded-lg' : 'rounded-full'} bg-[radial-gradient(circle_at_30%_30%,_var(--tw-gradient-stops))] from-white via-gray-200 to-gray-300 border border-gray-200/50 shadow-[2px_2px_5px_rgba(0,0,0,0.1),-1px_-1px_2px_rgba(255,255,255,0.8)]`}></div>
                        )
                    )
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {label && (
        <div className="mt-4 text-base text-gray-700 font-bold bg-gray-50/80 px-6 py-2 rounded-full border border-gray-100 shadow-sm backdrop-blur-sm">
          {label}
        </div>
      )}
    </div>
  );
};