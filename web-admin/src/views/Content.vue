<template>
  <div class="content-page">
    <!-- Tab 切换 -->
    <div class="tabs-wrapper">
      <div class="tabs-container">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          :class="['tab-item', { active: activeTab === tab.key }]"
          @click="switchTab(tab.key)"
        >
          <span class="tab-label">{{ tab.label }}</span>
          <StatusBadge
            :type="getTabBadgeType(tab.key)"
            :text="tab.count.toString()"
            size="small"
          />
        </div>
      </div>
    </div>

    <!-- 轮播管理 -->
    <div v-if="activeTab === 'banners'" class="tab-content">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" @click="openBannerDrawer()">
          <i class="fa-solid fa-plus"></i>
          添加轮播
        </el-button>
      </div>

      <!-- 轮播列表 -->
      <BaseCard v-if="banners.length" :shadow="'sm'">
        <div class="banner-list">
          <div
            v-for="(b, i) in banners"
            :key="b._id"
            :class="['banner-row', { offline: b.status === 'offline' }]"
          >
            <span class="banner-idx">{{ i + 1 }}</span>
            <div class="banner-thumb">
              <img
                v-if="b._httpUrl"
                :src="b._httpUrl"
                class="thumb-image"
              />
              <span v-else>暂无图片</span>
            </div>
            <div class="banner-info">
              <div class="banner-title">{{ b.title || '无标题' }}</div>
              <div v-if="b.subtitle" class="banner-subtitle">{{ b.subtitle }}</div>
              <div class="banner-url">
                <StatusBadge
                  v-if="b.redirect_type"
                  :type="getRedirectTypeColor(b.redirect_type)"
                  :text="redirectTypeLabel(b.redirect_type)"
                  size="small"
                />
                <span class="url-text">{{ b.redirect_url || '无跳转' }}</span>
              </div>
            </div>
            <div class="banner-actions">
              <StatusBadge
                :type="b.status === 'online' ? 'success' : 'info'"
                :text="b.status === 'online' ? '已上线' : '已下线'"
                size="small"
              />
              <el-button link type="primary" @click="openBannerDrawer(b)">
                编辑
              </el-button>
              <el-button
                v-if="b.status === 'online'"
                link
                type="warning"
                @click="toggleBanner(b, 'offline')"
              >
                下线
              </el-button>
              <template v-else>
                <el-button link type="success" @click="toggleBanner(b, 'online')">
                  上线
                </el-button>
                <el-popconfirm
                  :title="`确认删除轮播「${b.title || '无标题'}」？`"
                  @confirm="deleteBanner(b)"
                >
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 空状态 -->
      <EmptyState
        v-else
        type="noData"
        description="暂无轮播内容"
        actionText="添加轮播"
        @action="openBannerDrawer()"
      />
    </div>

    <!-- 推荐图书 -->
    <div v-if="activeTab === 'books'" class="tab-content">
      <!-- 操作栏 -->
      <div class="action-bar">
        <el-button type="primary" @click="openBookDrawer()">
          <i class="fa-solid fa-plus"></i>
          添加图书
        </el-button>
      </div>

      <!-- 图书列表 -->
      <BaseCard v-if="books.length" :shadow="'sm'">
        <div class="book-list">
          <div
            v-for="(book, i) in books"
            :key="book._id"
            :class="['book-row', { offline: book.status !== 'published' }]"
          >
            <span class="book-idx">{{ i + 1 }}</span>
            <div class="book-thumb">
              <img
                v-if="book._httpUrl"
                :src="book._httpUrl"
                class="thumb-image"
              />
              <div v-else class="thumb-placeholder">
                <i class="fa-solid fa-book"></i>
              </div>
            </div>
            <div class="book-info">
              <div class="book-header">
                <div class="book-title">{{ book.title }}</div>
                <div v-if="book.rating" class="book-rating">
                  <i class="fa-solid fa-star"></i>
                  {{ book.rating }}
                </div>
              </div>
              <div class="book-author">{{ book.author }}</div>
              <div class="book-description">{{ book.description }}</div>
            </div>
            <div class="book-actions">
              <StatusBadge
                :type="book.status === 'published' ? 'success' : 'info'"
                :text="book.status === 'published' ? '已上架' : '已下架'"
                size="small"
              />
              <el-button link type="primary" @click="openBookDrawer(book)">
                编辑
              </el-button>
              <el-button
                v-if="book.status === 'published'"
                link
                type="warning"
                @click="toggleBookStatus(book, 'draft')"
              >
                下架
              </el-button>
              <template v-else>
                <el-button link type="success" @click="toggleBookStatus(book, 'published')">
                  上架
                </el-button>
                <el-popconfirm
                  :title="`确认删除图书《${book.title}》？`"
                  @confirm="deleteBook(book)"
                >
                  <template #reference>
                    <el-button link type="danger">删除</el-button>
                  </template>
                </el-popconfirm>
              </template>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- 空状态 -->
      <EmptyState
        v-else
        type="noData"
        description="暂无推荐图书"
        actionText="添加图书"
        @action="openBookDrawer()"
      />
    </div>

    <!-- Banner 编辑抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="editingBanner ? '编辑轮播' : '添加轮播'"
      size="420px"
      :before-close="closeDrawer"
    >
      <el-form :model="bannerForm" label-width="80px">
        <el-form-item label="主标题" required>
          <el-input
            v-model="bannerForm.title"
            placeholder="例: 世界读书日特别活动"
            maxlength="20"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input
            v-model="bannerForm.subtitle"
            placeholder="例: 4月23日 诚邀书友共赴文学盛宴"
            maxlength="30"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="图片">
          <div class="upload-area" @click="handleImageUpload">
            <img v-if="bannerFormImageUrl" :src="bannerFormImageUrl" class="upload-image" />
            <div v-else class="upload-placeholder">
              <i class="fa-solid fa-cloud-upload-alt"></i>
              <span>点击或拖拽上传图片</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="跳转类型">
          <el-select
            v-model="bannerForm.redirect_type"
            placeholder="选择跳转类型"
            clearable
            style="width: 100%;"
          >
            <el-option label="活动页" value="event" />
            <el-option label="文章页" value="article" />
            <el-option label="自定义页面" value="page" />
          </el-select>
        </el-form-item>
        <el-form-item label="跳转地址">
          <el-input
            v-model="bannerForm.redirect_url"
            placeholder="/pages/event-detail/event-detail?id=xxx"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="bannerForm.sort_order"
            :min="0"
            :max="99"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="bannerForm.statusOnline"
            active-text="上线"
            inactive-text="下线"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeDrawer">取消</el-button>
        <el-button type="primary" @click="submitBanner">
          {{ editingBanner ? '更新' : '发布' }}
        </el-button>
      </template>
    </el-drawer>

    <!-- Book 编辑抽屉 -->
    <el-drawer
      v-model="bookDrawerVisible"
      :title="editingBook ? '编辑图书' : '添加图书'"
      size="420px"
    >
      <el-form :model="bookForm" label-width="80px">
        <el-form-item label="书名" required>
          <el-input v-model="bookForm.title" placeholder="书名" />
        </el-form-item>
        <el-form-item label="作者" required>
          <el-input v-model="bookForm.author" placeholder="作者" />
        </el-form-item>
        <el-form-item label="简介">
          <el-input
            v-model="bookForm.description"
            type="textarea"
            :rows="4"
            placeholder="图书简介"
          />
        </el-form-item>
        <el-form-item label="封面">
          <div class="upload-area" @click="handleBookCoverUpload">
            <img v-if="bookFormImageUrl" :src="bookFormImageUrl" class="upload-image" />
            <div v-else class="upload-placeholder">
              <i class="fa-solid fa-cloud-upload-alt"></i>
              <span>点击或拖拽上传封面</span>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="评分">
          <el-input-number
            v-model="bookForm.rating"
            :min="1"
            :max="10"
            :step="1"
            :precision="0"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number
            v-model="bookForm.sort_order"
            :min="0"
            :max="99"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="bookForm.statusPublished"
            active-text="上架"
            inactive-text="下架"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bookDrawerVisible = false">取消</el-button>
        <el-button type="primary" @click="submitBook">
          {{ editingBook ? '更新' : '添加' }}
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
/**
 * Content - 内容管理页面
 *
 * 功能特性：
 * - 轮播管理（上线/下线/编辑/删除）
 * - 推荐图书管理
 * - 图片上传支持
 * - Tab 切换
 * - 响应式布局
 */

import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { callFunction, uploadFile, getTempFileURL } from '@/utils/cloud'

// Tab 状态
const activeTab = ref('banners')
const banners = ref([])
const books = ref([])

// Tab 配置
const tabs = computed(() => [
  { key: 'banners', label: '轮播管理', count: banners.value.length },
  { key: 'books', label: '推荐图书', count: books.value.length }
])

// Banner drawer
const drawerVisible = ref(false)
const editingBanner = ref(null)
const bannerForm = reactive({
  title: '',
  subtitle: '',
  image_url: '',
  redirect_type: '',
  redirect_url: '',
  sort_order: 1,
  statusOnline: true
})
const bannerFormImageUrl = ref('')

// Book drawer
const bookDrawerVisible = ref(false)
const editingBook = ref(null)
const bookForm = reactive({
  title: '',
  author: '',
  description: '',
  cover_image: '',
  rating: 5,
  sort_order: 1,
  statusPublished: true
})
const bookFormImageUrl = ref('')

// 切换 Tab
function switchTab(key) {
  activeTab.value = key
}

// 获取 Tab 徽章类型
function getTabBadgeType(key) {
  return key === 'banners' ? 'primary' : 'success'
}

// 获取跳转类型颜色
function getRedirectTypeColor(type) {
  const colors = { event: 'success', article: 'info', page: 'warning' }
  return colors[type] || 'info'
}

// 获取跳转类型标签
function redirectTypeLabel(type) {
  const labels = { event: '活动', article: '文章', page: '页面' }
  return labels[type] || type || ''
}

// 加载轮播列表
async function loadBanners() {
  try {
    const res = await callFunction('admin', {
      action: 'manageContent',
      type: 'banner',
      method: 'list'
    })
    const list = res.data || []
    const fileIDs = list
      .map(b => b.image_url)
      .filter(u => u && u.startsWith('cloud://'))

    if (fileIDs.length > 0) {
      const urls = await getTempFileURL(fileIDs)
      const urlMap = Object.fromEntries(
        urls.map(u => [u.fileID, u.tempFileURL])
      )
      list.forEach(b => {
        if (b.image_url) {
          b._httpUrl = urlMap[b.image_url] || b.image_url
        }
      })
    }

    banners.value = list
  } catch (e) {
    // ignore
  }
}

// 加载图书列表
async function loadBooks() {
  try {
    const res = await callFunction('admin', {
      action: 'manageContent',
      type: 'book',
      method: 'list'
    })
    const list = res.data || []
    const fileIDs = list
      .map(b => b.cover_image)
      .filter(u => u && u.startsWith('cloud://'))

    if (fileIDs.length > 0) {
      const urls = await getTempFileURL(fileIDs)
      const urlMap = Object.fromEntries(
        urls.map(u => [u.fileID, u.tempFileURL])
      )
      list.forEach(b => {
        if (b.cover_image) {
          b._httpUrl = urlMap[b.cover_image] || b.cover_image
        }
      })
    }

    books.value = list
  } catch (e) {
    // ignore
  }
}

// 打开 Banner 编辑抽屉
async function openBannerDrawer(banner = null) {
  editingBanner.value = banner
  if (banner) {
    Object.assign(bannerForm, {
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      redirect_type: banner.redirect_type || '',
      redirect_url: banner.redirect_url || '',
      sort_order: banner.sort_order || 1,
      statusOnline: banner.status === 'online'
    })
    const url = banner.image_url || ''
    if (url.startsWith('cloud://')) {
      const urls = await getTempFileURL([url])
      bannerFormImageUrl.value = urls[0]?.tempFileURL || url
    } else {
      bannerFormImageUrl.value = url
    }
  } else {
    Object.assign(bannerForm, {
      title: '',
      subtitle: '',
      image_url: '',
      redirect_type: '',
      redirect_url: '',
      sort_order: banners.value.length + 1,
      statusOnline: true
    })
    bannerFormImageUrl.value = ''
  }
  drawerVisible.value = true
}

// 关闭 Banner 抽屉
function closeDrawer() {
  drawerVisible.value = false
  editingBanner.value = null
}

// 提交 Banner
async function submitBanner() {
  if (!bannerForm.title) {
    ElMessage.warning('请输入主标题')
    return
  }

  try {
    const data = {
      title: bannerForm.title,
      subtitle: bannerForm.subtitle,
      image_url: bannerForm.image_url,
      redirect_type: bannerForm.redirect_type,
      redirect_url: bannerForm.redirect_url,
      sort_order: bannerForm.sort_order,
      status: bannerForm.statusOnline ? 'online' : 'offline'
    }
    if (editingBanner.value) {
      await callFunction('admin', {
        action: 'manageContent',
        type: 'banner',
        method: 'update',
        id: editingBanner.value._id,
        data
      })
    } else {
      await callFunction('admin', {
        action: 'manageContent',
        type: 'banner',
        method: 'create',
        data
      })
    }
    ElMessage.success('保存成功')
    closeDrawer()
    loadBanners()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

// 切换 Banner 状态
async function toggleBanner(b, status) {
  try {
    await callFunction('admin', {
      action: 'manageContent',
      type: 'banner',
      method: 'update',
      id: b._id,
      data: { status }
    })
    loadBanners()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

// 删除 Banner
async function deleteBanner(b) {
  try {
    await callFunction('admin', {
      action: 'manageContent',
      type: 'banner',
      method: 'delete',
      id: b._id
    })
    ElMessage.success('已删除')
    loadBanners()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

// 处理 Banner 图片上传
function handleImageUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `banners/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, file)
      bannerForm.image_url = fileID
      const urls = await getTempFileURL([fileID])
      bannerFormImageUrl.value = urls[0]?.tempFileURL || fileID
    } catch (err) {
      ElMessage.error('上传失败')
    }
  }
  input.click()
}

// 打开 Book 编辑抽屉
async function openBookDrawer(book = null) {
  editingBook.value = book
  if (book) {
    Object.assign(bookForm, {
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      cover_image: book.cover_image || '',
      rating: book.rating ?? 5,
      sort_order: book.sort_order ?? 1,
      statusPublished: book.status === 'published'
    })
    const url = book.cover_image || ''
    if (url.startsWith('cloud://')) {
      const urls = await getTempFileURL([url])
      bookFormImageUrl.value = urls[0]?.tempFileURL || url
    } else {
      bookFormImageUrl.value = url
    }
  } else {
    Object.assign(bookForm, {
      title: '',
      author: '',
      description: '',
      cover_image: '',
      rating: 5,
      sort_order: books.value.length + 1,
      statusPublished: true
    })
    bookFormImageUrl.value = ''
  }
  bookDrawerVisible.value = true
}

// 处理图书封面上传
function handleBookCoverUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `books/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, file)
      bookForm.cover_image = fileID
      const urls = await getTempFileURL([fileID])
      bookFormImageUrl.value = urls[0]?.tempFileURL || fileID
    } catch (err) {
      ElMessage.error('上传失败')
    }
  }
  input.click()
}

// 提交图书
async function submitBook() {
  if (!bookForm.title) {
    ElMessage.warning('请输入书名')
    return
  }
  if (!bookForm.author) {
    ElMessage.warning('请输入作者')
    return
  }

  try {
    const data = {
      title: bookForm.title,
      author: bookForm.author,
      description: bookForm.description,
      cover_image: bookForm.cover_image,
      rating: bookForm.rating ?? 5,
      sort_order: bookForm.sort_order ?? 1,
      status: bookForm.statusPublished ? 'published' : 'draft'
    }
    if (editingBook.value) {
      await callFunction('admin', {
        action: 'manageContent',
        type: 'book',
        method: 'update',
        id: editingBook.value._id,
        data
      })
    } else {
      await callFunction('admin', {
        action: 'manageContent',
        type: 'book',
        method: 'create',
        data
      })
    }
    ElMessage.success('保存成功')
    bookDrawerVisible.value = false
    loadBooks()
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  }
}

// 切换图书状态
async function toggleBookStatus(book, status) {
  try {
    await callFunction('admin', {
      action: 'manageContent',
      type: 'book',
      method: 'update',
      id: book._id,
      data: { status }
    })
    ElMessage.success(status === 'published' ? '已上架' : '已下架')
    loadBooks()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

// 删除图书
async function deleteBook(book) {
  try {
    await callFunction('admin', {
      action: 'manageContent',
      type: 'book',
      method: 'delete',
      id: book._id
    })
    ElMessage.success('已删除')
    loadBooks()
  } catch (err) {
    ElMessage.error(err.message)
  }
}

onMounted(() => {
  loadBanners()
  loadBooks()
})
</script>

<style scoped>
.content-page {
  max-width: var(--container-max-width);
  margin: 0 auto;
}

/* Tab 样式 */
.tabs-wrapper {
  margin-bottom: var(--sp-4);
}

.tabs-container {
  display: flex;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-3) var(--sp-4);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.tab-item:hover {
  background: var(--color-fill-light);
  border-color: var(--color-border);
}

.tab-item.active {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
  border-color: var(--color-primary);
}

.tab-label {
  white-space: nowrap;
}

/* 操作栏 */
.action-bar {
  margin-bottom: var(--sp-4);
  display: flex;
  justify-content: flex-end;
}

/* 轮播列表 */
.banner-list {
  display: flex;
  flex-direction: column;
}

.banner-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-bottom: 1px solid var(--color-border-light);
  transition: background var(--transition-fast);
}

.banner-row:last-child {
  border-bottom: none;
}

.banner-row:hover {
  background: var(--color-fill-light);
}

.banner-row.offline {
  opacity: 0.6;
}

.banner-idx {
  color: var(--color-text-tertiary);
  font-size: var(--fs-lg);
  font-weight: 600;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.banner-thumb {
  width: 120px;
  height: 60px;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-teal-600)
  );
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--fs-xs);
  flex-shrink: 0;
  overflow: hidden;
}

.thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-info {
  flex: 1;
  min-width: 0;
}

.banner-title {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--fs-base);
  margin-bottom: var(--sp-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.banner-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
  margin-bottom: var(--sp-1);
}

.banner-url {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--color-text-tertiary);
  white-space: nowrap;
}

.url-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.banner-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

/* 图书列表 */
.book-list {
  display: flex;
  flex-direction: column;
}

.book-row {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-bottom: 1px solid var(--color-border-light);
  transition: all var(--transition-fast);
}

.book-row:last-child {
  border-bottom: none;
}

.book-row:hover {
  background: var(--color-fill-light);
}

.book-row.offline {
  opacity: 0.6;
}

.book-idx {
  color: var(--color-text-tertiary);
  font-size: var(--fs-lg);
  font-weight: 600;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.book-thumb {
  width: 60px;
  height: 84px;
  background: var(--color-gray-100);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.thumb-placeholder i {
  font-size: 24px;
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin-bottom: var(--sp-1);
}

.book-title {
  color: var(--color-text-primary);
  font-weight: 600;
  font-size: var(--fs-base);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fbbf24;
  font-size: var(--fs-xs);
  font-weight: 600;
}

.book-author {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
  margin-bottom: var(--sp-1);
}

.book-description {
  color: var(--color-text-tertiary);
  font-size: var(--fs-sm);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

/* 上传区域 */
.upload-area {
  width: 100%;
  height: 120px;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.upload-area:hover {
  border-color: var(--color-primary);
}

.upload-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  color: var(--color-text-tertiary);
  font-size: var(--fs-sm);
}

.upload-placeholder i {
  font-size: 24px;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .tabs-container {
    gap: var(--sp-1);
  }

  .tab-item {
    padding: var(--sp-2) var(--sp-3);
    font-size: var(--fs-xs);
  }

  .tab-label {
    font-size: var(--fs-xs);
  }

  .banner-row {
    flex-wrap: wrap;
    gap: var(--sp-3);
  }

  .banner-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .book-cover {
    height: 140px;
  }

  .book-title {
    font-size: var(--fs-sm);
  }

  .book-actions {
    flex-direction: column;
  }

  .book-actions .el-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
