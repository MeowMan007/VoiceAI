/**
 * Demo Auth — zero-backend localStorage authentication.
 * No Supabase project required. Works fully client-side.
 */

const USERS_KEY = 'voiceai_demo_users'
const SESSION_KEY = 'voiceai_demo_session'

export interface DemoUser {
  id: string
  email: string
  passwordHash: string
  createdAt: string
}

export interface DemoSession {
  userId: string
  email: string
  token: string
  createdAt: string
}

function hashPassword(password: string): string {
  // Simple deterministic hash for demo purposes (not cryptographic)
  let hash = 0
  const str = password + 'voiceai_salt_2024'
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function getUsers(): DemoUser[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(users: DemoUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function register(email: string, password: string): { error?: string; user?: DemoUser } {
  const users = getUsers()
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { error: 'An account with this email already exists.' }
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }
  const user: DemoUser = {
    id: 'usr_' + Math.random().toString(36).slice(2, 10),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  createSession(user)
  return { user }
}

export function login(email: string, password: string): { error?: string; user?: DemoUser } {
  const users = getUsers()
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
  if (!user) {
    return { error: 'No account found with this email.' }
  }
  if (user.passwordHash !== hashPassword(password)) {
    return { error: 'Incorrect password.' }
  }
  createSession(user)
  return { user }
}

export function createSession(user: DemoUser): DemoSession {
  const session: DemoSession = {
    userId: user.id,
    email: user.email,
    token: 'tok_' + Math.random().toString(36).slice(2, 18),
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export function getSession(): DemoSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function getUser(): { email: string; id: string } | null {
  const session = getSession()
  return session ? { email: session.email, id: session.userId } : null
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY)
}

export function isLoggedIn(): boolean {
  return getSession() !== null
}
