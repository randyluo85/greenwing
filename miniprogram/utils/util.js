/**
 * 通用工具函数
 */

/**
 * 格式化日期
 * @param {Date|string|number} date
 * @param {string} fmt 格式字符串，如 'YYYY-MM-DD HH:mm'
 */
const formatDate = (date, fmt = 'YYYY-MM-DD HH:mm') => {
  if (!date) return ''
  const d = new Date(date)
  const map = {
    'YYYY': d.getFullYear(),
    'MM': String(d.getMonth() + 1).padStart(2, '0'),
    'DD': String(d.getDate()).padStart(2, '0'),
    'HH': String(d.getHours()).padStart(2, '0'),
    'mm': String(d.getMinutes()).padStart(2, '0'),
    'ss': String(d.getSeconds()).padStart(2, '0')
  }
  let result = fmt
  for (const [key, value] of Object.entries(map)) {
    result = result.replace(key, value)
  }
  return result
}

/**
 * 格式化金额 (分 -> 元)
 */
const formatMoney = (amountInFen) => {
  return (amountInFen / 100).toFixed(2)
}

/**
 * 相对时间
 */
const timeAgo = (date) => {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  return formatDate(date, 'MM-DD')
}

/**
 * 生成核销码
 */
const generateVerifyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'QY-'
  const now = new Date()
  code += String(now.getMonth() + 1).padStart(2, '0')
  code += String(now.getDate()).padStart(2, '0')
  code += '-'
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 会员等级名称映射
 */
const LEVEL_MAP = {
  bronze: '青铜会员',
  silver: '白银会员',
  gold: '黄金会员'
}

const getLevelName = (level) => LEVEL_MAP[level] || '青铜会员'

/**
 * 获取等级进度信息
 */
const getLevelProgress = (totalPoints, thresholds) => {
  const t = thresholds || { bronze: 0, silver: 500, gold: 1000 }
  let current = 'bronze'
  let next = 'silver'
  let currentMin = 0
  let nextMin = 500

  if (totalPoints >= t.gold) {
    return { current: 'gold', next: null, percent: 100, needPoints: 0, currentMin: t.gold, nextMin: null }
  }
  if (totalPoints >= t.silver) {
    return {
      current: 'silver', next: 'gold',
      percent: Math.round((totalPoints - t.silver) / (t.gold - t.silver) * 100),
      needPoints: t.gold - totalPoints,
      currentMin: t.silver, nextMin: t.gold
    }
  }
  return {
    current: 'bronze', next: 'silver',
    percent: Math.round((totalPoints - t.bronze) / (t.silver - t.bronze) * 100),
    needPoints: t.silver - totalPoints,
    currentMin: t.bronze, nextMin: t.silver
  }
}

/**
 * 报名模式文案
 */
const MODE_TEXT = {
  free: '免费报名',
  points_only: '积分兑换',
  paid: '付费报名'
}

const getModeText = (mode) => MODE_TEXT[mode] || '报名'

/**
 * 简单防抖
 */
const debounce = (fn, delay = 500) => {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

module.exports = {
  formatDate,
  formatMoney,
  timeAgo,
  generateVerifyCode,
  getLevelName,
  getLevelProgress,
  getModeText,
  debounce
}
