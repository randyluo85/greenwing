<template>
  <div class="settings-page">
    <!-- 签到积分规则 -->
    <BaseCard
      title="签到积分规则"
      subtitle="用户每日签到获得的积分"
      :shadow="'sm'"
    >
      <template #extra>
        <el-button type="text" @click="resetSign">
          <i class="fa-solid fa-rotate-left"></i>
          重置默认
        </el-button>
      </template>

      <el-row :gutter="24">
        <el-col :xs="24" :sm="12">
          <div class="form-item">
            <label class="field-label">每日签到基础积分</label>
            <div class="input-group">
              <el-input-number
                v-model="form.daily_sign_base"
                :min="1"
                :max="100"
              />
              <span class="unit">积分/天</span>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12">
          <div class="form-item">
            <label class="field-label">连续签到额外奖励</label>
            <div class="input-group">
              <el-input-number
                v-model="form.daily_sign_bonus"
                :min="0"
                :max="50"
              />
              <span class="unit">积分/连续天</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </BaseCard>

    <!-- 会员等级配置 -->
    <BaseCard
      title="会员等级配置"
      subtitle="根据累计积分自动升级"
      :shadow="'sm'"
    >
      <div class="level-list">
        <div
          v-for="lv in levels"
          :key="lv.key"
          class="level-item"
          :style="{ background: lv.bg }"
        >
          <div class="level-dot" :style="{ background: lv.color }"></div>
          <div class="level-info">
            <div class="level-name">{{ lv.name }}</div>
            <div class="level-range">
              <span class="level-min">{{ form.level_thresholds[lv.key].min }}</span>
              <span class="level-separator">-</span>
              <template v-if="lv.key !== 'gold'">
                <el-input
                  v-model.number="form.level_thresholds[lv.key].max"
                  class="level-input"
                  :aria-label="lv.name + '积分上限'"
                />
              </template>
              <span v-else class="level-unlimited">不限</span>
              <span class="unit">积分</span>
            </div>
          </div>
          <div class="level-badge">
            <StatusBadge
              :type="getLevelBadgeType(lv.key)"
              :text="lv.key.toUpperCase()"
              size="small"
            />
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- 订单设置 -->
    <BaseCard
      title="订单设置"
      subtitle="付费活动的订单过期时间"
      :shadow="'sm'"
    >
      <div class="form-item">
        <label class="field-label">订单支付超时</label>
        <div class="input-group">
          <el-input-number
            v-model="form.order_expire_minutes"
            :min="1"
            :max="120"
          />
          <span class="unit">分钟</span>
        </div>
      </div>
    </BaseCard>

    <!-- 保存按钮 -->
    <div class="save-actions">
      <el-button type="primary" :loading="saving" @click="save">
        <i class="fa-solid fa-save"></i>
        保存设置
      </el-button>
    </div>
  </div>
</template>

<script setup>
/**
 * Settings - 系统设置页面
 *
 * 功能特性：
 * - 签到积分规则配置
 * - 会员等级配置
 * - 订单设置
 * - 配置保存和重置
 */

import { reactive, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import BaseCard from '@/components/BaseCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { callFunction } from '@/utils/cloud'

// 保存状态
const saving = ref(false)

// 默认配置
const defaults = {
  daily_sign_base: 10,
  daily_sign_bonus: 5,
  level_thresholds: {
    bronze: { min: 0, max: 499 },
    silver: { min: 500, max: 999 },
    gold: { min: 1000, max: Infinity }
  },
  order_expire_minutes: 15
}

// 表单数据
const form = reactive({
  daily_sign_base: defaults.daily_sign_base,
  daily_sign_bonus: defaults.daily_sign_bonus,
  level_thresholds: JSON.parse(JSON.stringify(defaults.level_thresholds)),
  order_expire_minutes: defaults.order_expire_minutes
})

// 等级配置
const levels = [
  {
    key: 'bronze',
    name: '青铜会员',
    color: '#CD7F32',
    bg: 'rgba(205, 127, 50, 0.1)'
  },
  {
    key: 'silver',
    name: '白银会员',
    color: '#9E9E9E',
    bg: 'rgba(158, 158, 158, 0.1)'
  },
  {
    key: 'gold',
    name: '黄金会员',
    color: '#FFD700',
    bg: 'rgba(255, 215, 0, 0.1)'
  }
]

// 获取等级徽章类型
function getLevelBadgeType(key) {
  const types = { bronze: 'warning', silver: 'info', gold: 'success' }
  return types[key] || 'info'
}

// 加载设置
async function loadSettings() {
  try {
    const res = await callFunction('admin', { action: 'getSettings' })
    const data = res.data
    if (data) {
      form.daily_sign_base = data.daily_sign_base || defaults.daily_sign_base
      form.daily_sign_bonus = data.daily_sign_bonus || defaults.daily_sign_bonus
      form.order_expire_minutes =
        data.order_expire_minutes || defaults.order_expire_minutes

      if (data.level_thresholds) {
        // Map from flat thresholds {bronze: 0, silver: 500, gold: 1000} to {bronze: {min,max}, ...}
        const t = data.level_thresholds
        if (typeof t.bronze === 'number') {
          form.level_thresholds = {
            bronze: { min: 0, max: t.silver - 1 },
            silver: { min: t.silver, max: t.gold - 1 },
            gold: { min: t.gold, max: Infinity }
          }
        } else {
          form.level_thresholds = t
        }
      }
    }
  } catch (e) {
    // 使用默认值
  }
}

// 重置签到规则
async function resetSign() {
  try {
    await ElMessageBox.confirm(
      '确定要重置签到积分规则为默认值吗？',
      '重置确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    form.daily_sign_base = defaults.daily_sign_base
    form.daily_sign_bonus = defaults.daily_sign_bonus
    ElMessage.success('已重置为默认值')
  } catch {
    // 用户取消
  }
}

// 保存设置
async function save() {
  // 验证等级阈值
  const bronzeMax = form.level_thresholds.bronze.max
  const silverMin = form.level_thresholds.silver.min
  const silverMax = form.level_thresholds.silver.max
  const goldMin = form.level_thresholds.gold.min

  if (bronzeMax >= silverMin) {
    ElMessage.warning('青铜会员积分上限必须小于白银会员积分下限')
    return
  }

  if (silverMax >= goldMin) {
    ElMessage.warning('白银会员积分上限必须小于黄金会员积分下限')
    return
  }

  saving.value = true
  try {
    await callFunction('admin', {
      action: 'updateSettings',
      data: {
        daily_sign_base: form.daily_sign_base,
        daily_sign_bonus: form.daily_sign_bonus,
        level_thresholds: {
          bronze: 0,
          silver: form.level_thresholds.silver.max,
          gold: form.level_thresholds.gold.min
        },
        order_expire_minutes: form.order_expire_minutes
      }
    })
    ElMessage.success('设置已保存')
  } catch (err) {
    ElMessage.error(err.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.settings-page {
  max-width: 900px;
  margin: 0 auto;
}

/* 表单项 */
.form-item {
  margin-bottom: var(--sp-4);
}

.form-item:last-child {
  margin-bottom: 0;
}

.field-label {
  display: block;
  margin-bottom: var(--sp-2);
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.input-group {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.unit {
  color: var(--color-text-secondary);
  font-size: var(--fs-sm);
  white-space: nowrap;
}

/* 等级列表 */
.level-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.level-item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.level-item:hover {
  transform: translateX(4px);
}

.level-dot {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.level-info {
  flex: 1;
  min-width: 0;
}

.level-name {
  font-weight: 500;
  font-size: var(--fs-base);
  color: var(--color-text-primary);
  margin-bottom: var(--sp-1);
}

.level-range {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  font-size: var(--fs-sm);
  color: var(--color-text-secondary);
}

.level-min {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
}

.level-separator {
  color: var(--color-text-tertiary);
}

.level-input {
  width: 80px;
}

.level-unlimited {
  font-style: italic;
  color: var(--color-text-tertiary);
}

.level-badge {
  flex-shrink: 0;
}

/* 保存操作 */
.save-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--sp-5);
}

/* 响应式调整 */
@media (max-width: 767px) {
  .settings-page {
    padding: 0;
  }

  .form-item {
    margin-bottom: var(--sp-3);
  }

  .level-item {
    flex-wrap: wrap;
    gap: var(--sp-3);
  }

  .level-badge {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .input-group {
    flex-wrap: wrap;
  }

  .save-actions {
    flex-direction: column;
    gap: var(--sp-3);
  }

  .save-actions .el-button {
    width: 100%;
  }
}
</style>
