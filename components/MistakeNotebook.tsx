
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
  Heading1
} from 'lucide-react';
import { MistakeRecord, VisualComponentData, Question, AddMistakePayload } from '../types';
import { ClockVisualizer } from './ClockVisualizer';
import { NumberLine } from './NumberLine';
import { FractionVisualizer } from './FractionVisualizer';
import { GeometryVisualizer } from './GeometryVisualizer';
import { EmojiCounter } from './EmojiCounter';

// --- CONSTANTS ---
const VISUAL_COMPONENT_INSTRUCTION = `
如果题目包含数学图形，请务必在 JSON 中返回 visualComponents 字段（这是一个数组，支持多个图形）。
支持的组件类型(type)及props参数：
1. 时钟 (clock): { "type": "clock", "props": { "hour": number(0-12), "minute": number(0-59), "label": "string" } }
2. 数轴 (numberLine): { "type": "numberLine", "props": { "min": number, "max": number, "step": number, "markedValues": [number], "label": "string" } }
3. 分数图 (fraction): { "type": "fraction", "props": { "numerator": number, "denominator": number, "mode": "pie"|"bar", "label": "string" } }
4. 几何图形 (geometry): { "type": "geometry", "props": { "shape": "rectangle"|"square"|"triangle"|"parallelogram"|"trapezoid", "width": number, "height": number, "topWidth": number(for trapezoid), "offset": number(for triangle/parallelogram), "showHeight": boolean, "labels": { "top": "string", "bottom": "string", "left": "string", "right": "string", "height": "string", "center": "string" } } }
5. 线段图 (lineSegment): { "type": "lineSegment", "props": { "total": number|null, "totalLabel": "string", "segments": [{"value": number, "label": "string", "color": "string"}], "points": [{"label": "string", "at": "start"|"end"}] } }
6. 物品计数 (emoji): { "type": "emoji", "props": { "icon": "string(emoji, e.g. 🍎, 🚗, ✏️)", "count": number, "label": "string" } }
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

// --- LOCAL COMPONENTS ---

interface LineSegmentProps {
  total?: number | null;
  totalLabel?: string;
  segments?: Array<{ value: number; label?: string; color?: string }>;
  points?: Array<{ label: string; at: 'start' | 'end' }>;
  width?: number;
  label?: string;
}

const LineSegmentVisualizerLocal: React.FC<LineSegmentProps> = ({
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
             const px = p.at === 'start' ? startX : startX + width;
             return (
                 <g key={i}>
                    <line x1={px} y1={y-5} x2={px} y2={y+25} stroke="#374151" strokeWidth="2" />
                    <text x={px} y={y-10} textAnchor="middle" className="text-xs font-bold fill-gray-800">{p.label}</text>
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

// --- COMPONENT RENDERER ---
const renderVisualComponent = (visual: VisualComponentData | undefined) => {
  if (!visual) return null;

  // SAFEGUARD
  const props = visual.props || {};

  switch (visual.type) {
    case 'clock':
      return (
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300">
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
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300 w-full overflow-x-auto">
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
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300">
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
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300">
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
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300">
            <LineSegmentVisualizerLocal 
               total={props.total}
               totalLabel={props.totalLabel}
               segments={props.segments}
               points={props.points}
               label={props.label}
            />
        </div>
      );
    case 'emoji':
      return (
        <div className="my-4 flex justify-center animate-in fade-in zoom-in duration-300">
            <EmojiCounter 
              icon={props.icon || "🍎"}
              count={props.count || 1}
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

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  label, 
  value, 
  onChange, 
  height = "h-48",
  placeholder 
}) => {
  const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');
  const [internalHtml, setInternalHtml] = useState(value);
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync internal HTML state when value prop changes externally (e.g. initial load)
  useEffect(() => {
    // Determine if we need to upgrade markdown to HTML for visual editor
    const displayHtml = simpleMarkdownToHtmlForEditor(value);
    setInternalHtml(displayHtml);
  }, [value]);

  const handleVisualChange = (newHtml: string) => {
    setInternalHtml(newHtml);
    onChange(newHtml);
  };

  const handleCodeChange = (newCode: string) => {
    setInternalHtml(newCode); // When in code mode, internal represents the raw code
    onChange(newCode);
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
               onClick={() => setEditMode('visual')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${editMode === 'visual' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Eye className="w-3 h-3" /> 可视化
             </button>
             <button 
               onClick={() => setEditMode('code')}
               className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${editMode === 'code' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
             >
                <Code className="w-3 h-3" /> 源码
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
            value={value} // Use raw value for code
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
            <textarea
            value={formData.visualComponentsJSON}
            onChange={e => setFormData({...formData, visualComponentsJSON: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs h-32 mt-2 bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </details>
      </div>
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
  onGenerateVariation: (mistake: MistakeRecord) => void;
  isGenerating?: boolean;
}

const MistakeCard: React.FC<MistakeCardProps> = ({ mistake, onDelete, onReview, onGenerateVariation, isGenerating }) => {
  const isDue = Date.now() > mistake.nextReviewAt;
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
            {isDue && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse">需复习</span>}
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded">
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
        
        // 生成更合理的错误选项，基于正确答案创建变体
        const generateDistractors = (correct: string) => {
          const distractors: string[] = [];
          
          // 如果答案是数字，生成相近的数字作为干扰项
          const num = parseInt(correct);
          if (!isNaN(num)) {
            // 生成三个不同的干扰项
            const variations = [num - 1, num + 1, num - 10, num + 10, num - 100, num + 100];
            const filtered = variations.filter(v => v !== num && !distractors.includes(v.toString()));
            for (let i = 0; i < 3 && i < filtered.length; i++) {
              distractors.push(filtered[i].toString());
            }
          }
          
          // 如果干扰项不足，使用通用干扰项
          while (distractors.length < 3) {
            const genericDistractors = [
              '这是一个干扰选项',
              '这个选项不正确',
              '请再仔细思考',
              '错误的答案',
              '不符合题意的选项'
            ];
            const randomDistractor = genericDistractors[Math.floor(Math.random() * genericDistractors.length)];
            if (!distractors.includes(randomDistractor)) {
              distractors.push(randomDistractor);
            }
          }
          
          return distractors;
        };
        
        const distractors = generateDistractors(cleanAnswer);
        
        // Create options with clean text
        const options = [
            { id: 'correct', text: cleanAnswer },
            { id: 'wrong_1', text: distractors[0] },
            { id: 'wrong_2', text: distractors[1] },
            { id: 'wrong_3', text: distractors[2] }
        ];
        
        // Shuffle options
        const shuffled = options.sort(() => Math.random() - 0.5);

        generatedQuestions.push({
            id: mistake.id,
            mistakeId: mistake.id,
            category: '复习挑战',
            title: mistake.tags.join(' / '),
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
            options: shuffled,
            correctId: 'correct',
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
          "html": "题目内容的 HTML（使用 Tailwind 类，字体大 text-2xl/3xl）。如果有可视化组件，请在 HTML 中预留位置或文字说明，组件将单独渲染。",
          "visualComponents": [
             {
                "type": "clock | numberLine | fraction | geometry | none | emoji",
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
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImageSrc(reader.result as string);
      setNewImage(null);
      setAnalyzedData([]);
      setCropRect(null);
      setRetryPrompt('');
    };
    reader.readAsDataURL(file);
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
            "html": "题目内容的 HTML（使用 Tailwind 类，字体大 text-2xl/3xl，重点数字加粗）。",
            "visualComponents": [
              {
                "type": "clock | numberLine | fraction | geometry | none | emoji",
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

  // --- PRINTING ---
  const handlePrint = () => {
    window.print();
  };

  // --- RENDERING ---

  return (
    <>
      {/* Add print-specific global styles */}
      <style>{`
        @media print {
          @page {
            margin: 2cm;
            size: A4;
          }
          body {
            background: white;
          }
        }
      `}</style>
      
      {/* MAIN CONTENT */}
      <div className="max-w-4xl mx-auto p-4 pb-24 print:hidden">
        {/* HEADER Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <BookOpen className="w-6 h-6 text-purple-600" />
               智能错题本
             </h2>
             <p className="text-gray-500 text-sm">已收录 {totalCount} 道错题，{mistakes?.filter(m => Date.now() > m.nextReviewAt).length} 道待复习</p>
          </div>
          <div className="flex gap-2">
             {view === 'list' && (
               <>
                 <button 
                    onClick={handlePrint}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl shadow-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    title="打印本页错题"
                 >
                    <Printer className="w-5 h-5" />
                    <span className="hidden md:inline">打印</span>
                 </button>
                 <button 
                    onClick={handleStartReview}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl shadow-md font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                 >
                    <Play className="w-5 h-5 fill-current" />
                    开始复习
                 </button>
               </>
             )}
             <button 
               onClick={() => setView(view === 'list' ? 'add' : 'list')}
               className={`px-4 py-2 rounded-xl shadow-md font-bold flex items-center gap-2 transition-colors ${view === 'list' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
             >
               {view === 'list' ? <><Plus className="w-5 h-5" /> 录入错题</> : '返回列表'}
             </button>
          </div>
        </div>

        {/* ERROR BANNER */}
        {storageError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {storageError}
          </div>
        )}

        {/* VIEW: ADD MISTAKE */}
        {view === 'add' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {!originalImageSrc ? (
               <div className="border-4 border-dashed border-gray-200 rounded-2xl p-12 text-center hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer relative bg-white">
                 <input 
                   ref={fileInputRef}
                   type="file" 
                   accept="image/*" 
                   // capture="environment" // REMOVED: Allow gallery selection on mobile
                   onChange={handleImageUpload} 
                   className="absolute inset-0 opacity-0 cursor-pointer"
                 />
                 <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                   <Camera className="w-10 h-10" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-800 mb-2">点击拍照或上传错题</h3>
                 <p className="text-gray-500">支持竖式、应用题、图形题</p>
               </div>
            ) : !newImage ? (
               // CROP UI
               <div className="bg-gray-900 rounded-xl overflow-hidden shadow-2xl relative select-none touch-none flex flex-col">
                 {/* HEADER BAR with INFO */}
                 <div className="bg-black/80 text-white px-4 py-3 flex justify-between items-center backdrop-blur-md shrink-0 border-b border-gray-700 z-20">
                   <div className="flex items-center gap-2">
                      <Crop className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-sm">请框选题目区域</span>
                   </div>
                   <div className="font-mono text-xs text-gray-400">
                      {cropRect && cropRect.w > 0 ? `${Math.round(cropRect.w)} × ${Math.round(cropRect.h)} px` : '拖拽创建选区'}
                   </div>
                 </div>

                 <div 
                   className="relative max-h-[70vh] overflow-hidden flex items-center justify-center bg-black/50"
                   onMouseDown={handleCropMouseDown}
                   onMouseMove={handleCropMouseMove}
                   onMouseUp={handleCropMouseUp}
                   onMouseLeave={handleCropMouseUp}
                   onTouchStart={handleCropMouseDown}
                   onTouchMove={handleCropMouseMove}
                   onTouchEnd={handleCropMouseUp}
                 >
                   <img 
                     ref={imageRef}
                     src={originalImageSrc} 
                     className="max-w-full max-h-[70vh] object-contain pointer-events-none select-none" // prevent img drag
                     alt="Original" 
                     onLoad={() => {
                       // Auto-init crop rect to center 80%? optional
                     }}
                   />
                   {/* Dim Overlay */}
                   <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                   
                   {/* Crop Box */}
                   {cropRect && cropRect.w > 0 && (
                      <div 
                        className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] group"
                        style={{
                          left: cropRect.x,
                          top: cropRect.y,
                          width: cropRect.w,
                          height: cropRect.h
                        }}
                      >
                        {/* Grid Lines */}
                        <div className="absolute inset-0 pointer-events-none opacity-40">
                           <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                           <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50"></div>
                           <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                           <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50"></div>
                        </div>

                        {/* Handles */}
                        <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-gray-400 rounded-full shadow-sm cursor-nw-resize z-20 hover:scale-125 transition-transform" />
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-400 rounded-full shadow-sm cursor-ne-resize z-20 hover:scale-125 transition-transform" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-gray-400 rounded-full shadow-sm cursor-sw-resize z-20 hover:scale-125 transition-transform" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-gray-400 rounded-full shadow-sm cursor-se-resize z-20 hover:scale-125 transition-transform" />
                        
                        {/* Move Hint */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                           <Move className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </div>
                   )}
                 </div>
                 
                 <div className="p-4 bg-gray-800 flex justify-between items-center shrink-0 border-t border-gray-700">
                    <button 
                      onClick={handleReset}
                      className="text-white hover:text-gray-300 font-bold px-4 py-2"
                    >
                      取消
                    </button>
                    <div className="flex gap-3">
                      <button 
                         onClick={() => analyzeImage(originalImageSrc)} // Skip crop
                         className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                      >
                         不剪裁直接识别
                      </button>
                      <button 
                         onClick={confirmCrop}
                         className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/50"
                      >
                         <Check className="w-5 h-5" />
                         确认剪裁
                      </button>
                    </div>
                 </div>
               </div>
            ) : (
               // ANALYSIS PREVIEW
               <div className="space-y-6">
                  <div className="flex gap-4 items-start">
                     <div className="w-1/3 bg-gray-100 rounded-xl p-2 border border-gray-200">
                        <img src={newImage} className="w-full rounded-lg shadow-sm mb-2" alt="Cropped" />
                        <button 
                          onClick={handleReCrop}
                          className="w-full py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 flex items-center justify-center gap-2"
                        >
                          <Crop className="w-4 h-4" />
                          重新剪裁
                        </button>
                     </div>
                     
                     <div className="flex-1 space-y-4">
                        {isProcessing ? (
                           <div className="h-64 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-4">
                              <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
                              <div className="text-center">
                                 <p className="font-bold text-gray-800 text-lg">AI 老师正在分析...</p>
                                 <p className="text-gray-500 text-sm">识别手写字迹 • 解析算理 • 提取图形</p>
                              </div>
                           </div>
                        ) : analyzedData.length > 0 ? (
                           <div className="space-y-4">
                              {analyzedData.map((data, idx) => (
                                 <div key={idx} className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
                                    <div className="bg-purple-50 px-4 py-2 border-b border-purple-100 flex justify-between items-center">
                                       <span className="font-bold text-purple-700 text-sm">识别结果 {analyzedData.length > 1 ? `#${idx+1}` : ''}</span>
                                       {editingAnalysisIndex !== idx && (
                                          <button 
                                            onClick={() => setEditingAnalysisIndex(idx)}
                                            className="text-purple-600 hover:text-purple-800 hover:bg-purple-100 p-1.5 rounded transition-colors"
                                            title="手动编辑"
                                          >
                                            <Edit className="w-4 h-4" />
                                          </button>
                                       )}
                                    </div>
                                    
                                    {editingAnalysisIndex === idx ? (
                                        <MistakeEditor 
                                          data={data}
                                          onSave={(updatedData) => handleSaveAnalysisUpdate(idx, updatedData)}
                                          onCancel={() => setEditingAnalysisIndex(null)}
                                        />
                                    ) : (
                                        <div className="p-6">
                                           <div 
                                             className="prose max-w-none text-gray-900 mb-4 text-xl"
                                             dangerouslySetInnerHTML={{__html: data.html}} 
                                           />
                                           {data.visualComponents && data.visualComponents.map((vc, i) => (
                                              <div key={i}>{renderVisualComponent(vc)}</div>
                                           ))}
                                           <div className="bg-green-50 p-4 rounded-lg border border-green-100 text-sm text-gray-700">
                                              <div className="font-bold text-green-800 mb-1 flex items-center gap-2">
                                                <span>Answer:</span>
                                                <MarkdownRenderer content={data.answer} />
                                              </div>
                                              <div><MarkdownRenderer content={data.explanation} /></div>
                                           </div>
                                        </div>
                                    )}
                                 </div>
                              ))}
                              
                              {/* REGENERATE SECTION */}
                              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                 <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                   <AlertTriangle className="w-4 h-4 text-orange-500" />
                                   识别不准确？
                                 </h4>
                                 <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      value={retryPrompt}
                                      onChange={(e) => setRetryPrompt(e.target.value)}
                                      placeholder="输入提示，例如：'这是除法不是加法' 或 '数字是 15'"
                                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                    <button 
                                      onClick={() => analyzeImage(newImage, retryPrompt)}
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-sm whitespace-nowrap"
                                    >
                                      重新生成
                                    </button>
                                 </div>
                              </div>

                              <div className="flex gap-3 pt-2">
                                 <button 
                                   onClick={handleReset}
                                   className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                 >
                                   放弃
                                 </button>
                                 <button 
                                   onClick={saveNewMistake}
                                   className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center justify-center gap-2"
                                 >
                                   <CheckCircle2 className="w-5 h-5" />
                                   确认并保存错题
                                 </button>
                              </div>
                           </div>
                        ) : (
                           <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 text-center">
                              识别失败，请尝试重新剪裁或上传更清晰的图片。
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            )}
          </div>
        )}

        {/* VIEW: LIST */}
        {view === 'list' && (
          <div className="space-y-6">
             {isLoading && mistakes?.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                  <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" />
                  加载中...
                </div>
             ) : mistakes?.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
                   <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-10 h-10 text-gray-400" />
                   </div>
                   <h3 className="text-xl font-bold text-gray-800 mb-2">错题本是空的</h3>
                   <p className="text-gray-500 mb-6">快去录入第一道错题吧，AI 帮你分析！</p>
                   <button 
                     onClick={() => setView('add')}
                     className="px-6 py-3 bg-blue-600 text-white font-bold rounded-full shadow-lg hover:bg-blue-700 transition-transform hover:scale-105"
                   >
                     立即录入
                   </button>
                </div>
             ) : (
               <>
                 <div className="grid gap-6">
                   {mistakes?.map(mistake => (
                     <MistakeCard 
                       key={mistake.id} 
                       mistake={mistake} 
                       onDelete={deleteMistake}
                       onReview={reviewMistake}
                       onGenerateVariation={handleGenerateVariation}
                       isGenerating={generatingVariationId === mistake.id}
                     />
                   ))}
                 </div>
                 
                 {/* PAGINATION */}
                 {totalPages > 1 && setPage && (
                   <div className="flex items-center justify-center gap-4 mt-8">
                      <button 
                         onClick={() => setPage(Math.max(1, page - 1))}
                         disabled={page === 1 || isLoading}
                         className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 border border-gray-200 bg-white"
                      >
                         <ChevronLeft className="w-5 h-5" />
                      </button>
                      
                      <span className="text-sm font-bold text-gray-600">
                         第 {page} 页 / 共 {totalPages} 页
                      </span>

                      <button 
                         onClick={() => setPage(Math.min(totalPages, page + 1))}
                         disabled={page === totalPages || isLoading}
                         className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 border border-gray-200 bg-white"
                      >
                         <ChevronRight className="w-5 h-5" />
                      </button>
                   </div>
                 )}
               </>
             )}
          </div>
        )}

        {/* MODAL: VARIATION PREVIEW */}
        {showVariationPreview && currentVariation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white shrink-0">
                   <h3 className="font-bold text-lg flex items-center gap-2">
                      <Wand2 className="w-5 h-5" />
                      AI 生成变式练习
                   </h3>
                   <div className="flex items-center gap-2">
                     {!isEditingVariation && (
                       <button onClick={() => setIsEditingVariation(true)} className="hover:bg-white/20 p-1.5 rounded-full transition-colors" title="编辑题目">
                         <Edit className="w-5 h-5" />
                       </button>
                     )}
                     <button onClick={() => setShowVariationPreview(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                        <XCircle className="w-6 h-6" />
                     </button>
                   </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                   {isEditingVariation ? (
                      <MistakeEditor 
                        data={currentVariation}
                        onSave={handleSaveVariationUpdate}
                        onCancel={() => setIsEditingVariation(false)}
                      />
                   ) : (
                     <>
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
                          <div className="flex gap-2 mb-4">
                             {currentVariation.tags.map(t => (
                                <span key={t} className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded border border-purple-100">{t}</span>
                             ))}
                          </div>
                          <div 
                             className="prose max-w-none text-gray-900 text-xl"
                             dangerouslySetInnerHTML={{__html: currentVariation.html}} 
                          />
                          {currentVariation.visualComponents && currentVariation.visualComponents.map((vc, i) => (
                             <div key={i}>{renderVisualComponent(vc)}</div>
                          ))}
                       </div>

                       <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                          <div className="font-bold text-green-800 mb-2 text-sm uppercase tracking-wide">参考答案</div>
                          <div className="text-gray-900 font-medium mb-3">
                            <MarkdownRenderer content={currentVariation.answer} />
                          </div>
                          <div className="text-sm text-gray-600">
                            <MarkdownRenderer content={currentVariation.explanation} />
                          </div>
                       </div>
                     </>
                   )}
                </div>

                {!isEditingVariation && (
                  <div className="p-4 bg-white border-t border-gray-200 flex justify-end gap-3 shrink-0">
                     <button 
                       onClick={() => setShowVariationPreview(false)}
                       className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors"
                     >
                       取消
                     </button>
                     <button 
                       onClick={handleSaveVariation}
                       className="px-6 py-2.5 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-200 transition-colors flex items-center gap-2"
                     >
                       <Save className="w-4 h-4" />
                       保存到错题本
                     </button>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>

      {/* PRINT VIEW (HIDDEN ON SCREEN) */}
      <div className="hidden print:block bg-white text-black p-8">
         <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h1 className="text-3xl font-bold mb-2">智能错题本 - 复习卷</h1>
            <p className="text-sm text-gray-500">生成时间：{new Date().toLocaleDateString()}</p>
         </div>
         
         {mistakes?.length === 0 ? (
            <div className="text-center text-gray-500">没有错题可打印</div>
         ) : (
            mistakes.map((m, i) => (
               <div key={m.id} className="mb-8 break-inside-avoid border-b border-dashed border-gray-300 pb-6">
                  <div className="flex justify-between items-start mb-4">
                     <div className="flex items-center gap-2">
                        <span className="text-xl font-bold mr-2">{i + 1}.</span>
                        <div className="flex gap-2">
                           {m.tags.map(t => (
                              <span key={t} className="text-xs font-bold border border-gray-400 px-2 py-0.5 rounded">{t}</span>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  {/* Content */}
                  <div className="pl-8 mb-6">
                     <div 
                        className="prose prose-lg max-w-none text-black mb-4" 
                        dangerouslySetInnerHTML={{__html: m.htmlContent}} 
                     />
                     {m.visualComponents && m.visualComponents.map((vc, idx) => (
                        <div key={idx} className="my-4 border-none">
                           {renderVisualComponent(vc)}
                        </div>
                     ))}

                  </div>

                  {/* Space for working out */}
                  <div className="h-32"></div>
               </div>
            ))
         )}
      </div>
    </>
  );
};
