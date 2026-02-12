import Papa from 'papaparse';
import { BacklinkRow, SnapshotMetrics } from '../types';
import { extractRefDomain, parseAhrefsDate } from './domain';

export interface ParseResult {
  rows: Partial<BacklinkRow>[];
  metrics: SnapshotMetrics;
  headers: string[];
}

const getVal = (item: any, keys: string[]) => {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null) return item[key];
    const normalizedTarget = key.toLowerCase().replace(/\s/g, '');
    for (const actualKey in item) {
      const normalizedActual = actualKey.toLowerCase().replace(/\s/g, '');
      if (normalizedActual === normalizedTarget) return item[actualKey];
    }
  }
  return null;
};

function processRows(data: any[], headers: string[]): ParseResult {
  const rows: Partial<BacklinkRow>[] = [];
  const domains = new Set<string>();
  const dofollowDomains = new Set<string>();
  let dofollowCount = 0;
  let firstSeenMin: number | null = null;
  let firstSeenMax: number | null = null;

  data.forEach((item) => {
    const refPageUrl = getVal(item, ['Referring page URL', 'Referrer URL', 'Source url']) || '';
    if (!refPageUrl) return;

    const domain = extractRefDomain(refPageUrl);
    if (!domain) return;

    const firstSeen = parseAhrefsDate(getVal(item, ['First seen']));
    const lastSeen = parseAhrefsDate(getVal(item, ['Last seen']));

    if (firstSeen) {
      if (firstSeenMin === null || firstSeen < firstSeenMin) firstSeenMin = firstSeen;
      if (firstSeenMax === null || firstSeen > firstSeenMax) firstSeenMax = firstSeen;
    }

    const rawDr = getVal(item, ['Domain rating', 'DR', 'DomainRating', 'Page ascore', 'Authority Score']);
    const dr = rawDr !== null ? parseFloat(String(rawDr).replace(/[^0-9.]/g, '')) : 0;

    const rawTraffic = getVal(item, ['Domain traffic', 'Traffic']);
    const domainTraffic = rawTraffic !== null ? parseFloat(String(rawTraffic).replace(/[^0-9.]/g, '')) : 0;

    const rawPageTraffic = getVal(item, ['Page traffic']);
    const pageTraffic = rawPageTraffic !== null ? parseFloat(String(rawPageTraffic).replace(/[^0-9.]/g, '')) : 0;

    const nfVal = getVal(item, ['Nofollow']);
    const nofollow = String(nfVal).toLowerCase() === 'true';

    domains.add(domain);
    if (!nofollow) {
      dofollowCount++;
      dofollowDomains.add(domain);
    }

    rows.push({
      refPageUrl: refPageUrl,
      refDomain: domain,
      targetUrl: getVal(item, ['Target URL']) || '',
      firstSeen: firstSeen,
      lastSeen: lastSeen,
      anchor: getVal(item, ['Anchor']) || '',
      nofollow: nofollow,
      dr: isNaN(dr) ? 0 : dr,
      domainTraffic: isNaN(domainTraffic) ? 0 : domainTraffic,
      pageTraffic: isNaN(pageTraffic) ? 0 : pageTraffic,
      externalLinks: parseInt(getVal(item, ['External links']) || '0'),
      language: getVal(item, ['Language']) || ''
    });
  });

  const metrics: SnapshotMetrics = {
    backlinksTotal: rows.length,
    referringDomainsTotal: domains.size,
    dofollowBacklinksTotal: dofollowCount,
    dofollowRefDomainsTotal: dofollowDomains.size,
    firstSeenMin: firstSeenMin,
    firstSeenMax: firstSeenMax
  };

  return { rows, metrics, headers };
}

export const parseAhrefsCSV = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (results) => {
        const data = results.data as any[];
        const headers = results.meta.fields || [];
        resolve(processRows(data, headers));
      },
      error: (error) => reject(error)
    });
  });
};

export const parseXLSX = async (file: File): Promise<ParseResult> => {
  const XLSX = await import('xlsx');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        resolve(processRows(data, headers));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
};

export const parseFileName = (fileName: string) => {
  const nameWithoutExt = fileName.replace(/\.(csv|xlsx|xls)$/i, '');
  const raw = nameWithoutExt.split(/[-_]backlinks/i)[0] || 'Unknown Site';
  // Extract just the domain if the filename contains encoded URL paths
  // e.g. "fluxproweb.com_model_nano-banana-ai_" -> "fluxproweb.com"
  const domainMatch = raw.match(/^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}/i);
  const host = domainMatch ? domainMatch[0] : raw;
  return { host: host, cutoff: Date.now() };
};