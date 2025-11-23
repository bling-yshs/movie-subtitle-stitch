```html
<script setup lang="ts">
import { Download, GripVertical, X } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { onUnmounted, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useSubtitleStitchStore } from '@/stores/subtitle-stitch'

interface StitchImage {
  id: string
  file: File
  url: string
  width: number
  height: number
}

const images = ref<StitchImage[]>([])
const subtitleRange = ref([70, 100]) // 默认范围 70% - 100%
const widthRange = ref([0, 100]) // 默认宽度范围 0% - 100%
const previewWidthRange = ref([0, 100]) // 预览用的宽度范围，与 Slider 解耦以优化性能
const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewUrl = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const previewContainerRef = ref<HTMLDivElement | null>(null)

// 导出设置 (从 Store 获取)
const store = useSubtitleStitchStore()
const { exportFormat, exportQuality } = storeToRefs(store)

// 拖拽状态
const isDragging = ref(false)
const dragIndex = ref<0 | 1 | null>(null)

// 监听 Slider 变化同步到预览 (仅在非拖拽时)
watch(widthRange, (newVal) => {
  if (!isDragging.value) {
    previewWidthRange.value = [...newVal]
  }
})

/**
 * 生成拼接图片 (预览用，始终全宽)
 * 仅在图片列表变化或台词区域滑块释放时调用
 */
function generateImage() {
  if (images.value.length === 0 || !canvasRef.value)
    return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx)
    return

  const baseWidth = images.value[0]?.width ?? 0
  if (baseWidth === 0)
    return

  let totalHeight = 0

  const upLim = subtitleRange.value[0] / 100
  const lowLim = subtitleRange.value[1] / 100

  // 计算总高度
  images.value.forEach((img, index) => {
    const scale = baseWidth / img.width
    const scaledHeight = img.height * scale

    if (index === 0) {
      // 第一张图片：保留 0 到 下限
      totalHeight += scaledHeight * lowLim
    }
    else {
      // 后续图片：保留 上限 到 下限
      totalHeight += scaledHeight * (lowLim - upLim)
    }
  })

  // 预览画布始终保持全宽，不进行水平裁剪
  canvas.width = baseWidth
  canvas.height = totalHeight

  let currentY = 0

  // 绘制图片
  images.value.forEach((imgObj, index) => {
    const img = new Image()
    img.src = imgObj.url

    const scale = baseWidth / imgObj.width
    const scaledHeight = imgObj.height * scale

    if (index === 0) {
      const sHeight = imgObj.height * lowLim
      const dHeight = scaledHeight * lowLim

      ctx.drawImage(
        img,
        0,
        0,
        imgObj.width,
        sHeight,
        0,
        currentY,
        baseWidth,
        dHeight,
      )
      currentY += dHeight
    }
    else {
      const sy = imgObj.height * upLim
      const sHeight = imgObj.height * (lowLim - upLim)
      const dHeight = scaledHeight * (lowLim - upLim)

      ctx.drawImage(
        img,
        0,
        sy,
        imgObj.width,
        sHeight,
        0,
        currentY,
        baseWidth,
        dHeight,
      )
      currentY += dHeight
    }
  })

  // 预览图片始终使用 PNG 以保证质量
  previewUrl.value = canvas.toDataURL('image/png')
}

/**
 * 下载拼接后的图片 (应用水平裁剪)
 */
function downloadStitchedImage() {
  if (!canvasRef.value)
    return

  const sourceCanvas = canvasRef.value
  const leftLim = widthRange.value[0] / 100
  const rightLim = widthRange.value[1] / 100
  const widthFactor = rightLim - leftLim

  // 创建临时 Canvas 进行裁剪
  const tempCanvas = document.createElement('canvas')
  tempCanvas.width = sourceCanvas.width * widthFactor
  tempCanvas.height = sourceCanvas.height
  const ctx = tempCanvas.getContext('2d')

  if (!ctx)
    return

  // 绘制裁剪后的图像
  ctx.drawImage(
    sourceCanvas,
    sourceCanvas.width * leftLim,
    0,
    sourceCanvas.width * widthFactor,
    sourceCanvas.height,
    0,
    0,
    tempCanvas.width,
    tempCanvas.height,
  )

  const type = `image/${exportFormat.value}`
  const quality = exportFormat.value === 'jpeg' ? exportQuality.value[0] / 100 : undefined
  const url = tempCanvas.toDataURL(type, quality)

  const link = document.createElement('a')
  link.href = url
  link.download = `stitched-subtitle.${exportFormat.value === 'jpeg' ? 'jpg' : 'png'}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 处理文件上传
 */
function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    Array.from(target.files).forEach((file) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        images.value.push({
          id: uuidv4(),
          file,
          url,
          width: img.width,
          height: img.height,
        })
        generateImage()
      }
      img.src = url
    })
  }
  // 重置 input 以便重复选择同一文件
  target.value = ''
}

/**
 * 触发文件选择框
 */
function triggerFileInput() {
  fileInputRef.value?.click()
}

/**
 * 移除图片
 */
function removeImage(index: number) {
  const img = images.value[index]
  if (img) {
    URL.revokeObjectURL(img.url)
    images.value.splice(index, 1)
    generateImage()
  }
}

/**
 * 拖拽结束回调
 */
function onDragEnd() {
  generateImage()
}

/**
 * 开始拖拽裁剪手柄
 */
function startDrag(index: 0 | 1, event: MouseEvent | TouchEvent) {
  // 阻止默认行为以防止滚动等
  if (event.cancelable) {
    event.preventDefault()
  }

  isDragging.value = true
  dragIndex.value = index

  // 添加鼠标事件监听
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)

  // 添加触摸事件监听
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend', stopDrag)
}

/**
 * 拖拽中
 */
function onDrag(event: MouseEvent | TouchEvent) {
  if (!previewContainerRef.value || dragIndex.value === null)
    return

  const rect = previewContainerRef.value.getBoundingClientRect()

  // 获取 X 坐标 (兼容鼠标和触摸)
  let clientX = 0
  if (event instanceof MouseEvent) {
    clientX = event.clientX
  }
  else if (event.touches && event.touches.length > 0) {
    clientX = event.touches[0].clientX
    // 触摸移动时阻止默认滚动
    if (event.cancelable) {
      event.preventDefault()
    }
  }
  else {
    return
  }

  const x = clientX - rect.left
  let percentage = (x / rect.width) * 100

  // 限制范围 0-100
  percentage = Math.max(0, Math.min(100, percentage))

  // 更新 previewWidthRange (不更新 Slider 以优化性能)
  const newRange = [...previewWidthRange.value]
  newRange[dragIndex.value] = Number(percentage.toFixed(1))

  // 确保左手柄在右手柄左侧
  if (dragIndex.value === 0) {
    if (newRange[0] >= newRange[1])
      newRange[0] = newRange[1] - 1
  }
  else {
    if (newRange[1] <= newRange[0])
      newRange[1] = newRange[0] + 1
  }

  previewWidthRange.value = newRange
}

/**
 * 停止拖拽
 */
function stopDrag() {
  isDragging.value = false
  dragIndex.value = null

  // 拖拽结束时同步到 Slider
  widthRange.value = [...previewWidthRange.value]

  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
}

// 组件卸载时清理事件监听
onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div class="container mx-auto py-4 md:py-8 px-4 md:px-0 min-h-screen md:h-screen flex flex-col">
    <h1 class="text-2xl md:text-3xl font-bold mb-4 md:mb-6">
      电影台词拼接工具
    </h1>

    <div class="flex flex-col-reverse md:flex-row gap-4 md:gap-6 flex-1 md:overflow-hidden">
      <!-- 左侧设置栏 -->
      <Card class="w-full md:w-1/3 flex flex-col h-auto md:h-full shrink-0">
        <CardContent class="flex-1 flex flex-col gap-4 md:gap-6 md:overflow-hidden p-4 md:p-6">
          <!-- 上传按钮 -->
          <div>
            <Label class="mb-2 block">上传图片</Label>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept="image/*"
              class="hidden"
              @change="handleFileUpload"
            >
            <Button class="w-full" @click="triggerFileInput">
              选择图片
            </Button>
          </div>

          <!-- 滑块设置 -->
          <div class="space-y-4">
            <div>
              <div class="flex justify-between mb-2">
                <Label>台词区域</Label>
                <span class="text-sm text-muted-foreground">{{ subtitleRange[0] }}% - {{ subtitleRange[1] }}%</span>
              </div>
              <Slider
                v-model="subtitleRange"
                :max="100"
                :step="1"
                :min-steps-between-thumbs="1"
                @value-commit="generateImage"
              />
            </div>

            <div>
              <div class="flex justify-between mb-2">
                <Label>图片宽度范围</Label>
                <span class="text-sm text-muted-foreground">{{ widthRange[0] }}% - {{ widthRange[1] }}%</span>
              </div>
              <Slider
                v-model="widthRange"
                :max="100"
                :step="0.1"
                :min-steps-between-thumbs="1"
              />
            </div>
          </div>

          <!-- 图片列表 (拖拽排序) -->
          <div class="flex-1 flex flex-col md:overflow-hidden min-h-[200px] md:min-h-0">
            <Label class="mb-2 block">图片列表 ({{ images.length }})</Label>
            <ScrollArea class="flex-1 border rounded-md p-2 h-full">
              <VueDraggable
                v-model="images"
                :animation="150"
                handle=".drag-handle"
                class="flex flex-col gap-2"
                @end="onDragEnd"
              >
                <div
                  v-for="(img, index) in images"
                  :key="img.id"
                  class="flex items-center gap-2 p-2 border rounded bg-card group"
                >
                  <!-- 拖拽手柄 -->
                  <div class="drag-handle cursor-move p-1 text-muted-foreground hover:text-foreground">
                    <GripVertical class="w-4 h-4" />
                  </div>

                  <img :src="img.url" class="w-12 h-12 object-cover rounded">
                  <div class="flex-1 truncate text-xs">
                    {{ img.file.name }}
                  </div>
                  <Button variant="destructive" size="icon" class="h-8 w-8" @click="removeImage(index)">
                    <X class="w-4 h-4" />
                  </Button>
                </div>
              </VueDraggable>
            </ScrollArea>
          </div>

          <!-- 导出设置 -->
          <div v-if="images.length > 0" class="space-y-4 border-t pt-4">
            <div class="flex items-center justify-between">
              <Label>导出格式</Label>
              <Select v-model="exportFormat">
                <SelectTrigger class="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">
                    PNG
                  </SelectItem>
                  <SelectItem value="jpeg">
                    JPG
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div v-if="exportFormat === 'jpeg'">
              <div class="flex justify-between mb-2">
                <Label>JPG 质量</Label>
                <span class="text-sm text-muted-foreground">{{ exportQuality[0] }}%</span>
              </div>
              <Slider
                v-model="exportQuality"
                :max="100"
                :step="1"
              />
            </div>

            <!-- 下载按钮 -->
            <Button v-if="previewUrl" class="w-full" @click="downloadStitchedImage">
              <Download class="w-4 h-4 mr-2" /> 下载图片
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- 预览区域 -->
      <Card class="w-full md:flex-1 h-[50vh] md:h-full overflow-hidden bg-muted/50 shrink-0">
        <CardContent class="h-full p-4 overflow-auto flex justify-center items-start">
          <div v-if="images.length === 0" class="text-muted-foreground text-center my-auto">
            请上传图片开始拼接
          </div>
          <div v-else class="relative shadow-lg select-none">
            <!-- 隐藏的 Canvas，用于生成图片 -->
            <canvas ref="canvasRef" class="hidden" />

            <!-- 预览容器 -->
            <div ref="previewContainerRef" class="relative group/preview">
              <img :src="previewUrl" class="max-w-full object-contain block">

              <!-- 左侧遮罩 -->
              <div
                class="absolute left-0 top-0 bottom-0 pointer-events-none border-2 border-red-500 z-10"
                :style="{
                  width: `${previewWidthRange[0]}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239, 68, 68, 0.3) 5px, rgba(239, 68, 68, 0.3) 10px)',
                }"
              />

              <!-- 右侧遮罩 -->
              <div
                class="absolute right-0 top-0 bottom-0 pointer-events-none border-2 border-red-500 z-10"
                :style="{
                  width: `${100 - previewWidthRange[1]}%`,
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239, 68, 68, 0.3) 5px, rgba(239, 68, 68, 0.3) 10px)',
                }"
              />

              <!-- 左侧手柄 -->
              <div
                class="absolute top-0 bottom-0 w-1 bg-primary cursor-col-resize z-10 flex items-center justify-center"
                :style="{ left: `${previewWidthRange[0]}%` }"
                @mousedown="startDrag(0, $event)"
                @touchstart.prevent="startDrag(0, $event)"
              >
                <div class="w-4 h-8 bg-primary rounded shadow-md flex items-center justify-center">
                  <div class="w-0.5 h-4 bg-white/50 rounded-full" />
                </div>
              </div>

              <!-- 右侧手柄 -->
              <div
                class="absolute top-0 bottom-0 w-1 bg-primary cursor-col-resize z-10 flex items-center justify-center -translate-x-full"
                :style="{ left: `${previewWidthRange[1]}%` }"
                @mousedown="startDrag(1, $event)"
                @touchstart.prevent="startDrag(1, $event)"
              >
                <div class="w-4 h-8 bg-primary rounded shadow-md flex items-center justify-center">
                  <div class="w-0.5 h-4 bg-white/50 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
