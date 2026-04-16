<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="24" class="stats-grid">
      <el-col :xs="24" :sm="12" :md="6" v-for="stat in statsCards" :key="stat.key">
        <BaseCard
          :shadow="'sm'"
          :hoverable="true"
          :bordered="true"
          class="stat-card"
          :class="`stat-card--${stat.key}`"
        >
          <div class="stat-card__header">
            <div class="stat-card__label">{{ stat.label }}</div>
            <i :class="stat.icon" class="stat-card__icon"></i>
          </div>
          <div class="stat-card__value">{{ stat.value }}</div>
          <div class="stat-card__change" :style="{ color: stat.color }">
            <span>{{ stat.change }}</span>
          </div>
        </BaseCard>
      </el-col>
    </el-row>

    <!-- 中间两列 -->
    <el-row :gutter="24" class="mid-section">
      <!-- 报名进度 -->
      <el-col :xs="24" :md="12">
        <BaseCard title="近期活动报名进度" :shadow="'sm'">
          <!-- 加载状态 -->
          <div v-if="loading" class="skeleton-wrapper">
            <el-skeleton :rows="3" animated />
          </div>

          <!-- 空状态 -->
          <EmptyState
            v-else-if="publishedEvents.length === 0"
            type="noData"
            description="暂无已发布活动"
          />

          <!-- 内容 -->
          <div v-else class="progress-list">
            <div
              v-for="evt in publishedEvents"
              :key="evt._id"
              class="progress-item"
            >
              <div class="progress-info">
                <span class="progress-title">{{ evt.title }}</span>
                <StatusBadge
                  :type="getProgressType(evt)"
                  :text="`${evt.enrolled_count}/${evt.quota}`"
                  size="small"
                />
              </div>
              <el-progress
                :percentage="calculateProgress(evt)"
                :color="getProgressColor(evt)"
                :stroke-width="8"
                :show-text="false"
              />
            </div>
          </div>
        </BaseCard>
      </el-col>

      <!-- 最近动态 -->
      <el-col :xs="24" :md="12">
        <BaseCard title="最近动态" :shadow="'sm'">
          <!-- 加载状态 -->
          <div v-if="loading" class="skeleton-wrapper">
            <el-skeleton :rows="3" animated />
          </div>

          <!-- 空状态 -->
          <EmptyState
            v-else-if="activities.length === 0"
            type="noData"
            description="暂无动态"
          />

          <!-- 时间轴 -->
          <el-timeline v-else class="activity-timeline">
            <el-timeline-item
              v-for="(item, index) in activities"
              :key="index"
              :color="getActivityColor(item.type)"
              placement="top"
            >
              <template #icon>
                <i :class="getActivityIcon(item.type)"></i>
              </template>
              <div class="activity-item">
                <div class="activity-description">{{ item.description }}</div>
                <div class="activity-time">{{ formatTime(item.created_at) }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </BaseCard>
      </el-col>
    </el-row>

    <!-- 底部 - 会员等级分布 -->
    <el-row :gutter="24" class="bottom-section">
      <el-col :span="24">
        <BaseCard title="会员等级分布" :shadow="'sm'">
          <!-- 加载状态 -->
          <div v-if="loading" class="skeleton-wrapper">
            <el-skeleton :rows="3" animated />
          </div>

          <!-- 空状态 -->
          <EmptyState
            v-else-if="levelData.length === 0"
            type="noData"
            description="暂无会员数据"
          />

          <!-- 等级分布 -->
          <div v-else class="level-list">
            <div v-for="level in levelData" :key="level.name" class="level-item">
              <div class="level-info">
                <div class="level-label">
                  <span
                    class="level-dot"
                    :style="{ background: level.color }"
                  ></span>
                  <span>{{ level.name }}</span>
                </div>
                <span class="level-count">
                  {{ level.count }}人 ({{ level.pct }}%)
                </span>
              </div>
              <el-progress
                :percentage="level.pct"
                :color="level.color"
                :stroke-width="6"
                :show-text="false"
              />
            </div>
          </div>
        </BaseCard>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
/**
 * Dashboard - 仪表盘页面
 *
 * 功能特性：
 * - 响应式统计卡片
 * - 活动报名进度
 * - 最近动态时间轴
 * - 会员等级分布
 */

import { ref, computed, onMounted } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import { callFunction } from '@/utils/cloud'
import { formatMoney } from '@/utils/format'

const loading = ref(false)
const stats = ref({})
const publishedEvents = ref([])
const activities = ref([])
const levelData = ref([])

// 统计卡片数据
const statsCards = computed(() => [
  {
    key: 'users',
    label: '社区成员',
    value: stats.value.userCount || 0,
    change: '总注册用户',
    color: '#14b8a6',
    icon: 'fa-solid fa-users'
  },
  {
    key: 'checkins',
    label: '本周签到',
    value: stats.value.weekSignIns || 0,
    change: '近7天签到',
    color: '#2dd4bf',
    icon: 'fa-solid fa-calendar-check'
  },
  {
    key: 'events',
    label: '进行中活动',
    value: stats.value.activeEvents || 0,
    change: '已发布',
    color: '#5eead4',
    icon: 'fa-solid fa-calendar-days'
  },
  {
    key: 'revenue',
    label: '累计收入',
    value: formatMoney(stats.value.netRevenue || 0),
    change: `总收入 ${formatMoney(stats.value.totalRevenue || 0)} / 退款 ${formatMoney(stats.value.totalRefund || 0)}`,
    color: '#80CBC4',
    icon: 'fa-solid fa-yen-sign'
  }
])

// 计算活动进度百分比
const calculateProgress = (evt) => {
  const percentage = Math.round(
    ((evt.enrolled_count || 0) / (evt.quota || 1)) * 100
  )
  return Math.min(100, percentage)
}

// 获取进度类型
const getProgressType = (evt) => {
  const pct = (evt.enrolled_count || 0) / (evt.quota || 1)
  if (pct >= 1) return 'danger'
  if (pct >= 0.8) return 'warning'
  return 'success'
}

// 获取进度颜色
const getProgressColor = (evt) => {
  const pct = (evt.enrolled_count || 0) / (evt.quota || 1)
  if (pct >= 1) return '#ef4444'
  if (pct >= 0.8) return '#f59e0b'
  return '#14b8a6'
}

// 获取活动颜色
const getActivityColor = (type) => {
  const colors = {
    signup: '#14b8a6',
    payment: '#3b82f6',
    checkin: '#10b981',
    refund: '#ef4444'
  }
  return colors[type] || '#6b7280'
}

// 获取活动图标
const getActivityIcon = (type) => {
  const icons = {
    signup: 'fa-solid fa-user-plus',
    payment: 'fa-solid fa-credit-card',
    checkin: 'fa-solid fa-check',
    refund: 'fa-solid fa-rotate-left'
  }
  return icons[type] || 'fa-solid fa-circle'
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date

  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes === 0 ? '刚刚' : `${minutes}分钟前`
  }

  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  // 小于7天
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }

  // 显示日期
  return date.toLocaleDateString('zh-CN')
}

// 加载仪表盘数据
async function loadDashboard() {
  loading.value = true
  try {
    const [dashRes, eventsRes, levelRes, actRes] = await Promise.allSettled([
      callFunction('admin', { action: 'getDashboard' }),
      callFunction('admin', { action: 'getEvents', pageSize: 10 }),
      callFunction('admin', { action: 'getLevelDistribution' }),
      callFunction('admin', { action: 'getRecentActivity', limit: 10 })
    ])

    if (dashRes.status === 'fulfilled') {
      stats.value = dashRes.value.data || {}
    }

    if (eventsRes.status === 'fulfilled') {
      publishedEvents.value = (eventsRes.value.data?.list || [])
        .filter(e => e.status === 'published' && e.quota)
        .slice(0, 5) // 只显示前5个
    }

    if (levelRes.status === 'fulfilled') {
      const d = levelRes.value.data || {}
      const total = (d.bronze || 0) + (d.silver || 0) + (d.gold || 0) || 1
      levelData.value = [
        {
          name: '青铜会员',
          color: '#CD7F32',
          count: d.bronze || 0,
          pct: Math.round((d.bronze || 0) / total * 100)
        },
        {
          name: '白银会员',
          color: '#9E9E9E',
          count: d.silver || 0,
          pct: Math.round((d.silver || 0) / total * 100)
        },
        {
          name: '黄金会员',
          color: '#FFD700',
          count: d.gold || 0,
          pct: Math.round((d.gold || 0) / total * 100)
        }
      ]
    }

    if (actRes.status === 'fulfilled') {
      activities.value = (actRes.value.data || []).slice(0, 5)
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard {
  max-width: var(--container-max-width);
  margin: 0 auto;
  padding: 0;
}

/* 统计卡片网格 */
.stats-grid {
  margin-bottom: var(--sp-6);
}

.stat-card {
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg) !important;
}

.stat-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-3);
}

.stat-card__label {
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.stat-card__icon {
  font-size: var(--fs-lg);
  opacity: 0.5;
}

.stat-card__value {
  font-size: var(--fs-stat);
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
  margin-bottom: var(--sp-2);
}

.stat-card__change {
  font-size: var(--fs-sm);
  font-weight: 500;
}

/* 中间区域 */
.mid-section {
  margin-bottom: var(--sp-6);
}

.skeleton-wrapper {
  padding: var(--sp-4);
}

.progress-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.progress-item {
  margin-bottom: var(--sp-2);
}

.progress-item:last-child {
  margin-bottom: 0;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--sp-2);
  font-size: var(--fs-base);
}

.progress-title {
  font-weight: 500;
  color: var(--color-text-primary);
  flex: 1;
  margin-right: var(--sp-2);
}

/* 活动时间轴 */
.activity-timeline {
  padding-left: var(--sp-2);
}

.activity-item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.activity-description {
  font-size: var(--fs-sm);
  color: var(--color-text-primary);
  line-height: var(--lh-normal);
}

.activity-time {
  font-size: var(--fs-xs);
  color: var(--color-text-tertiary);
}

/* 底部区域 */
.bottom-section {
  margin-bottom: var(--sp-6);
}

.level-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.level-item {
  margin-bottom: var(--sp-2);
}

.level-item:last-child {
  margin-bottom: 0;
}

.level-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.level-label {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-weight: 500;
  color: var(--color-text-primary);
}

.level-dot {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-sm);
}

.level-count {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
  font-weight: 500;
}

/* 响应式调整 */
@media (max-width: 767px) {
  .dashboard {
    padding: 0;
  }

  .stats-grid {
    margin-bottom: var(--sp-4);
  }

  .stats-grid :deep(.el-col) {
    margin-bottom: var(--sp-3);
  }

  .mid-section,
  .bottom-section {
    margin-bottom: var(--sp-4);
  }

  .mid-section :deep(.el-col),
  .bottom-section :deep(.el-col) {
    margin-bottom: var(--sp-4);
  }

  .stat-card__value {
    font-size: var(--fs-3xl);
  }

  .progress-title {
    font-size: var(--fs-sm);
  }

  .activity-description {
    font-size: var(--fs-xs);
  }
}
</style>
