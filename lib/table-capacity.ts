type CapacityTable = {
  seats?: number;
  metadata?: unknown;
};

export function tableCapacity(table: CapacityTable) {
  const metadata = (table.metadata || {}) as { capacity?: { maxPartySize?: number } };
  return Math.max(0, metadata.capacity?.maxPartySize || table.seats || 0);
}

export function totalTableCapacity(tables: CapacityTable[]) {
  return tables.reduce((total, table) => total + tableCapacity(table), 0);
}
