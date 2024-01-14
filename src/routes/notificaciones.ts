import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import {
    EmailClient,
    EmailMessage,
    KnownEmailSendStatus,
} from "@azure/communication-email";

export const notificacionesRouter = Router();
const prisma = new PrismaClient();

/**
 * GET /api/notificaciones
 * Emite las notificaciones del día
 */
notificacionesRouter.get("/", async (_req, res) => {
    try {
        // Hallar deudas en momento de notificar
        const fechaHoy = new Date();
        const deudas = await prisma.deuda.findMany({
            where: {
                activa: true,
                gasto: {
                    fecha_limite: {
                        lte: new Date(
                            new Date().setDate(fechaHoy.getDate() + 1),
                        ),
                        gte: new Date(
                            new Date().setDate(fechaHoy.getDate() - 2),
                        ),
                    },
                },
            },
            select: {
                gasto: {
                    select: {
                        concepto: true,
                        fecha_limite: true,
                        condominio: {
                            select: {
                                nombre: true,
                            },
                        },
                    },
                },
                vivienda: {
                    select: {
                        nombre: true,
                        cedula_propietario: true,
                    },
                },
                monto_usuario: true,
            },
        });
        // Enviar correos
        const emailClient = new EmailClient(process.env.EMAIL_CONN!);
        for (const deuda of deudas) {
            const propietario = await prisma.user.findFirst({
                where: { cedula: deuda.vivienda.cedula_propietario },
            });
            if (!propietario) {
                // El propietario no tiene cuenta
                continue;
            }
            const POLLER_TIME = 10;
            const subject =
                deuda.gasto.fecha_limite.getDate() === fechaHoy.getDate()
                    ? "Fecha límite de pago"
                    : deuda.gasto.fecha_limite.getDate() > fechaHoy.getDate()
                      ? "Recordatorio de pago próximo"
                      : "Fecha límite de pago superada";
            const plainText =
                deuda.gasto.fecha_limite.getDate() === fechaHoy.getDate()
                    ? `Hoy es la fecha límite de pago para su deuda de concepto ${deuda.gasto.concepto} en el condominio ${deuda.gasto.condominio.nombre}, para su vivienda ${deuda.vivienda.nombre}. Recuerde mantenerse al día con sus pagos`
                    : deuda.gasto.fecha_limite.getDate() > fechaHoy.getDate()
                      ? `Se aproxima la fecha límite de pago para su deuda de concepto ${
                            deuda.gasto.concepto
                        } en el condominio ${
                            deuda.gasto.condominio.nombre
                        }, para su vivienda ${
                            deuda.vivienda.nombre
                        }. Recuerde mantenerse al día con sus pagos, la fecha límite es el ${deuda.gasto.fecha_limite.toLocaleDateString()}`
                      : `Se superó la fecha límite de pago para su deuda de concepto ${deuda.gasto.concepto} en el condominio ${deuda.gasto.condominio.nombre}, para su vivienda ${deuda.vivienda.nombre}. Registre su pago en UCond y comuníquese con la administración sobre cualquier acción necesaria.`;
            const msg = {
                senderAddress: process.env.MAIL_FROM!,
                content: {
                    subject,
                    plainText,
                },
                recipients: {
                    to: [
                        {
                            address: propietario.correo,
                            displayName:
                                propietario.nombre + " " + propietario.apellido,
                        },
                    ],
                },
            } satisfies EmailMessage;
            const poller = await emailClient.beginSend(msg);
            if (!poller.getOperationState().isStarted) {
                throw new Error("Error iniciando poller");
            }
            let timeElapsed = 0;
            while (!poller.isDone()) {
                poller.poll();
                console.log("Polling...");
                await new Promise((resolve) =>
                    setTimeout(resolve, POLLER_TIME * 1000),
                );
                timeElapsed += 10;
                if (timeElapsed > 18 * POLLER_TIME) {
                    throw new Error("Error enviando correo");
                }
            }
            if (poller.getResult()?.status === KnownEmailSendStatus.Succeeded) {
                console.log("Correo enviado a " + propietario.correo);
            } else {
                throw new Error("Error enviando correo");
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});
