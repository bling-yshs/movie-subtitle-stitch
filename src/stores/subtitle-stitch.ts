import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSubtitleStitchStore = defineStore('subtitle-stitch', () => {
  const exportFormat = ref<'png' | 'jpeg'>('jpeg')
  const exportQuality = ref([80])

  return {
    exportFormat,
    exportQuality,
  }
}, {
  persist: true,
})
