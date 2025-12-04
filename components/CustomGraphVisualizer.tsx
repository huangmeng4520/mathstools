
import React from 'react';
import { DrawingElement } from '../types';

interface CustomGraphVisualizerProps {
  width?: number;
  height?: number;
  elements: DrawingElement[];
  label?: string;
}

export const CustomGraphVisualizer: React.FC<CustomGraphVisualizerProps> = ({
  width = 300,
  height = 300,
  elements = [],
  label
}) => {
  
  const renderElement = (el: DrawingElement) => {
    const { type, props } = el;
    switch (type) {
      case 'path':
        if (!props.points || props.points.length < 2) return null;
        const d = `M ${props.points.map(p => `${p.x},${p.y}`).join(' L ')}`;
        return <path key={el.id} d={d} stroke={props.color || 'black'} strokeWidth={props.strokeWidth || 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      
      case 'line':
        return <line key={el.id} x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} stroke={props.color || 'black'} strokeWidth={props.strokeWidth || 2} />;
      
      case 'rect':
        return <rect key={el.id} x={props.x} y={props.y} width={props.width} height={props.height} stroke={props.color || 'black'} strokeWidth={props.strokeWidth || 2} fill={props.fill || 'none'} />;
      
      case 'circle':
        // Props store bounding box x,y,w,h for consistency. SVG ellipse needs cx, cy, rx, ry
        const rx = (props.width || 0) / 2;
        const ry = (props.height || 0) / 2;
        const cx = (props.x || 0) + rx;
        const cy = (props.y || 0) + ry;
        return <ellipse key={el.id} cx={cx} cy={cy} rx={rx} ry={ry} stroke={props.color || 'black'} strokeWidth={props.strokeWidth || 2} fill={props.fill || 'none'} />;
      
      case 'text':
        return (
          <text 
            key={el.id} 
            x={props.x} 
            y={props.y} 
            fill={props.color || 'black'} 
            fontSize={props.fontSize || 16} 
            fontFamily="monospace"
            fontWeight="bold"
            style={{ whiteSpace: 'pre' }}
          >
            {props.text}
          </text>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-sm border border-gray-100 w-fit mx-auto my-4">
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`} 
        className="bg-white overflow-hidden"
        style={{maxWidth: '100%', height: 'auto'}}
      >
        {elements.map(renderElement)}
      </svg>
      {label && (
        <div className="mt-2 text-sm text-gray-500 font-bold bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          {label}
        </div>
      )}
    </div>
  );
};
