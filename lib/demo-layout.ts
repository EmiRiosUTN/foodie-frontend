export function demoLayout(roomId: string) {
  const zoneMain = `${roomId}-zone-main`;
  const zoneWindow = `${roomId}-zone-window`;
  const table1 = `${roomId}-table-1`;
  const table2 = `${roomId}-table-2`;
  const table3 = `${roomId}-table-3`;

  return {
    zones: [
      { id: zoneMain, name: "Salon central", slug: "salon-central" },
      { id: zoneWindow, name: "Ventana", slug: "ventana" }
    ],
    items: [
      {
        id: `${roomId}-wall-1`,
        kind: "wall",
        label: "Pared principal",
        x: 20,
        y: 20,
        width: 500,
        height: 14,
        rotation: 0,
        metadata: {}
      },
      {
        id: `${roomId}-window-1`,
        kind: "window",
        label: "Ventanal",
        x: 90,
        y: 16,
        width: 150,
        height: 10,
        rotation: 0,
        metadata: {}
      },
      {
        id: `${roomId}-corridor-1`,
        kind: "corridor",
        label: "Pasillo",
        x: 260,
        y: 40,
        width: 90,
        height: 250,
        rotation: 0,
        metadata: {}
      }
    ],
    tables: [
      {
        id: table1,
        label: "M1",
        shape: "round",
        seats: 4,
        x: 110,
        y: 140,
        width: 112,
        height: 112,
        rotation: 0,
        isReservable: true,
        zoneId: zoneWindow
      },
      {
        id: table2,
        label: "M2",
        shape: "square",
        seats: 2,
        x: 380,
        y: 170,
        width: 104,
        height: 104,
        rotation: 0,
        isReservable: true,
        zoneId: zoneMain
      },
      {
        id: table3,
        label: "M3",
        shape: "rectangular",
        seats: 4,
        x: 620,
        y: 170,
        width: 160,
        height: 104,
        rotation: 0,
        isReservable: true,
        zoneId: zoneMain
      }
    ],
    combinations: [
      {
        id: `${roomId}-combo-1`,
        parentTableId: table2,
        childTableId: table3,
        combinedSeats: 6
      }
    ]
  };
}
