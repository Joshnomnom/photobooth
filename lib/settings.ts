import { DEFAULT_MACHINE, type Machine, machineById } from "./machines";
import { layoutById } from "./strip";

export type Mode = "film" | "digital";
export type Timer = "3" | "5" | "10";

export type Settings = {
  machineId: string;
  /** Paper within the machine's set. */
  paperId: string;
  /** Layout within the machine's set. */
  layoutId: string;
  timer: Timer;
  /** Film: one press shoots the whole strip, no retakes. Digital: one shot per press, retakes allowed. */
  mode: Mode;
  mirror: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  machineId: DEFAULT_MACHINE.id,
  paperId: DEFAULT_MACHINE.papers[0].id,
  layoutId: DEFAULT_MACHINE.layouts[0],
  timer: "3",
  mode: "film",
  mirror: true,
};

/** Switching machines keeps paper/layout only if the new machine offers them. */
export function withMachine(settings: Settings, machine: Machine): Settings {
  return {
    ...settings,
    machineId: machine.id,
    paperId: machine.papers.some((p) => p.id === settings.paperId) ? settings.paperId : machine.papers[0].id,
    layoutId: machine.layouts.includes(settings.layoutId) ? settings.layoutId : machine.layouts[0],
  };
}

export function resolve(settings: Settings) {
  const machine = machineById(settings.machineId);
  return {
    machine,
    filter: machine.filter,
    paper: machine.papers.find((p) => p.id === settings.paperId) ?? machine.papers[0],
    layout: layoutById(machine.layouts.includes(settings.layoutId) ? settings.layoutId : machine.layouts[0]),
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
