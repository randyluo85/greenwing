<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="编辑用户" width="420px">
    <el-form label-position="top">
      <el-form-item label="昵称">
        <el-input v-model="form.nickname" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="form.role" style="width:100%;">
          <el-option label="普通用户" value="user" />
          <el-option label="核销员" value="verifier" />
          <el-option label="管理员" value="admin" />
        </el-select>
      </el-form-item>
      <el-form-item label="会员等级">
        <el-select v-model="form.level" style="width:100%;">
          <el-option label="青铜" value="bronze" />
          <el-option label="白银" value="silver" />
          <el-option label="黄金" value="gold" />
        </el-select>
      </el-form-item>
      <el-alert title="注意：修改角色和等级会立即生效，请谨慎操作" type="warning" :closable="false" show-icon />
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  user: Object
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const form = reactive({ nickname: '', role: 'user', level: 'bronze' })

watch(() => props.user, (u) => {
  if (u) {
    form.nickname = u.nickname || ''
    form.role = u.role || 'user'
    form.level = u.level || 'bronze'
  }
}, { immediate: true })

function handleSave() {
  emit('confirm', { ...form })
  emit('update:modelValue', false)
}
</script>
