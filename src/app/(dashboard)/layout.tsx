'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen bg-black text-white antialiased">
      {/* Sidebar */}
      <aside
        className={cn(
          'sticky top-0 h-screen shrink-0 flex flex-col justify-between bg-zinc-950 border-r border-zinc-800/80 transition-all duration-200 z-30',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Brand Header & Navigation */}
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-zinc-800/80">
            <Link href="/" className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold shrink-0">
                <Mic size={16} strokeWidth={2.5} />
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-sm tracking-tight text-white">VoiceAI</span>
                  <span className="text-[10px] text-zinc-400 font-mono tracking-wider">
                    ASSISTANT
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-3 space-y-1.5">
            {navItems.map(item => {
              const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors',
                    active
                      ? 'bg-zinc-800/90 text-white font-semibold'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                  )}
                >
                  <item.icon
                    size={16}
                    className={cn(active ? 'text-emerald-400' : 'text-zinc-400')}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Section - Sign Out */}
        <div className="p-4 border-t border-zinc-800/80">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors w-full',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-black flex flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
