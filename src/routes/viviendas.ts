import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

export const viviendasRouter = Router();
const prisma = new PrismaClient();

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
