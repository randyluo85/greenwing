<template>
  <el-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :title="'报名名单 - ' + (event?.title || '')" size="520px" direction="rtl">
    <template #header>
      <span style="font-weight:600;color: var(--color-text-primary);font-size: var(--fs-lg);">报名名单 - {{ event?.title }}</span>
      <span style="color: var(--color-primary);font-size: var(--fs-sm);cursor:pointer;margin-left:auto;">导出 Excel</span>
    </template>
    <div class="stats-row">
      <div class="stat-item"><div class="stat-num green">{{ stats.enrolled }}</div><div class="stat-lbl">已报名</div></div>
      <div class="stat-item"><div class="stat-num teal">{{ stats.verified }}</div><div class="stat-lbl">已核销</div></div>
      <div class="stat-item"><div class="stat-num red">{{ stats.cancelled }}</div><div class="stat-lbl">已取消</div></div>
      <div class="stat-item"><div class="stat-num gray">{{ stats.remaining }}</div><div class="stat-lbl">剩余名额</div></div>
    </div>
    <el-table :data="registrations" size="small" style="margin-top:12px;">
      <el-table-column label="用户" min-width="100">
        <template #default="{ row }">
          <div style="display:flex;align-items:center;gap:6px;">
            <div class="mini-avatar">{{ row.user_name?.[0] }}</div>
            <span>{{ row.user_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="报名方式" width="90">
        <template #default>{{ modeLabel }}</template>
      </el-table-column>
      <el-table-column label="报名时间" width="110">
        <template #default="{ row }"><span style="color: var(--color-text-tertiary);">{{ formatDateTime(row.enrolled_at) }}</span></template>
      </el-table-column>
      <el-table-column label="核销状态" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.status==='pending'" size="small" type="info">待核销</el-tag>
          <el-tag v-else-if="row.status==='verified'" size="small" type="success">已核销</el-tag>
          <el-tag v-else size="small" type="danger">已取消</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-drawer>
</template>

<script setup>
import { computed } from 'vue'
import { mockRegistrations } from '../mock/events'
import { formatDateTime } from '../utils/format'

const props = defineProps({ modelValue: Boolean, event: Object })
defineEmits(['update:modelValue'])

const registrations = computed(() => {
  if (!props.event) return []
  return mockRegistrations.filter(r => r.event_id === props.event.id)
})

const stats = computed(() => {
  const list = registrations.value
  const verified = list.filter(r => r.status === 'verified').length
  const cancelled = list.filter(r => r.status === 'cancelled').length
  const enrolled = list.length
  return { enrolled, verified, cancelled, remaining: (props.event?.quota || 0) - enrolled + cancelled }
})

const modeLabel = computed(() => {
  const m = props.event?.registration_mode
  if (m === 'points_only') return '积分'
  if (m === 'paid') return '付费'
  return '免费'
})
</script>

<style scoped>
.stats-row { display: flex; gap: var(--sp-4); background: var(--color-fill-light); border-radius: var(--radius-lg); padding: var(--sp-4); }
.stat-item { flex: 1; text-align: center; }
.stat-num { font-size: 18px; font-weight: 700; }
.stat-num.green { color: var(--color-primary); }
.stat-num.teal { color: var(--color-teal-500); }
.stat-num.red { color: var(--color-danger); }
.stat-num.gray { color: var(--color-text-tertiary); }
.stat-lbl { color: var(--color-text-secondary); font-size: var(--fs-xs); }
.mini-avatar { width: 24px; height: 24px; background: var(--color-primary-light); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; font-size: var(--fs-xs); color: var(--color-primary); }
</style>
