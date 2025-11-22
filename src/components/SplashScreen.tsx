'use client'

import { useEffect, useState } from 'react'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [stage, setStage] = useState(0) // 0: logo appear, 1: text appear, 2: fade out

  useEffect(() => {
    // Logo 出現動畫
    const timer1 = setTimeout(() => {
      setStage(1)
    }, 800)

    // 文字出現動畫
    const timer2 = setTimeout(() => {
      setStage(2)
    }, 2000)

    // 整體淡出
    const timer3 = setTimeout(() => {
      onFinish()
    }, 3200)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [onFinish])

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-purple-900 transition-opacity duration-700 ${
        stage === 2 ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* 背景動畫粒子效果 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 主要內容 */}
      <div className="relative z-10 text-center px-4">
        {/* Logo 容器 - 縮放 + 旋轉進場 */}
        <div
          className={`transform transition-all duration-1000 ease-out ${
            stage >= 0 ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'
          }`}
        >
          {/* 外圈光環 - 脈衝效果 */}
          <div className="relative inline-block">
            {/* 多層光暈效果 - 移動端縮小 */}
            <div className="absolute -inset-6 sm:-inset-8 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full blur-2xl sm:blur-3xl opacity-40 animate-pulse"></div>
            <div className="absolute -inset-8 sm:-inset-12 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full blur-xl sm:blur-2xl opacity-20 animate-ping"></div>

            {/* 旋轉光環 */}
            <div className="absolute -inset-3 sm:-inset-4 rounded-full">
              <div className="absolute inset-0 rounded-full border-2 sm:border-4 border-transparent border-t-indigo-500 border-r-purple-500 animate-spin"></div>
              <div className="absolute inset-1 sm:inset-2 rounded-full border-2 sm:border-4 border-transparent border-b-pink-500 border-l-indigo-500 animate-spin-slow"></div>
            </div>

            {/* Logo 本體 - 移動端縮小 */}
            <div className="relative bg-white rounded-full p-4 sm:p-8 shadow-2xl ring-2 sm:ring-4 ring-indigo-500/50">
              <div className="w-20 h-20 sm:w-32 sm:h-32 flex items-center justify-center">
                <img
                  src="/logo.jpg"
                  alt="Logo"
                  className="w-16 h-16 sm:w-28 sm:h-28 object-contain animate-pulse-slow"
                />
              </div>
            </div>

            {/* 閃光效果 */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="absolute top-0 -left-full h-full w-1/2 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
            </div>
          </div>
        </div>

        {/* 文字動畫 - 從下方滑入 + 淡入 */}
        <div
          className={`mt-12 transform transition-all duration-1000 delay-300 ${
            stage >= 1 ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent animate-gradient">
            庫存管理系統
          </h1>
          <p className="text-xl text-indigo-200 font-light tracking-wider animate-fade-in-up">
            Inventory Management System
          </p>

          {/* 進度條 */}
          <div className="mt-8 w-64 mx-auto">
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-progress rounded-full"></div>
            </div>
          </div>

          {/* 載入文字 */}
          <p className="mt-4 text-sm text-gray-400 animate-pulse">
            正在載入極致體驗
            <span className="inline-block animate-bounce-dots">.</span>
            <span className="inline-block animate-bounce-dots animation-delay-200">.</span>
            <span className="inline-block animate-bounce-dots animation-delay-400">.</span>
          </p>
        </div>

        {/* 裝飾性光點 */}
        <div className="absolute -top-20 left-1/2 -translate-x-1/2">
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-white rounded-full animate-twinkle"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 底部裝飾 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center">
        <p className="text-xs text-gray-500 tracking-widest uppercase animate-fade-in">
          Premium Experience
        </p>
      </div>

      {/* CSS 動畫定義 */}
      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }

        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }

        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes bounce-dots {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animate-shimmer {
          animation: shimmer 3s infinite;
        }

        .animate-progress {
          animation: progress 2.8s ease-out forwards;
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }

        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
        }

        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }

        .animate-bounce-dots {
          animation: bounce-dots 1.4s ease-in-out infinite;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
        }

        .animation-delay-400 {
          animation-delay: 0.4s;
        }

        .animate-fade-in {
          animation: fade-in-up 2s ease-out;
        }
      `}</style>
    </div>
  )
}
