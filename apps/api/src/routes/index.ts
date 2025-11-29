import { OpenAPIHono } from "@hono/zod-openapi";
import slackRoutes from "@api/modules/slack/routes/index";

const routes = new OpenAPIHono();
routes.route("/slack", slackRoutes);

export default routes;

