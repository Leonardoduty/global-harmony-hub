import { createServerFn } from "@tanstack/react-start";
import { getWorldState, updateWorldState, type WorldState } from "@/lib/worldState";

export const fetchWorldState = createServerFn({ method: "GET" }).handler(async () => {
  return { state: getWorldState() };
});

export const patchWorldState = createServerFn({ method: "POST" })
  .inputValidator((input: Partial<WorldState>) => input)
  .handler(async ({ data }) => {
    const updated = updateWorldState(data);
    return { state: updated };
  });
