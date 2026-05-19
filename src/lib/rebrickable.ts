import type { RebrickableColor, RebrickablePagedResponse, RebrickablePart, RebrickablePartColorDetails, RebrickablePartDetails, RebrickableSet } from '@/types/rebrickable'

const API_BASE = "https://rebrickable.com/api/v3/lego";

function getApiKey() {
  return import.meta.env.REBRICKABLE_API_KEY ?? "";
}

async function rebrickableFetch<T>(path: string): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing REBRICKABLE_API_KEY environment variable");
  }
  const response = await fetch(`${API_BASE}${path}/?key=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Rebrickable API error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function rebrickableFetchAbsolute<T>(url: string): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing REBRICKABLE_API_KEY environment variable");
  }
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}key=${apiKey}`);
  if (!response.ok) {
    throw new Error(`Rebrickable API error ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchRebrickableSet(setNumber: string): Promise<RebrickableSet> {
  return rebrickableFetch<RebrickableSet>(`/sets/${setNumber}/`);
}

export async function fetchRebrickableSetParts(setNumber: string): Promise<RebrickablePart[]> {
  const firstPage = await rebrickableFetch<RebrickablePagedResponse<RebrickablePart>>(`/sets/${setNumber}/parts`);
  const parts: RebrickablePart[] = [...firstPage.results];
  let next = firstPage.next;
  while (next) {
    const page = await rebrickableFetchAbsolute<RebrickablePagedResponse<RebrickablePart>>(next);
    parts.push(...page.results);
    next = page.next;
  }
  return parts;
}

export async function fetchRebrickableSetWithParts(setNumber: string): Promise<{ set: RebrickableSet; parts: RebrickablePart[] }> {
  const [set, parts] = await Promise.all([fetchRebrickableSet(setNumber), fetchRebrickableSetParts(setNumber)]);
  return { set, parts };
}

export async function fetchRebrickableColors(): Promise<RebrickableColor[]> {
  const firstPage = await rebrickableFetch<RebrickablePagedResponse<RebrickableColor>>(`/colors`);
  const colors: RebrickableColor[] = [...firstPage.results];
  let next = firstPage.next;
  while (next) {
    const page = await rebrickableFetchAbsolute<RebrickablePagedResponse<RebrickableColor>>(next);
    colors.push(...page.results);
    next = page.next;
  }
  return colors;
}

export async function fetchRebrickablePart(partNum: string): Promise<RebrickablePartDetails> {
  const partFullDetails = await rebrickableFetch<RebrickablePartDetails>(`/parts/${partNum}/`);

  const partDetails = {
    part_num: partFullDetails.part_num,
    name: partFullDetails.name,
    part_img_url: partFullDetails.part_img_url,
  }
  return partDetails;
}

export async function fetchRebrickablePartColors(partNum: string): Promise<RebrickablePartColorDetails[]> {
  const firstPage = await rebrickableFetch<RebrickablePagedResponse<RebrickablePartColorDetails>>(`/parts/${partNum}/colors`);
  
  const RebrickableColors: RebrickablePartColorDetails[] = [...firstPage.results];

  let next = firstPage.next;
  while (next) {
    const page = await rebrickableFetchAbsolute<RebrickablePagedResponse<RebrickablePartColorDetails>>(next);
    RebrickableColors.push(...page.results);
    next = page.next;
  }

  const colors = RebrickableColors.map(color => ({
    color_id: color.color_id,
    color_name: color.color_name,
    part_img_url: color.part_img_url,
    elements: color.elements,
  }));

  return colors;
}
