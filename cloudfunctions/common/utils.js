// P1-18: 云函数共享工具函数

/**
 * 生成6位核销码
 */
function generateVerifyCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/**
 * 生成唯一核销码（带重试）
 */
async function generateUniqueVerifyCode(collection) {
  for (let i = 0; i < 3; i++) {
    const code = generateVerifyCode()
    const exist = await collection.where({ verify_code: code }).count()
    if (exist.total === 0) return code
  }
  return generateVerifyCode() + Date.now().toString(36).slice(-3)
}

module.exports = { generateVerifyCode, generateUniqueVerifyCode }
