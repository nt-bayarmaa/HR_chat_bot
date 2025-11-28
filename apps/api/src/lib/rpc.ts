import { hc } from "hono/client";
import type apiRoutes from "../routes";

type ApiRoutes = typeof apiRoutes;

// create instance to inline type in build
// https://hono.dev/docs/guides/rpc#compile-your-code-before-using-it-recommended
const client = hc<ApiRoutes>("");
export type Client = typeof client;

export default (...args: Parameters<typeof hc>): Client =>
	hc<ApiRoutes>(...args);

