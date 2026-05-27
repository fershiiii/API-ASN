import express from "express";
import cors from "cors";
import pg from "pg";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 8080;

// Configuración de CORS para permitir la conexión desde Google Cloud sin bloqueos
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);

app.use(express.json());

// Configuración de conexión para Azure PostgreSQL
const pool = new pg.Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: {
    rejectUnauthorized: false, // Requerido para la conexión segura SSL de Azure
  },
});

// Test de conexión inicial
pool.connect((err) => {
  if (err) {
    console.error("❌ Error conectando a Azure PostgreSQL:", err.stack);
  } else {
    console.log("⚡ Conectado con éxito a Azure PostgreSQL Flexible Server");
  }
});

// ==========================================
// RUTAS DE LA API (Requerimientos de Cátedra)
// ==========================================

// 1. VISUALIZAR LA TABLA (GET)
app.get("/estudiantes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT nombres, apellidos, carnet, edad FROM estudiantes ORDER BY carnet ASC",
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error al obtener el listado de estudiantes" });
  }
});

// 2. CREAR USUARIO / ESTUDIANTE (POST)
app.post("/estudiantes", async (req, res) => {
  const { nombres, apellidos, carnet, edad } = req.body;

  if (!nombres || !apellidos || !carnet || !edad) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  try {
    const query =
      "INSERT INTO estudiantes (nombres, apellidos, carnet, edad) VALUES ($1, $2, $3, $4)";
    await pool.query(query, [nombres, apellidos, carnet, edad]);
    res.status(201).json({ message: "Estudiante creado con éxito" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error al insertar (Carnet duplicado o error de BD)" });
  }
});

// 3. BORRAR USUARIO / ESTUDIANTE (DELETE)
app.delete("/estudiantes/:carnet", async (req, res) => {
  const { carnet } = req.params;

  try {
    const query = "DELETE FROM estudiantes WHERE carnet = $1";
    const result = await pool.query(query, [carnet]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    res.json({ message: `Estudiante con carnet ${carnet} eliminado.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el estudiante" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API corriendo en Node.js 22 sobre el puerto ${PORT}`);
});
