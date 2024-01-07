import { Deuda, Gasto, Pago } from "@prisma/client";

export function obtenerMontoPagadoGasto(
    gasto: Gasto & { deudas: Array<Deuda & { pagos: Pago[] }> },
) {
    return gasto.deudas.reduce(
        (acc, deuda) => acc + obtenerMontoPagadoDeuda(deuda),
        0,
    );
}

export function obtenerMontoPagadoDeuda(deuda: Deuda & { pagos: Pago[] }) {
    return deuda.pagos
        .filter((pago) => pago.confirmado)
        .reduce((acc, pago) => acc + pago.monto_pagado, 0);
}
