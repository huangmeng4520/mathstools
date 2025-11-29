
import React from 'react';

interface DieVisualizerProps {
  topValue?: number;
  leftValue?: number; // Acts as "Front" face in Cabinet projection logic
  rightValue?: number;
  size?: number;
  color?: string;
  dotColor?: string;
  label?: string;
}

export const DieVisualizer: React.FC<DieVisualizerProps> = ({
  topValue = 1,
  leftValue = 2,
  rightValue = 3,
  size = 150,
  color = '#ffffff',
  dotColor = '#1f2937', // gray-800
  label
}) => {
  // --- Cabinet / Oblique Projection Constants ---
  // ViewBox is 0 0 100 100
  const VIEW_SIZE = 100;
  const CUBE_SIZE = 55; // The size of the main square face
  const OFFSET = 20;    // The depth perception offset (diagonal)
  
  // Origin for the Front Face (Top-Left of the square)
  // We want the whole cube centered.
  // Total Width = CUBE_SIZE + OFFSET
  // Total Height = CUBE_SIZE + OFFSET
  // We position the Front Square at (0, OFFSET) relative to the drawing area, 
  // but then center everything in the ViewBox.
  
  const DRAW_W = CUBE_SIZE + OFFSET;
  const DRAW_H = CUBE_SIZE + OFFSET;
  
  const START_X = (VIEW_SIZE - DRAW_W) / 2; 
  const START_Y = (VIEW_SIZE - DRAW_H) / 2 + OFFSET; 

  // --- Calculate Vertices ---
  
  // 1. Front Face (A perfect square facing the viewer)
  // f_tl (Top Left), f_tr (Top Right), f_br (Bottom Right), f_bl (Bottom Left)
  const f_tl = { x: START_X, y: START_Y };
  const f_tr = { x: START_X + CUBE_SIZE, y: START_Y };
  const f_br = { x: START_X + CUBE_SIZE, y: START_Y + CUBE_SIZE };
  const f_bl = { x: START_X, y: START_Y + CUBE_SIZE };

  // 2. Back Face (Offset upwards and rightwards to simulate depth)
  // b_tl (Top Left)
  const b_tl = { x: START_X + OFFSET, y: START_Y - OFFSET };
  const b_tr = { x: START_X + CUBE_SIZE + OFFSET, y: START_Y - OFFSET };
  const b_br = { x: START_X + CUBE_SIZE + OFFSET, y: START_Y + CUBE_SIZE - OFFSET };
  // b_bl is hidden

  // Helper to stringify points for SVG polygon
  const poly = (...points: {x:number, y:number}[]) => points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Dot positions grid (3x3) mapped to 0-1 range (u, v)
  // 0: TopLeft, 1: TopMid, 2: TopRight ... 4: Center ... 8: BottomRight
  const DOT_MAP: Record<number, number[]> = {
      0: [],
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
  };

  const renderDots = (face: 'top' | 'front' | 'right', value: number) => {
      if (!value || value < 1 || value > 6) return null;
      
      const indices = DOT_MAP[value];
      const dots = [];
      
      // Define corners for interpolation based on the face
      // Order for mapping: Top-Left, Top-Right, Bottom-Right, Bottom-Left (relative to the face's visual orientation)
      let c1 = {x:0,y:0}, c2={x:0,y:0}, c3={x:0,y:0}, c4={x:0,y:0}; 
      
      if (face === 'front') {
          // The main square face
          c1 = f_tl; c2 = f_tr; c3 = f_br; c4 = f_bl;
      } else if (face === 'top') {
          // The top parallelogram
          c1 = b_tl; c2 = b_tr; c3 = f_tr; c4 = f_tl;
      } else if (face === 'right') {
          // The right parallelogram
          c1 = f_tr; c2 = b_tr; c3 = b_br; c4 = f_br;
      }

      for (const idx of indices) {
          const r = Math.floor(idx / 3); // 0, 1, 2 (Row)
          const c = idx % 3; // 0, 1, 2 (Col)
          
          // Normalize to 0..1 with padding to keep dots away from edges
          const pad = 0.25;
          const u = pad + (c * (1 - 2*pad) / 2); // 0.25, 0.5, 0.75
          const v = pad + (r * (1 - 2*pad) / 2);

          // Bilinear interpolation formula to map 2D grid to skewed 3D face
          // Point = (1-u)(1-v)c1 + u(1-v)c2 + u*v*c3 + (1-u)v*c4
          const nx = (1-u)*(1-v)*c1.x + u*(1-v)*c2.x + u*v*c3.x + (1-u)*v*c4.x;
          const ny = (1-u)*(1-v)*c1.y + u*(1-v)*c2.y + u*v*c3.y + (1-u)*v*c4.y;

          dots.push(
              <circle 
                  key={`${face}-${idx}`} 
                  cx={nx} 
                  cy={ny} 
                  r={4} 
                  fill={dotColor}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.5"
              />
          );
      }
      return dots;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
      <svg width={size} height={size} viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`} className="drop-shadow-lg overflow-visible">
         {/* Top Face (Lightest) */}
         <polygon points={poly(f_tl, b_tl, b_tr, f_tr)} fill="#f3f4f6" stroke="black" strokeWidth="2" strokeLinejoin="round" />
         
         {/* Right Face (Darker) */}
         <polygon points={poly(f_tr, b_tr, b_br, f_br)} fill="#9ca3af" stroke="black" strokeWidth="2" strokeLinejoin="round" />
         
         {/* Front Face (Medium - Main View) */}
         <polygon points={poly(f_tl, f_tr, f_br, f_bl)} fill="#ffffff" stroke="black" strokeWidth="2" strokeLinejoin="round" />
         
         {/* Dots */}
         {/* Note: In this projection, 'leftValue' is mapped to the Front Face as it's the primary face */}
         {renderDots('top', topValue || 0)}
         {renderDots('right', rightValue || 0)}
         {renderDots('front', leftValue || 0)} 
      </svg>
      
      {label && (
        <div className="mt-3 text-sm text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          {label}
        </div>
      )}
    </div>
  );
};
