import React from 'react';

export interface LineSegmentProps {
  total?: number | null;
  totalLabel?: string;
  segments?: Array<{ value: number; label?: string; color?: string }>;
  points?: Array<{ label: string; at: 'start' | 'end' | 'custom' | 'junction'; position?: number; segmentIndex?: number }>;
  width?: number;
  label?: string;
}

export const LineSegmentVisualizer: React.FC<LineSegmentProps> = ({
  total,
  totalLabel,
  segments = [],
  points = [],
  width = 300,
  label
}) => {
  const totalValue = segments.reduce((sum, s) => sum + s.value, 0) || total || 100;
  const safeTotal = Math.max(totalValue, 1);
  const height = 60;
  const startX = 20;
  const y = 30;
  
  let currentX = startX;
  
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4 overflow-visible">
      <svg width={width + 40} height={height + (totalLabel ? 30 : 0)} style={{overflow: 'visible'}}>
         {/* Segments */}
         {segments.length > 0 ? (
           segments.map((seg, idx) => {
             const segWidth = (seg.value / safeTotal) * width;
             const el = (
               <g key={idx}>
                 <rect x={currentX} y={y} width={segWidth} height={20} fill={seg.color || '#3b82f6'} stroke="white" strokeWidth="1" />
                 {seg.label && (
                   <text x={currentX + segWidth/2} y={y + 14} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                     {seg.label}
                   </text>
                 )}
               </g>
             );
             currentX += segWidth;
             return el;
           })
         ) : (
             <line x1={startX} y1={y+10} x2={startX + width} y2={y+10} stroke="#374151" strokeWidth="2" />
         )}
         
         {/* Total Brace */}
         {totalLabel && (
            <g>
               <path d={`M ${startX} ${y+25} Q ${startX} ${y+35} ${startX+5} ${y+35} L ${startX + width/2 - 5} ${y+35} Q ${startX + width/2} ${y+35} ${startX + width/2} ${y+40} Q ${startX + width/2} ${y+35} ${startX + width/2 + 5} ${y+35} L ${startX + width - 5} ${y+35} Q ${startX + width} ${y+35} ${startX + width} ${y+25}`} fill="none" stroke="#6b7280" strokeWidth="1.5" />
               <text x={startX + width/2} y={y+55} textAnchor="middle" className="text-xs font-bold fill-gray-600">{totalLabel}</text>
            </g>
         )}
         
         {/* Points labels */}
         {points.map((p, i) => {
             let px = startX;
             let textAnchor: "start" | "middle" | "end" | "inherit" = "middle";

             if (p.at === 'end') {
               px = startX + width;
               textAnchor = "start"; // Shift slightly right/start align to avoid overlap if close to middle
             } else if (p.at === 'start') {
               px = startX;
               textAnchor = "end"; // Shift slightly left
             } else if (p.at === 'custom' && typeof p.position === 'number') {
               px = startX + (p.position * width);
             } else if (p.at === 'junction' && typeof p.segmentIndex === 'number') {
               // Calculate position at end of segment index
               let valSum = 0;
               for (let k = 0; k <= p.segmentIndex && k < segments.length; k++) {
                 valSum += segments[k].value;
               }
               px = startX + (valSum / safeTotal) * width;
             }

             // Adjust alignment for endpoints to stay cleaner
             if (px <= startX + 5) textAnchor = "start"; 
             else if (px >= startX + width - 5) textAnchor = "end";

             return (
                 <g key={i}>
                    <line x1={px} y1={y-5} x2={px} y2={y+25} stroke="#374151" strokeWidth="2" />
                    <text x={px} y={y-10} textAnchor={textAnchor} className="text-xs font-bold fill-gray-800">{p.label}</text>
                 </g>
             )
         })}
      </svg>
      {label && (
        <div className="mt-2 text-sm text-gray-500 font-bold">{label}</div>
      )}
    </div>
  );
};