import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { pagoSchema } from "../schemas/pago";

export const viviendasRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/viviendas/:id/deudas
 * Obtiene las deudas de una vivienda según su id
 */
viviendasRouter.get("/:id/deudas", async (req, res) => {
    try {
        const vivienda = await prisma.vivienda.findUnique({
            where: { id: Number(req.params.id) },
            select: {
                nombre: true,
                alicuota: true,
                cedula_propietario: true,
                condominio: {
                    select: { metodos_pago: { select: { tipo: true } } },
                },
            },
        });
        const usuario = await prisma.user.findUnique({
            where: { cedula: vivienda?.cedula_propietario },
            select: { nombre: true, apellido: true, cedula: true },
        });
        const deudas = await prisma.deuda.findMany({
            where: { id_vivienda: Number(req.params.id), activa: true },
            include: {
                gasto: true,
                pagos: { select: { monto_pagado: true, confirmado: true } },
            },
        });
        res.json({
            nombre_vivienda: vivienda?.nombre,
            alicuota: vivienda?.alicuota,
            propietario: usuario ? { ...usuario } : null,
            metodos_pago: vivienda?.condominio.metodos_pago.map(
                (metodo) => metodo.tipo,
            ),
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
                deuda: {
                    id_vivienda: Number(req.params.id),
                },
            },
            select: {
                id: true,
                fecha_pago: true,
                monto_pagado: true,
                metodo_pago: true,
                confirmado: true,
                nro_referencia: true,
                url_comprobante: true,
                deuda: {
                    select: {
                        gasto: {
                            select: { concepto: true },
                        },
                    },
                },
            },
            orderBy: {
                fecha_pago: "desc",
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
                nro_referencia: pago.nro_referencia,
                url_comprobante: pago.url_comprobante,
            })),
        });
    } catch (error) {
        res.status(500).json({ error });
    }
});

/**
 * POST /api/viviendas/:id/pagos
 * Realiza un pago a una vivienda (cuando el usuario no está registrado)
 */
viviendasRouter.post("/:id/pagos", async (req, res) => {
    try {
        //Parsear pago
        const pago = pagoSchema.parse({
            ...req.body,
        });

        //Verificar que la vivienda existe
        const vivienda = await prisma.vivienda.findUnique({
            where: { id: pago.id_vivienda },
        });
        if (!vivienda) {
            return res.status(400).json({ error: "La vivienda no existe" });
        }

        // Obtener informacion de deuda
        const deuda = await prisma.deuda.findUnique({
            where: { id: pago.id_deuda },
            include: { pagos: true },
        });
        if (!deuda) {
            return res.status(404).json({ error: "Deuda no encontrada" });
        }
        if (!deuda.activa) {
            return res.status(400).json({ error: "La deuda no está activa" });
        }

        // Crear pago
        const pagoCreado = await prisma.pago.create({
            data: {
                id_deuda: pago.id_deuda,
                monto_pagado: pago.monto_pagado,
                metodo_pago: pago.metodo_pago,
                notas: pago.notas,
                nro_referencia: pago.nro_referencia,
            },
        });

        res.json({ idPago: pagoCreado.id });
    } catch (error) {
        console.error(error);
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
