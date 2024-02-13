export type Season = {
  id: number;
  name: string;
};

export type Episode = {
  season_id: string;

  order: number;
  name: string;

  finale: boolean;
  post_merge: boolean;
  merge_occurs: boolean;
};
