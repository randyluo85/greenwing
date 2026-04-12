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
      const res = await db.collection('books').doc(id).get()
      const book = res.data
      const r = book.rating || 0
      const fullStars = Math.floor(r / 2)
      const halfStar = r % 2 === 1
      book._fullStars = fullStars
      book._halfStar = halfStar
      this.setData({ book, loading: false })
      wx.setNavigationBarTitle({ title: book.title || '好书推荐' })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '加载失败', icon: 'none' })
    }
  }
})
