import React from 'react';
import { LineSegmentRow, LineSegmentBrace } from '../types';

export interface LineSegmentVisualizerProps {
  rows?: LineSegmentRow[];
  braces?: LineSegmentBrace[];
  // Backward compatibility props (optional)
  total?: number;
  totalLabel?: string;
  segments?: Array<{ value: number | null; label?: string; color?: string }>; // Allow null in types
  label?: string;
}

export const LineSegmentVisualizer: React.FC<LineSegmentVisualizerProps> = (props) => {
  // --- 1. Normalize Data ---
  // Convert old single-line props to new multi-row structure if needed
  let dataRows: LineSegmentRow[] = props.rows || [];
  let dataBraces: LineSegmentBrace[] = props.braces || [];

  // Backward compatibility for old 'lineSegment' usage
  if (dataRows.length === 0 && props.segments && props.segments.length > 0) {
    
    // FIX: Handle null values. 
    // If total is provided, distribute evenly. Otherwise default to 1 unit.
    const count = props.segments.length;
    const autoValue = (props.total && count > 0) ? (props.total / count) : 1;

    dataRows = [{
      label: props.label,
      segments: props.segments.map(s => ({
        // If value is missing or null, use the auto-calculated value
        value: (s.value !== null && s.value !== undefined) ? s.value : autoValue,
        label: s.label,
        color: s.color,
        type: 'solid'
      }))
    }];
    
    if (props.totalLabel || props.total) {
      // Recalculate total based on the sanitized segments to ensure brace covers everything
      // (In case props.total was missing but totalLabel exists)
      const totalVal = dataRows[0].segments.reduce((a, b) => a + b.value, 0);
      
      dataBraces.push({
        rowIndex: 0,
        start: 0,
        end: totalVal,
        label: props.totalLabel || `${props.total}`,
        position: 'bottom'
      });
    }
  }

  if (dataRows.length === 0) return null;

  // --- 2. Calculate Scaling ---
  // Find the maximum total value across all rows to determine scale
  const rowTotals = dataRows.map(r => r.segments.reduce((sum, s) => sum + s.value, 0));
  const maxTotal = Math.max(...rowTotals);
  // Avoid division by zero
  const safeMaxTotal = maxTotal > 0 ? maxTotal : 1;

  // --- 3. Layout Constants ---
  const SVG_WIDTH = 300;
  const ROW_HEIGHT = 40;
  const ROW_GAP = 50; // Space between rows
  const LABEL_WIDTH = 60; // Space reserved for left labels
  const DRAW_WIDTH = SVG_WIDTH - LABEL_WIDTH - 20; // 20px padding right
  const START_X = LABEL_WIDTH + 10;
  const BRACE_HEIGHT = 15;
  
  // Calculate Scale Factor: how many pixels per unit value
  const scale = DRAW_WIDTH / safeMaxTotal;

  // Calculate total SVG height
  const svgHeight = dataRows.length * (ROW_HEIGHT + ROW_GAP) + 40; // Padding

  // --- 4. Helper: Brace Path Generator ---
  const drawBrace = (x1: number, x2: number, y: number, direction: 'top' | 'bottom') => {
    const w = x2 - x1;
    const h = direction === 'bottom' ? BRACE_HEIGHT : -BRACE_HEIGHT;
    
    // A curly brace path
    // Starts at x1,y. Curves to middle. Point at middle. Curves to x2,y.
    // Using Quadratic Bezier curves (Q)
    // Clamp curve control points to avoid weird loops on very small segments
    const curveX = Math.min(10, w/4);

    return `M ${x1} ${y} 
            Q ${x1} ${y + h/2} ${x1 + curveX} ${y + h/2} 
            L ${x1 + w/2 - curveX} ${y + h/2} 
            Q ${x1 + w/2} ${y + h/2} ${x1 + w/2} ${y + h} 
            Q ${x1 + w/2} ${y + h/2} ${x1 + w/2 + curveX} ${y + h/2} 
            L ${x2 - curveX} ${y + h/2} 
            Q ${x2} ${y + h/2} ${x2} ${y}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 w-full max-w-md mx-auto my-4 overflow-x-auto">
      <svg width={SVG_WIDTH} height={svgHeight} style={{overflow: 'visible'}}>
        
        {/* --- Render Rows --- */}
        {dataRows.map((row, rowIndex) => {
          const rowY = rowIndex * (ROW_HEIGHT + ROW_GAP) + 30; // Start Y position for this row
          let currentX = START_X;

          return (
            <g key={`row-${rowIndex}`}>
              {/* Row Label */}
              {row.label && (
                <text 
                  x={START_X - 10} 
                  y={rowY + ROW_HEIGHT / 2} 
                  textAnchor="end" 
                  dominantBaseline="middle" 
                  className="text-xs font-bold fill-gray-600"
                  style={{ fontSize: '12px' }}
                >
                  {row.label}
                </text>
              )}

              {/* Segments */}
              {row.segments.map((seg, segIndex) => {
                const segWidth = seg.value * scale;
                const isDotted = seg.type === 'dotted' || seg.type === 'dashed';
                
                const rectEl = (
                  <g key={`seg-${rowIndex}-${segIndex}`}>
                    {/* The Bar */}
                    <rect 
                      x={currentX} 
                      y={rowY} 
                      width={Math.max(segWidth, 0)} // Ensure no negative width
                      height={ROW_HEIGHT} 
                      fill={isDotted ? 'white' : (seg.color || '#3b82f6')} 
                      stroke={seg.color || '#3b82f6'}
                      strokeWidth="2"
                      strokeDasharray={isDotted ? "4 2" : "none"}
                      rx="4"
                    />
                    
                    {/* Segment Label (Inside) */}
                    {seg.label && (
                      <text 
                        x={currentX + segWidth / 2} 
                        y={rowY + ROW_HEIGHT / 2} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        className="text-xs font-bold"
                        style={{ 
                          fontSize: '10px', 
                          fill: isDotted ? '#374151' : 'white',
                          textShadow: isDotted ? 'none' : '0px 1px 2px rgba(0,0,0,0.3)' 
                        }}
                      >
                        {seg.label}
                      </text>
                    )}
                  </g>
                );

                // Advance X
                const prevX = currentX;
                currentX += segWidth;
                
                // Add separator line if not the last segment and not dotted transition
                // Only draw separator if width is sufficient
                const separator = (segIndex < row.segments.length - 1 && segWidth > 2) ? (
                   <line x1={currentX} y1={rowY} x2={currentX} y2={rowY + ROW_HEIGHT} stroke="white" strokeWidth="1" />
                ) : null;

                return (
                  <React.Fragment key={segIndex}>
                    {rectEl}
                    {separator}
                  </React.Fragment>
                );
              })}
              
              {/* Alignment Lines to next row (Optional, if needed for complex comparisons) */}
            </g>
          );
        })}

        {/* --- Render Braces --- */}
        {dataBraces.map((brace, idx) => {
          const rowY = brace.rowIndex * (ROW_HEIGHT + ROW_GAP) + 30;
          const startX = START_X + brace.start * scale;
          const endX = START_X + brace.end * scale;
          
          // Don't render if width is 0
          if (endX - startX <= 0) return null;

          const braceY = brace.position === 'top' ? rowY - 5 : rowY + ROW_HEIGHT + 5;
          const textY = brace.position === 'top' ? braceY - BRACE_HEIGHT - 5 : braceY + BRACE_HEIGHT + 12;

          return (
            <g key={`brace-${idx}`}>
              <path 
                d={drawBrace(startX, endX, braceY, brace.position || 'bottom')} 
                fill="none" 
                stroke="#4b5563" 
                strokeWidth="1.5" 
              />
              <text 
                x={startX + (endX - startX) / 2} 
                y={textY} 
                textAnchor="middle" 
                className="text-xs font-bold fill-gray-700"
              >
                {brace.label}
              </text>
            </g>
          );
        })}

      </svg>
    </div>
  );
};