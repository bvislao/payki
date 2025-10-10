export const users = [
    { id: 'u1', name: 'María López', balance: 15.5 },
]
export const recentActivity = [
    { id: 't1', type: 'ride', label: 'Viaje Corredor Azul', amount: -2.5, date: '2025-10-09 08:21' },
    { id: 't2', type: 'topup', label: 'Recarga tarjeta', amount: +10, date: '2025-10-08 19:02' },
]
export const buses = [
    { id: 'b102', plate: 'ABC-102', route: 'Corredor Azul', driverId: 'd1', status: 'Activo', pos: { x: 25, y: 40 } },
    { id: 'b207', plate: 'XYZ-207', route: 'Corredor Rojo', driverId: 'd2', status: 'Activo', pos: { x: 60, y: 55 } },
    { id: 'b312', plate: 'LMN-312', route: 'Alimentador Norte', driverId: null, status: 'Inactivo', pos: { x: 75, y: 20 } },
]
export const drivers = [
    { id: 'd1', name: 'Juan Pérez', unitId: 'b102', onShift: false },
    { id: 'd2', name: 'Ana Torres', unitId: 'b207', onShift: true },
    { id: 'd3', name: 'Luis Ramos', unitId: null, onShift: false },
]