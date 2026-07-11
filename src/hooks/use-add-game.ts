import { createAddMediaHook } from "./use-add-media";
import type { AddGameInput } from "@/lib/validations/game";

export const useAddGame = createAddMediaHook<AddGameInput>("games");