import { createRouter, createWebHistory } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { useSession } from './session';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'sign-in',
      component: () => import('@/pages/SignInPage.vue'),
      meta: { guest: true },
    },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: { name: 'orders' } },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('@/pages/OrdersPage.vue'),
        },
        {
          path: 'orders/:id',
          name: 'order',
          component: () => import('@/pages/OrderDetailPage.vue'),
          props: true,
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('@/pages/ProductsPage.vue'),
        },
        {
          path: 'products/new',
          name: 'product-new',
          component: () => import('@/pages/ProductFormPage.vue'),
        },
        {
          path: 'products/:id',
          name: 'product',
          component: () => import('@/pages/ProductFormPage.vue'),
          props: true,
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('@/pages/CategoriesPage.vue'),
        },
        {
          path: 'gallery',
          name: 'gallery',
          component: () => import('@/pages/GalleryPage.vue'),
        },
        {
          path: 'gallery/new',
          name: 'gallery-new',
          component: () => import('@/pages/GalleryFormPage.vue'),
        },
        {
          path: 'gallery/:id',
          name: 'gallery-item',
          component: () => import('@/pages/GalleryFormPage.vue'),
          props: true,
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const session = useSession();
  await session.restore();
  if (to.meta.guest) return session.isSignedIn.value ? { name: 'orders' } : true;
  if (!session.isSignedIn.value) return { name: 'sign-in', query: { redirect: to.fullPath } };
  return true;
});
