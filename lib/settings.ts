import { FILTERS } from "./filters";
import { FRAMES, LAYOUTS } from "./strip";

export type Mode = "film" | "digital";
export type Timer = "3" | "5" | "10";

export type Settings = {
  layoutId: string;
  filterId: string;
  frameId: string;
  timer: Timer;
  /** Film: one press shoots the whole strip, no retakes. Digital: one shot per press, retakes allowed. */
  mode: Mode;
  mirror: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  layoutId: "strip-4",
  filterId: "warm",
  frameId: "paper",
  timer: "3",
  mode: "film",
  mirror: true,
};

export function resolve(settings: Settings) {
  return {
    layout: LAYOUTS.find((l) => l.id === settings.layoutId) ?? LAYOUTS[0],
    filter: FILTERS.find((f) => f.id === settings.filterId) ?? FILTERS[0],
    frame: FRAMES.find((f) => f.id === settings.frameId) ?? FRAMES[0],
  };
}

export const POSE_PROMPTS = [
  "Big smile!",
  "Now look serious.",
  "Silly face!",
  "Look surprised!",
  "Squeeze in close.",
  "Strike a pose.",
  "Look off into the distance.",
  "Peace sign!",
  "Laugh like you mean it.",
  "Blow a kiss.",
];
