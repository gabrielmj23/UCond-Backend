import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { z } from "zod";

const condominioSchema = z.object({
    id_administrador: z
        .number()
        .min(1, "Se debe especificar un id de administrador válido"),
    nombre: z.string().trim().min(1, "El nombre no puede estar vacío").max(255),
    tipo: z.string().trim().min(1, "El tipo no puede estar vacío").max(255),
    direccion: z
        .string()
        .trim()
        .min(1, "La dirección no puede estar vacía")
        .max(255),
    url_pagina_actuarial: z.string().url().trim(),
});

const upload = multer({ dest: "uploads/" });

export const condominioRouter = Router();
const prisma = new PrismaClient();

condominioRouter.post("/", upload.single("pdf"), async (req, res) => {
    try {
        //Verificar que el archivo sea pdf
        if (req.file && req.file.mimetype !== "application/pdf") {
            return res.status(400).json({ error: "El archivo debe ser PDF" });
        }
        //parsear el id_administrador a numero
        req.body.id_administrador = Number(req.body.id_administrador);

        //Verificar que el id_administrador exista
        const user = await prisma.user.findUnique({
            where: { id: req.body.id_administrador },
        });
        if (!user) {
            return res
                .status(400)
                .json({ error: "El id de administrador no existe" });
        }

        //Crear url para el pdf
        const url_pagina_actuarial =
            req.protocol +
            "://" +
            req.get("host") +
            "/uploads/" +
            (req.file ? req.file.filename : "");
        const condominio = condominioSchema.parse({
            ...req.body,
            url_pagina_actuarial: url_pagina_actuarial,
        });
        const nuevoCondominio = await prisma.condominio.create({
            data: {
                ...condominio,
                // Inicializar la reserva en 0
                reserva: 0,
            },
        });
        res.json({ condominio: nuevoCondominio });
    } catch (error) {
        //Error de validacion
        if (error instanceof z.ZodError) {
            return res
                .status(400)
                .json({ error: "Datos inválidos", mensajes: error.issues });
        }
        res.status(500).json(error);
        console.error(error);
    }
});
