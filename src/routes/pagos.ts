import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import {
    obtenerMontoPagadoDeuda,
    obtenerMontoPagadoGasto,
} from "../../utils/montosRestantes";

export const pagosRouter = Router();
const prisma = new PrismaClient();

/**
 * PUT /api/pagos/:id
 * Confirma un pago
 */
pagosRouter.put("/:id", async (req, res) => {
    try {
        // Validar y obtener pago
        const idPago = parseInt(req.params.id);
        const pago = await prisma.pago.findUnique({
            where: { id: idPago },
        });
        if (!pago) {
            return res.status(404).json({ error: "Pago no encontrado" });
        }

        // Obtener informacion de deuda
        const deuda = await prisma.deuda.findUnique({
            where: { id: pago.id_deuda },
            include: { pagos: true },
        });
        if (!deuda) {
            return res.status(404).json({ error: "Deuda no encontrada" });
        }

        // Obtener información del gasto
        const gasto = await prisma.gasto.findUnique({
            where: { id: deuda.id_gasto },
            include: { deudas: { include: { pagos: true } } },
        });
        if (!gasto) {
            return res.status(404).json({ error: "Gasto no encontrado" });
        }

        // Calcular cuánto se ha pagado del gasto
        const montoPagadoGasto =
            obtenerMontoPagadoGasto(gasto) + pago.monto_pagado;

        // Calcular cuánto se ha pagado del gasto
        const montoPagadoDeuda =
            obtenerMontoPagadoDeuda(deuda) + pago.monto_pagado;

        // Ejecutar operaciones de la BD
        await prisma.$transaction(async (tx) => {
            // Confirmar pago
            await tx.pago.update({
                where: { id: idPago },
                data: { confirmado: true },
            });
            // Actualizar deuda
            if (montoPagadoDeuda === deuda.monto_usuario) {
                await tx.deuda.update({
                    where: { id: deuda.id },
                    data: { activa: false },
                });
            }
            // Actualizar gasto
            if (montoPagadoGasto === gasto.monto) {
                await tx.gasto.update({
                    where: { id: gasto.id },
                    data: { activo: false },
                });
            }
            return;
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error });
    }
});
