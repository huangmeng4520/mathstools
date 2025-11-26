import React, { useState } from 'react';
import { auth } from '../services/api';
import { User } from '../types';
import { Loader2, LogIn, UserPlus, BookOpen } from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gradeLevel, setGradeLevel] = useState<number>(3); // 默认三年级
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    setLoading(true);
    setError(null);

    try {
      const user = isLogin 
        ? await auth.login(username, password)
        : await auth.register(username, password, gradeLevel);
      
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-white/50">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-600 rounded-xl mb-4 shadow-lg shadow-blue-200">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isLogin ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            数学竖式算理 & 智能错题本
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center justify-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="请输入用户名"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="请输入密码"
              required
            />
          </div>
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年级</label>
              <select
                value={gradeLevel}
                onChange={(e) => setGradeLevel(parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              >
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}年级
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              isLogin ? <><LogIn className="w-5 h-5" /> 登录</> : <><UserPlus className="w-5 h-5" /> 注册</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors"
          >
            {isLogin ? '还没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>
      </div>
    </div>
  );
};
