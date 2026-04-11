<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="调整积分" width="420px">
    <div class="current-points">
      <span>当前积分</span>
      <span class="points-value">{{ user?.current_points || 0 }}</span>
    </div>
    <div style="margin-bottom:16px;">
      <label class="field-label">调整类型</label>
      <el-radio-group v-model="form.type">
        <el-radio-button value="add">增加积分</el-radio-button>
        <el-radio-button value="deduct">扣减积分</el-radio-button>
      </el-radio-group>
    </div>
    <div style="margin-bottom:16px;">
      <label class="field-label">积分数额</label>
      <el-input-number v-model="form.amount" :min="1" style="width:100%;" />
    </div>
    <div>
      <label class="field-label">调整原因</label>
      <el-input v-model="form.reason" placeholder="请输入调整原因" />
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确认调整</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: Boolean,
  user: Object
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const form = reactive({ type: 'add', amount: 1, reason: '' })

function handleConfirm() {
  if (!form.reason.trim()) {
    ElMessage.warning('请填写调整原因')
    return
  }
  if (form.amount > 10000) {
    ElMessage.warning('单次调整不能超过 10000 积分')
    return
  }
  const amount = form.type === 'add' ? form.amount : -form.amount
  emit('confirm', { userId: props.user?._id, amount, reason: form.reason })
  emit('update:modelValue', false)
  form.type = 'add'
  form.amount = 1
  form.reason = ''
}
</script>

<style scoped>
/* field-label inherited from theme.css */
.current-points { background: var(--color-fill-light); border-radius: var(--radius-lg); padding: var(--sp-3) var(--sp-4); margin-bottom: var(--sp-5); display: flex; justify-content: space-between; }
.points-value { color: var(--color-primary); font-weight: 600; }
</style>
