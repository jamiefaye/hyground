import { createRouter, createWebHistory } from 'vue-router'
import MainView from '../MainView.vue'
import Editors from '../Editors.vue'
import BGREditor from '../BGREditor.vue'

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
    {
    	path: '/bgr',
      name: 'bgr',
      component: BGREditor
    }
  ]
})

export default router
