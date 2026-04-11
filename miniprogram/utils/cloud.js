/**
 * 云函数调用封装
 */
const callFunction = (name, data = {}) => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
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

module.exports = {
  callFunction,
  getDatabase,
  queryPage
}
