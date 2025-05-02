import { createRouter, createWebHistory } from "vue-router";
const Patcher = () => import("../views/Patcher.vue");

const routes = [
  {
    path: "/",
    name: "Patcher",
    component: Patcher,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
