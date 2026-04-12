Page({
  data: {
    books: [],
    loading: true,
    hasMore: false,
    page: 1
  },

  onLoad() {
    this.loadBooks()
  },

  async loadBooks() {
    try {
      const db = wx.cloud.database()
      const countRes = await db.collection('books').where({ status: 'published' }).count()
      const total = countRes.total

      const res = await db.collection('books')
        .where({ status: 'published' })
        .orderBy('sort_order', 'asc')
        .skip((this.data.page - 1) * 20)
        .limit(20)
        .get()

      const books = res.data.map(b => {
        const r = b.rating || 0
        const fullStars = Math.floor(r / 2)
        const halfStar = r % 2 === 1
        return { ...b, _fullStars: fullStars, _halfStar: halfStar }
      })

      this.setData({
        books: this.data.books.concat(books),
        hasMore: this.data.page * 20 < total,
        loading: false
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  onReachBottom() {
    if (this.data.hasMore) {
      this.setData({ page: this.data.page + 1 })
      this.loadBooks()
    }
  },

  goBookDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/book-detail/book-detail?id=${id}` })
  }
})
