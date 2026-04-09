<template>
  <div style="max-width:800px;">
    <!-- 签到积分规则 -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <div>
          <div style="font-weight:600;color:#1f2937;font-size:13px;">签到积分规则</div>
          <div style="color:#6b7280;font-size:11px;margin-top:2px;">用户每日签到获得的积分</div>
        </div>
        <span class="reset-btn" @click="resetSign">重置默认</span>
      </div>
      <div class="two-col">
        <div>
          <label class="field-label">每日签到基础积分</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <el-input-number v-model="form.daily_sign_base" :min="1" />
            <span class="unit">分/天</span>
          </div>
        </div>
        <div>
          <label class="field-label">连续签到额外奖励</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <el-input-number v-model="form.daily_sign_bonus" :min="0" />
            <span class="unit">分/连续天</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 会员等级配置 -->
    <div class="card" style="margin-bottom:16px;">
      <div style="font-weight:600;color:#1f2937;font-size:13px;">会员等级配置</div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px;margin-bottom:16px;">根据累计积分自动升级</div>
      <div class="level-row" v-for="lv in levels" :key="lv.key" :style="{ background: lv.bg }">
        <span class="level-dot" :style="{ background: lv.color }"></span>
        <span class="level-name">{{ lv.name }}</span>
        <span class="level-min">{{ form.level_thresholds[lv.key].min }}</span>
        <span class="level-dash">-</span>
        <el-input v-if="lv.key !== 'gold'" v-model.number="form.level_thresholds[lv.key].max" style="width:80px;" />
        <span v-else class="level-unlimited">不限</span>
        <span class="unit">积分</span>
      </div>
    </div>

    <!-- 订单设置 -->
    <div class="card" style="margin-bottom:16px;">
      <div style="font-weight:600;color:#1f2937;font-size:13px;">订单设置</div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px;margin-bottom:16px;">付费活动的订单过期时间</div>
      <div style="display:flex;align-items:center;gap:8px;">
        <label class="field-label" style="margin:0;">订单支付超时</label>
        <el-input-number v-model="form.order_expire_minutes" :min="1" />
        <span class="unit">分钟</span>
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;">
      <el-button type="primary" @click="save">保存设置</el-button>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { mockSettings } from '../mock/settings'

const form = reactive({
  daily_sign_base: mockSettings.daily_sign_base,
  daily_sign_bonus: mockSettings.daily_sign_bonus,
  level_thresholds: JSON.parse(JSON.stringify(mockSettings.level_thresholds)),
  order_expire_minutes: mockSettings.order_expire_minutes
})

const levels = [
  { key: 'bronze', name: '青铜会员', color: '#CD7F32', bg: '#FFF3E0' },
  { key: 'silver', name: '白银会员', color: '#9E9E9E', bg: '#f5f5f5' },
  { key: 'gold', name: '黄金会员', color: '#FFD700', bg: '#FFF8E1' }
]

function resetSign() {
  form.daily_sign_base = mockSettings.daily_sign_base
  form.daily_sign_bonus = mockSettings.daily_sign_bonus
}

function save() {
  ElMessage.success('设置已保存')
}
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.reset-btn { color: #00897B; font-size: 11px; cursor: pointer; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-label { display: block; color: #374151; font-size: 11px; margin-bottom: 4px; font-weight: 500; }
.unit { color: #6b7280; font-size: 11px; }
.level-row { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
.level-dot { width: 12px; height: 12px; border-radius: 3px; }
.level-name { font-weight: 500; width: 60px; }
.level-min { color: #6b7280; font-size: 11px; }
.level-dash { color: #9ca3af; }
.level-unlimited { color: #6b7280; font-size: 11px; }
</style>
