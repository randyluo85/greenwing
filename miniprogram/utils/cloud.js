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
  console.log('[resolveCloudUrls] input cloudIds:', cloudIds.length, cloudIds)
  if (!cloudIds.length) return
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: cloudIds })
    console.log('[resolveCloudUrls] getTempFileURL response:', JSON.stringify(res.fileList))

    // 空值检查：防止 res.fileList 为 null/undefined 导致运行时错误
    if (!res.fileList || !Array.isArray(res.fileList)) {
      console.warn('[resolveCloudUrls] fileList 不是有效数组:', res.fileList)
      return
    }

    const map = {}
    res.fileList.forEach(f => {
      console.log('[resolveCloudUrls] fileID:', f.fileID, '-> tempFileURL:', f.tempFileURL, 'status:', f.status)
      if (f.tempFileURL) map[f.fileID] = f.tempFileURL
    })
    let matched = 0
    items.forEach(i => {
      if (i[field] && map[i[field]]) { i[field] = map[i[field]]; matched++ }
    })
    console.log('[resolveCloudUrls] matched:', matched, '/', cloudIds.length)
  } catch (e) {
    console.warn('[resolveCloudUrls] getTempFileURL 失败:', e)
  }
}

module.exports = {
  callFunction,
  getDatabase,
  queryPage,
  resolveCloudUrls
}
