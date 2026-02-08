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
  classes: ["Druid", "Death Knight", "Warlock", "Monk", "Evoker"],
};

export const RAID_BUFFS: RaidUtility[] = [
  { id: "stamina", name: "Stamina (Fortitude)", classes: ["Priest"] },
  { id: "intellect", name: "Intellect", classes: ["Mage"] },
  { id: "attack_power", name: "Attack Power", classes: ["Warrior", "Paladin", "Hunter"] },
  { id: "haste", name: "Haste (Windfury)", classes: ["Shaman"] },
  { id: "mark_of_wild", name: "Mark of the Wild", classes: ["Druid"] },
  { id: "versatility", name: "Versatility", classes: ["Monk"] },
  { id: "critical_strike", name: "Critical Strike", classes: ["Mage", "Hunter"] },
  { id: "mastery", name: "Mastery", classes: ["Shaman"] },
];

export const RAID_DEBUFFS: RaidUtility[] = [
  { id: "mystic_touch", name: "Mystic Touch (Físico +5%)", classes: ["Monk"] },
  { id: "chaos_brand", name: "Chaos Brand (Mágico +5%)", classes: ["Warlock", "Demon Hunter"] },
  { id: "mortal_wounds", name: "Mortal Wounds (Heal redução)", classes: ["Warrior", "Rogue", "Hunter", "Demon Hunter"] },
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
