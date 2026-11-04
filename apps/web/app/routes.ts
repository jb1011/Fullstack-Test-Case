import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("pages/home.tsx"),
  route("opportunities/:id", "pages/opportunity.tsx"),
] satisfies RouteConfig;
