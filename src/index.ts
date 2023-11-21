import express from "express";

//ayuda a cargar las variables
//de entorno correctamente ya que daba error en los get
import dotenv from "dotenv";
dotenv.config();

//rutas
import { authRouter } from "./routes/auth";
import consultaUsuarioRouter from "./routes/consultaUsuario";
import modificarUsuarioRouter from "./routes/modificarUsuario";
import eliminarUsuarioRouter from "./routes/eliminarUsuario";
// Inicializar aplicación
const app = express();
app.use(express.json());
const PORT = Number(process.env.port) || 3000;

// Registrar rutas
app.get("/api", (_req, res) => res.send("Hello world!"));
app.use("/api/auth", authRouter);
app.use("/api/consultausuario", consultaUsuarioRouter);
app.use("/api/modificarusuario", modificarUsuarioRouter);
app.use("/api/eliminarusuario", eliminarUsuarioRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
