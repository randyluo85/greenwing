/**
 * 通用工具函数
 */

/**
 * 安全解析时间戳，兼容多种格式
 * @param {Date|string|number} date
 * @returns {Date|null}
 */
const safeParseDate = (date) => {
  if (!date) return null
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d
}

/**
 * 比较时间是否已过
 * @param {Date|string|number} date
 * @returns {boolean}
 */
const isPast = (date) => {
  const d = safeParseDate(date)
  if (!d) return false
  return d.getTime() < Date.now()
}

/**
 * 格式化日期
 * @param {Date|string|number} date
 * @param {string} fmt 格式字符串，如 'YYYY-MM-DD HH:mm'
 */
const formatDate = (date, fmt = 'YYYY-MM-DD HH:mm') => {
  if (!date) return ''
  const d = safeParseDate(date)
  if (!d) return ''
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
 * 格式化活动时间范围 (小程序端简洁版)
 * @param {string|Date} start 开始时间
 * @param {string|Date} end 结束时间
 * @returns {string} 格式化后的字符串
 */
const formatEventRange = (start, end) => {
  if (!start) return ''
  const sDate = safeParseDate(start)
  if (!sDate) return ''
  
  const y = sDate.getFullYear()
  const m = String(sDate.getMonth() + 1).padStart(2, '0')
  const d = String(sDate.getDate()).padStart(2, '0')
  const h = String(sDate.getHours()).padStart(2, '0')
  const min = String(sDate.getMinutes()).padStart(2, '0')
  
  const startTimeStr = `${y}年${m}月${d}日 ${h}:${min}`
  
  if (!end) return startTimeStr
  
  const eDate = safeParseDate(end)
  if (!eDate) return startTimeStr
  
  const ey = eDate.getFullYear()
  const em = String(eDate.getMonth() + 1).padStart(2, '0')
  const ed = String(eDate.getDate()).padStart(2, '0')
  const eh = String(eDate.getHours()).padStart(2, '0')
  const emin = String(eDate.getMinutes()).padStart(2, '0')
  
  // 是否同一年
  const isSameYear = y === ey
  // 是否同一天
  const isSameDay = isSameYear && m === em && d === ed
  
  if (isSameDay) {
    return `${startTimeStr} ～ ${eh}:${emin}`
  } else if (isSameYear) {
    // 同年不同日: 2023年10月01日 14:00 ～ 10月02日 16:00
    return `${startTimeStr} ～ ${em}月${ed}日 ${eh}:${emin}`
  } else {
    // 不同年: 2023年12月31日 23:00 ～ 2024年01月01日 01:00
    return `${startTimeStr} ～ ${ey}年${em}月${ed}日 ${eh}:${emin}`
  }
}

/**
 * 格式化活动时间分段 (用于详情页大字/小字布局)
 * @param {string|Date} start 开始时间
 * @param {string|Date} end 结束时间
 * @returns {object} { dateStr, rangeStr }
 */
const formatEventParts = (start, end) => {
  if (!start) return { dateStr: '', rangeStr: '' }
  const sDate = safeParseDate(start)
  if (!sDate) return { dateStr: '', rangeStr: '' }
  
  const y = sDate.getFullYear()
  const m = String(sDate.getMonth() + 1).padStart(2, '0')
  const d = String(sDate.getDate()).padStart(2, '0')
  const h = String(sDate.getHours()).padStart(2, '0')
  const min = String(sDate.getMinutes()).padStart(2, '0')
  
  const dateStr = `${y}年${m}月${d}日`
  let rangeStr = `${h}:${min}`
  
  if (!end) return { dateStr, rangeStr }
  
  const eDate = safeParseDate(end)
  if (!eDate) return { dateStr, rangeStr }
  
  const ey = eDate.getFullYear()
  const em = String(eDate.getMonth() + 1).padStart(2, '0')
  const ed = String(eDate.getDate()).padStart(2, '0')
  const eh = String(eDate.getHours()).padStart(2, '0')
  const emin = String(eDate.getMinutes()).padStart(2, '0')
  
  // 是否同年
  const isSameYear = y === ey
  // 是否同日
  const isSameDay = isSameYear && m === em && d === ed
  
  rangeStr = ''
  if (isSameDay) {
    rangeStr = `${h}:${min} ～ ${eh}:${emin}`
  } else if (isSameYear) {
    rangeStr = `${m}月${d}日 ${h}:${min} ～ ${em}月${ed}日 ${eh}:${emin}`
  } else {
    rangeStr = `${y}年${m}月${d}日 ${h}:${min} ～ ${ey}年${em}月${ed}日 ${eh}:${emin}`
  }
  
  return {
    dateStr,
    rangeStr: rangeStr
  }
}

/**
 * 格式化金额 (分 -> 元)
 */
const formatMoney = (amountInFen) => {
  return (amountInFen / 100).toFixed(2) + ' 元'
}

/**
 * 相对时间
 */
const timeAgo = (date) => {
  const d = safeParseDate(date)
  if (!d) return ''
  const now = Date.now()
  const diff = now - d.getTime()
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
 * 生成核销码（6位随机码）
 * 注意：云函数中也定义了相同的逻辑，保持一致
 */
const generateVerifyCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
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
  formatEventRange,
  formatMoney,
  timeAgo,
  generateVerifyCode,
  getLevelName,
  getLevelProgress,
  getModeText,
  debounce,
  safeParseDate,
  isPast,
  formatEventParts
}
