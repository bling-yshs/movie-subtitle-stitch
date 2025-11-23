import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/subtitle-stitch',
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('@/views/home/home-index.vue'),
    },
    {
      path: '/subtitle-stitch',
      name: 'subtitle-stitch',
      component: () => import('@/views/subtitle-stitch/subtitle-stitch-index.vue'),
    },
  ],
})

export default router
