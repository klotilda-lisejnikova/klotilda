import { createRouter, createWebHistory } from 'vue-router';
import { isEmailTemplateKey, isLegalDocumentKey } from '@klotilda/domain';
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
        {
          path: '',
          name: 'overview',
          component: () => import('@/pages/OverviewPage.vue'),
        },
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
          path: 'shipping',
          name: 'shipping-methods',
          component: () => import('@/pages/ShippingMethodsPage.vue'),
        },
        {
          path: 'payments',
          name: 'payment-methods',
          component: () => import('@/pages/PaymentMethodsPage.vue'),
        },
        {
          path: 'seller',
          name: 'seller',
          component: () => import('@/pages/SellerPage.vue'),
        },
        {
          path: 'legal',
          name: 'legal-documents',
          component: () => import('@/pages/LegalDocumentsPage.vue'),
        },
        {
          path: 'legal/:document',
          name: 'legal-document',
          component: () => import('@/pages/LegalDocumentPage.vue'),
          props: true,
          // Only the legal pages there are have a page; any other goes back to the list.
          beforeEnter: (to) =>
            isLegalDocumentKey(String(to.params.document)) || { name: 'legal-documents' },
        },
        {
          path: 'emails',
          name: 'email-templates',
          component: () => import('@/pages/EmailTemplatesPage.vue'),
        },
        {
          path: 'emails/:templateKey',
          name: 'email-template',
          component: () => import('@/pages/EmailTemplatePage.vue'),
          props: true,
          // Only the fixed e-mails have a page; any other key goes back to the list.
          beforeEnter: (to) =>
            isEmailTemplateKey(String(to.params.templateKey)) || { name: 'email-templates' },
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
  if (to.meta.guest) return session.isSignedIn.value ? { name: 'overview' } : true;
  if (!session.isSignedIn.value) return { name: 'sign-in', query: { redirect: to.fullPath } };
  return true;
});
