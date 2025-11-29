import { OpenAPIHono } from "@hono/zod-openapi";
import slackRoutes from "@api/modules/slack/routes/index";

const routes = new OpenAPIHono().route("/api/slack", slackRoutes);

export default routes;

