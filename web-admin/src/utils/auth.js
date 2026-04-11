import { callFunction } from './cloud'

const TOKEN_KEY = 'admin_token'
const ADMIN_KEY = 'admin_user'

/**
 * 管理员登录（通过云函数验证账号密码）
 */
export async function loginAdmin(username, password) {
  const res = await callFunction('admin', { action: 'login', username, password })
  if (res.data && res.data.token) {
    localStorage.setItem(TOKEN_KEY, res.data.token)
    localStorage.setItem(ADMIN_KEY, res.data.username || username)
  }
  return res.data
}

/**
 * 登出
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY)
}

/**
 * 获取当前管理员用户名
 */
export function getAdminName() {
  return localStorage.getItem(ADMIN_KEY) || ''
}

/**
 * 获取 token（调用需鉴权的云函数时传入）
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
