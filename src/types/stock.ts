export type ReportType = 'problema' | 'ingreso' | 'encontrado';

export type ReportStatus = 'Abierto' | 'Notificado' | 'En revisión' | 'Cerrado' | 'Cancelado';

export type MovementAction = 'Bajar' | 'Subir' | 'Encontrado' | 'Devuelto' | 'Descarte' | 'Ingreso confirmado';

export interface ReportItem {
  sku: string;             // SKU del producto
  desc: string;            // Nombre / descripción del producto
  cant: number;            // Cantidad de este SKU
}

export interface StockReport {
  id: string;              // e.g. "01-00001"
  tipo: ReportType;        // 'problema' | 'ingreso' | 'encontrado'
  fecha: string;           // 'YYYY-MM-DD'
  reporta: string;         // Nombre de quien reporta / recibe
  items: ReportItem[];     // Uno o más SKUs asociados a este reporte
  sku: string;             // SKU principal o resumen (compatibilidad)
  desc: string;            // Descripción principal o resumen
  cant: number;            // Cantidad total acumulada
  trx: string;             // N° Transacción, Remito o Factura
  origen: string;          // Venta, Devoluciones, Depósito, Proveedor, Auditoría, Interno
  causa: string;           // Causa del problema o Motivo de ingreso/hallazgo
  sol: string;             // Solución temporal / Ubicación / Observaciones
  estado: ReportStatus;    // Estado actual
  mov: string | null;      // ID de movimiento vinculado (e.g. "02-00001") o null
  ubicacion?: string;      // Ubicación física (opcional)
}

export interface MovementLine {
  pid: string;             // ID del reporte asociado
  sku: string;
  desc: string;
  tipo?: ReportType;
  accion: MovementAction;
  cant: number;
  prev: ReportStatus;
}

export interface StockMovement {
  id: string;              // e.g. "02-00001"
  fecha: string;           // 'YYYY-MM-DD'
  resp: string;            // Responsable del movimiento
  estado: 'Confirmado';
  lineas: MovementLine[];
  notas?: string;
}

export interface StockDatabase {
  np: number;              // Próximo número de reporte
  nm: number;              // Próximo número de movimiento
  reportes: StockReport[];
  movimientos: StockMovement[];
}
