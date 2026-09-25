import { onRequest } from "../functions/[[path]].js";

export default {
    async fetch(request, env, ctx) {
        return onRequest({ request, env, ctx });
    }
};
