import { opportunitiesQuerySchema } from "@merkl/shared";
import type { Request } from "express";
import { Router } from "express";

import { FILTERS_TTL_MS, HISTORY_TTL_MS, LIST_TTL_MS } from "../cache/lifetimes";
import { publicCache } from "../http/cacheControl";
import { HttpError } from "../http/errors";
import { readQuery, validateQuery } from "../http/validateQuery";
import type { OpportunitiesService } from "../services/opportunities";

const idOf = (req: Request) => {
  const id = req.params.id;
  if (typeof id !== "string" || !/^\d+$/.test(id))
    throw new HttpError(400, "Invalid opportunity id");
  return id;
};

export const createOpportunitiesRouter = (service: OpportunitiesService) => {
  const router = Router();

  router.get("/filters", async (_req, res) => {
    res.set("Cache-Control", publicCache(FILTERS_TTL_MS)).json(await service.filters());
  });

  router.get("/opportunities", validateQuery(opportunitiesQuerySchema), async (_req, res) => {
    const query = readQuery(res, opportunitiesQuerySchema);
    res.set("Cache-Control", publicCache(LIST_TTL_MS)).json(await service.list(query));
  });

  router.get("/opportunities/:id/history", async (req, res) => {
    const history = await service.history(idOf(req));
    if (!history) throw new HttpError(404, "Opportunity not found");
    res.set("Cache-Control", publicCache(HISTORY_TTL_MS)).json(history);
  });

  router.get("/opportunities/:id", async (req, res) => {
    const detail = await service.get(idOf(req));
    if (!detail) throw new HttpError(404, "Opportunity not found");
    res.set("Cache-Control", publicCache(LIST_TTL_MS)).json(detail);
  });

  return router;
};
