/* eslint-disable @typescript-eslint/no-unused-vars */
import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { updateUserSchema } from "../schemas/user";
import { pagoSchema } from "../schemas/pago";
import multer from "multer";

export const usuariosRouter = Router();
const prisma = new PrismaClient();

// Para cargar comprobantes de pago
const comprobantes_pago_upload = multer({
    storage: multer.diskStorage({
        destination: "public/comprobantes_pago/",
        filename: (_req, file, cb) => {
            const prefijo = Date.now() + "-" + Math.round(Math.random() * 1e9);
            cb(null, prefijo + "-" + file.originalname);
        },
    }),
});

/**
 * GET /api/usuarios/:id
 * Busca un usuario por su ID
 */
usuariosRouter.get("/:id", async (req, res) => {
    try {
        const userId = parseInt(req.params.id); // Obtener el ID de los parámetros de la URL
        // Buscar usuario por ID en la base de datos
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        // Devolver el usuario en formato JSON sin la contraseña
        const { password, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword });
    } catch (error) {
        // Manejo de errores
        res.status(500).json({ error: "Error al buscar el usuario" });
        console.error(error);
    }
});

/**
 * DELETE /api/usuarios/:id
 * Elimina un usuario por su ID
 */
usuariosRouter.delete("/:id", async (req, res) => {
    try {
        const userId = parseInt(req.params.id); // Obtener el ID de los parámetros de la URL
        // Eliminar usuario por su ID
        const deletedUser = await prisma.user.delete({
            where: { id: userId },
        });
        res.json(deletedUser);
    } catch (error) {
        //Error handling
        res.status(500).json({ error: "Error al eliminar el usuario" });
    }
});

/**
 * PUT /api/usuarios/:id
 * Modifica un usuario por su ID, recibe el usuario
 */
usuariosRouter.put("/:id", async (req, res) => {
    try {
        const userId = parseInt(req.params.id); // Obtener el ID de los parámetros de la URL
        const updatedData = updateUserSchema.parse(req.body);
        // Añadir validacion sobre body usuario
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updatedData,
        });
        res.json({ user: updatedUser });
    } catch (error) {
        //Error handling
        res.status(500).json({ error: "Error al modificar el usuario" });
    }
});

/**
 * GET /api/usuarios/:userId/condominios
 * Busca los condominios de un usuario por su ID
 */
usuariosRouter.get("/:userId/condominios", async (req, res) => {
    try {
        const userId = parseInt(req.params.userId); // Obtener el ID de los parámetros de la URL
        // Obtener cédula de usuario
        const cedula = await prisma.user.findUnique({
            where: { id: userId },
            select: { cedula: true },
        });
        if (!cedula) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        // Hallar todas las viviendas del usuario
        const viviendas_usuario = await prisma.vivienda.findMany({
            where: {
                OR: [
                    { id_propietario: userId },
                    { cedula_propietario: cedula.cedula },
                ],
            },
            include: { condominio: true },
        });
        // Filtrar todos los condominios únicos de las viviendas del usuario
        const condominios = viviendas_usuario
            .map((vivienda) => vivienda.condominio)
            .filter(
                (condominio, index, self) =>
                    self.findIndex((c) => c.id === condominio.id) === index,
            );
        // Condominios de los que es administrador
        const condominios_admin = await prisma.condominio.findMany({
            where: { id_administrador: userId },
        });
        res.json({ condominios: [...condominios, ...condominios_admin] });
    } catch (error) {
        res.status(500).json({
            error: "Error al buscar los condominios del usuario",
        });
    }
});

/**
 * GET /api/usuarios/:userId/deudas?idCondominio=<idCondominio>
 * Busca las deudas de un usuario por su ID
 */
usuariosRouter.get("/:userId/deudas", async (req, res) => {
    try {
        // Obtener el ID de los parámetros de la URL
        const userId = parseInt(req.params.userId);
        // Buscar usuario por ID en la base de datos
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { deudas: true },
        });
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        // Trabajo extra si se especifica la id del condominio
        if (req.query.idCondominio) {
            const idCondominio = parseInt(req.query.idCondominio as string);
            // Buscar condominio por ID en la base de datos
            const condominio = await prisma.condominio.findUnique({
                where: { id: idCondominio },
                include: { gastos: true },
            });
            if (!condominio) {
                return res
                    .status(404)
                    .json({ error: "Condominio no encontrado" });
            }
            // Devolver deudas activas que pertenezcan al condominio
            return res.json({
                deudas: user.deudas.filter(
                    (deuda) =>
                        deuda.activa &&
                        condominio.gastos.some(
                            (gasto) => gasto.id === deuda.id_gasto,
                        ),
                ),
            });
        }
        // Devolver las deudas activas del usuario
        res.json({ deudas: user.deudas.filter((deuda) => deuda.activa) });
    } catch (error) {
        // Manejo de errores
        console.log(error);
        res.status(500).json({
            error,
        });
    }
});

/**
 * GET /api/usuarios/:userId/pagos?idCondominio=<idCondominio>
 * Busca el historial de pagos de un usuario por su ID
 */
usuariosRouter.get("/:userId/pagos", async (req, res) => {
    try {
        // Obtener id de los parámetros
        const userId = parseInt(req.params.userId);
        // Buscar usuario por ID en la base de datos
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { deudas: { include: { pagos: true } } },
        });
        if (!user) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        // Trabajo extra si se especifica la id del condominio
        if (req.query.idCondominio) {
            const idCondominio = parseInt(req.query.idCondominio as string);
            // Buscar condominio por ID en la base de datos
            const condominio = await prisma.condominio.findUnique({
                where: { id: idCondominio },
                include: { gastos: true },
            });
            if (!condominio) {
                return res
                    .status(404)
                    .json({ error: "Condominio no encontrado" });
            }
            // Devolver pagos que pertenezcan al condominio
            const deudasConConcepto = [];
            for (const deuda of user.deudas) {
                const gasto = condominio.gastos.find(
                    (gasto) => gasto.id === deuda.id_gasto,
                );
                if (gasto) {
                    deudasConConcepto.push({
                        ...deuda,
                        concepto: gasto.concepto,
                    });
                }
            }
            return res.json({
                pagos: deudasConConcepto.flatMap((deuda) =>
                    deuda.pagos.map((pago) => ({
                        ...pago,
                        concepto: deuda.concepto,
                    })),
                ),
            });
        }
    } catch (error) {
        // Manejo de errores
        console.log(error);
        res.status(500).json({
            error,
        });
    }
});

/**
 * POST /api/usuarios/:userId/pagos
 * Agrega un pago
 */
usuariosRouter.post(
    "/:userId/pagos",
    comprobantes_pago_upload.single("comprobante"),
    async (req, res) => {
        try {
            // Verificar archivo
            if (!req.file) {
                return res
                    .status(400)
                    .json({ error: "Debe enviar un archivo" });
            }
            if (
                !["image/jpeg", "application/pdf"].includes(req.file.mimetype)
            ) {
                return res
                    .status(400)
                    .json({ error: "El archivo debe ser de imagen o PDF" });
            }

            //Verificar que el id_usuario exista
            const user = await prisma.user.findUnique({
                where: { id: Number(req.body.id_usuario) },
            });
            if (!user) {
                return res.status(400).json({ error: "El usuario no existe" });
            }

            //Parsear pago
            const pago = pagoSchema.parse({
                ...req.body,
                url_comprobante: req.file.path,
            });

            // Obtener informacion de deuda
            const deuda = await prisma.deuda.findUnique({
                where: { id: pago.id_deuda },
                include: { gasto: true },
            });
            if (!deuda) {
                return res.status(404).json({ error: "Deuda no encontrada" });
            }

            // Registrar pago
            const [pagoCreado, _deudaActualizada, _gastoActualizado] =
                await prisma.$transaction([
                    prisma.pago.create({ data: { ...pago } }),
                    prisma.deuda.update({
                        where: { id: pago.id_deuda },
                        data: {
                            monto_pagado:
                                deuda.monto_pagado + pago.monto_pagado,
                            activa:
                                deuda.monto_pagado + pago.monto_pagado <
                                deuda.monto_usuario,
                        },
                    }),
                    prisma.gasto.update({
                        where: { id: deuda.gasto.id },
                        data: {
                            monto_pagado:
                                deuda.gasto.monto_pagado + pago.monto_pagado,
                            activo:
                                deuda.gasto.monto_pagado + pago.monto_pagado <
                                deuda.gasto.monto,
                        },
                    }),
                ]);
            res.json({ pago: pagoCreado });
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
    },
);
