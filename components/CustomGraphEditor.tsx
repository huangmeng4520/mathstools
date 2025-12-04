
import React, { useState, useRef, useEffect } from 'react';
import { 
  Pencil, 
  Square, 
  Circle, 
  Type, 
  Minus, 
  Trash2, 
  Undo, 
  Save, 
  Grid,
  X
} from 'lucide-react';
import { DrawingElement } from '../types';

interface CustomGraphEditorProps {
  initialData?: { width: number; height: number; elements: DrawingElement[] };
  onSave: (data: { type: 'customDraw'; props: { width: number; height: number; elements: DrawingElement[] } }) => void;
  onClose: () => void;
}

type Tool = 'pencil' | 'line' | 'rect' | 'circle' | 'text';

export const CustomGraphEditor: React.FC<CustomGraphEditorProps> = ({ initialData, onSave, onClose }) => {
  const [elements, setElements] = useState<DrawingElement[]>(initialData?.elements || []);
  const [tool, setTool] = useState<Tool>('pencil');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [textInput, setTextInput] = useState<{x: number, y: number, text: string} | null>(null);
  
  const width = initialData?.width || 300;
  const height = initialData?.height || 300;
  
  const svgRef = useRef<SVGSVGElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [textInput]);

  // Transform screen coordinates to SVG coordinates
  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Robust way to get SVG coordinates
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    
    // inverse transform to map screen pixels to SVG user units
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (textInput) {
       // If clicking outside while typing, commit text
       handleTextCommit();
       return;
    }
    
    const { x, y } = getMousePos(e);
    setStartPos({ x, y });
    setIsDrawing(true);
    
    const id = Date.now().toString();

    if (tool === 'pencil') {
        setCurrentElement({ id, type: 'path', props: { points: [{x, y}], color: 'black', strokeWidth: 2 } });
    } else if (tool === 'line') {
        setCurrentElement({ id, type: 'line', props: { x1: x, y1: y, x2: x, y2: y, color: 'black', strokeWidth: 2 } });
    } else if (tool === 'rect') {
        setCurrentElement({ id, type: 'rect', props: { x, y, width: 0, height: 0, color: 'black', strokeWidth: 2, fill: 'none' } });
    } else if (tool === 'circle') {
        setCurrentElement({ id, type: 'circle', props: { x, y, width: 0, height: 0, color: 'black', strokeWidth: 2, fill: 'none' } });
    } else if (tool === 'text') {
        setTextInput({ x, y, text: '' });
        setIsDrawing(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !currentElement || !startPos) return;
    // Prevent default touch actions like scrolling while drawing
    if ('touches' in e) e.preventDefault();
    
    const { x, y } = getMousePos(e);

    if (tool === 'pencil') {
        setCurrentElement(prev => prev ? ({
            ...prev,
            props: { ...prev.props, points: [...(prev.props.points || []), {x, y}] }
        }) : null);
    } else if (tool === 'line') {
        setCurrentElement(prev => prev ? ({
            ...prev,
            props: { ...prev.props, x2: x, y2: y }
        }) : null);
    } else if (tool === 'rect') {
        const w = x - startPos.x;
        const h = y - startPos.y;
        setCurrentElement(prev => prev ? ({
            ...prev,
            props: { 
                ...prev.props, 
                x: w < 0 ? x : startPos.x, 
                y: h < 0 ? y : startPos.y,
                width: Math.abs(w), 
                height: Math.abs(h) 
            }
        }) : null);
    } else if (tool === 'circle') {
        const w = x - startPos.x;
        const h = y - startPos.y;
        setCurrentElement(prev => prev ? ({
            ...prev,
            props: { 
                ...prev.props, 
                x: w < 0 ? x : startPos.x, 
                y: h < 0 ? y : startPos.y,
                width: Math.abs(w), 
                height: Math.abs(h) 
            }
        }) : null);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentElement) {
        // Basic validation to avoid adding tiny accidental shapes
        let isValid = true;
        if (tool === 'pencil' && (!currentElement.props.points || currentElement.props.points.length < 2)) isValid = false;
        if ((tool === 'rect' || tool === 'circle') && (currentElement.props.width === 0 || currentElement.props.height === 0)) isValid = false;
        
        if (isValid) {
            setElements(prev => [...prev, currentElement]);
        }
    }
    setIsDrawing(false);
    setCurrentElement(null);
    setStartPos(null);
  };

  const handleTextCommit = () => {
      if (textInput && textInput.text.trim()) {
          setElements(prev => [...prev, {
              id: Date.now().toString(),
              type: 'text',
              props: { x: textInput.x, y: textInput.y, text: textInput.text, color: 'black', fontSize: 16 }
          }]);
      }
      setTextInput(null);
  };

  const handleUndo = () => {
      setElements(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
      if (window.confirm('确定清空画板吗？')) {
          setElements([]);
      }
  };

  const renderTempElement = () => {
      if (!currentElement) return null;
      const { type, props } = currentElement;
      switch (type) {
        case 'path':
            const d = `M ${props.points?.map(p => `${p.x},${p.y}`).join(' L ')}`;
            return <path d={d} stroke="black" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
        case 'line':
            return <line x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} stroke="black" strokeWidth={2} />;
        case 'rect':
            return <rect x={props.x} y={props.y} width={props.width} height={props.height} stroke="black" strokeWidth={2} fill="none" />;
        case 'circle':
            const rx = (props.width || 0) / 2;
            const ry = (props.height || 0) / 2;
            const cx = (props.x || 0) + rx;
            const cy = (props.y || 0) + ry;
            return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} stroke="black" strokeWidth={2} fill="none" />;
        default: return null;
      }
  };

  // Render existing elements to display what's already there
  const renderStaticElement = (el: DrawingElement) => {
    const { type, props } = el;
    switch (type) {
      case 'path':
        const d = `M ${props.points?.map(p => `${p.x},${p.y}`).join(' L ')}`;
        return <path key={el.id} d={d} stroke={props.color} strokeWidth={props.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      case 'line':
        return <line key={el.id} x1={props.x1} y1={props.y1} x2={props.x2} y2={props.y2} stroke={props.color} strokeWidth={props.strokeWidth} />;
      case 'rect':
        return <rect key={el.id} x={props.x} y={props.y} width={props.width} height={props.height} stroke={props.color} strokeWidth={props.strokeWidth} fill={props.fill} />;
      case 'circle':
        const rx = (props.width || 0) / 2;
        const ry = (props.height || 0) / 2;
        const cx = (props.x || 0) + rx;
        const cy = (props.y || 0) + ry;
        return <ellipse key={el.id} cx={cx} cy={cy} rx={rx} ry={ry} stroke={props.color} strokeWidth={props.strokeWidth} fill={props.fill} />;
      case 'text':
        return (
            <text 
                key={el.id} 
                x={props.x} 
                y={props.y} 
                fill={props.color} 
                fontSize={props.fontSize} 
                fontFamily="monospace" 
                fontWeight="bold"
                style={{ whiteSpace: 'pre' }}
            >
                {props.text}
            </text>
        );
      default: return null;
    }
  };

  // Calculate screen position for text input based on SVG coordinates
  const getScreenPos = (svgX: number, svgY: number) => {
      if (!svgRef.current) return { left: 0, top: 0 };
      const svg = svgRef.current;
      const pt = svg.createSVGPoint();
      pt.x = svgX;
      pt.y = svgY;
      const screenPt = pt.matrixTransform(svg.getScreenCTM()!);
      
      // We need relative to the parent container for absolute positioning
      // but simpler is just to use fixed positioning or offset from bounding rect
      const rect = svg.getBoundingClientRect();
      return { left: screenPt.x - rect.left, top: screenPt.y - rect.top };
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
       {/* Toolbar */}
       <div className="flex items-center gap-2 p-2 bg-gray-100 border-b border-gray-200 overflow-x-auto flex-shrink-0">
          <button onClick={() => setTool('pencil')} className={`p-2 rounded ${tool === 'pencil' ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="画笔"><Pencil className="w-5 h-5" /></button>
          <button onClick={() => setTool('line')} className={`p-2 rounded ${tool === 'line' ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="直线"><Minus className="w-5 h-5" /></button>
          <button onClick={() => setTool('rect')} className={`p-2 rounded ${tool === 'rect' ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="矩形"><Square className="w-5 h-5" /></button>
          <button onClick={() => setTool('circle')} className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="圆形"><Circle className="w-5 h-5" /></button>
          <button onClick={() => setTool('text')} className={`p-2 rounded ${tool === 'text' ? 'bg-blue-200 text-blue-800' : 'hover:bg-gray-200'}`} title="文字"><Type className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={handleUndo} className="p-2 rounded hover:bg-gray-200" title="撤销"><Undo className="w-5 h-5" /></button>
          <button onClick={handleClear} className="p-2 rounded hover:bg-red-100 text-red-600" title="清空"><Trash2 className="w-5 h-5" /></button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button onClick={() => setShowGrid(!showGrid)} className={`p-2 rounded ${showGrid ? 'bg-gray-300' : 'hover:bg-gray-200'}`} title="网格"><Grid className="w-5 h-5" /></button>
       </div>

       {/* Canvas Area */}
       <div className="flex-1 bg-gray-50 relative overflow-auto flex items-center justify-center p-4">
          <div className="relative bg-white shadow-md select-none border border-gray-300" style={{ width, height }}>
             {showGrid && (
                <div 
                  className="absolute inset-0 pointer-events-none" 
                  style={{ 
                      backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                  }}
                />
             )}
             
             <svg
                ref={svgRef}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleMouseDown}
                onTouchMove={handleMouseMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 z-10 cursor-crosshair touch-none"
             >
                {elements.map(renderStaticElement)}
                {renderTempElement()}
             </svg>

             {/* Text Input Overlay */}
             {textInput && (
                 <div 
                    className="absolute z-20"
                    style={{ 
                        left: textInput.x, // Assuming strict pixel mapping for simple editor
                        top: textInput.y - 10, 
                    }}
                 >
                     <input
                        ref={inputRef}
                        type="text"
                        value={textInput.text}
                        onChange={e => setTextInput({...textInput, text: e.target.value})}
                        onKeyDown={e => e.key === 'Enter' && handleTextCommit()}
                        onBlur={handleTextCommit}
                        className="border border-blue-500 bg-white/90 px-1 py-0 text-base font-mono font-bold shadow-lg outline-none min-w-[50px]"
                        placeholder="Type..."
                        style={{ fontSize: '16px', lineHeight: '1' }}
                     />
                 </div>
             )}
          </div>
       </div>

       {/* Footer */}
       <div className="p-3 bg-gray-100 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium">取消</button>
          <button onClick={() => onSave({type: 'customDraw', props: {width, height, elements}})} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium flex items-center gap-2">
              <Save className="w-4 h-4" /> 保存图形
          </button>
       </div>
    </div>
  );
};
