
// Composables
import { createRouter, createWebHistory } from 'vue-router';
import Index from '@/pages/index.vue';
import Login from '@/pages/Login.vue';
import Register from '@/pages/Register.vue';
import PiDashboard from '@/pages/PiDashboard.vue'; // Importa el nuevo componente del Dashboard

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
      path: '/login',
      name: 'login',
      component: Login,
    },
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
    },

    {
      path: '/my-pis',
      name: 'my-pis',
      component: () => import('@/pages/MyPis.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/Profile.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/center-users',
      name: 'center-users',
      component: () => import('@/pages/CenterUsers.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/dashboard', // Nueva ruta para el dashboard
      name: 'dashboard',
      component: PiDashboard,
    },
  ],
});

let sessionChecked = false;

router.beforeEach(async (to, from, next) => {
  const loggedIn = localStorage.getItem('user');

  // Si hay usuario local, validamos contra backend UNA vez (cuando refrescas o entras)
  // NOTA: Hemos eliminado la validación proactiva /exists porque causaba bucles infinitos
  // con el router guard. Confiaremos en que las llamadas API fallen con 401 si la sesión es mala.
  if (loggedIn && !sessionChecked) {
    sessionChecked = true;
  }

  // Volvemos a leer por si se ha borrado arriba
  const currentUser = localStorage.getItem('user');

  if (to.matched.some(record => record.meta.requiresAuth) && !currentUser) {
    if (to.name !== 'login') {
      next({ name: 'login' });
    } else {
      next();
    }
  } else if (currentUser && (to.name === 'login' || to.name === 'register' || to.path === '/')) {
    next({ name: 'home' });
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
