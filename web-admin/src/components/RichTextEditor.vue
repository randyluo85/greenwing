<template>
  <div class="rich-text-editor-container">
    <Toolbar
      class="editor-toolbar"
      :editor="editorRef"
      :defaultConfig="toolbarConfig"
      :mode="mode"
    />
    <Editor
      class="editor-content"
      v-model="valueHtml"
      :defaultConfig="editorConfig"
      :mode="mode"
      @onCreated="handleCreated"
    />
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css'
import { onBeforeUnmount, ref, shallowRef, watch, onMounted } from 'vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { uploadFile, getTempFileURL, resolveHtml, compressImage, IMAGE_CONFIG } from '@/utils/cloud'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '请输入内容...'
  },
  height: {
    type: String,
    default: '400px'
  }
})

const emit = defineEmits(['update:modelValue'])

// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()
const mode = 'default'

// 内容 HTML (编辑器展示用的，含 HTTPS 临时链接)
const valueHtml = ref('')
// 临时链接与 cloud:// ID 的映射表
const urlMap = ref(new Map())
const isInternalChange = ref(false)

// 初始加载
onMounted(async () => {
  if (props.modelValue) {
    // 提取已有的 cloud:// ID 并建立初始映射（虽然此时没有 tempURL，但在 save 时没映射的不会被替换）
    const cloudIdRegex = /cloud:\/\/[\w\.\-\/]+/g
    const matches = props.modelValue.match(cloudIdRegex) || []
    
    const res = await resolveHtml(props.modelValue)
    valueHtml.value = res.html
    urlMap.value = res.map
  }
})

// 监听外部传参变化
watch(() => props.modelValue, async (newVal) => {
  // 如果是内部变动引起的外部同步，则跳过
  if (isInternalChange.value) {
    isInternalChange.value = false
    return
  }

  if (!newVal) {
    valueHtml.value = ''
    return
  }
  // 如果外部传入的值和我们「转换回存储格式」的值不同，才更新
  if (newVal !== convertToStorageHtml(valueHtml.value)) {
    const res = await resolveHtml(newVal)
    valueHtml.value = res.html
    // 合并映射表（如果已有内容，避免丢失之前的上传映射）
    res.map.forEach((v, k) => urlMap.value.set(k, v))
  }
})

// 监听内部内容变化，同步到外部
watch(valueHtml, (newVal) => {
  const storageHtml = convertToStorageHtml(newVal)
  if (storageHtml !== props.modelValue) {
    isInternalChange.value = true
    emit('update:modelValue', storageHtml)
  }
})

/**
 * 将编辑器内的 HTML (含 HTTPS) 转为存储用的 HTML (含 cloud://)
 */
function convertToStorageHtml(html) {
  if (!html) return ''
  let result = html
  urlMap.value.forEach((cloudId, tempUrl) => {
    // 替换 src 中的链接
    const escapedUrl = tempUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escapedUrl, 'g')
    result = result.replace(regex, cloudId)
  })
  return result
}

// 工具栏配置
const toolbarConfig = {
  excludeKeys: [
    'fullScreen'
  ]
}

// 编辑器配置
const editorConfig = {
  placeholder: props.placeholder,
  MENU_CONF: {}
}


// 图片上传自定义配置
editorConfig.MENU_CONF['uploadImage'] = {
  async customUpload(file, insertFn) {
    try {
      // 1. 压缩图片 (如果不是 GIF)
      let fileToUpload = file
      if (file.size > IMAGE_CONFIG.MAX_SIZE_BYTES) {
        try {
          fileToUpload = await compressImage(file)
        } catch (e) {
          console.warn('图片压缩失败，将使用原图上传', e)
        }
      }

      // 2. 上传到云存储
      const safeName = fileToUpload.name.replace(/[^\w.\-]/g, '_')
      const cloudPath = `editor/${Date.now()}_${safeName}`
      const fileID = await uploadFile(cloudPath, fileToUpload)
      
      // 3. 获取临时链接并插入
      const fileList = await getTempFileURL([fileID])
      const tempUrl = fileList[0]?.tempFileURL || fileID
      
      // 记录映射关系，以便保存时转回 cloud://
      urlMap.value.set(tempUrl, fileID)
      
      insertFn(tempUrl, file.name, tempUrl)
    } catch (err) {
      console.error('RichTextEditor Image Upload Error:', err)
      ElMessage.error('图片上传失败: ' + (err.message || '未知错误'))
    }
  }
}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

const handleCreated = (editor) => {
  editorRef.value = editor // 记录 editor 实例
}
</script>

<style scoped>
.rich-text-editor-container {
  border: 1px solid var(--color-border-medium);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: white;
  transition: border-color var(--transition-fast);
}

.rich-text-editor-container:focus-within {
  border-color: var(--color-primary);
}

.editor-toolbar {
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-fill-light);
}

.editor-content {
  height: v-bind(height) !important;
  overflow-y: auto;
}

/* 覆盖 wangeditor 默认样式以匹配项目风格 */
:deep(.w-e-text-container) {
  background-color: transparent !important;
}

:deep(.w-e-toolbar) {
  background-color: var(--color-fill-light) !important;
  padding: 0 4px !important;
}

:deep(.w-e-text-placeholder) {
  font-style: normal !important;
  color: var(--color-text-tertiary) !important;
}
</style>
