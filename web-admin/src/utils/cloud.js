import cloudbase from '@cloudbase/js-sdk'

const app = cloudbase.init({
  env: 'cloud1-8gax523s60b70149'
})

const TOKEN_KEY = 'admin_token'

/**
 * 调用云函数
 * 自动附带 admin token 用于鉴权（login 除外）
 */
export async function callFunction(name, data = {}) {
  try {
    // 匿名登录以保证 callFunction 可用
    const auth = app.auth()
    if (!auth.hasLoginState()) {
      try {
        await auth.anonymousAuthProvider().signIn()
      } catch (authErr) {
        console.error('[cloud.js] 匿名登录失败:', authErr)
        throw new Error('CloudBase 匿名登录失败，请在云开发控制台开启匿名登录（设置-登录方式），并确认 Web 安全域名包含当前域名')
      }
    }

    // 非 login 操作自动带 token
    if (data.action !== 'login') {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) data.token = token
    }

    let res
    try {
      res = await app.callFunction({ name, data })
    } catch (callErr) {
      console.error(`[cloud.js] 云函数调用失败 [${name}]:`, callErr)
      const msg = callErr.message || String(callErr)
      if (msg.includes('PERMISSION_DENIED')) {
        throw new Error('CloudBase 权限不足：请在云开发控制台「设置-安全配置」中添加当前域名到 Web 安全域名，并确认已开启匿名登录')
      }
      throw new Error('云函数调用失败: ' + msg)
    }

    const result = res.result
    if (result && result.success === false) {
      // token 过期 -> 自动跳转登录页
      if (result.message && result.message.includes('未登录')) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem('admin_user')
        window.location.href = '/#/login'
        throw new Error('登录已过期，请重新登录')
      }
      throw new Error(result.message || '操作失败')
    }
    return result
  } catch (err) {
    console.error(`Cloud function [${name}] error:`, err)
    throw err
  }
}

/**
 * 获取数据库引用
 */
export function getDb() {
  return app.database()
}

/**
 * 上传文件到云存储
 */
export async function uploadFile(cloudPath, file) {
  const res = await app.uploadFile({ cloudPath, filePath: file })
  return res.fileID
}

export { app }
