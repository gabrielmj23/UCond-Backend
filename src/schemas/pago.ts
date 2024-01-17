import { z } from "zod";

// Esquema de validación de un pago nuevo
export const pagoSchema = z.object({
    id_vivienda: z.coerce
        .number()
        .int()
        .min(1, "El id de vivienda debe ser positivo"),
    id_deuda: z.coerce
        .number()
        .int()
        .min(1, "El id de deuda debe ser positivo"),
    monto_pagado: z.coerce
        .number()
        .min(1, "El monto pagado debe ser mayor o igual a 1"),
    metodo_pago: z
        .string()
        .trim()
        .min(1, "El metodo de pago no puede estar vacio")
        .max(255),
    url_comprobante: z.string().trim().max(255).optional(),
    notas: z.string().trim().max(255).optional(),
    nro_referencia: z.string().trim().max(255).optional(),
});
