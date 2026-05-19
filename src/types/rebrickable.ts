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