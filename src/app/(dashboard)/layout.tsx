'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { demoAuth } from '@/lib/demo-auth'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, GitBranch, PhoneCall,
  Mic, Settings, LogOut, ChevronLeft, Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/businesses', icon: Building2, label: 'Businesses' },
  { href: '/workflows', icon: GitBranch, label: 'Workflows' },
  { href: '/calls', icon: PhoneCall, label: 'Call Records' },
  { href: '/simulator', icon: Mic, label: 'AI Simulator' },
  { href: '/settings', icon: Settings, label: 'Settings' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    demoAuth.signOut()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-black text-white antialiased">
      {/* Sidebar */}
      <aside
        className={cn(
          'sticky top-0 h-screen shrink-0 flex flex-col z-30 transition-all duration-200',
          'border-r',
          collapsed ? 'w-16' : 'w-60'
        )}
        style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}
      >
        {/* Brand */}
        <div
          className="flex items-center justify-between h-[57px] px-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--green)' }}
            >
              <Mic size={14} className="text-black" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-none min-w-0">
                <span className="text-[13px] font-semibold tracking-tight text-white truncate">VoiceAI</span>
                <span className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Assistant Platform
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md transition-colors shrink-0"
            style={{ color: 'var(--text-muted)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <Menu size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 py-3">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all',
                  active
                    ? 'text-white'
                    : 'hover:text-white'
                )}
                style={
                  active
                    ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                <item.icon
                  size={15}
                  style={{ color: active ? 'var(--green)' : 'inherit', flexShrink: 0 }}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium w-full transition-colors',
              collapsed && 'justify-center'
            )}
            style={{ color: 'var(--text-secondary)' }}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto" style={{ background: 'var(--bg-root)' }}>
        {children}
      </main>
    </div>
  )
}
