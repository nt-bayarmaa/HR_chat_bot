import { OpenAPIHono } from "@hono/zod-openapi";
import chatRoute from "./chat";
import assistantRoute from "./assistant";

const routes = new OpenAPIHono();
routes.route("/", chatRoute);
routes.route("/", assistantRoute);

export default routes;

