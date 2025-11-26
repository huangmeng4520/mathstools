import React from 'react';

type ShapeType = 'rectangle' | 'square' | 'triangle' | 'parallelogram' | 'trapezoid';

interface GeometryVisualizerProps {
  shape: ShapeType;
  // Normalized visual props (roughly 0-100 range works best)
  width?: number;
  height?: number;
  topWidth?: number; // for trapezoid
  offset?: number; // for triangle peak offset or parallelogram slant
  showHeight?: boolean; // Draw altitude line
  labels?: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
      height?: string;
      center?: string; // e.g. "Area?"
  };
}

export const GeometryVisualizer: React.FC<GeometryVisualizerProps> = ({
  shape,
  width = 100,
  height = 80,
  topWidth = 60,
  offset = 20,
  showHeight = false,
  labels = {}
}) => {
  const viewBoxW = Math.max(width, topWidth + offset) + 40;
  const viewBoxH = height + 40;
  const startX = 20;
  const startY = 20;
  
  let pathD = "";
  let heightLine = null;
  
  // Coordinate Calculation
  // All shapes drawn starting from (startX, startY + height) going clockwise or calculated vertices
  const bl = { x: startX + (shape === 'parallelogram' ? 0 : offset), y: startY + height }; // Bottom Left (adjusted for some shapes)
  
  // Actually simpler to define vertices array
  let points: {x:number, y:number}[] = [];
  
  switch (shape) {
      case 'square':
      case 'rectangle':
          points = [
              { x: startX, y: startY }, // TL
              { x: startX + width, y: startY }, // TR
              { x: startX + width, y: startY + height }, // BR
              { x: startX, y: startY + height } // BL
          ];
          break;
      case 'triangle':
           // Assume base is 'width', peak is at 'offset'
           points = [
               { x: startX + offset, y: startY }, // Top Peak
               { x: startX + width, y: startY + height }, // BR
               { x: startX, y: startY + height } // BL
           ];
           break;
      case 'parallelogram':
           // Slant determined by offset
           points = [
               { x: startX + offset, y: startY }, // TL
               { x: startX + width + offset, y: startY }, // TR
               { x: startX + width, y: startY + height }, // BR
               { x: startX, y: startY + height } // BL
           ];
           break;
      case 'trapezoid':
            // Isosceles or offset trapezoid
            points = [
                { x: startX + offset, y: startY }, // TL
                { x: startX + offset + topWidth, y: startY }, // TR
                { x: startX + Math.max(width, topWidth + offset), y: startY + height }, // BR (Using width as bottom base)
                { x: startX, y: startY + height } // BL
            ];
            break;
  }

  const polyPoints = points.map(p => `${p.x},${p.y}`).join(" ");
  
  // Height Line Logic
  if (showHeight) {
      // Typically drawn from top to bottom
      let hx = 0;
      if (shape === 'triangle' || shape === 'parallelogram' || shape === 'trapezoid') {
          hx = points[0].x; // From top-left or peak
      }
      
      if (shape === 'triangle') {
          heightLine = (
              <g>
                <line x1={points[0].x} y1={points[0].y} x2={points[0].x} y2={startY + height} stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 2" />
                {/* Right angle marker */}
                <path d={`M ${points[0].x} ${startY + height - 8} L ${points[0].x + 8} ${startY + height - 8} L ${points[0].x + 8} ${startY + height}`} fill="none" stroke="#9ca3af" />
              </g>
          );
      } else if (shape === 'parallelogram') {
           // Draw height outside or inside? Inside usually.
           heightLine = (
               <line x1={points[0].x} y1={points[0].y} x2={points[0].x} y2={points[3].y} stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 2" />
           );
      } else if (shape === 'trapezoid') {
           heightLine = (
               <line x1={points[0].x} y1={points[0].y} x2={points[0].x} y2={points[3].y} stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 2" />
           );
      }
  }

  // Label Positions
  const labelEls = [];
  if (labels.bottom) labelEls.push(<text key="b" x={startX + width/2} y={startY + height + 15} textAnchor="middle" className="text-xs font-bold fill-gray-700">{labels.bottom}</text>);
  if (labels.top) {
      const tx = shape === 'trapezoid' ? startX + offset + topWidth/2 : startX + width/2 + (shape==='parallelogram'?offset:0);
      labelEls.push(<text key="t" x={tx} y={startY - 5} textAnchor="middle" className="text-xs font-bold fill-gray-700">{labels.top}</text>);
  }
  if (labels.left) {
      // Approximate center of left side
      const lx = (points[0].x + points[points.length-1].x)/2 - 10;
      const ly = (points[0].y + points[points.length-1].y)/2;
      labelEls.push(<text key="l" x={lx} y={ly} textAnchor="end" dominantBaseline="middle" className="text-xs font-bold fill-gray-700">{labels.left}</text>);
  }
  if (labels.right) {
       // Approximate center of right side
      const rx = (points[1].x + points[2].x)/2 + 10;
      const ry = (points[1].y + points[2].y)/2;
      labelEls.push(<text key="r" x={rx} y={ry} textAnchor="start" dominantBaseline="middle" className="text-xs font-bold fill-gray-700">{labels.right}</text>);
  }
  if (labels.height && showHeight && shape !== 'rectangle' && shape !== 'square') {
       // Put label next to height line
       const hx = points[0].x + 5;
       const hy = startY + height/2;
       labelEls.push(<text key="h" x={hx} y={hy} dominantBaseline="middle" className="text-xs font-bold fill-gray-500">{labels.height}</text>);
  } else if (labels.height && (shape === 'rectangle' || shape === 'square')) {
      // For rect, height is just left/right side, handled by labels.left/right usually, but if explicit:
      labelEls.push(<text key="h" x={startX - 10} y={startY + height/2} textAnchor="end" dominantBaseline="middle" className="text-xs font-bold fill-gray-700">{labels.height}</text>);
  }
  if (labels.center) {
      labelEls.push(<text key="c" x={startX + width/2 + (shape ==='parallelogram'?offset/2:0)} y={startY + height/2} textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-blue-600">{labels.center}</text>);
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
      <svg width={viewBoxW} height={viewBoxH} viewBox={`0 0 ${viewBoxW} ${viewBoxH}`} className="overflow-visible">
          <polygon points={polyPoints} fill="#eff6ff" stroke="#2563eb" strokeWidth="2" />
          {heightLine}
          {labelEls}
      </svg>
    </div>
  );
};