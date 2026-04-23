/**
 * 云函数调用封装
 */
const callFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      config: {
        timeout: 20000 // 防止因为冷启动或者微信支付接口慢导致的前端 timeout
      },
      success: res => {
        if (res.result && res.result.success) {
          resolve(res.result)
        } else {
          const errMsg = (res.result && res.result.message) || '操作失败'
          reject(new Error(errMsg))
        }
      },
      fail: err => {
        console.error(`云函数 ${name} 调用失败:`, err)
        reject(new Error(err.errMsg || '网络异常，请重试'))
      }
    })
  })
}

/**
 * 获取云数据库实例
 */
const getDatabase = () => wx.cloud.database()

/**
 * 分页查询封装
 * @param {string} collection 集合名
 * @param {object} where 查询条件
 * @param {object} options 分页和排序选项
 */
const queryPage = async (collection, where = {}, options = {}) => {
  const db = wx.cloud.database()
  const { page = 1, pageSize = 10, orderBy = 'created_at', order = 'desc' } = options

  const countRes = await db.collection(collection).where(where).count()
  const total = countRes.total

  const listRes = await db.collection(collection)
    .where(where)
    .orderBy(orderBy, order)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    list: listRes.data,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  }
}

/**
 * 将 cloud:// fileID 批量转为 HTTPS 临时链接
 * @param {Array} items 数据数组
 * @param {string} field 含 cloud:// URL 的字段名
 */
const resolveCloudUrls = async (items, field = 'cover_image') => {
  const cloudIds = items.filter(i => i[field] && i[field].startsWith('cloud://')).map(i => i[field])
  if (!cloudIds.length) return
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: cloudIds })
    if (!res.fileList || !Array.isArray(res.fileList)) return

    const map = {}
    res.fileList.forEach(f => {
      if (f.tempFileURL) map[f.fileID] = f.tempFileURL
    })
    items.forEach(i => {
      if (i[field] && map[i[field]]) { i[field] = map[i[field]] }
    })
  } catch (e) {
    console.warn('[resolveCloudUrls] getTempFileURL 失败:', e)
  }
}

/**
 * 将 rich text HTML 中的 cloud:// fileID 转为 HTTPS 临时链接
 * @param {string} html 富文本字符串
 * @returns {Promise<string>} 转换后的 HTML 字符串
 */
const resolveRichTextCloudUrls = async (html) => {
  if (!html || typeof html !== 'string') return html

  // 1. 适配图片宽度：注入 style 确保图片不超出屏幕
  let resolvedHtml = html.replace(/<img([\s\S]*?)(\/?)>/gi, (match, p1, p2) => {
    // 注入响应式样式
    if (/style\s*=\s*"/i.test(p1)) {
      return `<img${p1.replace(/style\s*=\s*"/i, 'style="max-width:100%;height:auto;display:block;margin:10px 0;')}${p2}>`
    } else {
      return `<img style="max-width:100%;height:auto;display:block;margin:10px 0;"${p1}${p2}>`
    }
  })

  // 匹配 cloud:// 格式的 URL
  const cloudIdRegex = /cloud:\/\/[\w\.\-\/]+/g
  const cloudIds = resolvedHtml.match(cloudIdRegex)

  if (!cloudIds || !cloudIds.length) return resolvedHtml

  // 去重
  const uniqueIds = [...new Set(cloudIds)]

  try {
    const res = await wx.cloud.getTempFileURL({ fileList: uniqueIds })
    if (!res.fileList || !Array.isArray(res.fileList)) return resolvedHtml

    res.fileList.forEach(f => {
      if (f.tempFileURL) {
        // 全量替换该 ID 为临时链接
        const escapedId = f.fileID.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(escapedId, 'g')
        resolvedHtml = resolvedHtml.replace(regex, f.tempFileURL)
      }
    })
    return resolvedHtml
  } catch (e) {
    console.warn('[resolveRichTextCloudUrls] 失败:', e)
    return resolvedHtml
  }
}

module.exports = {
  callFunction,
  getDatabase,
  queryPage,
  resolveCloudUrls,
  resolveRichTextCloudUrls
}
