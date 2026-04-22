const { resolveCloudUrls, resolveRichTextCloudUrls } = require('../../../utils/cloud')

Page({
  data: {
    book: null,
    loading: true
  },

  onLoad(options) {
    if (options.id) {
      this.loadBook(options.id)
    }
  },

  async loadBook(id) {
    try {
      const db = wx.cloud.database()
      const res = await db.collection('books').doc(id).get({ timeout: 8000 })
      const book = res.data
      const r = book.rating || 0
      book._fullStars = Math.floor(r / 2)
      book._halfStar = r % 2 === 1
      book._stars = computeStars(book.rating)

      // 转换 cloud:// URL
      await resolveCloudUrls([book], 'cover_image')
      // 转换富文本中的图片
      book.description = await resolveRichTextCloudUrls(book.description)
      // 转换失败则使用默认图
      if (book.cover_image && book.cover_image.startsWith('cloud://')) {
        console.warn('[book-detail] 封面转换失败，使用默认图')
        book.cover_image = '/images/book1.png'
      }

      this.setData({ book, loading: false })
      wx.setNavigationBarTitle({ title: book.title || '好书推荐' })
    } catch (e) {
      console.error('[book-detail] 加载失败:', e)
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})

function computeStars(rating) {
  const r = rating || 0
  let fullStars = 0
  let halfStar = false
  if (r >= 9.5) { fullStars = 5 }
  else if (r >= 8.5) { fullStars = 4; halfStar = true }
  else if (r >= 7.5) { fullStars = 4 }
  else if (r >= 6.5) { fullStars = 3; halfStar = true }
  else if (r >= 5.5) { fullStars = 3 }
  else if (r >= 4.5) { fullStars = 2; halfStar = true }
  else if (r >= 3.5) { fullStars = 2 }
  else if (r >= 2.5) { fullStars = 1; halfStar = true }
  else if (r >= 1.5) { fullStars = 1 }
  else { fullStars = 0 }

  const stars = []
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) stars.push('full')
    else if (i === fullStars && halfStar) stars.push('half')
    else stars.push('empty')
  }
  return stars
}
