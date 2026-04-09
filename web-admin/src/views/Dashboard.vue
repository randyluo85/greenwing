<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stat-row">
      <StatCard label="社区成员" :value="mockUsers.length" change="+12 本周新增" color="#00897B" />
      <StatCard label="本周签到" value="386" change="日均 55 人" color="#26A69A" />
      <StatCard label="本月活动参与" value="156" change="人次报名" color="#4DB6AC" />
      <!-- 收入卡片带切换 -->
      <div class="stat-card card revenue-card" style="border-left-color: var(--color-teal-400);">
        <div class="revenue-header">
          <span class="stat-label">累计收入</span>
          <div class="period-toggle">
            <span v-for="p in periods" :key="p.key" :class="['period-btn', { active: revenuePeriod === p.key }]" @click="revenuePeriod = p.key">{{ p.label }}</span>
          </div>
        </div>
        <div class="stat-value">{{ revenueAmount }}</div>
        <div class="stat-change" style="color: var(--color-teal-400);">{{ revenueSubtitle }}</div>
      </div>
    </div>

    <!-- 中间两列 -->
    <div class="mid-row">
      <!-- 活跃趋势 -->
      <div class="card">
        <div class="card-header">
          <span style="font-weight:600;color: var(--color-text-primary);">社区活跃趋势</span>
          <div class="period-toggle">
            <span class="period-btn active">周</span>
            <span class="period-btn">月</span>
          </div>
        </div>
        <div class="bar-chart">
          <div v-for="(h, i) in [40,60,45,80,70,55,90]" :key="i" class="bar" :style="{ height: h + '%' }"></div>
        </div>
        <div class="bar-labels">
          <span v-for="d in ['周一','周二','周三','周四','周五','周六','周日']" :key="d">{{ d }}</span>
        </div>
        <div class="chart-legend">
          <span>■ 签到人数</span>
          <span style="color: var(--color-primary);font-weight:500;">■ 活动参与</span>
        </div>
      </div>
      <!-- 报名进度 -->
      <div class="card">
        <div style="font-weight:600;color: var(--color-text-primary);margin-bottom:16px;">近期活动报名进度</div>
        <div v-for="evt in publishedEvents" :key="evt.id" class="progress-item">
          <div class="progress-info">
            <span>{{ evt.title }}</span>
            <span :style="{ color: progressColor(evt) }" class="progress-count">{{ evt.enrolled_count }}/{{ evt.quota }}</span>
          </div>
          <el-progress :percentage="Math.min(100, Math.round(evt.enrolled_count / evt.quota * 100))" :color="progressColor(evt)" :stroke-width="8" :show-text="false" />
        </div>
      </div>
    </div>

    <!-- 底部两列 -->
    <div class="bottom-row">
      <!-- 最近动态 -->
      <div class="card">
        <div style="font-weight:600;color: var(--color-text-primary);margin-bottom:16px;">最近动态</div>
        <el-timeline>
          <el-timeline-item v-for="(item, i) in activities" :key="i" :color="item.color" :timestamp="item.time" placement="top">
            <div v-html="item.text"></div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <!-- 等级分布 -->
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
        <div class="level-stats">
          <span>总积分发放: 52,340</span>
          <span>总积分消耗: 18,200</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import StatCard from '../components/StatCard.vue'
import { mockUsers } from '../mock/users'
import { mockEvents } from '../mock/events'

const publishedEvents = computed(() => mockEvents.filter(e => e.status === 'published'))

const revenuePeriod = ref('month')
const periods = [
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
  { key: 'all', label: '全部' }
]
const revenueData = { month: 12800, year: 89600, all: 234500 }
const revenueAmount = computed(() => {
  const v = revenueData[revenuePeriod.value]
  return v >= 10000 ? (v / 10000).toFixed(1) + '万' : v.toLocaleString()
})
const revenueSubtitle = computed(() => ({
  month: '本月收入',
  year: '本年收入',
  all: '累计收入'
}[revenuePeriod.value]))

function progressColor(evt) {
  const pct = evt.enrolled_count / evt.quota
  if (pct > 0.9) return '#EF5350'
  if (pct > 0.5) return '#00897B'
  return '#26A69A'
}

const activities = [
  { text: '<b>张三</b> 报名了《活着》读书会', time: '10分钟前 · 免费活动', color: '#00897B' },
  { text: '<b>李四</b> 签到成功 (连续7天)', time: '15分钟前 · +15积分', color: '#e65100' },
  { text: '<b>《三体》共读</b> 核销完成 32/42', time: '1小时前 · 到场率 76%', color: '#2e7d32' },
  { text: '<b>王五</b> 申请退款 - 《三体》共读', time: '2小时前 · ¥19.90 · 待审批', color: '#c62828' }
]

const levelData = [
  { name: '青铜会员', color: '#CD7F32', count: 820, pct: 66 },
  { name: '白银会员', color: '#9E9E9E', count: 312, pct: 25 },
  { name: '黄金会员', color: '#FFD700', count: 102, pct: 9 }
]
</script>

<style scoped>
.dashboard { max-width: 1200px; }
.stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--sp-4); margin-bottom: var(--sp-5); }
.revenue-card { position: relative; }
.revenue-header { display: flex; justify-content: space-between; align-items: center; }
.period-toggle { display: flex; gap: 2px; background: var(--color-border-light); border-radius: var(--radius-sm); padding: 1px; }
.period-btn { padding: 1px 6px; border-radius: 3px; font-size: var(--fs-xs); color: var(--color-text-secondary); cursor: pointer; }
.period-btn.active { background: var(--color-primary); color: white; }
.mid-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); margin-bottom: var(--sp-5); }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-4); }
.bar-chart { height: 120px; background: linear-gradient(180deg, var(--color-primary-light), var(--color-bg)); border-radius: var(--radius-md); display: flex; align-items: flex-end; padding: var(--sp-2); gap: 6px; }
.bar { flex: 1; background: var(--color-primary); border-radius: 3px 3px 0 0; }
.bar-labels { display: flex; justify-content: space-between; margin-top: 6px; color: var(--color-text-tertiary); font-size: var(--fs-xs); }
.chart-legend { margin-top: 10px; display: flex; gap: var(--sp-3); font-size: var(--fs-sm); color: var(--color-text-secondary); }
.progress-item { margin-bottom: var(--sp-3); }
.progress-info { display: flex; justify-content: space-between; margin-bottom: var(--sp-1); font-size: var(--fs-base); }
.progress-count { font-weight: 600; }
.bottom-row { display: grid; grid-template-columns: 3fr 2fr; gap: var(--sp-4); }
.level-item { margin-bottom: var(--sp-4); }
.level-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.level-label { display: flex; align-items: center; gap: 6px; }
.level-dot { width: 12px; height: 12px; border-radius: 3px; }
.level-count { color: var(--color-text-secondary); font-size: var(--fs-sm); }
.level-stats { margin-top: var(--sp-4); padding-top: var(--sp-3); border-top: 1px solid var(--color-border-light); display: flex; justify-content: space-between; font-size: var(--fs-sm); color: var(--color-text-secondary); }
</style>
