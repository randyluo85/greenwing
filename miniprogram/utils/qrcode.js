const drawQrcode = require('./weapp-qrcode-canvas-2d')

/**
 * 在 canvas 上生成二维码并导出为临时图片路径
 * @param {string} text 二维码内容
 * @param {object} canvasNode Canvas 2D 节点
 * @param {number} size 画布尺寸（rpx 会自动转为 px）
 * @returns {Promise<string>} 临时图片路径
 */
function generateQR(text, canvasNode, size) {
  return new Promise((resolve, reject) => {
    drawQrcode({
      canvas: canvasNode,
      text,
      width: size,
      padding: 12,
      background: '#ffffff',
      foreground: '#000000'
    }).then(() => {
      wx.canvasToTempFilePath({
        canvas: canvasNode,
        success: res => resolve(res.tempFilePath),
        fail: err => reject(err)
      })
    }).catch(reject)
  })
}

module.exports = { generateQR }
