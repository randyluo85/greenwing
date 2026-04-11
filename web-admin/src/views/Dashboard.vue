<template>
  <div class="dashboard" v-loading="loading">
    <!-- 统计卡片 -->
    <div class="stat-row">
      <StatCard label="社区成员" :value="stats.userCount || 0" change="总注册用户" color="#00897B" />
      <StatCard label="本周签到" :value="stats.weekSignIns || 0" change="近7天签到" color="#26A69A" />
      <StatCard label="进行中活动" :value="stats.activeEvents || 0" change="已发布" color="#4DB6AC" />
      <!-- 收入卡片带切换 -->
      <div class="stat-card card revenue-card" style="border-left-color: var(--color-teal-400);">
        <div class="revenue-header">
          <span class="stat-label">累计收入</span>
        </div>
        <div class="stat-value">{{ formatMoney(stats.netRevenue || 0) }}</div>
        <div class="stat-change" style="color: var(--color-teal-400);">
          总收入 {{ formatMoney(stats.totalRevenue || 0) }} / 退款 {{ formatMoney(stats.totalRefund || 0) }} / 退款率 {{ stats.refundRate || '0.0' }}%
        </div>
      </div>
    </div>

    <!-- 中间两列 -->
    <div class="mid-row">
      <!-- 报名进度 -->
      <div class="card">
        <div style="font-weight:600;color: var(--color-text-primary);margin-bottom:16px;">近期活动报名进度</div>
        <div v-if="publishedEvents.length === 0" style="color: var(--color-text-tertiary);font-size:var(--fs-sm);">暂无已发布活动</div>
        <div v-for="evt in publishedEvents" :key="evt._id" class="progress-item">
          <div class="progress-info">
            <span>{{ evt.title }}</span>
            <span :style="{ color: progressColor(evt) }" class="progress-count">{{ evt.enrolled_count }}/{{ evt.quota }}</span>
          </div>
          <el-progress :percentage="Math.min(100, Math.round((evt.enrolled_count || 0) / (evt.quota || 1) * 100))" :color="progressColor(evt)" :stroke-width="8" :show-text="false" />
        </div>
      </div>
      <!-- 最近动态 -->
      <div class="card">
        <div style="font-weight:600;color: var(--color-text-primary);margin-bottom:16px;">最近动态</div>
        <el-timeline v-if="activities.length">
          <el-timeline-item v-for="(item, i) in activities" :key="i" color="#00897B" placement="top">
            <div>{{ item.description }}</div>
          </el-timeline-item>
        </el-timeline>
        <div v-else style="color: var(--color-text-tertiary);font-size:var(--fs-sm);">暂无动态</div>
      </div>
    </div>

    <!-- 底部 -->
    <div class="bottom-row">
      <div class="card">
        <div style="font-weight:600;color: var(--color-text-primary);margin-bottom:16px;">会员等级分布</div>
        <div v-for="lv in levelData" :key="lv.name" class="level-item">
          <div class="level-info">
            <div class="level-label">
              <span class="level-dot" :style="{ background: lv.color }"></span>
              <span>{{ lv.name }}</span>
            </div>
            <span class="level-count">{{ lv.count }}人 ({{ lv.pct }}%)</span>
          </div>
          <el-progress :percentage="lv.pct" :color="lv.color" :stroke-width="6" :show-text="false" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import StatCard from '../components/StatCard.vue'
import { callFunction } from '../utils/cloud'
import { formatMoney } from '../utils/format'

const loading = ref(false)
const stats = ref({})
const publishedEvents = ref([])
const activities = ref([])
const levelData = ref([])

async function loadDashboard() {
  loading.value = true
  try {
    const [dashRes, eventsRes, levelRes, actRes] = await Promise.allSettled([
      callFunction('admin', { action: 'getDashboard' }),
      callFunction('admin', { action: 'getEvents', pageSize: 10 }),
      callFunction('admin', { action: 'getLevelDistribution' }),
      callFunction('admin', { action: 'getRecentActivity', limit: 10 })
    ])

    if (dashRes.status === 'fulfilled') stats.value = dashRes.value.data || {}
    if (eventsRes.status === 'fulfilled') {
      publishedEvents.value = (eventsRes.value.data?.list || []).filter(e => e.status === 'published' && e.quota)
    }
    if (levelRes.status === 'fulfilled') {
      const d = levelRes.value.data || {}
      const total = (d.bronze || 0) + (d.silver || 0) + (d.gold || 0) || 1
      levelData.value = [
        { name: '青铜会员', color: '#CD7F32', count: d.bronze || 0, pct: Math.round((d.bronze || 0) / total * 100) },
        { name: '白银会员', color: '#9E9E9E', count: d.silver || 0, pct: Math.round((d.silver || 0) / total * 100) },
        { name: '黄金会员', color: '#FFD700', count: d.gold || 0, pct: Math.round((d.gold || 0) / total * 100) }
      ]
    }
    if (actRes.status === 'fulfilled') activities.value = actRes.value.data || []
  } finally {
    loading.value = false
  }
}

function progressColor(evt) {
  const pct = (evt.enrolled_count || 0) / (evt.quota || 1)
  if (pct > 0.9) return '#EF5350'
  if (pct > 0.5) return '#00897B'
  return '#26A69A'
}

onMounted(loadDashboard)
</script>

<style scoped>
.dashboard { max-width: 1200px; }
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-5); }
.revenue-card { position: relative; }
.revenue-header { display: flex; justify-content: space-between; align-items: center; }
.mid-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); margin-bottom: var(--sp-5); }
.progress-item { margin-bottom: var(--sp-3); }
.progress-info { display: flex; justify-content: space-between; margin-bottom: var(--sp-1); font-size: var(--fs-base); }
.progress-count { font-weight: 600; }
.bottom-row { display: grid; grid-template-columns: 1fr; gap: var(--sp-4); }
.level-item { margin-bottom: var(--sp-4); }
.level-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.level-label { display: flex; align-items: center; gap: 6px; }
.level-dot { width: 12px; height: 12px; border-radius: 3px; }
.level-count { color: var(--color-text-secondary); font-size: var(--fs-sm); }
</style>
