import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import pg from 'pg';

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

const pool = new pg.Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    allowExitOnIdle: true
});


app.get("/posts", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        titulo, 
        img as url,  
        descripcion, 
        likes 
      FROM posts 
      ORDER BY id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener posts:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.post("/posts", async (req, res) => {
  try {
    const { titulo, url, descripcion } = req.body;
    
    if (!titulo || !url || !descripcion) {
      return res.status(400).json({ 
        error: "Todos los campos son requeridos" 
      });
    }

    const query = `
      INSERT INTO posts (titulo, img, descripcion, likes) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id, titulo, img as url, descripcion, likes  -- ← También transformar aquí
    `;
    const values = [titulo, url, descripcion, 0];
    
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error al crear post:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.put("/posts/like/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      UPDATE posts 
      SET likes = COALESCE(likes, 0) + 1 
      WHERE id = $1 
      RETURNING id, titulo, img as url, descripcion, likes
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al dar like:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


app.delete("/posts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM posts WHERE id = $1 RETURNING *", 
      [id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    
    res.json({ 
      message: "Post eliminado", 
      post: result.rows[0] 
    });
  } catch (error) {
    console.error("Error al eliminar post:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

app.listen(3000, () => {
  console.log("Servidor corriendo en puerto 3000");
});