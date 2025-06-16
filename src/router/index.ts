
import { createRouter, createWebHistory } from 'vue-router'
import {useAuthStore} from "@/stores/auth.ts";


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    }
  ],
})

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();

  // if (to.path === '/profile' && !auth.token) {
  //   next('/login');
  // } else if (to.path === '/features/create' && !auth.token) {
  //   next('/login');
  // } else {
  //   next();
  // }
  next();
});

export default router
