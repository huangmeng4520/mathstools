
import React, { useState, useEffect } from 'react';
import { QUESTIONS } from './constants';
import { QuizState, Question, ReviewResult, User } from './types';
import { MistakeNotebook } from './components/MistakeNotebook';
import { AuthScreen } from './components/AuthScreen';
import { useMistakeManager } from './useMistakeManager';
import { auth } from './services/api';
import { 
  ChevronRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Award,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Calculator,
  Trophy,
  Loader2,
  LogOut
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Auth Check ---
  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await auth.getProfile();
      setUser(currentUser);
      setAuthLoading(false);
    };
    checkUser();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    // 移除window.location.reload()调用，避免页面刷新
    // useMistakeManager会在user状态变化时自动重新获取数据
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  const [appMode, setAppMode] = useState<'quiz' | 'notebook' | 'review-game'>('notebook');
  
  // --- Global Mistake State ---
  // Only load if user is authenticated
  const mistakeManager = useMistakeManager();

  // --- Quiz State ---
  const [gameState, setGameState] = useState<QuizState>(QuizState.START);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  
  // Review Game Specifics
  const [reviewQuestions, setReviewQuestions] = useState<Question[]>([]);
  const [reviewResults, setReviewResults] = useState<ReviewResult[]>([]);

  // Derived
  const activeQuestions = appMode === 'review-game' ? reviewQuestions : QUESTIONS;
  const currentQuestion = activeQuestions[currentQIndex];

  // --- Handlers ---

  const handleStart = () => {
    setGameState(QuizState.PLAYING);
    setCurrentQIndex(0);
    setScore(0);
    resetQuestionState();
  };

  const handleStartReviewGame = (questions: Question[]) => {
    setReviewQuestions(questions);
    setReviewResults([]);
    setAppMode('review-game');
    setGameState(QuizState.PLAYING);
    setCurrentQIndex(0);
    setScore(0);
    resetQuestionState();
  };

  const resetQuestionState = () => {
    setSelectedOption(null);
    setIsCorrect(null);
  };

  const handleOptionSelect = (optionId: string) => {
    if (isCorrect !== null) return; 
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (!selectedOption) return;
    
    const correct = selectedOption === currentQuestion.correctId;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    if (appMode === 'review-game' && currentQuestion.mistakeId) {
      setReviewResults(prev => [...prev, {
        mistakeId: currentQuestion.mistakeId!,
        success: correct
      }]);
    }
  };

  const handleNext = () => {
    if (currentQIndex < activeQuestions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      resetQuestionState();
    } else {
      setGameState(QuizState.COMPLETED);
      if (appMode === 'review-game') {
        finishReviewSession();
      }
    }
  };

  const finishReviewSession = () => {
    reviewResults.forEach(res => {
      mistakeManager.reviewMistake(res.mistakeId, res.success);
    });
  };

  const progressPercent = ((currentQIndex) / activeQuestions.length) * 100;

  // --- Renderers ---

  const renderStartScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-400 to-indigo-600 text-white">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl text-center max-w-lg w-full border border-white/20">
        <Award className="w-20 h-20 mx-auto mb-6 text-yellow-300 drop-shadow-lg" />
        <h1 className="text-4xl font-bold mb-4">竖式算理大闯关</h1>
        <p className="text-xl mb-8 text-blue-100">
          通过 4 个关卡，彻底搞懂竖式计算背后的秘密！
        </p>
        <button 
          onClick={handleStart}
          className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-indigo-600 bg-white rounded-full overflow-hidden transition-transform active:scale-95 hover:shadow-lg"
        >
          <span className="mr-2">开始挑战</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );

  const renderCompletedScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-400 to-emerald-600 text-white">
      <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full">
        <div className="mb-6 inline-flex p-4 rounded-full bg-green-100">
          <Award className="w-16 h-16 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold mb-2">
           {appMode === 'review-game' ? '复习完成！' : '挑战完成！'}
        </h2>
        <p className="text-gray-600 mb-6">
          你的得分：<span className="text-2xl font-bold text-green-600">{score}</span> / {activeQuestions.length}
        </p>
        
        {appMode === 'review-game' && (
           <div className="bg-purple-50 p-6 rounded-xl text-left mb-8 border border-purple-200">
             <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-purple-800">
               <Trophy className="w-5 h-5 text-purple-600" />
               智能复习报告
             </h3>
             <p className="text-gray-700 text-sm mb-2">
               本次复习了 {activeQuestions.length} 道错题。系统正在后台更新您的记忆曲线。
             </p>
           </div>
        )}

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => {
              if (appMode === 'review-game') {
                 setAppMode('notebook');
              } else {
                 handleStart();
              }
            }}
            className="w-full py-4 rounded-xl bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            {appMode === 'review-game' ? '返回错题本' : '再玩一次'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderGameScreen = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              {currentQuestion.category}
            </span>
            <span className="text-sm font-bold text-blue-600">
              第 {currentQIndex + 1} / {activeQuestions.length} 题
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 pb-64 overflow-visible">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 text-center">
          {currentQuestion.title}
        </h2>

        <div className="mb-8 flex justify-center">
          {currentQuestion.content}
        </div>

        <div className="space-y-6 overflow-visible mb-8">
          {currentQuestion.options.map((opt) => {
            let stateClass = "border-gray-200 hover:border-blue-400 hover:bg-blue-50";
            
            if (selectedOption === opt.id) {
              stateClass = "border-blue-500 bg-blue-100 ring-2 ring-blue-200";
              if (isCorrect !== null) {
                if (opt.id === currentQuestion.correctId) {
                  stateClass = "border-green-500 bg-green-100 ring-2 ring-green-200";
                } else {
                  stateClass = "border-red-500 bg-red-100 ring-2 ring-red-200";
                }
              }
            } else if (isCorrect !== null && opt.id === currentQuestion.correctId) {
               stateClass = "border-green-500 bg-green-50 border-dashed";
            }

            return (
              <button
                key={opt.id}
                onClick={() => handleOptionSelect(opt.id)}
                disabled={isCorrect !== null}
                className={`w-full p-6 text-left rounded-xl border-2 transition-all duration-200 flex flex-col items-start justify-start group ${stateClass} overflow-visible`}
                style={{ minHeight: '80px' }}
              >
                <span className="font-medium text-gray-800 break-words w-full">{opt.text}</span>
                {selectedOption === opt.id && isCorrect === null && (
                   <div className="mt-2 w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                )}
                {isCorrect !== null && opt.id === currentQuestion.correctId && (
                   <div className="mt-2 w-6 h-6 text-green-600">
                     <CheckCircle2 className="w-full h-full" />
                   </div>
                )}
                 {isCorrect !== null && selectedOption === opt.id && opt.id !== currentQuestion.correctId && (
                   <div className="mt-2 w-6 h-6 text-red-600">
                     <XCircle className="w-full h-full" />
                   </div>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex-1 w-full">
             {isCorrect === null ? (
               <div className="text-gray-500 text-sm flex items-center gap-2">
                 <Lightbulb className="w-4 h-4 text-yellow-500" />
                 提示: {currentQuestion.hint || "仔细思考，相信你可以！"}
               </div>
             ) : (
                <div className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="font-bold mb-1">{isCorrect ? '回答正确！🎉' : '再想一想...'}</p>
                  <div className="max-h-20 overflow-auto">{currentQuestion.explanation}</div>
                </div>
             )}
           </div>

           <div className="w-full md:w-auto shrink-0">
             {isCorrect === null ? (
               <button 
                 onClick={handleSubmit}
                 disabled={!selectedOption}
                 className="w-full md:w-48 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold rounded-xl transition-colors shadow-md"
               >
                 提交答案
               </button>
             ) : (
                <button 
                 onClick={handleNext}
                 className="w-full md:w-48 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
               >
                 {currentQIndex < activeQuestions.length - 1 ? '下一题' : '查看结果'}
                 <ChevronRight className="w-5 h-5" />
               </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );

  // --- Main Render ---
  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
  }

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="font-sans min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 py-2 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex gap-4">
          <button 
            onClick={() => setAppMode('notebook')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${appMode === 'notebook' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">智能错题本</span>
          </button>
          <button 
            onClick={() => { setAppMode('quiz'); setGameState(QuizState.START); }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${appMode === 'quiz' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden md:inline">算理闯关</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
             <div className="text-xs text-gray-500">欢迎回来</div>
             <div className="text-sm font-bold text-gray-800">{user.username}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="退出登录"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col">
        {mistakeManager.isLoading && appMode === 'notebook' && mistakeManager.mistakes.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
             <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
             <p>正在同步云端数据...</p>
           </div>
        ) : (
           appMode === 'quiz' || appMode === 'review-game' ? (
              <>
                {gameState === QuizState.START && appMode === 'quiz' && renderStartScreen()}
                {gameState === QuizState.PLAYING && renderGameScreen()}
                {gameState === QuizState.COMPLETED && renderCompletedScreen()}
              </>
           ) : (
             <MistakeNotebook 
               mistakes={mistakeManager.mistakes}
               storageError={mistakeManager.error}
               isLoading={mistakeManager.isLoading}
               addMistake={mistakeManager.addMistake}
               deleteMistake={mistakeManager.deleteMistake}
               reviewMistake={mistakeManager.reviewMistake}
               onStartReview={handleStartReviewGame}
               page={mistakeManager.page}
               setPage={mistakeManager.setPage}
               limit={mistakeManager.limit}
               totalCount={mistakeManager.totalCount}
             />
           )
        )}
      </div>
    </div>
  );
}
