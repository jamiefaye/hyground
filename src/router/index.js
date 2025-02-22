import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../MainView.vue'
import Editors from '../Editors.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: MainView
    },
    {
      path: '/editor',
      name: 'editor',
      component: Editors
    },
  ]
})


export default router
