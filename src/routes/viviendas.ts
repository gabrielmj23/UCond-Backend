import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

export const viviendasRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/viviendas/:id/deudas
 * Obtiene las deudas de una vivienda según su id
 */
viviendasRouter.get("/:id/deudas", async (req, res) => {
    try {
        const deudas = await prisma.deuda.findMany({
            where: { id_vivienda: Number(req.params.id), activa: true },
            include: {
                gasto: true,
                pagos: { select: { monto_pagado: true, confirmado: true } },
            },
        });
        res.json({
            deudas: deudas.map((deuda) => ({
                id: deuda.id,
                gasto: deuda.gasto,
                monto_original: deuda.monto_usuario,
                monto_pagado: deuda.pagos
                    .filter((pago) => pago.confirmado)
                    .reduce((acc, pago) => acc + pago.monto_pagado, 0),
                monto_por_confirmar: deuda.pagos
                    .filter((pago) => !pago.confirmado)
                    .reduce((acc, pago) => acc + pago.monto_pagado, 0),
            })),
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});

/**
 * GET /api/viviendas/:id/pagos
 * Obtiene los pagos de una vivienda según su id
 */
viviendasRouter.get("/:id/pagos", async (req, res) => {
    try {
        const pagos = await prisma.pago.findMany({
            where: {
                id: Number(req.params.id),
            },
            select: {
                id: true,
                fecha_pago: true,
                monto_pagado: true,
                metodo_pago: true,
                confirmado: true,
                deuda: {
                    select: {
                        gasto: {
                            select: { concepto: true },
                        },
                    },
                },
            },
            take: 50,
        });
        res.json({
            pagos: pagos.map((pago) => ({
                id: pago.id,
                fecha: pago.fecha_pago,
                monto: pago.monto_pagado,
                metodo_pago: pago.metodo_pago,
                confirmado: pago.confirmado,
                concepto: pago.deuda.gasto.concepto,
            })),
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});

/**
 * PUT /api/viviendas/:id
 * Actualiza una vivienda según su id
 */
viviendasRouter.put("/:id", async (req, res) => {
    try {
        const bodyParsed = z
            .object({
                cedula_propietario: z
                    .string()
                    .trim()
                    .min(1, "La cédula del propietario no puede estar vacía")
                    .max(15),
                ocupada: z.boolean(),
            })
            .parse(req.body);
        await prisma.vivienda.update({
            where: {
                id: Number(req.params.id),
            },
            data: {
                id_propietario: null,
                ...bodyParsed,
            },
        });
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error });
    }
});
