import React from 'react';

interface ChainVisualizerProps {
  count?: number;
  diameter?: number; // Outer diameter
  thickness?: number; // Thickness of the ring material
  label?: string;
}

export const ChainVisualizer: React.FC<ChainVisualizerProps> = ({
  count = 5,
  diameter = 50,
  thickness = 5,
  label
}) => {
  // Math Logic:
  // Total Length = Diameter + (Count - 1) * (Diameter - 2 * Thickness)
  // Visual Logic:
  // Each ring is shifted by (Diameter - 2 * Thickness) pixels to the right.
  
  // SVG Scaling Factors to keep it looking nice regardless of input numbers
  const SCALE = 2; 
  const VISUAL_DIAMETER = diameter * SCALE;
  const VISUAL_THICKNESS = thickness * SCALE;
  
  const radius = (VISUAL_DIAMETER - VISUAL_THICKNESS) / 2; // SVG Radius (center of stroke)
  const strokeWidth = VISUAL_THICKNESS;
  
  const shiftStep = VISUAL_DIAMETER - (2 * VISUAL_THICKNESS);
  const totalWidth = VISUAL_DIAMETER + (count - 1) * shiftStep;
  
  const svgHeight = VISUAL_DIAMETER + 60; // Padding for labels
  const svgWidth = totalWidth + 40; // Padding for labels
  
  const startX = 20;
  const startY = svgHeight / 2;

  // Generate rings
  const rings = [];
  for (let i = 0; i < count; i++) {
    const cx = startX + radius + (VISUAL_THICKNESS/2) + (i * shiftStep);
    rings.push(
      <g key={i}>
        {/* The Ring */}
        <circle 
          cx={cx} 
          cy={startY} 
          r={radius} 
          fill="none" 
          stroke="#9ca3af" 
          strokeWidth={strokeWidth}
        />
        {/* Inner Highlight for 3D effect */}
        <circle 
          cx={cx} 
          cy={startY} 
          r={radius} 
          fill="none" 
          stroke="white" 
          strokeWidth={1}
          strokeOpacity={0.3}
        />
      </g>
    );
  }

  // Dimension Lines
  const annotations = [];
  
  // 1. Total Length Brace
  const braceY = startY + VISUAL_DIAMETER / 2 + 15;
  const braceStart = startX;
  const braceEnd = startX + totalWidth;
  
  annotations.push(
    <g key="total-brace">
       <path 
         d={`M ${braceStart} ${braceY} 
             L ${braceStart} ${braceY + 5} 
             L ${(braceStart + braceEnd)/2} ${braceY + 5} 
             L ${(braceStart + braceEnd)/2} ${braceY + 10} 
             L ${(braceStart + braceEnd)/2} ${braceY + 5} 
             L ${braceEnd} ${braceY + 5} 
             L ${braceEnd} ${braceY}`}
         fill="none" 
         stroke="#4b5563" 
         strokeWidth="1.5"
       />
       <text x={(braceStart + braceEnd)/2} y={braceY + 25} textAnchor="middle" className="text-xs font-bold fill-gray-600">
         {count} 个铁环总长 ?
       </text>
    </g>
  );

  // 2. Single Ring Diameter (Top)
  const dimY = startY - VISUAL_DIAMETER / 2 - 10;
  const r1_start = startX;
  const r1_end = startX + VISUAL_DIAMETER;
  
  annotations.push(
      <g key="diameter-dim">
          <line x1={r1_start} y1={dimY} x2={r1_end} y2={dimY} stroke="#4b5563" strokeWidth="1" />
          <line x1={r1_start} y1={dimY-3} x2={r1_start} y2={dimY+3} stroke="#4b5563" strokeWidth="1" />
          <line x1={r1_end} y1={dimY-3} x2={r1_end} y2={dimY+3} stroke="#4b5563" strokeWidth="1" />
          <text x={(r1_start + r1_end)/2} y={dimY - 5} textAnchor="middle" className="text-xs font-bold fill-gray-600">
            外直径 {diameter}
          </text>
      </g>
  );

  // 3. Thickness Marker (On the first ring)
  // Pointing to the left wall of the first ring
  const thickX = startX + VISUAL_THICKNESS / 2;
  
  annotations.push(
      <g key="thickness-dim">
         <line x1={thickX} y1={startY} x2={thickX + 20} y2={startY + 20} stroke="#ef4444" strokeWidth="1" />
         <text x={thickX + 22} y={startY + 28} className="text-[10px] font-bold fill-red-500">
             壁厚 {thickness}
         </text>
         {/* Small red line indicating thickness width */}
         <line x1={startX} y1={startY} x2={startX + VISUAL_THICKNESS} y2={startY} stroke="#ef4444" strokeWidth="2" />
      </g>
  );

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
       <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {rings}
          {annotations}
       </svg>
       {label && (
        <div className="mt-2 text-sm text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          {label}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2">
          提示: 重叠部分 = 2 × 壁厚
      </div>
    </div>
  );
};
