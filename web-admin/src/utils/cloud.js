import cloudbase from '@cloudbase/js-sdk'

const envId = import.meta.env.VITE_CLOUD_ENV_ID
const app = cloudbase.init(envId ? { env: envId } : {})

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
  try {
    // 确保有登录状态（匿名或正式）
    const auth = app.auth()
    if (!auth.hasLoginState()) {
      await auth.anonymousAuthProvider().signIn()
    }
    
    const res = await app.uploadFile({ cloudPath, filePath: file })
    return res.fileID
  } catch (err) {
    console.error('[cloud.js] 文件上传失败:', err)
    // 常见错误：跨域(CORS)或权限不足
    if (err.message?.includes('ACCESS_DENIED') || err.message?.includes('OPERATION_FAIL') || err.name === 'TypeError') {
      throw new Error('云存储操作失败：请检查云开发控制台「安全配置」是否已添加 localhost:5180 到 Web 安全域名，并确认存储权限设置正确。')
    }
    throw err
  }
}

/**
 * 批量将 cloud:// fileID 转为 HTTPS 临时 URL
 */
export async function getTempFileURL(fileIDs) {
  if (!fileIDs || fileIDs.length === 0) return []
  const result = await app.getTempFileURL({ fileList: fileIDs })
  return result.fileList || []
}

/**
 * 将 rich text HTML 中的 cloud:// fileID 转为 HTTPS 临时链接
 */
export async function resolveHtml(html) {
  if (!html || typeof html !== 'string') return { html: html || '', map: new Map() }
  const cloudIdRegex = /cloud:\/\/[\w\.\-\/]+/g
  const cloudIds = html.match(cloudIdRegex)
  const mapping = new Map()
  if (!cloudIds || !cloudIds.length) return { html, map: mapping }
  const uniqueIds = [...new Set(cloudIds)]
  try {
    const fileList = await getTempFileURL(uniqueIds)
    let resolvedHtml = html
    fileList.forEach(f => {
      if (f.tempFileURL) {
        const escapedId = f.fileID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedId, 'g')
        resolvedHtml = resolvedHtml.replace(regex, f.tempFileURL)
        mapping.set(f.tempFileURL, f.fileID)
      }
    })
    return { html: resolvedHtml, map: mapping }
  } catch (e) {
    console.warn('[resolveHtml] 失败:', e)
    return { html, map: mapping }
  }
}

/**
 * 图片压缩配置
 */
export const IMAGE_CONFIG = {
  MAX_SIZE_BYTES: 200 * 1024, // 200KB 阈值
  MAX_WIDTH: 1200,            // 最大宽度
  QUALITY: 0.8                // 压缩质量
}

/**
 * 压缩图片
 * @param {File} file 原始文件
 * @param {Object} options 压缩配置（可选，默认使用 IMAGE_CONFIG）
 * @returns {Promise<File>} 压缩后的 File 对象
 */
export async function compressImage(file, options = {}) {
  if (!file) return file
  if (file.type === 'image/gif') return file // 不压缩 GIF
  
  const config = {
    maxWidth: options.maxWidth || IMAGE_CONFIG.MAX_WIDTH,
    quality: options.quality || IMAGE_CONFIG.QUALITY,
    maxSizeBytes: options.maxSizeBytes || IMAGE_CONFIG.MAX_SIZE_BYTES
  }

  // 小于阈值的不压缩
  if (file.size <= config.maxSizeBytes) return file

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // 如果图片宽度大于最大宽度，进行等比缩放
        if (width > config.maxWidth) {
          height = (config.maxWidth / width) * height
          width = config.maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 Blob，然后再转回 File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'))
              return
            }
            // 保持原始文件名后缀名转为 .jpg
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg"
            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            
            // 内存清理建议
            canvas.width = canvas.height = 0
            
            resolve(compressedFile)
          },
          'image/jpeg',
          config.quality
        )
      }
      img.onerror = () => reject(new Error('图片加载失败'))
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
  })
}

export { app }
