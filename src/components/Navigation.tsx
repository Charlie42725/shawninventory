'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'

const navigation = [
  { name: '庫存管理', href: '/inventory', icon: '📦' },
  { name: '銷售記錄', href: '/sales', icon: '💰' },
  { name: '營運支出', href: '/expenses', icon: '💸' },
  { name: '損益報表', href: '/reports', icon: '📄' },
  { name: 'AI 財務洞察', href: '/insights', icon: '🤖' },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!user) {
    return null
  }

  return (
    <nav className="bg-gray-800 dark:bg-gray-950 shadow-sm sticky top-0 z-50 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/inventory" className="text-white text-lg sm:text-xl font-bold whitespace-nowrap">
              🏪 管理系統
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:space-x-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    isActive
                      ? 'bg-gray-900 dark:bg-gray-800 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white'
                  } px-3 py-2 rounded-md text-sm font-medium inline-flex items-center transition-colors whitespace-nowrap`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  <span className="hidden xl:inline">{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Desktop User Menu */}
          <div className="hidden lg:flex lg:items-center lg:space-x-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white transition-colors"
              title={theme === 'light' ? '切換至深色模式' : '切換至淺色模式'}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <span className="text-gray-300 dark:text-gray-400 text-sm truncate max-w-[150px]" title={user.email}>
              {user.email}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              登出
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
          >
            <span className="sr-only">開啟選單</span>
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-700 dark:border-gray-800">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${
                    isActive
                      ? 'bg-gray-900 dark:bg-gray-800 text-white'
                      : 'text-gray-300 dark:text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800 hover:text-white'
                  } block px-3 py-2 rounded-md text-base font-medium transition-colors`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                </Link>
              )
            })}
          </div>
          <div className="border-t border-gray-700 dark:border-gray-800 px-4 py-3">
            <div className="text-gray-400 dark:text-gray-500 text-sm mb-2 truncate">{user.email}</div>
            <div className="flex gap-2">
              <button
                onClick={toggleTheme}
                className="flex-shrink-0 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors"
                title={theme === 'light' ? '切換至深色模式' : '切換至淺色模式'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <button
                onClick={() => {
                  handleSignOut()
                  setMobileMenuOpen(false)
                }}
                className="flex-1 bg-gray-700 dark:bg-gray-800 hover:bg-gray-600 dark:hover:bg-gray-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}