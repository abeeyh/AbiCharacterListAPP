"use server";

import {
  dbListPlayers,
  dbGetPlayer,
  dbSavePlayer,
  dbDeletePlayer,
  dbListCompositions,
  dbGetComposition,
  dbSaveComposition,
  dbDeleteComposition,
  type MembroData,
  type CompositionData,
} from "./db-data";

// --- Players ---

export async function getMembers(): Promise<MembroData[]> {
  return dbListPlayers();
}

export async function getMember(id: string): Promise<MembroData | null> {
  return dbGetPlayer(id);
}

export async function saveMember(
  data: Omit<MembroData, "id"> & { id?: string }
): Promise<MembroData> {
  return dbSavePlayer(data);
}

export async function deleteMember(id: string): Promise<void> {
  return dbDeletePlayer(id);
}

// --- Compositions ---

export async function getCompositions(): Promise<CompositionData[]> {
  return dbListCompositions();
}

export async function getComposition(
  id: string
): Promise<CompositionData | null> {
  return dbGetComposition(id);
}

export async function saveComposition(
  data: Omit<CompositionData, "id"> & { id?: string }
): Promise<CompositionData> {
  return dbSaveComposition(data);
}

export async function deleteComposition(id: string): Promise<void> {
  return dbDeleteComposition(id);
}
