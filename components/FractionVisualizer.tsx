import React from 'react';

interface FractionVisualizerProps {
  numerator: number;
  denominator: number;
  mode?: 'pie' | 'bar';
  label?: string;
  size?: number;
}

export const FractionVisualizer: React.FC<FractionVisualizerProps> = ({
  numerator,
  denominator,
  mode = 'pie',
  label,
  size = 150
}) => {
  // Ensure valid inputs
  const num = Math.max(0, numerator);
  const den = Math.max(1, denominator);
  
  const renderPie = () => {
    const cx = 50;
    const cy = 50;
    const r = 45;
    
    // Generate slices
    const slices = [];
    for (let i = 0; i < den; i++) {
        const startAngle = (i * 360) / den;
        const endAngle = ((i + 1) * 360) / den;
        
        // Convert polar to cartesian
        // SVG coords: 0 deg is 3 o'clock. We want 12 o'clock start, so subtract 90 deg
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);
        
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        
        const largeArcFlag = 0; // Since we usually split into equal parts, individual slice is usually < 180 unless den=1
        
        const pathData = den === 1 
            ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r}` // Full circle
            : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        const isFilled = i < num;
        
        slices.push(
            <path 
                key={i} 
                d={pathData} 
                fill={isFilled ? '#3b82f6' : '#f3f4f6'} // blue-500 or gray-100
                stroke="white" 
                strokeWidth="1.5"
            />
        );
    }
    return (
        <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-sm">
            {slices}
        </svg>
    );
  };

  const renderBar = () => {
    const totalW = 200;
    const h = 40;
    const partW = totalW / den;
    
    const parts = [];
    for (let i = 0; i < den; i++) {
        const isFilled = i < num;
        parts.push(
            <rect
                key={i}
                x={i * partW}
                y={0}
                width={partW}
                height={h}
                fill={isFilled ? '#3b82f6' : '#f3f4f6'}
                stroke="white"
                strokeWidth="2"
            />
        );
    }
    
    return (
         <svg viewBox={`0 0 ${totalW} ${h}`} width={size * 1.5} height={h / 200 * size * 1.5} className="drop-shadow-sm">
            {parts}
            {/* Outline */}
            <rect x="0" y="0" width={totalW} height={h} fill="none" stroke="#e5e7eb" strokeWidth="2" rx="4" />
         </svg>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
      {mode === 'pie' ? renderPie() : renderBar()}
      <div className="mt-2 text-xl font-bold font-mono text-gray-700 flex flex-col items-center leading-none">
          {label ? <span className="text-sm text-gray-500 mb-1">{label}</span> : null}
          <div className="flex flex-col items-center">
             <span>{num}</span>
             <div className="w-6 h-0.5 bg-gray-700 my-1"></div>
             <span>{den}</span>
          </div>
      </div>
    </div>
  );
};