const CACHE_PREFIX = 'gw_cache_'

/**
 * 设置带 TTL 的缓存
 * @param {string} key 缓存键名
 * @param {any} data 缓存数据
 * @param {number} ttlSeconds 存活时间（秒），默认 300 秒（5分钟）
 */
function setCache(key, data, ttlSeconds = 300) {
  const timestamp = Date.now()
  wx.setStorageSync(CACHE_PREFIX + key, {
    data,
    expireAt: timestamp + ttlSeconds * 1000
  })
}

/**
 * 获取缓存数据
 * @param {string} key 缓存键名
 * @returns {any|null} 缓存数据，如果过期或不存在则返回 null
 */
function getCache(key) {
  const cached = wx.getStorageSync(CACHE_PREFIX + key)
  if (!cached) return null
  
  if (Date.now() > cached.expireAt) {
    wx.removeStorageSync(CACHE_PREFIX + key)
    return null
  }
  return cached.data
}

/**
 * 删除指定缓存
 * @param {string} key 缓存键名
 */
function removeCache(key) {
  wx.removeStorageSync(CACHE_PREFIX + key)
}

module.exports = {
  setCache,
  getCache,
  removeCache
}
