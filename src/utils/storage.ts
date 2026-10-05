import { StockDatabase, StockReport } from '../types/stock';
import bundledDatabase from '../data/database.json';

const STORAGE_KEY = 'tickets_stock_v2';

export const todayDate = (): string => new Date().toISOString().slice(0, 10);

export const fmtDate = (d: string): string => {
  if (!d) return '—';
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
};

export const longDate = (): string => {
  try {
    const t = new Date().toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch {
    return new Date().toLocaleDateString();
  }
};

export const pid = (n: number): string => '01-' + String(n).padStart(5, '0');
export const mid = (n: number): string => '02-' + String(n).padStart(5, '0');

export function getSeedData(): StockDatabase {
  if (bundledDatabase && Array.isArray((bundledDatabase as any).reportes)) {
    return JSON.parse(JSON.stringify(bundledDatabase)) as StockDatabase;
  }
  return {
    np: 1,
    nm: 1,
    reportes: [],
    movimientos: []
  };
}

export function loadDatabase(): StockDatabase {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getSeedData();
    const parsed = JSON.parse(raw);
    
    // Migration: if stored with old 'problemas' key
    let reportesRaw: any[] = [];
    if (Array.isArray(parsed.reportes)) {
      reportesRaw = parsed.reportes;
    } else if (Array.isArray(parsed.problemas)) {
      reportesRaw = parsed.problemas;
    } else {
      return getSeedData();
    }

    const reportes: StockReport[] = reportesRaw.map((r: any) => {
      // Normalize items
      let items = Array.isArray(r.items) && r.items.length > 0 ? r.items : [];
      if (items.length === 0) {
        items = [{
          sku: r.sku || 'SKU',
          desc: r.desc || 'Producto',
          cant: typeof r.cant === 'number' && r.cant > 0 ? r.cant : 1
        }];
      }

      const totalCant = items.reduce((sum: number, it: any) => sum + (Number(it.cant) || 1), 0);
      const firstSku = items[0]?.sku || r.sku || 'SKU';
      const summaryDesc = items.length === 1 
        ? (items[0]?.desc || r.desc || '') 
        : `${items[0]?.desc || r.desc || 'Producto'} (+${items.length - 1} más)`;

      return {
        ...r,
        tipo: r.tipo || 'problema',
        items,
        sku: firstSku,
        desc: r.desc || summaryDesc,
        cant: totalCant
      };
    });

    return {
      np: typeof parsed.np === 'number' && parsed.np > 0 ? parsed.np : Math.max(...reportes.map(r => {
        const n = parseInt(r.id.replace('01-', ''), 10);
        return isNaN(n) ? 0 : n;
      }), 0) + 1,
      nm: typeof parsed.nm === 'number' && parsed.nm > 0 ? parsed.nm : 1,
      reportes,
      movimientos: Array.isArray(parsed.movimientos) ? parsed.movimientos : []
    };
  } catch (err) {
    console.error('Error loading database from localStorage:', err);
    return getSeedData();
  }
}

export function saveDatabase(db: StockDatabase): void {
  try {
    // Keep both 'reportes' and 'problemas' for backwards compatibility
    const toStore = {
      ...db,
      problemas: db.reportes
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (err) {
    console.error('Error saving database to localStorage:', err);
  }
}

export function downloadDatabaseJSON(db: StockDatabase): void {
  const jsonStr = JSON.stringify(db, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'database.json');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseDatabaseJSON(text: string): StockDatabase {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('El archivo no tiene un formato JSON válido.');
  }

  const reportes = Array.isArray(parsed.reportes) ? parsed.reportes : [];
  const movimientos = Array.isArray(parsed.movimientos) ? parsed.movimientos : [];

  let maxNp = 1;
  reportes.forEach((r: any) => {
    const match = String(r.id || '').match(/^01-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNp) maxNp = num + 1;
    }
  });

  let maxNm = 1;
  movimientos.forEach((m: any) => {
    const match = String(m.id || '').match(/^02-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNm) maxNm = num + 1;
    }
  });

  return {
    np: typeof parsed.np === 'number' && parsed.np >= maxNp ? parsed.np : maxNp,
    nm: typeof parsed.nm === 'number' && parsed.nm >= maxNm ? parsed.nm : maxNm,
    reportes,
    movimientos
  };
}
