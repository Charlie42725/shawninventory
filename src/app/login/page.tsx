'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { signIn } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      router.push('/inventory')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async () => {
    setError('註冊功能暫時不可用，請聯繫管理員獲取帳戶。')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors overflow-hidden relative">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 dark:opacity-5 animate-blob"></div>
        <div className="absolute top-1/3 -right-48 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 dark:opacity-5 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-3xl opacity-10 dark:opacity-5 animate-blob animation-delay-4000"></div>
      </div>

      <div className={`sm:mx-auto sm:w-full sm:max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-4 shadow-xl ring-1 ring-gray-200 dark:ring-gray-700 transition-all group-hover:scale-105">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain dark:invert transition-all"
              />
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text">
          庫存管理系統
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          登入您的帳戶以繼續
        </p>
      </div>

      <div className={`mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="bg-white dark:bg-gray-800 py-6 sm:py-8 px-4 sm:px-10 shadow-xl sm:rounded-xl transition-colors border border-gray-200 dark:border-gray-700">
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSignIn}>
            <div>
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                電子郵件
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                密碼
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm sm:text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs sm:text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-md transition-colors">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 sm:py-2 px-4 border border-transparent rounded-md shadow-sm text-sm sm:text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? '登入中...' : '登入'}
              </button>

              <button
                type="button"
                onClick={handleSignUp}
                disabled={loading}
                className="w-full flex justify-center py-2.5 sm:py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm sm:text-base font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {loading ? '註冊中...' : '註冊'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}