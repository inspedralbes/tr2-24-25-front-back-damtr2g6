
// Composables
import { createRouter, createWebHistory } from 'vue-router';
import Index from '@/pages/index.vue';
import Login from '@/pages/Login.vue';
import Register from '@/pages/Register.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/home',
      name: 'home',
      component: Index,
      meta: { requiresAuth: true },
    },
    {
      path: '/',
      name: 'login',
      component: Login,
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/pages/Search.vue'), // Lazy load
      meta: { requiresAuth: true },
    },
    {
      path: '/my-pis',
      name: 'my-pis',
      component: () => import('@/pages/MyPis.vue'),
      meta: { requiresAuth: true },
    },
  ],
});

let sessionChecked = false;

router.beforeEach(async (to, from, next) => {
  const loggedIn = localStorage.getItem('user');

  // Si hay usuario local, validamos contra backend UNA vez (cuando refrescas o entras)
  if (loggedIn && !sessionChecked) {
    try {
      const user = JSON.parse(loggedIn);
      if (user && user.id) {
        // Hacemos la petición
        const res = await fetch(`/api/users/${user.id}/exists`);

        if (res.status === 404) {
          // El usuario no existe en DB (ej: reinicio Docker)
          console.warn('Usuario invalido o BBDD reiniciada. Cerrando sesión.');
          localStorage.removeItem('user');
          // Redirigir a login
          if (to.path !== '/') return next('/');
        } else if (res.ok) {
          // Todo OK
          sessionChecked = true;
        }
      }
    } catch (e) {
      console.error('Error validando sesión (Backend offline?):', e);
      // Si falla la red, no borramos sesión por si acaso es temporal, 
      // pero no marcamos sessionChecked=true para reintentar luego.
    }
  }

  // Volvemos a leer por si se ha borrado arriba
  const currentUser = localStorage.getItem('user');

  if (to.matched.some(record => record.meta.requiresAuth) && !currentUser) {
    next('/');
  } else if (currentUser && (to.name === 'login' || to.name === 'register')) {
    next('/home');
  } else {
    next();
  }
});

// Workaround for https://github.com/vitejs/vite/issues/11804
router.onError((err, to) => {
  if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
    if (localStorage.getItem('vuetify:dynamic-reload')) {
      console.error('Dynamic import error, reloading page did not fix it', err);
    } else {
      console.log('Reloading page to fix dynamic import error');
      localStorage.setItem('vuetify:dynamic-reload', 'true');
      location.assign(to.fullPath);
    }
  } else {
    console.error(err);
  }
});

router.isReady().then(() => {
  localStorage.removeItem('vuetify:dynamic-reload');
});

export default router;
