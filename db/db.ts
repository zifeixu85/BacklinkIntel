import Dexie, { Table } from 'dexie';
import { Site, Snapshot, BacklinkRow, LinkLibraryDomain } from '../types';

export class BacklinkIntelDB extends Dexie {
  sites!: Table<Site>;
  snapshots!: Table<Snapshot>;
  backlinks!: Table<BacklinkRow>;
  library!: Table<LinkLibraryDomain>;

  constructor() {
    super('BacklinkIntelDB');
    (this as any).version(1).stores({
      sites: 'id, name, canonicalHost',
      snapshots: 'id, siteId, importedAt, dataCutoffAt',
      backlinks: 'id, snapshotId, siteId, refDomain, [snapshotId+refDomain]',
      library: 'id, &domain, pricingType, status'
    });
  }
}

export const db = new BacklinkIntelDB();