<template>
  <el-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :title="event ? '编辑活动' : '创建活动'" size="600px" direction="rtl">
    <div style="padding:0 4px;">
      <div class="section-title">基本信息</div>
      <el-form label-position="top" size="default">
        <el-form-item label="活动标题" required>
          <el-input v-model="form.title" placeholder="例: 《活着》读书会" />
        </el-form-item>
        <div style="display:flex;gap:12px;">
          <el-form-item label="分类" style="flex:1;">
            <el-select v-model="form.category" style="width:100%;">
              <el-option label="读书会" value="读书会" />
              <el-option label="特邀沙龙" value="特邀沙龙" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="活动人数" required style="flex:1;">
            <el-input-number v-model="form.quota" :min="1" style="width:100%;" />
          </el-form-item>
        </div>
        <div style="display:flex;gap:12px;">
          <el-form-item label="活动时间 (开始 - 结束)" required style="flex:2;">
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="[new Date(2000, 1, 1, 14, 0, 0), new Date(2000, 1, 1, 16, 0, 0)]"
              style="width:100%;"
            />
          </el-form-item>
          <el-form-item label="报名截止" required style="flex:1;">
            <el-date-picker v-model="form.registration_deadline" type="datetime" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DD HH:mm:ss" style="width:100%;" />
          </el-form-item>
        </div>
        <div style="display:flex;gap:12px;">
          <el-form-item label="活动地点" style="flex:1;">
            <el-input v-model="form.location" placeholder="例: 青翼书屋" />
          </el-form-item>
          <el-form-item label="主讲人" style="flex:1;">
            <el-input v-model="form.speaker" placeholder="例: 李老师" />
          </el-form-item>
        </div>
        <el-form-item label="封面图">
          <div class="upload-placeholder" @click="handleCoverUpload">
            <img v-if="coverImageUrl" :src="coverImageUrl" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md);" />
            <span v-else>点击上传封面图</span>
          </div>
          <div class="upload-tip">建议尺寸为 4:5 (800x1000)</div>
        </el-form-item>
        <el-form-item label="活动详情">
          <RichTextEditor v-model="form.description" placeholder="请输入活动详情描述..." height="300px" />
        </el-form-item>
      </el-form>

      <div class="section-title">报名模式</div>
      <div class="mode-cards">
        <div v-for="m in modes" :key="m.key" :class="['mode-card', { active: form.registration_mode === m.key }]" @click="form.registration_mode = m.key">
          <div class="mode-name">{{ m.label }}</div>
        </div>
      </div>
      <el-form label-position="top">
        <el-form-item v-if="form.registration_mode === 'points_only'" label="积分消耗">
          <el-input-number v-model="form.points_cost" :min="1" style="width:100%;" />
        </el-form-item>
        <el-form-item v-if="form.registration_mode === 'paid'" label="价格（元）">
          <el-input-number v-model="form.priceYuan" :min="0.01" :precision="2" style="width:100%;" />
        </el-form-item>
      </el-form>

      <div class="section-title">其他设置</div>
      <el-form label-position="top">
        <div style="display:flex;gap:12px;">
          <el-form-item label="活动奖励积分" style="flex:1;">
            <el-input-number v-model="form.reward_points" :min="0" style="width:100%;" />
          </el-form-item>
          <el-form-item label="初始状态" style="flex:1;">
            <el-select v-model="form.status" style="width:100%;">
              <el-option label="草稿" value="draft" />
              <el-option label="发布" value="published" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button @click="submit('draft')">保存草稿</el-button>
      <el-button type="primary" @click="submit('published')">发布活动</el-button>
    </template>
  </el-drawer>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import RichTextEditor from './RichTextEditor.vue'
import { uploadFile, getTempFileURL, compressImage, IMAGE_CONFIG } from '../utils/cloud'
import { ElMessage } from 'element-plus'

const props = defineProps({ modelValue: Boolean, event: Object })
const emit = defineEmits(['update:modelValue', 'submit'])

const modes = [
  { key: 'free', label: '免费报名' },
  { key: 'points_only', label: '积分兑换' },
  { key: 'paid', label: '付费报名' }
]

const defaultForm = { title: '', category: '读书会', quota: 30, event_time: '', event_end_time: '', registration_deadline: '', location: '', speaker: '', description: '', cover_image: '', registration_mode: 'free', points_cost: 0, priceYuan: 0, reward_points: 20, status: 'draft' }
const form = reactive({ ...defaultForm })
const timeRange = ref([])
const coverImageUrl = ref('')

watch(() => props.event, async (e) => {
  if (e) {
    Object.assign(form, { ...defaultForm, ...e, priceYuan: (e.price || 0) / 100 })
    // 初始化时间范围
    if (e.event_time) {
      timeRange.value = [e.event_time, e.event_end_time || '']
    } else {
      timeRange.value = []
    }
    
    const url = e.cover_image || ''
    if (url.startsWith('cloud://')) {
      const urls = await getTempFileURL([url])
      coverImageUrl.value = urls[0]?.tempFileURL || url
    } else {
      coverImageUrl.value = url
    }
  } else {
    Object.assign(form, defaultForm)
    timeRange.value = []
    coverImageUrl.value = ''
  }
}, { immediate: true })

// 监听抽屉打开状态，创建模式时重置表单
watch(() => props.modelValue, (newValue) => {
  if (newValue && !props.event) {
    // 抽屉打开且是创建模式时，确保表单被重置
    Object.assign(form, defaultForm)
    timeRange.value = []
    coverImageUrl.value = ''
  }
})

function submit(status) {
  // 从时间范围中拆分开始和结束时间
  if (timeRange.value && timeRange.value.length === 2) {
    form.event_time = timeRange.value[0]
    form.event_end_time = timeRange.value[1]
  }

  const data = { ...form, price: Math.round(form.priceYuan * 100), status }
  delete data.priceYuan
  emit('submit', data)
  emit('update:modelValue', false)
}

function handleCoverUpload() {
  const input = document.createElement('input')
  input.type = 'file'; input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      // 1. 压缩图片 (如果不是 GIF 且超过阈值)
      let fileToUpload = file
      if (file.size > IMAGE_CONFIG.MAX_SIZE_BYTES) {
        try {
          fileToUpload = await compressImage(file)
        } catch (e) {
          console.warn('图片压缩失败，使用原图', e)
        }
      }

      const safeName = fileToUpload.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `events/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, fileToUpload)
      form.cover_image = fileID
      const urls = await getTempFileURL([fileID])
      coverImageUrl.value = urls[0]?.tempFileURL || fileID
    } catch (err) { ElMessage.error('封面图上传失败') }
  }
  input.click()
}
</script>

<style scoped>
.section-title { color: var(--color-primary); font-weight: 600; font-size: var(--fs-base); margin: 20px 0 var(--sp-3); }
.section-title:first-child { margin-top: 0; }
.upload-placeholder { border: 2px dashed var(--color-border-medium); border-radius: var(--radius-md); padding: var(--sp-5); text-align: center; color: var(--color-text-tertiary); font-size: var(--fs-sm); cursor: pointer; }
.upload-tip { margin-top: 8px; font-size: 12px; color: var(--color-text-tertiary); line-height: 1.2; }
.mode-cards { display: flex; gap: var(--sp-2); }
.mode-card { flex: 1; padding: 10px; text-align: center; border: 1px solid var(--color-border-medium); border-radius: var(--radius-md); cursor: pointer; font-size: var(--fs-base); }
.mode-card.active { border: 2px solid var(--color-primary); background: var(--color-primary-light); }
.mode-name { font-weight: 500; color: var(--color-primary); }
.mode-card:not(.active) .mode-name { color: var(--color-text-secondary); }
</style>
