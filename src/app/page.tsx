'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import SplashScreen from '@/components/SplashScreen'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (!loading && !showSplash) {
      if (user) {
        router.push('/inventory')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, showSplash, router])

  // 如果還在顯示 Splash Screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />
  }

  // Splash 結束後的過渡畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center transition-colors">
      <div className="text-center">
        {/* Logo with animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-full p-6 shadow-2xl mx-auto w-32 h-32 flex items-center justify-center">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-20 h-20 object-contain dark:invert animate-pulse"
            />
          </div>
        </div>

        {/* Loading spinner */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>

        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">庫存管理系統</p>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">正在進入系統...</p>
      </div>
    </div>
  )
}