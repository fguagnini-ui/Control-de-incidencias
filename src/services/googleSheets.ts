import { StockDatabase, StockReport, StockMovement } from '../types/stock';
import { getAccessToken } from './auth';

const SHEETS_API_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export const DEFAULT_SPREADSHEET_ID = '1qQKewwpW0U6ReBDxxN40IsE-0epzoB-LLc9pebk4OIk';
export const DEFAULT_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1qQKewwpW0U6ReBDxxN40IsE-0epzoB-LLc9pebk4OIk/edit?gid=751834322#gid=751834322';

export const UNIFIED_SHEET_TITLE = 'Base de Datos';
export const STORAGE_WEBHOOK_KEY = 'tickets_stock_webhook_url';

export const APPS_SCRIPT_TEMPLATE = `// PEGAR ESTE CÓDIGO EN EXTENSIONES > APPS SCRIPT DE TU PLANILLA DE GOOGLE SHEETS
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Base de Datos") || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Base de Datos");
    if (!sheet) {
      sheet = ss.insertSheet("Base de Datos");
    }

    if (payload.action === "syncAll" && payload.rows) {
      sheet.clearContents();
      if (payload.rows.length > 0) {
        sheet.getRange(1, 1, payload.rows.length, payload.rows[0].length).setValues(payload.rows);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (payload.action === "appendRow" && payload.row) {
      sheet.appendRow(payload.row);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

/**
 * Creates a new Google Spreadsheet with a single 'Base de Datos' tab.
 */
export async function createStockSpreadsheet(
  title: string = 'Control de Stock - Mecano Tools'
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesión de Google activa. Iniciá sesión con Google.');
  }

  const payload = {
    properties: {
      title
    },
    sheets: [
      {
        properties: {
          title: UNIFIED_SHEET_TITLE,
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    ]
  };

  const res = await fetch(SHEETS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Error al crear la planilla (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Ensures that the unified sheet exists within an existing spreadsheet.
 */
export async function ensureSheetsExist(
  spreadsheetId: string,
  requiredTitles: string[] = [UNIFIED_SHEET_TITLE]
): Promise<void> {
  const token = await getAccessToken();
  if (!token) return;

  const res = await fetch(`${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return;

  const data = await res.json();
  const sheets = data.sheets || [];
  const existingTitles: string[] = sheets.map((s: any) => s.properties?.title || '');

  const requests: any[] = [];

  // If the spreadsheet has the user's specific sheet (gid 751834322) or first sheet,
  // rename it to 'Base de Datos' if not present!
  const gidSheet = sheets.find((s: any) => s.properties?.sheetId === 751834322);
  const defaultSheet = gidSheet || sheets[0];

  let unifiedExists = existingTitles.includes(UNIFIED_SHEET_TITLE);
  if (!unifiedExists && defaultSheet) {
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: defaultSheet.properties.sheetId,
          title: UNIFIED_SHEET_TITLE,
          gridProperties: { frozenRowCount: 1 }
        },
        fields: 'title,gridProperties.frozenRowCount'
      }
    });
    unifiedExists = true;
    existingTitles.push(UNIFIED_SHEET_TITLE);
  }

  // Add any remaining required sheets
  requiredTitles.forEach((title) => {
    if (!existingTitles.includes(title)) {
      requests.push({
        addSheet: {
          properties: {
            title,
            gridProperties: { frozenRowCount: 1 }
          }
        }
      });
      existingTitles.push(title);
    }
  });

  if (requests.length > 0) {
    await fetch(`${SHEETS_API_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
  }
}

/**
 * Syncs (exports) the current database to a SINGLE unified sheet in Google Sheets.
 */
export async function syncDatabaseToSheets(
  spreadsheetId: string,
  db: StockDatabase
): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesión de Google activa. Iniciá sesión con Google.');
  }

  // Ensure single unified sheet exists
  await ensureSheetsExist(spreadsheetId, [UNIFIED_SHEET_TITLE]);

  // Headers for the unified database
  const headers = [
    'ID',
    'Tipo de Registro',
    'Fecha',
    'Responsable',
    'SKU / Detalle',
    'Cantidad',
    'Descripción / Notas',
    'Transacción / Remito',
    'Origen / Causa',
    'Solución / Ubicación',
    'Estado',
    'Vínculo (ID)',
    'Detalle_JSON'
  ];

  // Map Reportes
  const reportRows = db.reportes.map((r) => {
    const skuDisplay =
      r.items && r.items.length > 1
        ? r.items.map((it) => `${it.sku} (x${it.cant})`).join(', ')
        : r.sku;
    const totalCant =
      r.items && r.items.length > 0
        ? r.items.reduce((s, it) => s + (it.cant || 1), 0)
        : r.cant;

    const tipoLabel =
      r.tipo === 'ingreso'
        ? 'Reporte - Ingreso (+)'
        : r.tipo === 'encontrado'
        ? 'Reporte - Encontrado (+)'
        : 'Reporte - Problema';

    return [
      r.id,
      tipoLabel,
      r.fecha,
      r.reporta,
      skuDisplay,
      totalCant,
      r.desc,
      r.trx || '',
      [r.origen, r.causa].filter(Boolean).join(' | '),
      r.sol || '',
      r.estado,
      r.mov || '',
      JSON.stringify(r.items || [])
    ];
  });

  // Map Movimientos
  const movementRows = db.movimientos.map((m) => {
    const skuDisplay = m.lineas.map((l) => `${l.sku} (${l.accion} x${l.cant})`).join(', ');
    const totalCant = m.lineas.reduce((s, l) => s + (l.cant || 1), 0);

    return [
      m.id,
      'Movimiento de Stock',
      m.fecha,
      m.resp,
      skuDisplay,
      totalCant,
      m.notas || '',
      '',
      '',
      '',
      m.estado,
      m.lineas.map((l) => l.pid).filter(Boolean).join(', '),
      JSON.stringify(m.lineas || [])
    ];
  });

  // Sort rows chronologically (newest first)
  const allRows = [...reportRows, ...movementRows].sort((a, b) => {
    const dateA = new Date(a[2] || 0).getTime();
    const dateB = new Date(b[2] || 0).getTime();
    return dateB - dateA;
  });

  // 1. Clear previous data
  try {
    await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ranges: [`${UNIFIED_SHEET_TITLE}!A1:Z10000`, 'Reportes!A1:Z5000', 'Movimientos!A1:Z5000']
      })
    });
  } catch (clearErr) {
    console.warn('values:batchClear warning:', clearErr);
  }

  // 2. Batch update unified sheet atomically
  const batchRes = await fetch(`${SHEETS_API_URL}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [
        {
          range: `${UNIFIED_SHEET_TITLE}!A1`,
          values: [headers, ...allRows]
        }
      ]
    })
  });

  if (!batchRes.ok) {
    const err = await batchRes.json().catch(() => ({}));
    if (batchRes.status === 403) {
      throw new Error(
        'Permiso denegado (403): La cuenta de Google conectada no tiene permisos de edición en la planilla.'
      );
    }
    throw new Error(err.error?.message || `Error al actualizar la planilla (${batchRes.status})`);
  }
}

/**
 * Loads and imports data from Google Sheets into the StockDatabase structure.
 */
export async function loadDatabaseFromSheets(spreadsheetId: string): Promise<StockDatabase> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No hay sesión de Google activa. Iniciá sesión con Google.');
  }

  // Verify access and check sheet titles
  const metaRes = await fetch(`${SHEETS_API_URL}/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!metaRes.ok) {
    if (metaRes.status === 403) {
      throw new Error(
        'Permiso denegado (403): Asegurate de compartir la planilla con tu cuenta de Google con permiso de Editor.'
      );
    }
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Error al acceder a la planilla (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const titles: string[] = (metaData.sheets || []).map((s: any) => s.properties?.title || '');

  // Find the target sheet to read: 'Base de Datos' or 'Reportes' or first sheet
  const targetTitle = titles.includes(UNIFIED_SHEET_TITLE)
    ? UNIFIED_SHEET_TITLE
    : titles.includes('Reportes')
    ? 'Reportes'
    : titles[0] || UNIFIED_SHEET_TITLE;

  const readRes = await fetch(
    `${SHEETS_API_URL}/${spreadsheetId}/values/${encodeURIComponent(targetTitle)}!A2:M10000`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!readRes.ok) {
    return { reportes: [], movimientos: [], np: 1, nm: 1 };
  }

  const readData = await readRes.json();
  const rows: any[][] = readData.values || [];

  const reportes: StockReport[] = [];
  const movimientos: StockMovement[] = [];

  rows.forEach((row, idx) => {
    const id = (row[0] || '').trim();
    const tipoCol = (row[1] || '').toLowerCase();

    // Check if it's a movement
    if (id.startsWith('02-') || id.startsWith('MOV-') || tipoCol.includes('movimiento')) {
      let lineas = [];
      try {
        if (row[12]) {
          lineas = JSON.parse(row[12]);
        }
      } catch {
        lineas = [];
      }

      movimientos.push({
        id: id || `02-${String(idx + 1).padStart(5, '0')}`,
        fecha: row[2] || '',
        resp: row[3] || '',
        estado: (row[10] as 'Confirmado') || 'Confirmado',
        notas: row[6] || '',
        lineas
      });
    } else {
      // It's a report/ticket
      let items = [];
      try {
        if (row[12]) {
          items = JSON.parse(row[12]);
        }
      } catch {
        items = [];
      }

      let parsedTipo: any = 'problema';
      if (tipoCol.includes('ingreso')) parsedTipo = 'ingreso';
      else if (tipoCol.includes('encontrado')) parsedTipo = 'encontrado';

      const sku = row[4] || '';
      const cant = Number(row[5]) || 1;
      const desc = row[6] || '';

      if (!Array.isArray(items) || items.length === 0) {
        items = [{ sku, desc, cant }];
      }

      reportes.push({
        id: id || `01-${String(idx + 1).padStart(5, '0')}`,
        tipo: parsedTipo,
        fecha: row[2] || '',
        reporta: row[3] || '',
        sku,
        cant,
        desc,
        trx: row[7] || '',
        origen: row[8] || '',
        causa: '',
        sol: row[9] || '',
        estado: row[10] || 'Abierto',
        mov: row[11] ? row[11] : null,
        items
      });
    }
  });

  // Calculate next counters
  let maxNp = 1;
  reportes.forEach((r) => {
    const match = r.id.match(/^01-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNp) maxNp = num + 1;
    }
  });

  let maxNm = 1;
  movimientos.forEach((m) => {
    const match = m.id.match(/^02-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNm) maxNm = num + 1;
    }
  });

  return {
    np: maxNp,
    nm: maxNm,
    reportes,
    movimientos
  };
}

/**
 * Syncs database via Google Apps Script Web App without requiring end-user Google login.
 */
export async function syncDatabaseViaWebhook(
  webhookUrl: string,
  db: StockDatabase
): Promise<void> {
  const headers = [
    'ID',
    'Tipo de Registro',
    'Fecha',
    'Responsable',
    'SKU / Detalle',
    'Cantidad',
    'Descripción / Notas',
    'Transacción / Remito',
    'Origen / Causa',
    'Solución / Ubicación',
    'Estado',
    'Vínculo (ID)',
    'Detalle_JSON'
  ];

  const reportRows = db.reportes.map((r) => {
    const skuDisplay =
      r.items && r.items.length > 1
        ? r.items.map((it) => `${it.sku} (x${it.cant})`).join(', ')
        : r.sku;
    const totalCant =
      r.items && r.items.length > 0
        ? r.items.reduce((s, it) => s + (it.cant || 1), 0)
        : r.cant;

    const tipoLabel =
      r.tipo === 'ingreso'
        ? 'Reporte - Ingreso (+)'
        : r.tipo === 'encontrado'
        ? 'Reporte - Encontrado (+)'
        : 'Reporte - Problema';

    return [
      r.id,
      tipoLabel,
      r.fecha,
      r.reporta,
      skuDisplay,
      totalCant,
      r.desc,
      r.trx || '',
      [r.origen, r.causa].filter(Boolean).join(' | '),
      r.sol || '',
      r.estado,
      r.mov || '',
      JSON.stringify(r.items || [])
    ];
  });

  const movementRows = db.movimientos.map((m) => {
    const skuDisplay = m.lineas.map((l) => `${l.sku} (${l.accion} x${l.cant})`).join(', ');
    const totalCant = m.lineas.reduce((s, l) => s + (l.cant || 1), 0);

    return [
      m.id,
      'Movimiento de Stock',
      m.fecha,
      m.resp,
      skuDisplay,
      totalCant,
      m.notas || '',
      '',
      '',
      '',
      m.estado,
      m.lineas.map((l) => l.pid).filter(Boolean).join(', '),
      JSON.stringify(m.lineas || [])
    ];
  });

  const allRows = [...reportRows, ...movementRows].sort((a, b) => {
    const dateA = new Date(a[2] || 0).getTime();
    const dateB = new Date(b[2] || 0).getTime();
    return dateB - dateA;
  });

  const payload = {
    action: 'syncAll',
    rows: [headers, ...allRows]
  };

  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload)
  });
}

/**
 * Loads database via Google Apps Script Web App without requiring end-user Google login.
 */
export async function loadDatabaseViaWebhook(webhookUrl: string): Promise<StockDatabase> {
  const res = await fetch(webhookUrl);
  if (!res.ok) {
    throw new Error(`Error al conectar con el Webhook de Google Apps Script (${res.status})`);
  }

  const result = await res.json();
  const rawRows: any[][] = result.data || [];
  if (rawRows.length <= 1) {
    return { reportes: [], movimientos: [], np: 1, nm: 1 };
  }

  const rows = rawRows.slice(1);
  const reportes: StockReport[] = [];
  const movimientos: StockMovement[] = [];

  rows.forEach((row, idx) => {
    const id = String(row[0] || '').trim();
    const tipoCol = String(row[1] || '').toLowerCase();

    if (id.startsWith('02-') || id.startsWith('MOV-') || tipoCol.includes('movimiento')) {
      let lineas = [];
      try {
        if (row[12]) {
          lineas = JSON.parse(row[12]);
        }
      } catch {
        lineas = [];
      }
      movimientos.push({
        id: id || `02-${String(idx + 1).padStart(5, '0')}`,
        fecha: String(row[2] || ''),
        resp: String(row[3] || ''),
        estado: (row[10] as 'Confirmado') || 'Confirmado',
        notas: String(row[6] || ''),
        lineas
      });
    } else {
      let items = [];
      try {
        if (row[12]) {
          items = JSON.parse(row[12]);
        }
      } catch {
        items = [];
      }

      let parsedTipo: any = 'problema';
      if (tipoCol.includes('ingreso')) parsedTipo = 'ingreso';
      else if (tipoCol.includes('encontrado')) parsedTipo = 'encontrado';

      const sku = String(row[4] || '');
      const cant = Number(row[5]) || 1;
      const desc = String(row[6] || '');

      if (!Array.isArray(items) || items.length === 0) {
        items = [{ sku, desc, cant }];
      }

      reportes.push({
        id: id || `01-${String(idx + 1).padStart(5, '0')}`,
        tipo: parsedTipo,
        fecha: String(row[2] || ''),
        reporta: String(row[3] || ''),
        sku,
        cant,
        desc,
        trx: String(row[7] || ''),
        origen: String(row[8] || ''),
        causa: '',
        sol: String(row[9] || ''),
        estado: (row[10] as any) || 'Abierto',
        mov: row[11] ? String(row[11]) : null,
        items
      });
    }
  });

  let maxNp = 1;
  reportes.forEach((r) => {
    const match = r.id.match(/^01-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNp) maxNp = num + 1;
    }
  });

  let maxNm = 1;
  movimientos.forEach((m) => {
    const match = m.id.match(/^02-(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= maxNm) maxNm = num + 1;
    }
  });

  return {
    np: maxNp,
    nm: maxNm,
    reportes,
    movimientos
  };
}
