import React, { useState, useRef } from 'react';
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
  XCircle
} from 'lucide-react';
import { MistakeRecord, VisualComponentData, Question } from '../types';
import { ClockVisualizer } from './ClockVisualizer';
import { NumberLine } from './NumberLine';
import { FractionVisualizer } from './FractionVisualizer';
import { GeometryVisualizer } from './GeometryVisualizer';

// --- HELPER: Markdown Renderer ---
const renderMarkdown = (text: string) => {
  if (!text) return null;
  
  return text.split('\n').map((line, index) => {
    const isList = line.trim().match(/^(\d+\.|-|\*)\s/);
    const cleanLine = line.replace(/^(\d+\.|-|\*)\s/, '');
    
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
    const renderedParts = parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900 bg-yellow-50 px-1 rounded">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isList) {
      return (
        <div key={index} className="flex gap-2 mb-1 ml-2">
           <span className="font-bold text-blue-500 select-none">•</span>
           <div className="leading-relaxed text-gray-700">{renderedParts}</div>
        </div>
      );
    }

    return (
      <div key={index} className={`leading-relaxed text-gray-700 ${line.trim() === '' ? 'h-2' : 'mb-1'}`}>
        {renderedParts}
      </div>
    );
  });
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
    default:
      return null;
  }
};

// --- COMPONENTS ---

interface MistakeCardProps {
  mistake: MistakeRecord;
  onDelete: (id: string) => void;
  onReview: (id: string, success: boolean) => void;
  onGenerateVariation: (mistake: MistakeRecord) => void;
}

const MistakeCard: React.FC<MistakeCardProps> = ({ mistake, onDelete, onReview, onGenerateVariation }) => {
  const isDue = Date.now() > mistake.nextReviewAt;
  const [showAnswer, setShowAnswer] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-lg">
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
         <div className="flex gap-2">
           {mistake.tags.map(t => (
             <span key={t} className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">{t}</span>
           ))}
         </div>
         <div className="flex items-center gap-3">
            {isDue && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold animate-pulse">需复习</span>}
            <button onClick={() => onDelete(mistake.id)} className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 rounded">
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
                  {mistake.visualComponent && (
                    <div className="w-full border-t border-dashed border-gray-200 pt-4">
                      {renderVisualComponent(mistake.visualComponent)}
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
                      <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded uppercase tracking-wider mt-1">Answer</span>
                      <div className="flex-1 text-gray-900">{renderMarkdown(mistake.answer)}</div>
                    </div>
                    <div className="text-sm bg-white p-4 rounded-lg border border-green-100/50 text-gray-700 leading-relaxed shadow-sm">
                      {renderMarkdown(mistake.explanation)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                     <button onClick={() => onReview(mistake.id, false)} className="py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-base font-bold hover:bg-red-100 hover:shadow-sm transition-all">如果不熟练</button>
                     <button onClick={() => onReview(mistake.id, true)} className="py-3 bg-green-50 text-green-600 border border-green-100 rounded-xl text-base font-bold hover:bg-green-100 hover:shadow-sm transition-all">已掌握</button>
                  </div>

                  <button 
                     onClick={() => onGenerateVariation(mistake)}
                     className="w-full py-3 border-2 border-purple-100 text-purple-600 bg-white rounded-xl text-base font-bold hover:bg-purple-50 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Wand2 className="w-5 h-5" />
                    AI 生成变式练习
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
  addMistake: (record: Omit<MistakeRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  deleteMistake: (id: string) => void;
  reviewMistake: (id: string, success: boolean) => void;
  onStartReview: (questions: Question[]) => void;
}

export const MistakeNotebook: React.FC<MistakeNotebookProps> = ({ 
  mistakes, 
  storageError, 
  isLoading, 
  addMistake, 
  deleteMistake, 
  reviewMistake,
  onStartReview
}) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New entry state
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [newImage, setNewImage] = useState<string | null>(null);
  const [analyzedData, setAnalyzedData] = useState<Array<{html: string, answer: string, explanation: string, tags: string[], visualComponent?: VisualComponentData}>>([]);
  const [retryPrompt, setRetryPrompt] = useState('');
  
  // Variation preview state
  const [showVariationPreview, setShowVariationPreview] = useState(false);
  const [currentVariation, setCurrentVariation] = useState<{html: string, answer: string, explanation: string, tags: string[], visualComponent?: VisualComponentData} | null>(null);
  const [currentOriginalMistake, setCurrentOriginalMistake] = useState<MistakeRecord | null>(null);

  // Cropping State
  const [cropRect, setCropRect] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // --- REVIEW QUIZ GENERATION ---
  const handleStartReview = async () => {
    // 1. Filter due mistakes
    const dueMistakes = mistakes.filter(m => Date.now() > m.nextReviewAt).slice(0, 5); 
    if (dueMistakes.length === 0) {
      alert("当前没有需要复习的错题！");
      return;
    }

    setIsProcessing(true);
    try {
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
                  {mistake.visualComponent && (
                    <div className="w-full border-t border-dashed border-gray-200 pt-4">
                      {renderVisualComponent(mistake.visualComponent)}
                    </div>
                  )}
                </div>
            ),
            options: shuffled,
            correctId: 'correct',
            explanation: renderMarkdown(mistake.explanation),
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
  };
  
  const setFile = (f: any) => { if(fileInputRef.current) fileInputRef.current.value = '' };

  const handleReCrop = () => {
    setNewImage(null);
    setAnalyzedData([]);
    setRetryPrompt('');
  };

  // ... (Cropping logic unchanged)
  const getClientPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if ('touches' in e) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
  };

  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const pos = getClientPos(e);
    const x = pos.x - rect.left;
    const y = pos.y - rect.top;
    setStartPos({x, y});
    setIsDragging(true);
    setCropRect({x, y, w: 0, h: 0});
  };

  const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !startPos || !imageRef.current) return;
    e.preventDefault();
    const rect = imageRef.current.getBoundingClientRect();
    const pos = getClientPos(e);
    const currentX = pos.x - rect.left;
    const currentY = pos.y - rect.top;
    let x = Math.min(currentX, startPos.x);
    let y = Math.min(currentY, startPos.y);
    let w = Math.abs(currentX - startPos.x);
    let h = Math.abs(currentY - startPos.y);
    x = Math.max(0, x);
    y = Math.max(0, y);
    if (x + w > rect.width) w = rect.width - x;
    if (y + h > rect.height) h = rect.height - y;
    setCropRect({x, y, w, h});
  };

  const handleCropMouseUp = () => setIsDragging(false);

  const confirmCrop = () => {
    if (!imageRef.current || !originalImageSrc) return;
    if (!cropRect || cropRect.w < 20 || cropRect.h < 20) {
      analyzeImage(originalImageSrc);
      return;
    }
    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    canvas.width = cropRect.w * scaleX;
    canvas.height = cropRect.h * scaleY;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    ctx.drawImage(img, cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 0, 0, canvas.width, canvas.height);
    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.7);
    analyzeImage(croppedBase64);
  };

  const skipCrop = () => {
    if (originalImageSrc) analyzeImage(originalImageSrc);
  };
  // ... (End Cropping logic)

  // --- AI Logic ---
  const analyzeImage = async (base64String: string, customInstruction?: string) => {
    setNewImage(base64String);
    setIsProcessing(true);
    try {
      const base64Data = base64String.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
             { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
             { text: `
             请你扮演一位小学数学老师。分析这张图片中的数学题。
             ${customInstruction ? `
用户特别补充说明（请根据此修正识别结果）：${customInstruction}
` : ''}
              
             注意：本系统支持本地渲染高保真数学组件。如果图片中包含以下数学模型，请不要尝试用HTML画图，而是返回对应的组件数据：
             1. **钟表/时间**: visual type 'clock'
             2. **数轴**: visual type 'numberLine'
             3. **分数**: visual type 'fraction'
             4. **几何图形**: visual type 'geometry'
              
             请返回一个纯 JSON 数组，包含以下字段：
             1. "html": HTML代码片段展示题目文字。字体大小：text-3xl，普通文字 text-lg。字体颜色：text-gray-900。
             2. "answer": 正确答案。
             3. "explanation": 中文 Markdown 解析。
             4. "tags": 2-3个中文标签。
             5. "visualComponent": (可选) 组件数据。格式：{ type: "clock", props: { hour: 7, minute: 30 } }。注意 props 字段必须存在。
             ` }
          ]
        },
        config: { responseMimeType: 'application/json' }
      });

      const text = response.text;
      if (text) {
        const data = JSON.parse(text);
        // Ensure data is an array
        const questions = Array.isArray(data) ? data : [data];
        setAnalyzedData(questions);
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("图片解析失败，请重试");
      setAnalyzedData([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateVariation = async (original: MistakeRecord) => {
    setIsProcessing(true);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `
        请生成一道新的**变式练习题**。
        原题 HTML: ${original.htmlContent}
        原题组件数据: ${JSON.stringify(original.visualComponent)}
        原题解析: ${original.explanation}
        
        要求：
        1. 考察相同的核心素养，但改变情境或数字。
        2. 返回 JSON: html, visual (可选), answer, explanation, tags。
        `,
        config: { responseMimeType: 'application/json' }
      });
      
      const textResponse = response.text || '{}';
      console.log('AI Response:', textResponse);
      
      const parsedData = JSON.parse(textResponse);
      // Handle both array and single object responses
      const data = Array.isArray(parsedData) ? parsedData[0] : parsedData;
      
      // Validate required fields
      if (!data.html || !data.answer || !data.explanation) {
        throw new Error('AI response missing required fields');
      }
      
      // Set the generated variation for preview
      setCurrentVariation({
        html: data.html,
        answer: data.answer,
        explanation: data.explanation,
        tags: [...(data.tags || []), '变式'],
        visualComponent: data.visual
      });
      
      // Store the original mistake reference
      setCurrentOriginalMistake(original);
      
      // Show the preview modal
      setShowVariationPreview(true);
      console.log('Preview modal shown successfully');
    } catch (e) {
      console.error('Error generating variation:', e);
      alert(`生成失败，请稍后重试：${e instanceof Error ? e.message : '未知错误'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const regenerateVariation = async () => {
    if (!currentOriginalMistake) return;
    await generateVariation(currentOriginalMistake);
  };
  
  const saveVariation = async () => {
    if (!currentVariation || !currentOriginalMistake) return;
    
    setIsProcessing(true);
    try {
      // Create the request data in the format expected by the backend
      const requestData = {
        originalImage: {
          url: currentOriginalMistake.imageData || '',
          fileId: `local-${Date.now()}` // Generate a temporary fileId
        },
        mistakes: [{
          html: currentVariation.html,
          answer: currentVariation.answer,
          explanation: currentVariation.explanation,
          tags: currentVariation.tags,
          originalMistakeId: currentOriginalMistake.id // Add the association
        }]
      };
      
      await addMistake(requestData);
      
      // Close the preview modal immediately
      setShowVariationPreview(false);
      setCurrentVariation(null);
      setCurrentOriginalMistake(null);
      
      // Switch to list view immediately
      setView('list');
      
      // Show success message after view update
      setTimeout(() => {
        alert("🎉 变式题目已保存！");
      }, 100);
    } catch (e) {
      console.error("保存变式失败:", e);
      alert("保存失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const closeVariationPreview = () => {
    setShowVariationPreview(false);
    setCurrentVariation(null);
    setCurrentOriginalMistake(null);
  };

  const saveNewMistake = async () => {
    if (analyzedData.length === 0) return;
    
    setIsProcessing(true);
    try {
      // 发送所有错题数据到后端
      const requestData = {
        originalImage: {
          url: newImage || '',
          fileId: `local-${Date.now()}` // 生成一个临时fileId
        },
        mistakes: analyzedData.map(data => ({
          html: data.html,
          answer: data.answer,
          explanation: data.explanation,
          tags: data.tags || []
        }))
      };
      
      await addMistake(requestData);
      
      // Reset View and switch to list immediately
      setOriginalImageSrc(null);
      setNewImage(null);
      setAnalyzedData([]);
      setRetryPrompt('');
      setView('list');
      
      // Show success message after view update
      setTimeout(() => {
        alert("🎉 错题添加成功！");
      }, 100);
    } catch (error) {
      console.error("保存错题失败:", error);
      alert("保存错题失败，请重试");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Render ---
  const dueCount = mistakes.filter(m => Date.now() > m.nextReviewAt).length;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
      {/* Storage Alert */}
      {storageError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">数据保存警告</p>
            <p className="text-sm text-red-600">{storageError}</p>
          </div>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 mb-1">我的智能错题本</h2>
           <p className="text-gray-500 font-medium">
             已收录 <span className="text-purple-600 font-bold">{mistakes.length}</span> 道错题
           </p>
        </div>
        <button 
          onClick={() => {
             setView(view === 'add' ? 'list' : 'add');
             if (view === 'list') {
               handleReset();
             }
          }}
          className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 shadow-md ${view === 'add' ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50' : 'bg-purple-600 text-white hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5'}`}
        >
          {view === 'add' ? <ChevronUp className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {view === 'add' ? '返回列表' : '录入新错题'}
        </button>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-purple-100">
            <RefreshCw className="w-10 h-10 text-purple-600 animate-spin" />
            <span className="font-bold text-xl text-gray-800">AI 老师正在思考中...</span>
          </div>
        </div>
      )}
      
      {/* Variation Preview Modal */}
      {showVariationPreview && currentVariation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-purple-600 text-white px-8 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Wand2 className="w-6 h-6" />
                变式练习预览
              </h3>
              <button 
                onClick={closeVariationPreview}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-8">
              {/* Original Mistake Reference */}
              <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
                <p className="font-bold text-blue-800 flex items-center gap-2 text-sm mb-2">
                  <BookOpen className="w-4 h-4" />
                  基于原题：{currentOriginalMistake?.tags.join(' / ') || '未知'}
                </p>
                <div className="text-xs text-blue-600">
                  点击关闭可重新生成，满意后点击保存
                </div>
              </div>
              
              {/* Generated Variation */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
                <div className="w-full break-words prose prose-lg max-w-none text-gray-900 mb-4" dangerouslySetInnerHTML={{__html: currentVariation.html}} />
                {currentVariation.visualComponent && (
                  <div className="w-full border-t border-dashed border-gray-200 pt-4">
                    {renderVisualComponent(currentVariation.visualComponent)}
                  </div>
                )}
                <div className="mt-4">
                  <div className="flex gap-2 flex-wrap">
                    {currentVariation.tags.map(t => (
                      <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold border border-gray-200">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Answer and Explanation */}
              <div className="bg-green-50 p-5 rounded-xl border border-green-100 mb-8 shadow-sm">
                <div className="font-bold text-green-900 text-lg mb-3 flex items-start gap-2 border-b border-green-200/50 pb-2">
                  <span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded uppercase tracking-wider mt-1">Answer</span>
                  <div className="flex-1 text-gray-900">{renderMarkdown(currentVariation.answer)}</div>
                </div>
                <div className="text-sm bg-white p-4 rounded-lg border border-green-100/50 text-gray-700 leading-relaxed shadow-sm">
                  {renderMarkdown(currentVariation.explanation)}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={regenerateVariation}
                  className="flex-1 py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl text-base font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  重新生成
                </button>
                <button 
                  onClick={saveVariation}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-base font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  保存到错题本
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        {view === 'list' && (
           <>
             {/* Review Task Card */}
             {dueCount > 0 && (
               <div className="bg-gradient-to-r from-orange-400 to-pink-500 rounded-2xl p-6 text-white shadow-lg mb-8 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                     <div>
                       <h3 className="text-2xl font-bold mb-1 flex items-center gap-2">
                         <BrainCircuit className="w-6 h-6" />
                         今日复习任务
                       </h3>
                       <p className="text-orange-50 opacity-90">
                         有 <span className="text-2xl font-bold bg-white/20 px-2 rounded">{dueCount}</span> 道错题需要巩固
                       </p>
                     </div>
                     <button 
                       onClick={handleStartReview}
                       className="bg-white text-orange-600 px-8 py-3 rounded-xl font-bold hover:bg-orange-50 transition-colors shadow-sm flex items-center gap-2"
                     >
                       <Play className="w-5 h-5 fill-current" />
                       开始闯关
                     </button>
                  </div>
                  <div className="absolute -right-10 -bottom-10 opacity-20 transform rotate-12">
                    <BookOpen className="w-40 h-40" />
                  </div>
               </div>
             )}
             
             {/* Mistake List */}
             <div className="space-y-6">
                {mistakes.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="inline-flex p-6 bg-gray-50 rounded-full mb-6"><BookOpen className="w-12 h-12 text-gray-300" /></div>
                    <h3 className="text-xl font-bold text-gray-400 mb-2">错题本空空如也</h3>
                    <p className="text-gray-400">点击右上角“录入新错题”开始积累吧！</p>
                  </div>
                ) : (
                  mistakes.sort((a,b) => a.nextReviewAt - b.nextReviewAt).map(mistake => (
                    <MistakeCard 
                       key={mistake.id}
                       mistake={mistake}
                       onDelete={deleteMistake}
                       onReview={reviewMistake}
                       onGenerateVariation={generateVariation}
                    />
                  ))
                )}
             </div>
           </>
        )}

        {view === 'add' && (
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
              {/* Reuse existing Add Mistake UI (Simplified for brevity as it's largely same structure) */}
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-800">
                <div className="p-2 bg-purple-100 rounded-lg"><Camera className="w-6 h-6 text-purple-600" /></div>
                录入新错题
              </h3>
              
              {!originalImageSrc && !newImage && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-gray-300 rounded-2xl h-80 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 hover:border-purple-400 transition-all group"
                >
                  <div className="p-4 bg-gray-100 rounded-full mb-4 group-hover:bg-purple-200 transition-colors">
                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-purple-600" />
                  </div>
                  <span className="text-lg text-gray-600 font-bold group-hover:text-purple-700">点击拍照或上传图片</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
              )}

              {/* Cropping UI (Same as previous) */}
              {originalImageSrc && !newImage && (
                <div className="flex flex-col gap-4">
                   <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                     <div className="flex items-center gap-2 text-gray-700 font-bold"><Crop className="w-5 h-5" />请拖动框选题目区域</div>
                     <div className="flex gap-2">
                        <button onClick={skipCrop} className="px-4 py-2 text-gray-500 font-medium hover:bg-gray-200 rounded-lg">不剪裁</button>
                        <button onClick={confirmCrop} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2"><Check className="w-4 h-4" />确认剪裁</button>
                     </div>
                   </div>
                   <div 
                     className="relative w-full bg-gray-900 rounded-lg overflow-hidden select-none touch-none"
                     onMouseDown={handleCropMouseDown} onMouseMove={handleCropMouseMove} onMouseUp={handleCropMouseUp} onMouseLeave={handleCropMouseUp}
                     onTouchStart={handleCropMouseDown} onTouchMove={handleCropMouseMove} onTouchEnd={handleCropMouseUp}
                   >
                     <img ref={imageRef} src={originalImageSrc} alt="Crop Source" className="w-full h-auto block pointer-events-none" />
                     {cropRect && cropRect.w > 0 && (
                       <div className="absolute pointer-events-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" style={{left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h }}></div>
                     )}
                   </div>
                </div>
              )}

              {newImage && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row gap-6">
                     <div className="w-full md:w-1/3 flex flex-col gap-4">
                       <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 relative group">
                         <img src={newImage} alt="Uploaded" className="w-full h-full object-contain" />
                         <button onClick={handleReset} className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity" title="重新上传"><Trash2 className="w-4 h-4" /></button>
                       </div>
                       
                       <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
                          <p className="font-bold text-amber-800 mb-2 flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4" /> 识别不准确？
                          </p>
                          <div className="flex flex-col gap-2">
                            <textarea 
                              value={retryPrompt}
                              onChange={e => setRetryPrompt(e.target.value)}
                              placeholder="例如：这是除法不是乘法，或者数字是25..."
                              className="w-full p-2 text-sm border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white text-gray-800"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button 
                                onClick={() => analyzeImage(newImage!, retryPrompt)}
                                disabled={isProcessing}
                                className="flex-1 px-3 py-2 bg-amber-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-1 disabled:bg-gray-400"
                              >
                                {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                重新生成
                              </button>
                              <button 
                                onClick={handleReCrop}
                                disabled={isProcessing}
                                className="px-3 py-2 bg-white text-amber-700 border border-amber-300 text-xs md:text-sm font-bold rounded-lg hover:bg-amber-50 transition-colors flex items-center justify-center gap-1"
                              >
                                <Crop className="w-3 h-3" /> 调整
                              </button>
                            </div>
                          </div>
                       </div>
                     </div>
                     
                     <div className="flex-1">
                       {analyzedData.length > 0 ? (
                         <div className="flex flex-col h-full gap-4">
                           <div className="flex-1 bg-white border-2 border-green-100 rounded-xl p-0 shadow-sm relative overflow-auto max-h-[400px]">
                             <div className="absolute top-0 left-0 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-br-lg z-10">识别结果预览</div>
                             <div className="p-6">
                               <h4 className="text-lg font-bold text-gray-800 mb-4">共识别到 {analyzedData.length} 道题目</h4>
                               <div className="space-y-6">
                                 {analyzedData.map((data, index) => (
                                   <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                                     <div className="mb-2 flex items-center gap-2">
                                       <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded">题目 {index + 1}</span>
                                     </div>
                                     <div className="w-full break-words prose prose-lg max-w-none text-gray-900 mb-4" dangerouslySetInnerHTML={{__html: data.html}} />
                                     {data.visualComponent && (
                                       <div className="w-full border-t border-dashed border-gray-200 pt-4">
                                         <span className="text-xs text-gray-400 block mb-2 text-center">- 生成的数学组件 -</span>
                                         {renderVisualComponent(data.visualComponent)}
                                       </div>
                                     )}
                                     <div className="mt-2">
                                       <div className="flex gap-2 flex-wrap">
                                         {data.tags.map(t => (
                                           <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold border border-gray-200">{t}</span>
                                         ))}
                                       </div>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           </div>
                         </div>
                       ) : null}
                     </div>
                  </div>
                  <button onClick={saveNewMistake} disabled={analyzedData.length === 0} className="w-full py-4 bg-purple-600 text-white font-bold text-lg rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-md">确认添加到错题本</button>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
};
