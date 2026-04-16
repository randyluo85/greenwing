<template>
  <el-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :title="'报名名单 - ' + (event?.title || '')" size="520px" direction="rtl">
    <template #header>
      <span style="font-weight:600;color: var(--color-text-primary);font-size: var(--fs-lg);">报名名单 - {{ event?.title }}</span>
    </template>
    <div v-loading="loading">
      <div class="stats-row">
        <div class="stat-item"><div class="stat-num green">{{ stats.enrolled }}</div><div class="stat-lbl">已报名</div></div>
        <div class="stat-item"><div class="stat-num teal">{{ stats.verified }}</div><div class="stat-lbl">已核销</div></div>
        <div class="stat-item"><div class="stat-num red">{{ stats.cancelled }}</div><div class="stat-lbl">已取消</div></div>
        <div class="stat-item"><div class="stat-num gray">{{ stats.remaining }}</div><div class="stat-lbl">剩余名额</div></div>
      </div>
      <el-table :data="registrations" size="small" style="margin-top:12px;">
        <el-table-column label="用户信息" min-width="160">
          <template #default="{ row }">
            <div class="user-info-cell">
              <div class="user-nickname">{{ row.user?.nickname || '-' }}</div>
              <div class="user-real-name" v-if="row.real_name">{{ row.real_name }}</div>
              <div class="user-phone" v-if="row.contact_phone || row.user?.phone">{{ row.contact_phone || row.user?.phone }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="报名方式" width="90">
          <template #default>{{ modeLabel }}</template>
        </el-table-column>
        <el-table-column label="报名时间" width="110">
          <template #default="{ row }"><span style="color: var(--color-text-tertiary);">{{ formatDateTime(row.created_at) }}</span></template>
        </el-table-column>
        <el-table-column label="核销状态" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.status==='pending'" size="small" type="info">待核销</el-tag>
            <el-tag v-else-if="row.status==='verified'" size="small" type="success">已核销</el-tag>
            <el-tag v-else size="small" type="danger">已取消</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { callFunction } from '../utils/cloud'
import { formatDateTime } from '../utils/format'

const props = defineProps({ modelValue: Boolean, event: Object })
defineEmits(['update:modelValue'])

const loading = ref(false)
const registrations = ref([])

const stats = computed(() => {
  const list = registrations.value
  const verified = list.filter(r => r.status === 'verified').length
  const cancelled = list.filter(r => r.status === 'cancelled').length
  const enrolled = list.filter(r => r.status !== 'cancelled').length
  return { enrolled, verified, cancelled, remaining: (props.event?.quota || 0) - enrolled }
})

const modeLabel = computed(() => {
  const m = props.event?.registration_mode
  if (m === 'points_only') return '积分'
  if (m === 'paid') return '付费'
  return '免费'
})

async function loadRegistrations() {
  if (!props.event?._id) return
  loading.value = true
  try {
    const res = await callFunction('admin', { action: 'getRegistrations', eventId: props.event._id, pageSize: 200 })
    registrations.value = res.data?.list || []
  } catch (e) {
    registrations.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) loadRegistrations()
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

/* 用户信息单元格 */
.user-info-cell { display: flex; flex-direction: column; gap: 2px; }
.user-nickname { font-weight: 500; color: var(--color-text-primary); }
.user-real-name { font-size: var(--fs-xs); color: var(--color-primary); }
.user-phone { font-size: var(--fs-xs); color: var(--color-text-secondary); }
</style>
