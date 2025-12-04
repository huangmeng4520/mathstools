
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Camera, 
  Upload, 
  BrainCircuit, 
  RefreshCw, 
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Wand2,
  BookOpen,
  Maximize2,
  Crop,
  Check,
  CheckCircle2,
  AlertTriangle,
  Play,
  XCircle,
  Save,
  Move,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Printer,
  Edit,
  Code,
  Eye,
  Bold,
  Italic,
  Eraser,
  List,
  Heading1,
  Pencil,
  X
} from 'lucide-react';
import { MistakeRecord, VisualComponentData, Question, AddMistakePayload, Option } from '../types';
import { api } from '../services/api';
import { ClockVisualizer } from './ClockVisualizer';
import { NumberLine } from './NumberLine';
import { FractionVisualizer } from './FractionVisualizer';
import { GeometryVisualizer } from './GeometryVisualizer';
import { EmojiCounter } from './EmojiCounter';
import { GridVisualizer } from './GridVisualizer';
import { LineSegmentVisualizer } from './LineSegmentVisualizer';
import { DieVisualizer } from './DieVisualizer';
import { CustomGraphVisualizer } from './CustomGraphVisualizer';
import { CustomGraphEditor } from './CustomGraphEditor';
import { ChainVisualizer } from './ChainVisualizer';

// --- CONSTANTS ---
const VISUAL_COMPONENT_INSTRUCTION = `
如果题目包含数学图形，请务必在 JSON 中返回 visualComponents 字段（这是一个数组，支持多个图形）。
支持的组件类型(type)及props参数：
1. 时钟 (clock): { "type": "clock", "props": { "hour": number(0-12), "minute": number(0-59), "label": "string" } }
2. 数轴 (numberLine): { "type": "numberLine", "props": { "min": number, "max": number, "step": number, "markedValues": [number], "label": "string" } }
3. 分数图 (fraction): { "type": "fraction", "props": { "numerator": number, "denominator": number, "mode": "pie"|"bar", "label": "string" } }
4. 几何图形 (geometry): { "type": "geometry", "props": { "shape": "rectangle"|"square"|"triangle"|"parallelogram"|"trapezoid", "width": number, "height": number, "topWidth": number(for trapezoid), "offset": number(for triangle/parallelogram), "showHeight": boolean, "labels": { "top": "string", "bottom": "string", "left": "string", "right": "string", "height": "string", "center": "string" } } }
5. 线段图 (lineSegment): { "type": "lineSegment", "props": { "rows": [{ "label": "string(Row Label)", "segments": [{ "value": number, "label": "string", "color": "string", "type": "solid|dotted" }] }], "braces": [{ "rowIndex": number, "start": number, "end": number, "label": "string", "position": "top|bottom" }] } }
   - 注意：lineSegment 现在支持多行对比。'value' 是相对长度。'braces' 用于标记总数或部分。
   - 示例 (海豚2米，鲨鱼更长): 
     { "rows": [ 
         { "label": "海豚", "segments": [{ "value": 2, "label": "2米" }] }, 
         { "label": "鲨鱼", "segments": [{ "value": 2, "label": "2米" }, { "value": 1, "label": "+1", "type": "dotted" }] } 
       ], 
       "braces": [{ "rowIndex": 1, "start": 0, "end": 3, "label": "?米", "position": "bottom" }] 
     }
6. 物品计数 (emoji): { "type": "emoji", "props": { "icon": "string(emoji, e.g. 🍎, 🚗, ✏️)", "count": number, "label": "string" } }
7. 阵列/矩阵/卡片 (grid): { "type": "grid", "props": { "rows": number, "cols": number, "itemType": "circle"|"square"|"emoji", "icon": "string", "label": "string", "data": Array } }
   - "data" 是一维数组。
   - 简单模式: [1, 1, 0, 1] (1=显示, 0=隐藏)。
   - 高级模式 (用于分类/卡片题): 数组包含对象 { "shape": "triangle|circle|square", "content": "🐰", "label": "①" }。
   - 示例 (分类统计题): { "rows": 2, "cols": 5, "data": [{ "shape": "triangle", "content": "🐰", "label": "①" }, { "shape": "circle", "content": "🐱", "label": "②" }] }
8. 骰子/正方体 (die): { "type": "die", "props": { "topValue": number(1-6), "leftValue": number(1-6), "rightValue": number(1-6), "size": number, "label": "string" } }
   - 注意：'leftValue' 对应正方体正面的数字，'rightValue' 对应右侧面，'topValue' 对应顶面。
9. 铁环链 (chain): { "type": "chain", "props": { "count": number, "diameter": number, "thickness": number, "label": "string" } }
10. 自定义绘图 (customDraw): { "type": "customDraw", "props": { "width": number, "height": number, "elements": [ { "type": "path|line|rect|circle|text", "props": {...} } ] } }
   - 仅在其他组件无法满足需求时使用。elements 包含SVG基本图形数据。
`;

// --- MARKDOWN & MATH RENDERER ---

const renderMath = (latex: string, displayMode: boolean): string => {
  if (typeof window !== 'undefined' && (window as any).katex) {
    try {
      return (window as any).katex.renderToString(latex, {
        displayMode,
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX render error", e);
    }
  }
  return latex;
};

const processContent = (text: string): string => {
  // 1. Math extraction - Protect Math segments
  const mathSegments: string[] = [];
  let processed = text.replace(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g, (match) => {
    mathSegments.push(match);
    return `%%%MATH${mathSegments.length - 1}%%%`;
  });

  // 2. Headers
  processed = processed.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold my-2 text-gray-800">$1</h3>');
  processed = processed.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold my-3 text-gray-800">$1</h2>');
  processed = processed.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold my-4 text-gray-800">$1</h1>');

  // 3. Bold
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 4. Code Blocks (simple backticks)
  processed = processed.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded font-mono text-sm text-red-600">$1</code>');

  // 5. Lists
  // Unordered Lists: lines starting with "- " or "* "
  processed = processed.replace(/(?:^|\n)((?:[-*] .+(?:\n|$))+)/g, (match, list) => {
      const items = list.trim().split('\n').map((line: string) => `<li>${line.replace(/^[-*] /, '')}</li>`).join('');
      return `\n<ul class="list-disc pl-5 space-y-1 my-2">${items}</ul>\n`;
  });

  // Ordered Lists: lines starting with "1. "
  processed = processed.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (match, list) => {
      const items = list.trim().split('\n').map((line: string) => `<li>${line.replace(/^\d+\. /, '')}</li>`).join('');
      return `\n<ol class="list-decimal pl-5 space-y-1 my-2">${items}</ol>\n`;
  });

  // 6. Restore Math and render to HTML
  processed = processed.replace(/%%%MATH(\d+)%%%/g, (_, index) => {
    const idx = parseInt(index, 10);
    const match = mathSegments[idx];
    if (match.startsWith('$$')) {
       // Block math
       const latex = match.slice(2, -2);
       const html = renderMath(latex, true);
       return `<div class="my-2 overflow-x-auto">${html}</div>`;
    } else {
       // Inline math
       const latex = match.slice(1, -1);
       return renderMath(latex, false);
    }
  });

  return processed;
};

// Helper to convert simple Markdown to HTML for the Visual Editor (Without rendering Math)
// This allows the visual editor to show structure while keeping Math as editable text $$...$$
const simpleMarkdownToHtmlForEditor = (md: string): string => {
  if (!md) return '';
  // Check if it already looks like HTML (has tags)
  if (/<[a-z][\s\S]*>/i.test(md)) return md;

  let processed = md;
  // Escape HTML characters to prevent XSS if we were real, but here we want to allow user HTML.
  // We assume trusted content or acceptable risk for personal notebook.

  // 1. Bold **text** -> <b>text</b>
  processed = processed.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  
  // 2. Italic *text* -> <i>text</i>
  processed = processed.replace(/\*(.+?)\*/g, '<i>$1</i>');

  // 3. Headers
  processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 4. Lists (Simple transformation)
  processed = processed.replace(/^\- (.*$)/gm, '<div>• $1</div>');
  
  // 5. Newlines to <br> or <div> (Browsers prefer <div> or <br> in contentEditable)
  // We replace single newlines with <br> for the initial view
  processed = processed.replace(/\n/g, '<br/>');

  return processed;
};

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const trimmedContent = content.trim();

  // Check if content contains block HTML tags. 
  // If it does, we avoid splitting by paragraphs to preserve HTML structure (like tables).
  const hasBlockHtml = /<(table|div|ul|ol|h[1-6]|p|blockquote|pre)/i.test(trimmedContent);

  if (hasBlockHtml) {
      // For mixed content, we process Markdown syntax but rely on the user/HTML for layout
      return <div className="leading-relaxed text-gray-800 break-words" dangerouslySetInnerHTML={{__html: processContent(trimmedContent)}} />;
  }

  // If no block HTML, assumes standard Markdown text. Split by paragraphs for better spacing.
  const normalized = content.replace(/\r\n/g, '\n');
  const sections = normalized.split(/\n\n+/);
  
  return (
    <div className="space-y-3">
      {sections.map((sec, idx) => {
         const trimmed = sec.trim();
         if (!trimmed) return null;
         
         return (
            <div key={idx} className="leading-relaxed text-gray-800 break-words" dangerouslySetInnerHTML={{__html: processContent(trimmed)}} />
         );
      })}
    </div>
  );
};

// --- COMPONENT RENDERER ---
const renderVisualComponent = (visual: VisualComponentData | undefined) => {
  if (!visual) return null;

  // SAFEGUARD
  const props = visual.props || {};

  // NOTE: Added print:animate-none to prevent animations from hiding content during print
  // Added print:scale-75 print:origin-top-left to reduce size on paper
  const commonClasses = "my-4 flex justify-center animate-in fade-in zoom-in duration-300 print:animate-none print:my-2 print:scale-75 print:origin-top-left";

  switch (visual.type) {
    case 'clock':
      return (
        <div className={commonClasses}>
          <ClockVisualizer 
            hour={props.hour} 
            minute={props.minute}
            showNumbers={props.showNumbers !== false}
            label={props.label}
          />
        </div>
      );
    case 'numberLine':
      return (
        <div className={`${commonClasses} w-full overflow-x-auto`}>
          <NumberLine 
            min={props.min}
            max={props.max}
            step={props.step}
            markedValues={props.markedValues}
            label={props.label}
          />
        </div>
      );
    case 'fraction':
      return (
        <div className={commonClasses}>
           <FractionVisualizer 
             numerator={props.numerator}
             denominator={props.denominator}
             mode={props.mode}
             label={props.label}
           />
        </div>
      );
    case 'geometry':
      return (
        <div className={commonClasses}>
            <GeometryVisualizer 
              shape={props.shape}
              width={props.width}
              height={props.height}
              topWidth={props.topWidth}
              offset={props.offset}
              showHeight={props.showHeight}
              labels={props.labels}
            />
        </div>
      );
    case 'lineSegment':
      return (
        <div className={commonClasses}>
            <LineSegmentVisualizer 
               rows={props.rows}
               braces={props.braces}
               // backward compatibility
               total={props.total}
               totalLabel={props.totalLabel}
               segments={props.segments}
               label={props.label}
            />
        </div>
      );
    case 'emoji':
      return (
        <div className={commonClasses}>
            <EmojiCounter 
              icon={props.icon || "🍎"}
              count={props.count || 1}
              label={props.label}
            />
        </div>
      );
    case 'grid':
      return (
        <div className={commonClasses}>
            <GridVisualizer 
              rows={props.rows}
              cols={props.cols}
              itemType={props.itemType}
              icon={props.icon}
              label={props.label}
              data={props.data}
            />
        </div>
      );
    case 'die':
      return (
        <div className={commonClasses}>
            <DieVisualizer 
              topValue={props.topValue}
              leftValue={props.leftValue}
              rightValue={props.rightValue}
              size={props.size}
              label={props.label}
            />
        </div>
      );
    case 'chain':
      return (
        <div className={commonClasses}>
            <ChainVisualizer 
              count={props.count}
              diameter={props.diameter}
              thickness={props.thickness}
              label={props.label}
            />
        </div>
      );
    case 'customDraw':
      return (
        <div className={commonClasses}>
            <CustomGraphVisualizer
              width={props.width}
              height={props.height}
              elements={props.elements}
              label={props.label}
            />
        </div>
      );
    default:
      return null;
  }
};

// --- HELPER: ContentEditable Component ---
// This component manages the contentEditable div to prevent cursor jumping issues during React re-renders.
const ContentEditable = React.forwardRef<HTMLDivElement, { html: string, onChange: (html: string) => void, className?: string }>(
  ({ html, onChange, className }, ref) => {
    const internalRef = useRef<HTMLDivElement>(null);
    
    // Allow parent to access ref
    React.useImperativeHandle(ref, () => internalRef.current!);

    // Only update innerHTML from prop when mounting. 
    // Subsequent updates are handled by the user typing, or if the parent key changes (remount).
    useEffect(() => {
      if (internalRef.current && internalRef.current.innerHTML !== html) {
        internalRef.current.innerHTML = html;
      }
    }, [html]); // Re-run if html prop significantly changes (e.g. initial load or reset)

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
      onChange(e.currentTarget.innerHTML);
    };

    return (
      <div
        ref={internalRef}
        className={className}
        contentEditable
        onInput={handleInput}
        suppressContentEditableWarning={true}
        style={{ minHeight: '120px', outline: 'none' }} 
      />
    );
  }
);
ContentEditable.displayName = 'ContentEditable';

// --- RICH TEXT EDITOR COMPONENT ---
// Reusable component for editing HTML/Markdown with Visual and Code modes.

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  placeholder?: string;
}

// Helper function to format HTML
const formatHtml = (html: string): string => {
  // Simple HTML formatter that works in all environments
  let result = '';
  let indentLevel = 0;
  const indentSize = 2;
  let inComment = false;
  
  // Remove any existing newlines and extra spaces
  let cleanedHtml = html.replace(/\s+/g, ' ').trim();
  
  // Split into tokens
  const tokens = cleanedHtml.split(/(<[^>]+>)/g).filter(Boolean);
  
  for (const token of tokens) {
    if (token.startsWith('<!--')) {
      // Start of comment
      inComment = true;
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
    } else if (token.endsWith('-->')) {
      // End of comment
      inComment = false;
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
    } else if (inComment) {
      // Inside comment
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
    } else if (token.startsWith('</')) {
      // Close tag
      indentLevel--;
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
    } else if (token.startsWith('<') && token.endsWith('/>')) {
      // Self-closing tag
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
    } else if (token.startsWith('<')) {
      // Open tag
      result += `${' '.repeat(indentLevel * indentSize)}${token}\n`;
      indentLevel++;
    } else if (token.trim()) {
      // Text content
      result += `${' '.repeat(indentLevel * indentSize)}${token.trim()}\n`;
    }
  }
  
  return result.trim();
};

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  height = "h-48",
  placeholder 
}) => {
  const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');
  const [internalHtml, setInternalHtml] = useState(value);
  const [codeValue, setCodeValue] = useState(formatHtml(value)); // Format HTML for code mode
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync internal HTML state when value prop changes externally (e.g. initial load)
  useEffect(() => {
    // Determine if we need to upgrade markdown to HTML for visual editor
    const displayHtml = simpleMarkdownToHtmlForEditor(value);
    setInternalHtml(displayHtml);
    // Update code value with formatted HTML
    // console.log('useEffect: value changed, original value:', value);
    const formatted = formatHtml(value);
    // console.log('useEffect: formatted HTML:', formatted);
    setCodeValue(formatted);
  }, [value]);

  const handleVisualChange = (newHtml: string) => {
    setInternalHtml(newHtml);
    onChange(newHtml);
    // Update code value with formatted HTML
    setCodeValue(formatHtml(newHtml));
  };

  const handleCodeChange = (newCode: string) => {
    setCodeValue(newCode);
    onChange(newCode);
  };

  // Handle mode change
  const handleModeChange = (newMode: 'visual' | 'code') => {
    if (newMode === 'code') {
      // Format HTML when switching to code mode
      // console.log('Switching to code mode, original value:', value);
      const formatted = formatHtml(value);
      // console.log('Formatted HTML:', formatted);
      setCodeValue(formatted);
    }
    setEditMode(newMode);
  };

  const execCmd = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    // Force sync state after command
    if (editorRef.current) {
        const newHtml = editorRef.current.innerHTML;
        handleVisualChange(newHtml);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm focus-within:ring-2 focus-within:ring-purple-500 transition-all">
       <div className="bg-gray-50 border-b border-gray-200 p-2 flex justify-between items-center">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide ml-1">{label}</label>
          <div className="flex bg-gray-200/50 p-0.5 rounded-lg">
             <button 
               onClick={() => handleModeChange('visual')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${editMode === 'visual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Eye className="w-3 h-3" />
                可视化
             </button>
             <button 
               onClick={() => handleModeChange('code')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${editMode === 'code' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Code className="w-3 h-3" />
                源码
             </button>
          </div>
       </div>

       {editMode === 'visual' ? (
          <div className="flex flex-col">
             {/* TOOLBAR */}
             <div className="border-b border-gray-100 p-1 flex gap-1 flex-wrap bg-white">
                <button onClick={() => execCmd('bold')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="加粗"><Bold className="w-4 h-4" /></button>
                <button onClick={() => execCmd('italic')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="斜体"><Italic className="w-4 h-4" /></button>
                <button onClick={() => execCmd('formatBlock', 'H3')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700 font-bold text-xs" title="标题">H3</button>
                <div className="w-px bg-gray-200 mx-1 h-6 self-center"></div>
                <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="无序列表"><List className="w-4 h-4" /></button>
                <div className="w-px bg-gray-200 mx-1 h-6 self-center"></div>
                <button onClick={() => execCmd('foreColor', '#dc2626')} className="p-1.5 hover:bg-gray-100 rounded text-red-600 font-bold" title="标红">A</button>
                <button onClick={() => execCmd('removeFormat')} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="清除格式"><Eraser className="w-4 h-4" /></button>
             </div>
             <ContentEditable 
                ref={editorRef}
                html={internalHtml} 
                onChange={handleVisualChange}
                className={`p-4 ${height} overflow-y-auto prose prose-sm max-w-none outline-none text-gray-900 bg-white`}
             />
          </div>
       ) : (
          <textarea
            value={codeValue} // Use formatted code value
            onChange={e => handleCodeChange(e.target.value)}
            className={`w-full px-3 py-2 font-mono text-xs ${height} outline-none bg-gray-50 text-gray-800 resize-none`}
            placeholder={placeholder || "<div>...</div> or Markdown"}
          />
       )}
    </div>
  );
};

// --- EDIT COMPONENT ---
interface MistakeEditorProps {
  data: {
    html: string;
    answer: string;
    explanation: string;
    tags: string[];
    visualComponents?: VisualComponentData[];
  };
  onSave: (newData: any) => void;
  onCancel: () => void;
}

const MistakeEditor: React.FC<MistakeEditorProps> = ({ data, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    html: data.html || '',
    answer: data.answer || '',
    explanation: data.explanation || '',
    tags: (data.tags || []).join(', '),
    visualComponentsJSON: JSON.stringify(data.visualComponents || [], null, 2)
  });
  const [showGraphEditor, setShowGraphEditor] = useState(false);

  const handleSave = () => {
    try {
      const visualComponents = JSON.parse(formData.visualComponentsJSON);
      onSave({
        ...data,
        html: formData.html,
        answer: formData.answer,
        explanation: formData.explanation,
        tags: formData.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean),
        visualComponents
      });
    } catch (e) {
      alert("可视化组件 JSON 格式错误，请检查");
    }
  };

  const handleAddDrawing = (drawingData: any) => {
    try {
      const visualComponents = JSON.parse(formData.visualComponentsJSON);
      visualComponents.push(drawingData);
      setFormData({
        ...formData,
        visualComponentsJSON: JSON.stringify(visualComponents, null, 2)
      });
      setShowGraphEditor(false);
    } catch (e) {
      alert("无法解析当前的 JSON 配置，请先修复格式错误后再添加图形。");
    }
  };

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg animate-in fade-in duration-200 border border-purple-100 shadow-sm">
      
      {/* Question Editor */}
      <RichTextEditor 
        label="题目内容"
        value={formData.html}
        onChange={(val) => setFormData({...formData, html: val})}
        height="h-48"
      />

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">答案</label>
          <input
            type="text"
            value={formData.answer}
            onChange={e => setFormData({...formData, answer: e.target.value})}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">标签 (逗号分隔)</label>
          <input
            type="text"
            value={formData.tags}
            onChange={e => setFormData({...formData, tags: e.target.value})}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-shadow"
          />
        </div>
       </div>

       {/* Explanation Editor - Supports Markdown/HTML Visual Editing */}
       <RichTextEditor 
         label="解析 (支持 Markdown/HTML)"
         value={formData.explanation}
         onChange={(val) => setFormData({...formData, explanation: val})}
         height="h-32"
       />

      <div>
        <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-gray-500 hover:text-purple-600 transition-colors flex items-center gap-1 select-none">
                <Code className="w-3 h-3" /> 高级：可视化组件配置 (JSON)
            </summary>
            
            <div className="my-2">
               <button 
                 type="button"
                 onClick={() => setShowGraphEditor(true)}
                 className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-md border border-indigo-100 hover:bg-indigo-100 transition-colors"
               >
                 <Pencil className="w-3 h-3" /> 
                 手绘图形编辑器
               </button>
            </div>

            <textarea
            value={formData.visualComponentsJSON}
            onChange={e => setFormData({...formData, visualComponentsJSON: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs h-32 mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </details>
      </div>

      {showGraphEditor && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <Pencil className="w-4 h-4" /> 绘图编辑器
                    </h3>
                    <button onClick={() => setShowGraphEditor(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                <div className="flex-1 overflow-hidden">
                    <CustomGraphEditor 
                        onSave={handleAddDrawing}
                        onClose={() => setShowGraphEditor(false)}
                    />
                </div>
            </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold transition-colors">取消</button>
        <button onClick={handleSave} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold transition-colors flex items-center gap-2 shadow-md shadow-purple-200">
            <Save className="w-4 h-4" />
            保存修改
        </button>
      </div>
    </div>
  );
};

// --- COMPONENTS ---

interface MistakeCardProps {
  mistake: MistakeRecord;
  onDelete: (id: string) => void;
  onReview: (id: string, success: boolean) => void;
  onEdit: (mistake: MistakeRecord) => void;
  onGenerateVariation: (mistake: MistakeRecord) => void;
  isGenerating?: boolean;
}

const MistakeCard: React.FC<MistakeCardProps> = ({ mistake, onDelete, onReview, onEdit, onGenerateVariation, isGenerating }) => {
  const isDue = Date.now() > mistake.nextReviewAt;
  const isMastered = mistake.masteryLevel === 'mastered';
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  const handleDelete = () => {
    // 兼容性处理：如果id不存在，尝试获取_id (防止后端返回原始对象未映射)
    const targetId = mistake.id || (mistake as any)._id;
    if (!targetId) {
      console.error("Mistake ID missing:", mistake);
      alert("删除失败：无法获取题目ID");
      return;
    }
    
    if (window.confirm("确定要删除这道错题吗？删除后不可恢复。")) {
      onDelete(targetId);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-lg break-inside-avoid">
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
         <div className="flex gap-2">
           {mistake.tags.map(t => (
             <span key={t} className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">{t}</span>
           ))}
         </div>
         <div className="flex items-center gap-3">
            {isMastered && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold flex items-center gap-1 border border-green-200">
                 <CheckCircle2 className="w-3 h-3" />
                 已掌握
              </span>
            )}
            {!isMastered && isDue && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse">需复习</span>}
            <button onClick={() => onEdit(mistake)} className="text-gray-400 hover:text-blue-500 p-1 hover:bg-blue-50 rounded" title="编辑">
              <Edit className="w-5 h-5" />
            </button>
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded" title="删除">
              <Trash2 className="w-5 h-5" />
            </button>
         </div>
      </div>

      <div className="p-0 md:p-6">
        <div className="flex flex-col md:flex-row gap-0 md:gap-8">
           <div className="flex-1 flex flex-col bg-white md:border-2 md:border-slate-100 md:rounded-xl md:shadow-inner relative overflow-hidden">
              {/* Text Content */}
              <div className="w-full bg-grid-slate-50 min-h-[200px] max-h-[500px] overflow-auto rounded-lg">
                <div className="min-h-full min-w-full flex flex-col items-center justify-center p-6 text-gray-900">
                  <div 
                    className="w-full break-words prose prose-lg max-w-none text-gray-900 mb-4" 
                    dangerouslySetInnerHTML={{__html: mistake.htmlContent}} 
                  />
                  {mistake.visualComponents && mistake.visualComponents.length > 0 && (
                    <div className="w-full border-t border-dashed border-gray-200 pt-4 space-y-4">
                      {mistake.visualComponents.map((vc, idx) => (
                         <div key={idx}>{renderVisualComponent(vc)}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {mistake.imageData && (
                <div className="bg-gray-50 border-t border-gray-100 p-2 flex items-center justify-between px-4 shrink-0">
                  <span className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <Camera className="w-3 h-3" />
                    原始题目
                  </span>
                  <button 
                    onClick={() => setShowFullImage(!showFullImage)}
                    className="group relative h-10 w-10 md:w-auto md:h-auto md:px-2 flex items-center justify-center"
                  >
                     <img 
                      src={mistake.imageData} 
                      className="h-8 w-8 object-cover rounded border border-gray-300 bg-white" 
                      alt="Thumbnail" 
                    />
                    <Maximize2 className="w-4 h-4 text-gray-500 absolute bg-white/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              )}
              
              {showFullImage && mistake.imageData && (
                <div className="absolute inset-0 z-10 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
                  <img src={mistake.imageData} className="max-w-full max-h-[80%] object-contain shadow-2xl rounded-lg border-2 border-white" alt="Original" />
                  <button 
                    onClick={() => setShowFullImage(false)}
                    className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-full text-sm font-bold shadow-lg hover:bg-black transition-colors"
                  >
                    关闭预览
                  </button>
                </div>
              )}
           </div>

           <div className="flex-1 flex flex-col justify-start border-t md:border-t-0 md:border-l border-gray-100 pt-6 px-6 md:pt-0 md:pl-8 md:px-0 bg-white md:bg-transparent pb-6 md:pb-0">
              {!showAnswer ? (
                <div className="h-full flex flex-col justify-center">
                  <button 
                    onClick={() => setShowAnswer(true)}
                    className="w-full py-4 bg-blue-50 text-blue-600 font-bold text-lg rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 shadow-sm border border-blue-100 group"
                  >
                    <ChevronDown className="w-6 h-6 group-hover:translate-y-1 transition-transform" />
                    查看答案与解析
                  </button>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">
                  {/* Collapse Button */}
                  <div className="flex justify-end">
                    <button 
                      onClick={() => setShowAnswer(false)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                      收起答案
                    </button>
                  </div>
                  
                  {/* Answer and Explanation */}
                  <div className="bg-green-50 p-5 rounded-xl border border-green-100 shadow-sm">
                    <div className="font-bold text-green-900 text-lg mb-3 flex items-start gap-2 border-b border-green-200/50 pb-2">
                      <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded uppercase tracking-wider mt-1 flex-shrink-0">Answer</span>
                      <div className="flex-1 text-gray-900">
                        <MarkdownRenderer content={mistake.answer} />
                      </div>
                    </div>
                    <div className="text-sm bg-white p-4 rounded-lg border border-green-100/50 text-gray-700 leading-relaxed shadow-sm">
                      <MarkdownRenderer content={mistake.explanation} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <button onClick={() => onReview(mistake.id, false)} className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-base font-bold hover:bg-red-100 hover:shadow-sm transition-all">如果不熟练</button>
                     <button onClick={() => onReview(mistake.id, true)} className="py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-base font-bold hover:bg-green-100 hover:shadow-sm transition-all">已掌握</button>
                  </div>

                  <button 
                     onClick={() => onGenerateVariation(mistake)}
                     disabled={isGenerating}
                     className={`w-full py-3 border-2 border-purple-100 text-purple-600 bg-white rounded-xl text-base font-bold hover:bg-purple-50 flex items-center justify-center gap-2 transition-colors ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    {isGenerating ? '正在生成...' : 'AI 生成变式练习'}
                  </button>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

interface MistakeNotebookProps {
  mistakes: MistakeRecord[];
  storageError: string | null;
  isLoading: boolean;
  addMistake: (record: AddMistakePayload) => void;
  deleteMistake: (id: string) => void;
  updateMistake: (id: string, updates: any) => void;
  reviewMistake: (id: string, success: boolean) => void;
  onStartReview: (questions: Question[]) => void;
  // Pagination Props
  page?: number;
  setPage?: (page: number) => void;
  limit?: number;
  totalCount?: number;
  getReviewQueue: () => Promise<MistakeRecord[]>;
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({ 
  mistakes = [], 
  storageError, 
  isLoading, 
  addMistake, 
  deleteMistake, 
  updateMistake,
  reviewMistake,
  onStartReview,
  page = 1,
  setPage,
  limit = 5,
  totalCount = 0,
  getReviewQueue
}) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [generatingVariationId, setGeneratingVariationId] = useState<string | null>(null);
  
  // New entry state
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [analyzedData, setAnalyzedData] = useState<Array<{html: string, answer: string, explanation: string, tags: string[], visualComponents?: VisualComponentData[]}>>([]);
  const [retryPrompt, setRetryPrompt] = useState('');
  
  // Edit State
  const [editingAnalysisIndex, setEditingAnalysisIndex] = useState<number | null>(null);
  const [isEditingVariation, setIsEditingVariation] = useState(false);
  
  // Variation preview state
  const [showVariationPreview, setShowVariationPreview] = useState(false);
  const [currentVariation, setCurrentVariation] = useState<{html: string, answer: string, explanation: string, tags: string[], visualComponents?: VisualComponentData[]} | null>(null);
  const [currentOriginalMistake, setCurrentOriginalMistake] = useState<MistakeRecord | null>(null);

  // Edit Existing Mistake State
  const [editingMistake, setEditingMistake] = useState<MistakeRecord | null>(null);

  // Print State
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);
  const [printMistakes, setPrintMistakes] = useState<MistakeRecord[]>([]);

  // Cropping State
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'create' | 'move' | 'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [dragStartRect, setDragStartRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const totalPages = Math.ceil(totalCount / limit);

  // --- HELPER: Call AI with Retry (Exponential Backoff) ---
  const callAiWithRetry = async (apiCall: () => Promise<any>, retries = 3): Promise<any> => {
    try {
      return await apiCall();
    } catch (e: any) {
      // Check for 429 Resource Exhausted / Quota errors
      const isQuotaError = e.message?.includes('429') || 
                           e.message?.includes('quota') || 
                           e.message?.includes('RESOURCE_EXHAUSTED') ||
                           e.status === 429;

      if (isQuotaError && retries > 0) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = 2000 * Math.pow(2, 3 - retries); 
        console.warn(`AI Quota hit. Retrying in ${delay}ms... (${retries} attempts left)`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return callAiWithRetry(apiCall, retries - 1);
      }
      throw e;
    }
  };

  // --- REVIEW QUIZ GENERATION ---
  const handleStartReview = async () => {
    // Safety check to prevent crash if prop is missing
    if (typeof getReviewQueue !== 'function') {
        console.error("getReviewQueue is not defined or is not a function.");
        alert("复习功能暂不可用，请刷新页面重试。");
        return;
    }

    setIsProcessing(true);
    try {
      const dueMistakes = await getReviewQueue();

      if (dueMistakes.length === 0) {
        alert("当前没有需要复习的错题！");
        return;
      }

      const generatedQuestions: Question[] = [];

      for (const mistake of dueMistakes) {
        // 移除答案中的HTML标签，只保留纯文本
        const cleanAnswer = mistake.answer.replace(/<[^>]*>/g, '').trim();
        const upperAnswer = cleanAnswer.toUpperCase();
        
        // --- 1. DETECT QUESTION TYPE ---
        let qType: 'judgment' | 'selection' | 'completion' = 'completion';
        
        // Judgment (True/False) Detection
        const isJudgment = 
            ["对", "错", "√", "×", "TRUE", "FALSE"].includes(upperAnswer) ||
            mistake.tags.some(t => t.includes("判断"));

        // Selection (Multiple Choice) Detection (Single letter A-D)
        const isSelection = /^[A-D]$/i.test(cleanAnswer);

        if (isJudgment) qType = 'judgment';
        else if (isSelection) qType = 'selection';
        
        // --- 2. GENERATE OPTIONS BASED ON TYPE ---
        let options: Option[] = [];
        let correctId = 'correct';

        if (qType === 'judgment') {
             // Logic for Judgment
             const isTrue = ["对", "√", "TRUE", "T", "A"].includes(upperAnswer) || (cleanAnswer === "正确");
             
             // Fixed Options for Judgment
             options = [
                 { id: 'opt_true', text: '正确' },
                 { id: 'opt_false', text: '错误' }
             ];
             correctId = isTrue ? 'opt_true' : 'opt_false';

        } else if (qType === 'selection') {
             // Logic for Selection (Assuming content already has choices)
             options = [
                 { id: 'A', text: 'A' },
                 { id: 'B', text: 'B' },
                 { id: 'C', text: 'C' },
                 { id: 'D', text: 'D' }
             ];
             correctId = upperAnswer; // Correct ID is 'A', 'B', etc.

        } else {
             // Logic for Completion (Convert to Multiple Choice with Distractors)
             const generateDistractors = (correct: string) => {
                const distractors: string[] = [];
                const num = parseInt(correct);
                if (!isNaN(num)) {
                  // Numeric distractors
                  const variations = [num - 1, num + 1, num - 10, num + 10, num * 10, Math.floor(num/2)];
                  const filtered = variations.filter(v => v !== num && !distractors.includes(v.toString()));
                  for (let i = 0; i < 3 && i < filtered.length; i++) {
                    distractors.push(filtered[i].toString());
                  }
                }
                // Fallback text distractors
                while (distractors.length < 3) {
                  const generic = ['未知', '无法计算', '以上都不对', '需要更多信息'];
                  const rand = generic[Math.floor(Math.random() * generic.length)];
                  if (!distractors.includes(rand)) distractors.push(rand);
                }
                return distractors;
             };
             
             const distractors = generateDistractors(cleanAnswer);
             
             const rawOptions = [
                 { id: 'correct', text: cleanAnswer },
                 { id: 'wrong_1', text: distractors[0] },
                 { id: 'wrong_2', text: distractors[1] },
                 { id: 'wrong_3', text: distractors[2] }
             ];
             // Shuffle for completion type
             options = rawOptions.sort(() => Math.random() - 0.5);
             correctId = 'correct';
        }

        generatedQuestions.push({
            id: mistake.id,
            mistakeId: mistake.id,
            category: qType === 'judgment' ? '判断题' : (qType === 'selection' ? '选择题' : '填空/计算'),
            title: mistake.tags.join(' / '),
            questionType: qType, // PASS TYPE TO UI
            content: (
                <div className="flex flex-col items-center justify-center p-6 text-gray-900">
                  <div 
                    className="w-full break-words prose prose-lg max-w-none text-gray-900 mb-4" 
                    dangerouslySetInnerHTML={{__html: mistake.htmlContent}} 
                  />
                  {mistake.visualComponents && mistake.visualComponents.length > 0 && (
                    <div className="w-full border-t border-dashed border-gray-200 pt-4 space-y-4">
                       {mistake.visualComponents.map((vc, idx) => (
                         <div key={idx}>{renderVisualComponent(vc)}</div>
                       ))}
                    </div>
                  )}
                </div>
            ),
            options: options,
            correctId: correctId,
            explanation: <MarkdownRenderer content={mistake.explanation} />,
            hint: '回想一下之前整理错题时的思路'
        });
      }

      onStartReview(generatedQuestions);
    } catch (e) {
      console.error(e);
      alert("生成复习题失败");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- VARIATION GENERATION ---
  const handleGenerateVariation = async (mistake: MistakeRecord) => {
    setGeneratingVariationId(mistake.id);
    setCurrentOriginalMistake(mistake);
    
    try {
      const prompt = `
        我需要针对一道小学数学错题生成一道“变式练习题”。
        
        原题内容：${mistake.htmlContent.replace(/<[^>]+>/g, '')}
        原题答案：${mistake.answer}
        原题解析：${mistake.explanation}
        相关知识点：${mistake.tags.join(', ')}

        请生成一道新的题目。要求：
        1. 考察相同的核心素养（如计算逻辑、数形结合、位值原理等）。
        2. 题目场景或数字可以变化，但难度相当。
        3. 必须生成纯文本JSON，不要使用Markdown代码块。

        JSON结构要求：
        {
          "html": "题目内容的 HTML（使用 Tailwind 类，字体大 text-sm/base）。如果有可视化组件，请在 HTML 中预留位置或文字说明，组件将单独渲染。",
          "visualComponents": [
             {
                "type": "clock | numberLine | fraction | geometry | none | emoji | grid | die",
                "props": { ... }
             }
          ],
          "answer": "新题答案",
          "explanation": "新题解析（Markdown格式，支持$$LaTeX$$公式）",
          "tags": ["标签1", "标签2"]
        }

        ${VISUAL_COMPONENT_INSTRUCTION}
      `;

      // Use helper with retry
      const result = await callAiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }));

      const responseText = result.text || '';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const variation = JSON.parse(cleanJson);

      setCurrentVariation(variation);
      setShowVariationPreview(true);
    } catch (e: any) {
      console.error(e);
      // Detailed error alert
      if (e.message?.includes('429') || e.message?.includes('quota') || e.status === 429) {
        alert("AI 服务当前繁忙（配额超限）。请稍后再试。");
      } else {
        alert("生成变式题失败，请重试");
      }
    } finally {
      setGeneratingVariationId(null);
    }
  };

  const handleSaveVariation = async () => {
    if (!currentVariation || !currentOriginalMistake) return;
    
    // Construct AddMistakePayload
    const payload: AddMistakePayload = {
      htmlContent: currentVariation.html,
      answer: currentVariation.answer,
      explanation: currentVariation.explanation,
      tags: [...currentVariation.tags, "变式练习"],
      visualComponents: currentVariation.visualComponents,
      originalMistakeId: currentOriginalMistake.id,
      imageData: currentOriginalMistake.imageData,
      nextReviewAt: Date.now(),
      reviewCount: 0,
      masteryLevel: 'new'
    };

    addMistake(payload);
    setShowVariationPreview(false);
    setCurrentVariation(null);
    setCurrentOriginalMistake(null);
  };

  // --- Image Logic ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsConverting(true);
    let processFile = file;

    // HEIC Conversion Logic
    try {
       // Check for HEIC/HEIF file types by extension or mime type
       const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                      file.name.toLowerCase().endsWith('.heif') || 
                      file.type === 'image/heic' || 
                      file.type === 'image/heif';

       if (isHeic) {
           console.log("Detected HEIC file, starting conversion...");
           
           // Dynamically import heic2any to process the file
           // @ts-ignore
           const heic2anyModule = await import('heic2any');
           // Handle ESM default export compatibility
           // Fix: cast to any to avoid "expression is not callable" error due to complex import type
           const heic2any = (heic2anyModule.default || heic2anyModule) as any;
           
           // Read file as ArrayBuffer to ensure we have the complete raw bytes
           const arrayBuffer = await file.arrayBuffer();
           
           // Create a blob with the correct type using the array buffer
           const blob = new Blob([arrayBuffer], { type: "image/heic" });

           const blobOrBlobArr = await heic2any({
               blob: blob,
               toType: "image/jpeg",
               quality: 0.8
           });
           
           const resultBlob = Array.isArray(blobOrBlobArr) ? blobOrBlobArr[0] : blobOrBlobArr;
           processFile = new File([resultBlob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
       }
    } catch (err: any) {
       console.error("HEIC Conversion Failed:", err);
       
       // Handle specific library errors
       const msg = (err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))).toString();

       if (msg.includes("Image is already browser readable")) {
           // Case: The file was detected as HEIC but heic2any thinks it's already a JPEG/PNG
           // Just use the original file and proceed
           console.log("Image is already readable, skipping conversion.");
           
           // FIX: Force MIME type to image/jpeg so FileReader creates a usable Data URL
           // Re-read buffer from original file since it wasn't converted
           const buffer = await file.arrayBuffer();
           processFile = new File([buffer], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });

       } else if (msg.includes("ERR_LIBHEIF")) {
           // Fallback for browsers that can natively display HEIC or if conversion fails
           console.warn("HEIC conversion failed (ERR_LIBHEIF), falling back to original file.");
           // We will try to use the original file. 
           // If the browser (like Safari) supports it, it will render.
           // If not, the onError handler on the img tag will catch it.
           processFile = file;
       } else {
           alert(`图片格式转换失败: ${msg}。请尝试使用 JPG 或 PNG 格式。`);
           setIsConverting(false);
           if (fileInputRef.current) fileInputRef.current.value = '';
           return;
       }
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImageSrc(reader.result as string);
      setNewImage(null);
      setAnalyzedData([]);
      setCropRect(null);
      setRetryPrompt('');
      setIsConverting(false);
    };
    reader.onerror = () => {
        alert("无法读取图片文件");
        setIsConverting(false);
    };
    reader.readAsDataURL(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = () => {
    setNewImage(null);
    setAnalyzedData([]);
    setOriginalImageSrc(null);
    setFile(null);
    setEditingAnalysisIndex(null); // Reset editing state
  };
  
  const setFile = (f: any) => { if(fileInputRef.current) fileInputRef.current.value = '' };

  const handleReCrop = () => {
    setNewImage(null);
    setAnalyzedData([]);
    setRetryPrompt('');
  };

  // ... (Cropping logic)
  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const getInteractionType = (x: number, y: number, rect: {x:number, y:number, w:number, h:number}) => {
     if (!rect) return 'create';
     const BUFFER = 20; // Hit test buffer for handles
     
     // Check corners
     // Top-Left
     if (Math.abs(x - rect.x) < BUFFER && Math.abs(y - rect.y) < BUFFER) return 'tl';
     // Top-Right
     if (Math.abs(x - (rect.x + rect.w)) < BUFFER && Math.abs(y - rect.y) < BUFFER) return 'tr';
     // Bottom-Left
     if (Math.abs(x - rect.x) < BUFFER && Math.abs(y - (rect.y + rect.h)) < BUFFER) return 'bl';
     // Bottom-Right
     if (Math.abs(x - (rect.x + rect.w)) < BUFFER && Math.abs(y - (rect.y + rect.h)) < BUFFER) return 'br';
     
     // Check inside for move
     if (x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h) return 'move';
     
     return 'create';
  };

  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const pos = getClientPos(e);
    const x = pos.x - rect.left;
    const y = pos.y - rect.top;

    // Determine mode
    let mode = 'create';
    if (cropRect) {
        mode = getInteractionType(x, y, cropRect);
    }
    
    setDragMode(mode as any);
    setStartPos({x, y});
    setIsDragging(true);

    if (mode === 'create') {
        setCropRect({x, y, w: 0, h: 0});
        setDragStartRect(null);
    } else {
        setDragStartRect(cropRect);
    }
  };

  const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const pos = getClientPos(e);
    const currentX = pos.x - rect.left;
    const currentY = pos.y - rect.top;

    // Change cursor based on hover if not dragging
    if (!isDragging) {
       const hoverMode = cropRect ? getInteractionType(currentX, currentY, cropRect) : 'create';
       let cursor = 'crosshair';
       if (hoverMode === 'move') cursor = 'move';
       if (hoverMode === 'tl' || hoverMode === 'br') cursor = 'nwse-resize';
       if (hoverMode === 'tr' || hoverMode === 'bl') cursor = 'nesw-resize';
       imageRef.current.style.cursor = cursor;
       return;
    }

    // Handle Dragging
    if (!startPos) return;
    e.preventDefault();

    const dx = currentX - startPos.x;
    const dy = currentY - startPos.y;

    if (dragMode === 'create') {
        let x = Math.min(currentX, startPos.x);
        let y = Math.min(currentY, startPos.y);
        let w = Math.abs(currentX - startPos.x);
        let h = Math.abs(currentY - startPos.y);
        
        // Bounds check
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > rect.width) w = rect.width - x;
        if (y + h > rect.height) h = rect.height - y;
        
        setCropRect({x, y, w, h});
    } else if (dragMode === 'move' && dragStartRect) {
        let newX = dragStartRect.x + dx;
        let newY = dragStartRect.y + dy;
        
        // Bounds check
        if (newX < 0) newX = 0;
        if (newY < 0) newY = 0;
        if (newX + dragStartRect.w > rect.width) newX = rect.width - dragStartRect.w;
        if (newY + dragStartRect.h > rect.height) newY = rect.height - dragStartRect.h;
        
        setCropRect({ ...dragStartRect, x: newX, y: newY });
    } else if (dragStartRect) {
        // Resize logic
        let newX = dragStartRect.x;
        let newY = dragStartRect.y;
        let newW = dragStartRect.w;
        let newH = dragStartRect.h;

        if (dragMode === 'br') {
            newW = Math.max(10, dragStartRect.w + dx);
            newH = Math.max(10, dragStartRect.h + dy);
        } else if (dragMode === 'bl') {
            newX = Math.min(dragStartRect.x + dragStartRect.w - 10, dragStartRect.x + dx);
            newW = dragStartRect.w - (newX - dragStartRect.x);
            newH = Math.max(10, dragStartRect.h + dy);
        } else if (dragMode === 'tr') {
            newY = Math.min(dragStartRect.y + dragStartRect.h - 10, dragStartRect.y + dy);
            newH = dragStartRect.h - (newY - dragStartRect.y);
            newW = Math.max(10, dragStartRect.w + dx);
        } else if (dragMode === 'tl') {
            newX = Math.min(dragStartRect.x + dragStartRect.w - 10, dragStartRect.x + dx);
            newW = dragStartRect.w - (newX - dragStartRect.x);
            newY = Math.min(dragStartRect.y + dragStartRect.h - 10, dragStartRect.y + dy);
            newH = dragStartRect.h - (newY - dragStartRect.y);
        }
        
        // Clamp logic can be added here if needed, basic prevents negative dim
        setCropRect({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handleCropMouseUp = () => {
    setIsDragging(false);
    setStartPos(null);
    setDragStartRect(null);
    setDragMode(null);
  };

  const confirmCrop = () => {
    if (!imageRef.current || !cropRect || cropRect.w < 10 || cropRect.h < 10) {
      if (originalImageSrc) {
        // Fallback to full image if no crop
        analyzeImage(originalImageSrc);
      }
      return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    canvas.width = cropRect.w * scaleX;
    canvas.height = cropRect.h * scaleY;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(
        imageRef.current,
        cropRect.x * scaleX,
        cropRect.y * scaleY,
        cropRect.w * scaleX,
        cropRect.h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );
      const croppedBase64 = canvas.toDataURL('image/jpeg');
      setNewImage(croppedBase64);
      analyzeImage(croppedBase64);
    }
  };

  const analyzeImage = async (base64Image: string, customInstruction: string = '') => {
    setIsProcessing(true);
    try {
      const prompt = `
        请分析这张小学数学错题图片。
        ${customInstruction ? `注意：${customInstruction}` : ''}
        
        请识别题目内容、去除手写及批改内容，手写答案（如果有）分析错误原因，并给出正确解答及解题思路。
        
        必须返回纯 JSON 格式（不要Markdown代码块），结构如下：
        [
          {
            "html": "题目内容的 HTML（使用 Tailwind 类，字体大 text-sm/base，重点数字加粗）。",
            "visualComponents": [
              {
                "type": "clock | numberLine | fraction | geometry | none | emoji | grid | die",
                "props": { ... }
             }
            ],
            "answer": "正确答案",
            "explanation": "详细解析（Markdown格式，支持$$LaTeX$$公式）",
            "tags": ["标签1", "标签2"]
          }
        ]

        ${VISUAL_COMPONENT_INSTRUCTION}
        
        如果图片包含多道题，请返回多个对象，如果一题有多个问题时，题目内容公共部分需要复用。
        对于HTML内容：
        - 竖式计算请使用 <table> 布局对齐。
        - 确保文字颜色深色 (text-gray-900)。
        - 题目文字要完整。
        - 解析时要用小学生能理解的方式。
      `;

      // Use helper with retry
      const result = await callAiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
              { text: prompt }
            ]
          }
        ]
      }));

      const responseText = result.text || '';
      const cleanJson = responseText.replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      
      setAnalyzedData(Array.isArray(data) ? data : [data]);
    } catch (e: any) {
      console.error(e);
      // Detailed error alert
      if (e.message?.includes('429') || e.message?.includes('quota') || e.status === 429) {
        alert("AI 服务当前繁忙（配额超限）。请稍后再试。");
      } else {
        alert("AI 识别失败，请重试");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const saveNewMistake = () => {
    if (!newImage || analyzedData.length === 0) return;
    
    // Support saving multiple detected mistakes
    const mistakesPayload = analyzedData.map(d => ({
        html: d.html,
        answer: d.answer,
        explanation: d.explanation,
        tags: d.tags,
        visualComponents: d.visualComponents
    }));

    // If there's only one, standard format, but API supports bulk via separate call or array
    // Let's use bulk payload format defined in types
    const payload: AddMistakePayload = {
        originalImage: {
            url: newImage,
            fileId: `upload-${Date.now()}`
        },
        mistakes: mistakesPayload
    };

    addMistake(payload);
    
    // Reset
    handleReset();
    setView('list');
  };

  const handleSaveAnalysisUpdate = (index: number, newData: any) => {
    const updated = [...analyzedData];
    updated[index] = newData;
    setAnalyzedData(updated);
    setEditingAnalysisIndex(null);
  };

  const handleSaveVariationUpdate = (newData: any) => {
    setCurrentVariation(newData);
    setIsEditingVariation(false);
  };

  // --- EDIT EXISTING MISTAKE ---
  const handleUpdateMistake = (updatedData: any) => {
    if (!editingMistake) return;

    // Construct update payload
    // Use 'html' instead of 'htmlContent' to match backend expectation
    const updates = {
        html: updatedData.html,
        answer: updatedData.answer,
        explanation: updatedData.explanation,
        tags: updatedData.tags,
        visualComponents: updatedData.visualComponents
    };

    updateMistake(editingMistake.id, updates);
    setEditingMistake(null);
  };

  // --- PRINTING ---
  const handlePrint = async () => {
    setIsPreparingPrint(true);
    try {
      // Fetch all mistakes (limit 1000 should cover most use cases for a personal notebook)
      const { items } = await api.getMistakes(1, 1000); 
      setPrintMistakes(items);
      
      // Allow DOM to update and images to load
      setTimeout(() => {
        window.print();
        setIsPreparingPrint(false);
      }, 1000);
    } catch (e) {
      console.error("Failed to prepare print data", e);
      alert("无法获取全部数据用于打印");
      setIsPreparingPrint(false);
    }
  };

  // START OF RENDER LOGIC

  // Print View
  if (isPreparingPrint) {
    return (
      <div className="bg-white min-h-screen p-8 print:p-0">
         <div className="mb-6 text-center print:hidden">
            <h1 className="text-2xl font-bold">准备打印预览...</h1>
            <p>正在生成打印版式，请稍候</p>
         </div>
         <div className="space-y-8 print:space-y-4">
             {printMistakes.map((m, idx) => (
               <div key={m.id} className="break-inside-avoid border-b border-gray-200 pb-4 mb-4">
                  <div className="font-bold text-gray-500 mb-2">题目 {idx + 1}</div>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{__html: m.htmlContent}} />
                  {m.visualComponents && m.visualComponents.map((vc, vci) => (
                    <div key={vci} className="my-2">{renderVisualComponent(vc)}</div>
                  ))}
               </div>
             ))}
         </div>
      </div>
    );
  }

  // Helper for pagination
  const handlePrevPage = () => {
    if (page > 1 && setPage) setPage(page - 1);
  };
  const handleNextPage = () => {
    if (page < totalPages && setPage) setPage(page + 1);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 w-full">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
         <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
               <span className="bg-purple-100 text-purple-600 p-2 rounded-xl"><BrainCircuit className="w-8 h-8" /></span>
               智能错题本
            </h1>
            <p className="text-gray-500 mt-1 ml-1 text-sm">
               已收录 <span className="font-bold text-gray-900">{totalCount}</span> 道错题 
               {isLoading && <span className="ml-2 inline-block w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin align-middle"></span>}
            </p>
         </div>
         
         <div className="flex gap-3 w-full md:w-auto">
            {view === 'list' && !editingMistake && !showVariationPreview && (
                <>
                  <button 
                    onClick={handleStartReview} 
                    className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-100"
                  >
                    <RefreshCw className="w-4 h-4" />
                    智能复习
                  </button>
                  <button 
                    onClick={handlePrint} 
                    className="flex-1 md:flex-none px-4 py-2.5 bg-gray-50 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 border border-gray-100"
                    title="打印全部错题"
                  >
                    <Printer className="w-4 h-4" />
                    打印
                  </button>
                  <button 
                    onClick={() => setView('add')}
                    className="flex-1 md:flex-none px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    录入错题
                  </button>
                </>
            )}
            {(view === 'add' || editingMistake || showVariationPreview) && (
                <button 
                  onClick={() => {
                    setView('list');
                    setEditingMistake(null);
                    setShowVariationPreview(false);
                    handleReset();
                  }}
                  className="px-4 py-2.5 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  返回列表
                </button>
            )}
         </div>
      </div>

      {storageError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
           <AlertTriangle className="w-5 h-5" />
           {storageError}
        </div>
      )}

      {/* --- VIEW: ADD MISTAKE --- */}
      {view === 'add' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {!newImage && !originalImageSrc ? (
             // STEP 1: UPLOAD
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 text-center">
                <div className="max-w-md mx-auto">
                   <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Camera className="w-10 h-10" />
                   </div>
                   <h2 className="text-2xl font-bold text-gray-900 mb-2">拍照/上传错题</h2>
                   <p className="text-gray-500 mb-8">支持自动识别题目内容、手写痕迹去除、AI 智能解析</p>
                   
                   <div className="grid grid-cols-1 gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isConverting}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-blue-200 shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                         {isConverting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                         {isConverting ? '正在处理图片...' : '选择图片'}
                      </button>
                      <input 
                        type="file" 
                        accept="image/*,.heic,.heif" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                      />
                   </div>
                   <p className="mt-4 text-xs text-gray-400">支持 JPG, PNG, HEIC 格式</p>
                </div>
             </div>
          ) : !analyzedData.length ? (
             // STEP 2: CROP & ANALYZE
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row h-[calc(100vh-200px)] md:h-[600px]">
                <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden select-none group">
                   <img 
                     ref={imageRef}
                     src={originalImageSrc || ''} 
                     className="max-w-full max-h-full object-contain pointer-events-none"
                     alt="To Crop"
                   />
                   {/* Interactive Overlay */}
                   <div 
                      className="absolute inset-0 z-10 cursor-crosshair touch-none"
                      onMouseDown={handleCropMouseDown}
                      onMouseMove={handleCropMouseMove}
                      onMouseUp={handleCropMouseUp}
                      onMouseLeave={handleCropMouseUp}
                      onTouchStart={handleCropMouseDown}
                      onTouchMove={handleCropMouseMove}
                      onTouchEnd={handleCropMouseUp}
                   />
                   
                   {/* Crop Rect Render */}
                   {cropRect && (
                      <div 
                        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none"
                        style={{
                            left: imageRef.current?.getBoundingClientRect().left! - (imageRef.current?.parentElement?.getBoundingClientRect().left || 0) + cropRect.x,
                            top: imageRef.current?.getBoundingClientRect().top! - (imageRef.current?.parentElement?.getBoundingClientRect().top || 0) + cropRect.y,
                            width: cropRect.w,
                            height: cropRect.h
                        }}
                      >
                          {/* Handles */}
                          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border border-white"></div>
                          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border border-white"></div>
                          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border border-white"></div>
                          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border border-white"></div>
                      </div>
                   )}
                   
                   {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                         <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-400" />
                         <p className="font-bold text-lg">AI 正在识别分析...</p>
                         <p className="text-sm text-gray-300 mt-2">正在提取题目、生成解析、去除笔迹</p>
                      </div>
                   )}
                </div>

                <div className="w-full md:w-80 bg-white border-l border-gray-200 p-6 flex flex-col">
                   <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                     <Crop className="w-5 h-5 text-gray-500" />
                     裁剪题目
                   </h3>
                   <div className="text-sm text-gray-600 mb-6 space-y-2">
                      <p>1. 在左侧拖动框选题目区域。</p>
                      <p>2. 尽量只包含一道题目。</p>
                      <p>3. 点击下方按钮开始识别。</p>
                   </div>
                   
                   <div className="flex-1"></div>

                   <div className="space-y-3">
                      <button 
                         onClick={confirmCrop}
                         disabled={isProcessing}
                         className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                         <BrainCircuit className="w-5 h-5" />
                         {isProcessing ? '处理中...' : '确认并识别'}
                      </button>
                      <button 
                         onClick={handleReset}
                         disabled={isProcessing}
                         className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                      >
                         取消 / 重选
                      </button>
                   </div>
                </div>
             </div>
          ) : (
             // STEP 3: REVIEW & EDIT RESULT
             <div className="max-w-3xl mx-auto space-y-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-xl text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
                       <CheckCircle2 className="w-6 h-6 text-green-500" />
                       识别结果确认
                       <span className="text-sm font-normal text-gray-500 ml-auto">共 {analyzedData.length} 题</span>
                    </h3>
                    
                    {analyzedData.map((item, idx) => (
                        <div key={idx} className="mb-8 last:mb-0 border border-gray-100 rounded-xl p-4 bg-gray-50">
                           <div className="flex justify-between items-center mb-4">
                              <span className="font-bold text-gray-500 text-sm">题目 {idx + 1}</span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setEditingAnalysisIndex(idx)}
                                  className="text-blue-600 text-sm font-bold hover:underline"
                                >
                                  编辑修改
                                </button>
                                {analyzedData.length > 1 && (
                                    <button 
                                      onClick={() => {
                                          const newData = [...analyzedData];
                                          newData.splice(idx, 1);
                                          setAnalyzedData(newData);
                                      }}
                                      className="text-red-500 text-sm font-bold hover:underline"
                                    >
                                      删除
                                    </button>
                                )}
                              </div>
                           </div>

                           {editingAnalysisIndex === idx ? (
                               <MistakeEditor 
                                 data={item} 
                                 onSave={(data) => handleSaveAnalysisUpdate(idx, data)}
                                 onCancel={() => setEditingAnalysisIndex(null)}
                               />
                           ) : (
                               <div className="bg-white p-4 rounded-lg border border-gray-200">
                                  <div className="prose prose-sm max-w-none text-gray-800 mb-4" dangerouslySetInnerHTML={{__html: item.html}} />
                                  {item.visualComponents && item.visualComponents.map((vc, i) => (
                                     <div key={i}>{renderVisualComponent(vc)}</div>
                                  ))}
                                  <div className="flex gap-2 mb-2">
                                     <span className="text-xs font-bold text-gray-400 uppercase">Answer:</span>
                                     <span className="text-sm font-bold text-green-600">{item.answer}</span>
                                  </div>
                                  <div className="flex gap-2">
                                      {item.tags.map(t => <span key={t} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{t}</span>)}
                                  </div>
                               </div>
                           )}
                        </div>
                    ))}
                    
                    {/* Retry / Add More Actions */}
                    <div className="mt-8 flex gap-4 pt-4 border-t border-gray-100">
                       <button 
                         onClick={handleReCrop}
                         className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                       >
                         丢弃结果重新裁剪
                       </button>
                       <button 
                         onClick={saveNewMistake}
                         className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200"
                       >
                         全部保存入库
                       </button>
                    </div>

                    {/* Retry Prompt */}
                    <div className="mt-6">
                       <details className="text-sm text-gray-500">
                          <summary className="cursor-pointer hover:text-gray-800">识别不准？使用提示词重试</summary>
                          <div className="mt-2 flex gap-2">
                             <input 
                               type="text" 
                               value={retryPrompt} 
                               onChange={(e) => setRetryPrompt(e.target.value)}
                               placeholder="例如：只识别第一题，或者忽略手写红笔..."
                               className="flex-1 px-3 py-2 border rounded-lg text-sm"
                             />
                             <button 
                               onClick={() => newImage && analyzeImage(newImage, retryPrompt)}
                               disabled={isProcessing}
                               className="px-4 py-2 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm"
                             >
                               重试
                             </button>
                          </div>
                       </details>
                    </div>
                 </div>
             </div>
          )}
        </div>
      )}

      {/* --- VIEW: EDIT EXISTING --- */}
      {view === 'list' && editingMistake && (
          <div className="max-w-3xl mx-auto">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-6">编辑错题</h2>
                <MistakeEditor 
                  data={{
                      html: editingMistake.htmlContent,
                      answer: editingMistake.answer,
                      explanation: editingMistake.explanation,
                      tags: editingMistake.tags,
                      visualComponents: editingMistake.visualComponents
                  }} 
                  onSave={handleUpdateMistake}
                  onCancel={() => setEditingMistake(null)}
                />
             </div>
          </div>
      )}

      {/* --- VIEW: VARIATION PREVIEW --- */}
      {view === 'list' && !editingMistake && showVariationPreview && currentVariation && (
          <div className="max-w-3xl mx-auto animate-in slide-in-from-right-8 duration-300">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-1 rounded-2xl shadow-xl">
                  <div className="bg-white rounded-xl p-6 md:p-8">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                           <Wand2 className="w-6 h-6 text-purple-600" />
                           AI 生成变式题
                        </h2>
                        <button onClick={() => setShowVariationPreview(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5"/></button>
                     </div>

                     {isEditingVariation ? (
                        <MistakeEditor 
                           data={currentVariation}
                           onSave={handleSaveVariationUpdate}
                           onCancel={() => setIsEditingVariation(false)}
                        />
                     ) : (
                        <div className="space-y-6">
                           <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                              <div className="prose prose-lg max-w-none text-gray-900" dangerouslySetInnerHTML={{__html: currentVariation.html}} />
                              {currentVariation.visualComponents && currentVariation.visualComponents.map((vc, i) => (
                                 <div key={i}>{renderVisualComponent(vc)}</div>
                              ))}
                           </div>

                           <div className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl">
                              <span className="font-bold text-gray-500 text-sm uppercase mt-1">Answer:</span>
                              <div className="font-bold text-gray-900">{currentVariation.answer}</div>
                           </div>
                           
                           <div className="flex gap-2">
                               {currentVariation.tags.map(t => <span key={t} className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">{t}</span>)}
                           </div>
                        </div>
                     )}

                     <div className="mt-8 flex gap-3">
                        <button 
                          onClick={() => setIsEditingVariation(!isEditingVariation)} 
                          className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                        >
                           {isEditingVariation ? '取消编辑' : '手动微调'}
                        </button>
                        <button 
                          onClick={handleSaveVariation}
                          className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200"
                        >
                           保存到错题本
                        </button>
                     </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- VIEW: LIST --- */}
      {view === 'list' && !editingMistake && !showVariationPreview && (
         <div className="space-y-8 animate-in fade-in duration-500">
            {mistakes.length === 0 && !isLoading ? (
               <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                     <BookOpen className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">错题本空空如也</h3>
                  <p className="text-gray-400 mb-6">快去录入第一道错题吧，AI 帮你举一反三！</p>
                  <button onClick={() => setView('add')} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">立即录入</button>
               </div>
            ) : (
               <>
                  <div className="columns-1 md:columns-1 gap-6 space-y-6">
                     {mistakes.map(mistake => (
                        <MistakeCard 
                           key={mistake.id} 
                           mistake={mistake} 
                           onDelete={deleteMistake}
                           onReview={reviewMistake}
                           onEdit={setEditingMistake}
                           onGenerateVariation={handleGenerateVariation}
                           isGenerating={generatingVariationId === mistake.id}
                        />
                     ))}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                     <div className="flex justify-center items-center gap-4 py-8">
                        <button 
                          onClick={handlePrevPage}
                          disabled={page === 1}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                           <ChevronLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <span className="font-bold text-gray-600">
                           {page} / {totalPages}
                        </span>
                        <button 
                          onClick={handleNextPage}
                          disabled={page === totalPages}
                          className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                           <ChevronRight className="w-6 h-6 text-gray-700" />
                        </button>
                     </div>
                  )}
               </>
            )}
         </div>
      )}
    </div>
  );
};