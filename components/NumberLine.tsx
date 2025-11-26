import React from 'react';

interface NumberLineProps {
  min?: number;
  max?: number;
  step?: number;
  markedValues?: number[]; // Array of values to put a dot/label on
  label?: string;
  width?: number;
}

export const NumberLine: React.FC<NumberLineProps> = ({ 
  min = 0, 
  max = 10, 
  step = 1, 
  markedValues = [],
  label,
  width = 300
}) => {
  const range = max - min;
  const paddingX = 30;
  const paddingY = 40;
  const svgWidth = width + paddingX * 2;
  const svgHeight = 100;
  
  // Calculate position for a value
  const getX = (val: number) => {
    return paddingX + ((val - min) / range) * width;
  };

  // Generate ticks
  const ticks = [];
  for (let i = min; i <= max; i += step) {
    const x = getX(i);
    ticks.push(
      <g key={i}>
        <line x1={x} y1={50} x2={x} y2={60} stroke="#374151" strokeWidth="2" />
        <text x={x} y={80} textAnchor="middle" className="text-sm font-mono fill-gray-600">{i}</text>
      </g>
    );
  }

  // Generate marked values (points and arrows)
  const marks = markedValues.map((val, idx) => {
    const x = getX(val);
    return (
      <g key={`mark-${idx}`}>
         <circle cx={x} cy={50} r={6} fill="#ef4444" stroke="white" strokeWidth="2" />
         <text x={x} y={30} textAnchor="middle" className="text-xs font-bold fill-red-600">{val}</text>
      </g>
    );
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Main Line with Arrows */}
        <line x1={paddingX} y1={50} x2={paddingX + width} y2={50} stroke="#374151" strokeWidth="2" />
        
        {/* Left Arrow */}
        <path d={`M ${paddingX} 50 L ${paddingX + 5} 47 L ${paddingX + 5} 53 Z`} fill="#374151" />
        {/* Right Arrow */}
        <path d={`M ${paddingX + width} 50 L ${paddingX + width - 5} 47 L ${paddingX + width - 5} 53 Z`} fill="#374151" />

        {ticks}
        {marks}
      </svg>
      {label && (
        <div className="text-gray-600 font-mono font-bold text-sm bg-gray-100 px-3 py-1 rounded mt-[-10px]">
          {label}
        </div>
      )}
    </div>
  );
};