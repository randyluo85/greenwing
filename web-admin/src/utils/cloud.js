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
      await auth.anonymousAuthProvider().signIn()
    }

    // 非 login 操作自动带 token
    if (data.action !== 'login') {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) data.token = token
    }

    const res = await app.callFunction({ name, data })
    const result = res.result
    if (result && result.success === false) {
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
