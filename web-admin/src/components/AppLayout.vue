<template>
  <div class="app-layout" :class="{ 'sidebar-collapsed': isCollapsed }">
    <!-- 移动端汉堡菜单按钮 -->
    <el-button
      v-if="isMobile"
      class="mobile-menu-btn"
      @click="mobileDrawerOpen = true"
    >
      <i class="fa-solid fa-bars"></i>
    </el-button>

    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'collapsed': isCollapsed }">
      <!-- Logo 区域 -->
      <div class="sidebar-header">
        <img src="/logo.png" alt="青翼读书会" class="logo-img" />
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapsed"
        background-color="#00695C"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard">
          <i class="fas fa-chart-line"></i>
          <template #title>Dashboard</template>
        </el-menu-item>
        <el-menu-item index="/users">
          <i class="fas fa-users"></i>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item index="/events">
          <i class="far fa-calendar-alt"></i>
          <template #title>活动管理</template>
        </el-menu-item>
        <el-menu-item index="/orders">
          <i class="fas fa-receipt"></i>
          <template #title>订单管理</template>
        </el-menu-item>
        <el-menu-item index="/content">
          <i class="fas fa-images"></i>
          <template #title>内容管理</template>
        </el-menu-item>
        <el-menu-item index="/settings">
          <i class="fas fa-cog"></i>
          <template #title>系统设置</template>
        </el-menu-item>
        <el-menu-item index="/guide">
          <i class="fas fa-book"></i>
          <template #title>使用指南</template>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 移动端抽屉导航 -->
    <el-drawer
      v-model="mobileDrawerOpen"
      direction="ltr"
      :size="280"
      :with-header="false"
      class="mobile-drawer"
    >
      <div class="mobile-drawer__content">
        <div class="mobile-drawer__header">
          <img src="/logo.png" alt="青翼读书会" class="logo-img" />
          <el-button
            circle
            size="small"
            @click="mobileDrawerOpen = false"
          >
            <i class="fa-solid fa-times"></i>
          </el-button>
        </div>

        <el-menu
          :default-active="activeMenu"
          background-color="#00695C"
          text-color="rgba(255,255,255,0.7)"
          active-text-color="#ffffff"
          router
          @select="handleMobileMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <i class="fas fa-chart-line"></i>
            <template #title>概览</template>
          </el-menu-item>
          <el-menu-item index="/users">
            <i class="fas fa-users"></i>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item index="/events">
            <i class="far fa-calendar-alt"></i>
            <template #title>活动管理</template>
          </el-menu-item>
          <el-menu-item index="/orders">
            <i class="fas fa-receipt"></i>
            <template #title>订单管理</template>
          </el-menu-item>
          <el-menu-item index="/content">
            <i class="fas fa-images"></i>
            <template #title>内容管理</template>
          </el-menu-item>
          <el-menu-item index="/settings">
            <i class="fas fa-cog"></i>
            <template #title>系统设置</template>
          </el-menu-item>
          <el-menu-item index="/guide">
            <i class="fas fa-book"></i>
            <template #title>使用指南</template>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>

    <!-- 主内容区 -->
    <div class="main-content">
      <header class="topbar">
        <div class="topbar-left">
          <!-- 折叠按钮（Desktop，可选） -->
          <el-button
            v-if="!isMobile && showCollapseButton"
            circle
            size="small"
            @click="toggleCollapse"
            class="collapse-btn"
          >
            <i :class="isCollapsed ? 'fa-solid fa-angle-right' : 'fa-solid fa-angle-left'"></i>
          </el-button>
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
        <div class="topbar-right">
          <span class="topbar-date">{{ today }}</span>
          <el-dropdown @command="onDropdownCommand">
            <div class="topbar-avatar">{{ adminInitial }}</div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatDate } from '../utils/format'
import { logout } from '../utils/auth'

const route = useRoute()
const router = useRouter()

// 响应式状态
const windowWidth = ref(window.innerWidth)
const isCollapsed = ref(false)
const mobileDrawerOpen = ref(false)

// 计算是否为移动端
const isMobile = computed(() => windowWidth.value < 768)

// 是否显示折叠按钮
const showCollapseButton = computed(() => windowWidth.value >= 1024)

// 当前激活菜单
const activeMenu = computed(() => route.path)

// 页面标题
const pageTitle = computed(() => route.meta.title || route.name || '概览')

// 日期
const today = formatDate(new Date())

// 管理员头像
const adminInitial = computed(() => {
  const name = localStorage.getItem('admin_user')
  return name ? name[0].toUpperCase() : '管'
})

// 切换侧边栏折叠
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

// 处理窗口大小变化
const handleResize = () => {
  windowWidth.value = window.innerWidth

  // 窗口变宽时关闭移动端抽屉
  if (windowWidth.value >= 768) {
    mobileDrawerOpen.value = false
  }

  // 移动端时自动折叠侧边栏
  if (windowWidth.value < 1024) {
    isCollapsed.value = true
  }
}

// 处理移动端菜单选择
const handleMobileMenuSelect = () => {
  mobileDrawerOpen.value = false
}

// 下拉菜单命令
const onDropdownCommand = (cmd) => {
  if (cmd === 'logout') {
    logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}

// 生命周期
onMounted(() => {
  window.addEventListener('resize', handleResize)

  // 初始化时根据窗口宽度设置折叠状态
  if (windowWidth.value < 1024) {
    isCollapsed.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

/* ============================================
   MOBILE MENU BUTTON
   ============================================ */
.mobile-menu-btn {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: var(--z-sticky);
  display: none;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: var(--radius-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.mobile-menu-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: var(--shadow-lg);
}

.mobile-menu-btn i {
  font-size: var(--fs-base);
}

/* ============================================
   SIDEBAR
   ============================================ */
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  transition: width var(--transition-base);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: var(--z-fixed);
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-width);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  padding: 0;
  background: white;
  border-bottom: 1px solid var(--color-border);
}

.logo-img {
  height: 36px;
  width: auto;
}

.sidebar .el-menu {
  border-right: none !important;
  flex: 1;
  background: transparent !important;
  padding: 0 var(--sp-2);
}

.sidebar .el-menu-item {
  font-size: var(--fs-sm);
  height: 48px;
  line-height: 48px;
  margin: var(--sp-1) 0;
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
  color: rgba(255, 255, 255, 0.7) !important;
  position: relative;
  overflow: hidden;
}

.sidebar .el-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: white;
  border-radius: 0 2px 2px 0;
  transition: height var(--transition-base);
}

.sidebar .el-menu-item i {
  width: 20px;
  text-align: center;
  margin-right: var(--sp-3);
  font-size: var(--fs-base);
  transition: all var(--transition-base);
}

.sidebar .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  transform: translateX(2px);
}

.sidebar .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.sidebar .el-menu-item.is-active::before {
  height: 24px;
}

.sidebar .el-menu-item.is-active i {
  transform: scale(1.1);
}

/* 折叠状态下的菜单项样式 */
.sidebar.collapsed .el-menu-item {
  padding: 0;
  justify-content: center;
}

.sidebar.collapsed .el-menu-item i {
  margin-right: 0;
}

/* ============================================
   MOBILE DRAWER
   ============================================ */
.mobile-drawer__content {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
}

.mobile-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-3) var(--sp-4);
  background: white;
  border-bottom: 1px solid var(--color-border);
}

.mobile-drawer__header .logo-img {
  height: 28px;
  width: auto;
}

.mobile-drawer__header .el-button {
  background: var(--color-gray-100);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 32px;
  height: 32px;
  padding: 0;
  transition: all var(--transition-base);
}

.mobile-drawer__header .el-button:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: scale(1.05);
}

.mobile-drawer__header .el-button i {
  font-size: var(--fs-sm);
}

.mobile-drawer :deep(.el-menu) {
  border-right: none !important;
  flex: 1;
  background: transparent !important;
  padding: 0 var(--sp-3);
}

.mobile-drawer .el-menu-item {
  font-size: var(--fs-base);
  height: 52px;
  line-height: 52px;
  margin: var(--sp-1) 0;
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
  color: rgba(255, 255, 255, 0.8) !important;
}

.mobile-drawer .el-menu-item:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
}

.mobile-drawer .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.2) !important;
  color: white !important;
  font-weight: 600;
}

/* ============================================
   MAIN CONTENT
   ============================================ */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left var(--transition-base);
}

.topbar {
  height: 64px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--sp-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.collapse-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: var(--radius-full);
  background: var(--color-gray-100);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  transition: all var(--transition-base);
}

.collapse-btn:hover {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: var(--shadow-sm);
}

.collapse-btn i {
  font-size: var(--fs-sm);
}

.sidebar.collapsed .collapse-btn {
  margin: 0;
}

.page-title {
  margin: 0;
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.topbar-date {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
}

.topbar-avatar {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-600));
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--fs-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-sm);
}

.topbar-avatar:hover {
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700));
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.content-area {
  flex: 1;
  background: var(--color-bg);
  padding: var(--sp-5);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ============================================
   RESPONSIVE BREAKPOINTS
   ============================================ */

/* Desktop (≥ 1024px) */
@media (min-width: 1024px) {
  .main-content {
    margin-left: var(--sidebar-width);
  }

  .sidebar-collapsed .main-content {
    margin-left: var(--sidebar-collapsed-width);
  }
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .main-content {
    margin-left: var(--sidebar-collapsed-width);
  }

  .sidebar.collapsed {
    width: 160px;
  }

  .sidebar.collapsed ~ .main-content {
    margin-left: 160px;
  }

  .sidebar-toggle {
    display: flex;
  }

  .collapse-btn {
    display: none;
  }
}

/* Mobile (< 768px) */
@media (max-width: 767px) {
  .sidebar {
    display: none;
  }

  .main-content {
    margin-left: 0;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .topbar {
    height: 56px;
    padding: 0 var(--sp-4);
  }

  .page-title {
    font-size: var(--fs-lg);
  }

  .topbar-date {
    display: none;
  }

  .content-area {
    padding: var(--sp-4);
  }
}
</style>
