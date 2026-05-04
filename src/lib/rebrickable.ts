const API_BASE = "https://rebrickable.com/api/v3/lego";

export interface RebrickableSet {
  set_num: string;
  name: string;
  year: number;
  num_parts: number;
  set_img_url: string | null;
  set_url: string;
  last_modified_dt: string;
}

export interface RebrickablePart {
  id: number;
  inv_part_id: number;
  part: {
    part_num: string;
    name: string;
    part_cat_id: number;
    part_url: string;
    part_img_url: string | null;
    external_ids: Record<string, string[] | number[] | null>;
    print_of: string | null;
  };
  color: {
    id: number;
    name: string;
    rgb: string;
    is_trans: boolean;
    external_ids: Record<string, string[] | number[] | null>;
  };
  set_num: string;
  quantity: number;
  is_spare: boolean;
  element_id: string | null;
  num_sets: number;
}

export interface RebrickableColor {
  id: number;
  name: string;
  rgb: string;
  is_trans: boolean;
}

export interface RebrickablePagedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface RebrickablePartColor {
  color: {
    id: number;
    name: string;
    rgb: string;
    is_trans: boolean;
  };
  elements: string[];
  set_count: number;
  part_count: number;
}

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

export interface RebrickablePartDetails {
  part_num: string;
  name: string;
  part_cat_id: number;
  part_url: string;
  part_img_url: string | null;
  external_ids: Record<string, string[] | number[] | null>;
  print_of: string | null;
}

export interface RebrickablePartColor {
  color: RebrickableColor;
  elements: string[];
  set_count: number;
  part_count: number;
}

export interface RebrickablePartColorDetails {
  color_id: number,
  color_name: string,
  num_sets: number,
  num_set_parts: number,
  part_img_url: string,
  elements: string[],
  colorRgb: string
}

export async function fetchRebrickablePart(partNum: string): Promise<RebrickablePartDetails> {
  return rebrickableFetch<RebrickablePartDetails>(`/parts/${partNum}/`);
}

export async function fetchRebrickablePartColors(partNum: string): Promise<RebrickablePartColor[]> {
  const firstPage = await rebrickableFetch<RebrickablePagedResponse<RebrickablePartColor>>(`/parts/${partNum}/colors`);
  const colors: RebrickablePartColor[] = [...firstPage.results];
  let next = firstPage.next;
  while (next) {
    const page = await rebrickableFetchAbsolute<RebrickablePagedResponse<RebrickablePartColor>>(next);
    colors.push(...page.results);
    next = page.next;
  }
  return colors;
}
