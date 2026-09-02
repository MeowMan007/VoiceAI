'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, GitBranch, PhoneCall,
  Mic, Settings, LogOut, ChevronLeft, Menu, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/businesses', icon: Building2, label: 'Businesses' },
  { href: '/workflows', icon: GitBranch, label: 'Workflows' },
  { href: '/calls', icon: PhoneCall, label: 'Call Records' },
  { href: '/simulator', icon: Mic, label: 'Simulator' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-40',
          collapsed ? 'w-16' : 'w-60'
        )}
        style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 h-16" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}>
            <Mic size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-sm font-display gradient-text">VoiceAI</span>
              <div className="flex items-center gap-1">
                <Zap size={10} style={{ color: 'var(--accent-purple)' }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Assistant</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn('ml-auto p-1 rounded-lg transition-colors', collapsed && 'mx-auto')}
            style={{ color: 'var(--text-muted)' }}
            id="sidebar-toggle"
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))' : 'transparent',
                  color: active ? 'white' : 'var(--text-secondary)',
                  borderLeft: active ? '2px solid #8b5cf6' : '2px solid transparent',
                }}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-colors',
              collapsed && 'justify-center'
            )}
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={18} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={cn('flex-1 min-h-screen transition-all duration-300', collapsed ? 'ml-16' : 'ml-60')}
        style={{ background: 'var(--bg-primary)' }}
      >
        {children}
      </main>
    </div>
  )
}
