/**
 * WoW raid utilities by class: Lust, Battle Rez, buffs and debuffs.
 * Used to show missing utilities in composition builder.
 */

export interface RaidUtility {
  id: string;
  name: string;
  classes: string[];
}

export const LUST: RaidUtility = {
  id: "lust",
  name: "Lust (Bloodlust/Time Warp)",
  classes: ["Shaman", "Mage", "Hunter", "Evoker"],
};

export const BATTLE_REZ: RaidUtility = {
  id: "battle_rez",
  name: "Battle Rez",
  classes: ["Druid", "Death Knight", "Warlock", "Evoker"],
};

export const RAID_BUFFS: RaidUtility[] = [
  { id: "arcane_intellect", name: "Arcane Intellect", classes: ["Mage"] },
  { id: "mark_of_wild", name: "Mark of the Wild", classes: ["Druid"] },
  { id: "close_to_heart", name: "Close to Heart", classes: ["Monk"] },
  { id: "devotion_aura", name: "Devotion Aura", classes: ["Paladin"] },
  { id: "power_infusion", name: "Power Infusion", classes: ["Priest"] },
  { id: "prayer_of_fortitude", name: "Prayer of Fortitude", classes: ["Priest"] },
  { id: "windfury_totem", name: "Windfury Totem", classes: ["Shaman"] },
  { id: "battle_shout", name: "Battle Shout", classes: ["Warrior"] },
];

export const RAID_DEBUFFS: RaidUtility[] = [
  { id: "chaos_brand", name: "Chaos Brand", classes: ["Demon Hunter"] },
  { id: "hunters_mark", name: "Hunter's Mark", classes: ["Hunter"] },
];

export function getClassesInComposition(
  slots: Array<{ char: { classe?: string }; saved?: boolean } | null>,
  unsavedOnly = false
): Set<string> {
  const classes = new Set<string>();
  for (const slot of slots) {
    if (!slot?.char?.classe) continue;
    if (unsavedOnly && slot.saved) continue;
    classes.add(slot.char.classe);
  }
  return classes;
}

export function checkUtility(
  utility: RaidUtility,
  classesInComp: Set<string>
): { has: boolean; providedBy?: string } {
  for (const c of utility.classes) {
    if (classesInComp.has(c)) {
      return { has: true, providedBy: c };
    }
  }
  return { has: false };
}
