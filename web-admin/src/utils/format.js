export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}

export function fenToYuan(fen) {
  if (fen == null) return '0.00'
  return (fen / 100).toFixed(2)
}

export function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export function formatMoney(fen) {
  return fenToYuan(fen) + ' 元'
}

/**
 * 格式化活动时间范围
 * @param {string|Date} start 开始时间
 * @param {string|Date} end 结束时间
 * @returns {string} 格式化后的字符串 YYYY-MM-DD HH:mm - HH:mm
 */
export function formatEventTimeRange(start, end) {
  if (!start) return '-'
  
  const startDate = new Date(start)
  const y = startDate.getFullYear()
  const m = String(startDate.getMonth() + 1).padStart(2, '0')
  const d = String(startDate.getDate()).padStart(2, '0')
  const h = String(startDate.getHours()).padStart(2, '0')
  const min = String(startDate.getMinutes()).padStart(2, '0')
  
  const startTimeStr = `${y}年${m}月${d}日 ${h}:${min}`
  
  if (!end) return startTimeStr
  
  const endDate = new Date(end)
  const eh = String(endDate.getHours()).padStart(2, '0')
  const emin = String(endDate.getMinutes()).padStart(2, '0')
  
  // 判断是否跨天
  const isSameDay = y === endDate.getFullYear() && 
                    startDate.getMonth() === endDate.getMonth() && 
                    startDate.getDate() === endDate.getDate()
                    
  if (isSameDay) {
    return `${startTimeStr} ～ ${eh}:${emin}`
  } else {
    const ey = endDate.getFullYear()
    const em = String(endDate.getMonth() + 1).padStart(2, '0')
    const ed = String(endDate.getDate()).padStart(2, '0')
    const isSameYear = y === ey
    if (isSameYear) {
      return `${startTimeStr} ～ ${em}月${ed}日 ${eh}:${emin}`
    } else {
      return `${startTimeStr} ～ ${ey}年${em}月${ed}日 ${eh}:${emin}`
    }
  }
}
