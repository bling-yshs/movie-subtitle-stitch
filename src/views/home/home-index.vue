<template>
  <div>
    <div class="text-orange-500">
      hello world
    </div>
    <Button class="active:scale-95" @click="hello">
      这是一个测试按钮哦~
    </Button>
    <Input v-model="inp" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Hello } from '@/entity/hello.ts'

const inp = ref('')

async function hello() {
  const hello = new Hello('abc')
  console.warn(hello.s)
}
</script>
