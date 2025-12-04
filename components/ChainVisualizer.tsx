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
  
  // AUTO SCALE: Target a visual diameter of roughly 120px (Doubled from 60px)
  // This ensures visibility regardless of units (cm vs mm).
  const TARGET_PIXEL_SIZE = 120;
  const SCALE = diameter > 0 ? TARGET_PIXEL_SIZE / diameter : 6;
  
  const VISUAL_DIAMETER = diameter * SCALE;
  const VISUAL_THICKNESS = thickness * SCALE;
  
  // SVG Radius (center of stroke)
  // Visual Diameter includes the full stroke width.
  // svg circle r is distance to center of stroke.
  // So Outer Diameter = 2*r + strokeWidth.
  // We want Outer Diameter = VISUAL_DIAMETER.
  // 2*r = VISUAL_DIAMETER - strokeWidth
  // r = (VISUAL_DIAMETER - VISUAL_THICKNESS) / 2
  const radius = (VISUAL_DIAMETER - VISUAL_THICKNESS) / 2;
  const strokeWidth = VISUAL_THICKNESS;
  
  // Visual Shift
  // In math: shift = D - 2*T
  // Visually we use the calculated scaled values
  const shiftStep = VISUAL_DIAMETER - (2 * VISUAL_THICKNESS);
  
  // Total visual width
  const totalWidth = VISUAL_DIAMETER + (count - 1) * shiftStep;
  
  const svgHeight = VISUAL_DIAMETER + 120; // Increased padding for labels
  const svgWidth = totalWidth + 100; // Increased padding
  
  const startX = 50; // Increased left padding
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
          strokeWidth={2}
          strokeOpacity={0.3}
        />
      </g>
    );
  }

  // Dimension Lines
  const annotations = [];
  
  // 1. Total Length Brace
  // Positioned below
  const braceY = startY + VISUAL_DIAMETER / 2 + 25;
  const braceStart = startX;
  const braceEnd = startX + totalWidth;
  
  annotations.push(
    <g key="total-brace">
       <path 
         d={`M ${braceStart} ${braceY} 
             L ${braceStart} ${braceY + 10} 
             L ${(braceStart + braceEnd)/2} ${braceY + 10} 
             L ${(braceStart + braceEnd)/2} ${braceY + 15} 
             L ${(braceStart + braceEnd)/2} ${braceY + 10} 
             L ${braceEnd} ${braceY + 10} 
             L ${braceEnd} ${braceY}`}
         fill="none" 
         stroke="#4b5563" 
         strokeWidth="2"
       />
       <text x={(braceStart + braceEnd)/2} y={braceY + 35} textAnchor="middle" className="font-bold fill-gray-600" style={{fontSize: '14px'}}>
         {count} 个铁环总长 ?
       </text>
    </g>
  );

  // 2. Single Ring Diameter (Top)
  const dimY = startY - VISUAL_DIAMETER / 2 - 25;
  const r1_start = startX;
  const r1_end = startX + VISUAL_DIAMETER;
  
  annotations.push(
      <g key="diameter-dim">
          <line x1={r1_start} y1={dimY} x2={r1_end} y2={dimY} stroke="#4b5563" strokeWidth="2" />
          <line x1={r1_start} y1={dimY-5} x2={r1_start} y2={dimY+5} stroke="#4b5563" strokeWidth="2" />
          <line x1={r1_end} y1={dimY-5} x2={r1_end} y2={dimY+5} stroke="#4b5563" strokeWidth="2" />
          <text x={(r1_start + r1_end)/2} y={dimY - 8} textAnchor="middle" className="font-bold fill-gray-600" style={{fontSize: '14px'}}>
            外直径 {diameter}
          </text>
      </g>
  );

  // 3. Thickness Marker (On the first ring)
  // Pointing to the thickness of the first ring.
  
  annotations.push(
      <g key="thickness-dim">
         {/* Line indicating thickness width on the ring itself */}
         <line x1={startX} y1={startY} x2={startX + VISUAL_THICKNESS} y2={startY} stroke="#ef4444" strokeWidth="3" />
         
         {/* Leader line down to label */}
         <path d={`M ${startX + VISUAL_THICKNESS/2} ${startY} L ${startX + VISUAL_THICKNESS/2} ${startY + 60}`} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 2"/>
         
         <text x={startX + VISUAL_THICKNESS/2} y={startY + 75} textAnchor="middle" className="font-bold fill-red-500" style={{fontSize: '12px'}}>
             壁厚 {thickness}
         </text>
      </g>
  );

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
       <div className="overflow-x-auto w-full flex justify-center">
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
            {rings}
            {annotations}
        </svg>
       </div>
       {label && (
        <div className="mt-2 text-base text-gray-500 font-bold bg-gray-50 px-4 py-1 rounded-full border border-gray-100">
          {label}
        </div>
      )}
      <div className="text-sm text-gray-400 mt-2">
          提示: 两个铁环重叠部分的长度 = 2 × 壁厚
      </div>
    </div>
  );
};