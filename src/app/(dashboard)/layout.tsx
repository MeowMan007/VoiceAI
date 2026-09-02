'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  LayoutDashboard, Building2, GitBranch, PhoneCall,
  Mic, Settings, LogOut, ChevronLeft, Menu, Radio
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
      {/* Sidebar - Sticky, Flex-based (No overlapping) */}
      <aside
        className={cn(
          'sticky top-0 h-screen shrink-0 flex flex-col bg-[#09090b] border-r border-zinc-800 transition-all duration-200 z-30',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-bold shrink-0">
              <Mic size={16} strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sm tracking-tight text-white">VoiceAI</span>
                <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ASSISTANT
                </span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                  active
                    ? 'bg-zinc-800/80 text-white border-l-2 border-emerald-500 pl-2.5'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                )}
              >
                <item.icon
                  size={16}
                  className={cn(active ? 'text-emerald-400' : 'text-zinc-400')}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Simulator Call Quick Access */}
        {!collapsed && (
          <div className="p-3 m-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <div className="flex items-center gap-2 mb-1 text-emerald-400 font-medium">
              <Radio size={13} className="animate-pulse" />
              <span>Voice Engine Ready</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-2">
              Test missed-call voice agent with tool calling.
            </p>
            <Link
              href="/simulator"
              className="block w-full text-center py-1.5 rounded bg-emerald-500 text-black font-semibold text-[11px] hover:bg-emerald-400 transition-colors"
            >
              Test Simulator
            </Link>
          </div>
        )}

        {/* Sign Out */}
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors w-full',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut size={15} />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area (Clean flex item, zero cutoffs) */}
      <main className="flex-1 min-w-0 bg-black flex flex-col">
        {children}
      </main>
    </div>
  )
}
