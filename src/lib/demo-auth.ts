/**
 * Demo Auth — localStorage-based authentication
 * Works without any external service (Supabase, Firebase, etc.)
 * All accounts and sessions are stored in the browser's localStorage.
 */

const ACCOUNTS_KEY = 'voiceai_accounts'
const SESSION_KEY = 'voiceai_session'

export interface DemoUser {
  id: string
  email: string
  created_at: string
}

interface AccountStore {
  [email: string]: {
    passwordHash: string
    user: DemoUser
  }
}

interface Session {
  user: DemoUser
  expires_at: number
}

function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return hash.toString(36)
}

function loadAccounts(): AccountStore {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveAccounts(accounts: AccountStore) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

function loadSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session: Session = JSON.parse(raw)
    if (Date.now() > session.expires_at) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

function saveSession(user: DemoUser) {
  if (typeof window === 'undefined') return
  const session: Session = {
    user,
    expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const demoAuth = {
  register(email: string, password: string): { error: string | null; user: DemoUser | null } {
    const accounts = loadAccounts()
    const key = email.toLowerCase().trim()

    if (accounts[key]) {
      return { error: 'An account with this email already exists. Please sign in instead.', user: null }
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.', user: null }
    }

    const user: DemoUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: key,
      created_at: new Date().toISOString(),
    }

    accounts[key] = { passwordHash: simpleHash(password), user }
    saveAccounts(accounts)
    saveSession(user)

    return { error: null, user }
  },

  login(email: string, password: string): { error: string | null; user: DemoUser | null } {
    const accounts = loadAccounts()
    const key = email.toLowerCase().trim()
    const account = accounts[key]

    if (!account) {
      return { error: 'No account found with this email. Please register first.', user: null }
    }

    if (account.passwordHash !== simpleHash(password)) {
      return { error: 'Incorrect password. Please try again.', user: null }
    }

    saveSession(account.user)
    return { error: null, user: account.user }
  },

  getUser(): DemoUser | null {
    return loadSession()?.user || null
  },

  signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY)
    }
  },

  isAuthenticated(): boolean {
    return !!loadSession()
  },
}
