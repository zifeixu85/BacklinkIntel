
export const normalizeDomain = (url: string): string => {
  try {
    let hostname = url;
    if (url.includes('://')) {
      hostname = new URL(url).hostname;
    } else {
      hostname = url.split('/')[0];
    }
    return hostname.toLowerCase().replace(/^www\./, '');
  } catch (e) {
    return url.toLowerCase().trim();
  }
};

export const extractRefDomain = (url: string): string => {
  return normalizeDomain(url);
};

export const getFaviconUrl = (domain: string) => `https://favicon.im/${domain}?size=64`;
export const getWhoisUrl = (domain: string) => `https://rewhois.com/zh-hans/${domain}`;
export const getScreenshotUrl = (domain: string) => `https://screenshot.domains/${domain}`;

export const formatCurrency = (amount: number | null, currency: string = 'USD') => {
  if (amount === null) return '-';
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount);
};

export const parseAhrefsDate = (dateStr: string): number | null => {
  if (!dateStr || dateStr === '-') return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d.getTime();
};

export const formatCompactNumber = (num: number | null) => {
  if (num === null) return '0';
  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(num);
};
