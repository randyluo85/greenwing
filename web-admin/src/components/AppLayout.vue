<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-logo">
        <span class="logo-icon">📖</span>
        <span class="logo-text">青翼读书会</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#00695C"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard"><span>📊 Dashboard</span></el-menu-item>
        <el-menu-item index="/users"><span>👤 用户管理</span></el-menu-item>
        <el-menu-item index="/events"><span>📅 活动管理</span></el-menu-item>
        <el-menu-item index="/orders"><span>💰 订单管理</span></el-menu-item>
        <el-menu-item index="/content"><span>🖼️ 内容管理</span></el-menu-item>
        <el-menu-item index="/settings"><span>⚙️ 系统设置</span></el-menu-item>
      </el-menu>
    </aside>
    <div class="main-area">
      <header class="topbar">
        <span class="page-title">{{ pageTitle }}</span>
        <div class="topbar-right">
          <span class="topbar-date">{{ today }}</span>
          <div class="topbar-avatar">A</div>
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
import { useRoute } from 'vue-router'
import { formatDate } from '../utils/format'

const route = useRoute()
const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.name || 'Dashboard')
const today = formatDate(new Date())
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 190px;
  background: #00695C;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.15);
}
.logo-icon {
  width: 30px;
  height: 30px;
  background: rgba(255,255,255,0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.logo-text {
  color: white;
  font-weight: 600;
  font-size: 13px;
}
.sidebar .el-menu-item {
  font-size: 13px;
  height: 44px;
  line-height: 44px;
  margin: 2px 8px;
  border-radius: 6px;
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
  height: 48px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.topbar-date {
  color: #6b7280;
  font-size: 12px;
}
.topbar-avatar {
  width: 28px;
  height: 28px;
  background: #e0f2f1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00897B;
  font-size: 12px;
  font-weight: 600;
}
.content {
  flex: 1;
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
