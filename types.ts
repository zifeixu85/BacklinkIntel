
export interface Site {
  id: string;
  name: string;
  canonicalHost: string;
  createdAt: number;
  updatedAt: number;
}

export interface SnapshotMetrics {
  backlinksTotal: number;
  referringDomainsTotal: number;
  dofollowBacklinksTotal: number;
  dofollowRefDomainsTotal: number;
  firstSeenMin: number | null;
  firstSeenMax: number | null;
}

export interface Snapshot {
  id: string;
  siteId: string;
  sourceFileName: string;
  importedAt: number;
  dataCutoffAt: number | null;
  rowCount: number;
  notes?: string;
  metrics: SnapshotMetrics;
}

export interface BacklinkRow {
  id: string;
  snapshotId: string;
  siteId: string;
  refPageUrl: string;
  refDomain: string;
  targetUrl: string;
  firstSeen: number | null;
  lastSeen: number | null;
  anchor: string | null;
  nofollow: boolean;
  ugc: boolean;
  sponsored: boolean;
  dr: number | null;
  domainTraffic: number | null;
  urlRating: number | null;
  pageTraffic: number | null;
  externalLinks: number | null;
  language: string | null;
  extra?: any;
}

export type PricingType = "free" | "paid" | "unknown";
export type LinkStatus = "not_tried" | "submitted" | "live" | "rejected" | "maintenance";

export interface LinkLibraryDomain {
  id: string;
  domain: string;
  displayName?: string;
  typeTags: string[];
  pricingType: PricingType;
  priceAmount: number | null;
  currency: string;
  submissionUrl: string | null;
  contact: string | null;
  status: LinkStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryUsageEdge {
  domainId: string;
  siteId: string;
  countBacklinks: number;
  lastSeen: number | null;
}
