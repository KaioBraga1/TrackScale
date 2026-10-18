import type { Release } from "../search/releaseSearch";

export interface SmartlinkLink {
  platform: string;
  url: string;
}

export interface Smartlink extends Release {
  links: SmartlinkLink[];
}

export interface ClickEvent {
  id: string;
  smartlinkId: string;
  platform: string;
  at: string;
  /** Campanha de origem (parâmetro `tsc` no link rastreado). */
  campaignId?: string;
}

export const CURRENT_USER_ID = "u1";
