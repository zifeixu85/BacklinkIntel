import Dexie, { Table } from 'dexie';
import { Site, Snapshot, BacklinkRow, LinkLibraryDomain, OutreachProject, OutreachTask } from '../types';

export class BacklinkIntelDB extends Dexie {
  sites!: Table<Site>;
  snapshots!: Table<Snapshot>;
  backlinks!: Table<BacklinkRow>;
  library!: Table<LinkLibraryDomain>;
  projects!: Table<OutreachProject>;
  outreachTasks!: Table<OutreachTask>;

  constructor() {
    super('BacklinkIntelDB');
    (this as any).version(1).stores({
      sites: 'id, name, canonicalHost',
      snapshots: 'id, siteId, importedAt, dataCutoffAt',
      backlinks: 'id, snapshotId, siteId, refDomain, [snapshotId+refDomain]',
      library: 'id, &domain, pricingType, status'
    });
    (this as any).version(2).stores({
      sites: 'id, name, canonicalHost',
      snapshots: 'id, siteId, importedAt, dataCutoffAt',
      backlinks: 'id, snapshotId, siteId, refDomain, [snapshotId+refDomain]',
      library: 'id, &domain, pricingType, status, domainType',
      projects: 'id, siteId, createdAt',
      outreachTasks: 'id, projectId, libraryDomainId, domain, scheduledDate, status, [projectId+status]'
    }).upgrade((tx: any) => {
      return tx.table('library').toCollection().modify((item: any) => {
        if (!item.domainType) {
          item.domainType = 'unknown';
        }
      });
    });
  }
}

export const db = new BacklinkIntelDB();
