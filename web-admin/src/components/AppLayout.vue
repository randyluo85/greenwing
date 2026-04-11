<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <img src="/logo-box.png" alt="青翼读书会" class="logo-img" />
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#00695C"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard"><i class="fas fa-chart-line"></i><span> Dashboard</span></el-menu-item>
        <el-menu-item index="/users"><i class="fas fa-users"></i><span> 用户管理</span></el-menu-item>
        <el-menu-item index="/events"><i class="far fa-calendar-alt"></i><span> 活动管理</span></el-menu-item>
        <el-menu-item index="/orders"><i class="fas fa-receipt"></i><span> 订单管理</span></el-menu-item>
        <el-menu-item index="/content"><i class="fas fa-images"></i><span> 内容管理</span></el-menu-item>
        <el-menu-item index="/settings"><i class="fas fa-cog"></i><span> 系统设置</span></el-menu-item>
      </el-menu>
    </aside>
    <div class="main-area">
      <header class="topbar">
        <span class="page-title">{{ pageTitle }}</span>
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
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatDate } from '../utils/format'
import { logout } from '../utils/auth'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.name || 'Dashboard')
const today = formatDate(new Date())
const adminInitial = computed(() => {
  const name = localStorage.getItem('admin_user')
  return name ? name[0].toUpperCase() : 'A'
})

function onDropdownCommand(cmd) {
  if (cmd === 'logout') {
    logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-3) var(--sp-4);
  margin-bottom: var(--sp-3);
  border-bottom: 1px solid rgba(255,255,255,0.15);
}
.logo-img {
  height: 36px;
  width: auto;
}
.sidebar .el-menu-item {
  font-size: var(--fs-md);
  height: 44px;
  line-height: 44px;
  margin: 2px var(--sp-2);
  border-radius: var(--radius-md);
  transition: background 0.2s ease;
}
.sidebar .el-menu-item i {
  width: 20px;
  text-align: center;
  margin-right: var(--sp-2);
}
.sidebar .el-menu-item.is-active {
  background: rgba(255,255,255,0.2) !important;
  font-weight: 500;
}
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.topbar {
  height: var(--topbar-height);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-5);
  flex-shrink: 0;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}
.topbar-date {
  color: var(--color-text-secondary);
  font-size: var(--fs-base);
}
.topbar-avatar {
  width: 28px;
  height: 28px;
  background: var(--color-primary-light);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: var(--fs-base);
  font-weight: 600;
}
.content {
  flex: 1;
  background: var(--color-bg);
  padding: var(--sp-5);
  overflow-y: auto;
}
</style>
