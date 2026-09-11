import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PYTHON_DIR = path.resolve(__dirname, "../python");
const PYTHON_RUNNER = path.join(PYTHON_DIR, "runner.py");
const PYTHON_EXPORT = path.join(PYTHON_DIR, "export_excel.py");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const METHODS = [
  { id: "bisection", name: "Bisección", category: "Raíces" },
  { id: "false-position", name: "Falsa Posición", category: "Raíces" },
  { id: "newton-raphson", name: "Newton-Raphson", category: "Raíces" },
  { id: "golden-section", name: "Sección Dorada", category: "Optimización" },
  { id: "quadratic-interpolation", name: "Interpolación Cuadrática", category: "Optimización" },
  { id: "newton-optimization", name: "Newton de Optimización", category: "Optimización" },
  { id: "random-search", name: "Búsqueda Aleatoria 1D", category: "Búsqueda" },
  { id: "random-search-2d", name: "Búsqueda Aleatoria 2D", category: "Búsqueda" }
];

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend funcionando" });
});

app.get("/api/methods", (req, res) => {
  res.json(METHODS);
});

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const python = process.env.PYTHON_BIN || "python3";
    const child = spawn(python, [script], { cwd: PYTHON_DIR });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => stdout += chunk.toString());
    child.stderr.on("data", (chunk) => stderr += chunk.toString());

    child.on("error", (err) => reject(new Error(`No se pudo iniciar Python: ${err.message}`)));

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python terminó con código ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.ok) {
          reject(new Error(parsed.error || "Error en Python"));
          return;
        }
        resolve(parsed.result ?? parsed);
      } catch {
        reject(new Error(`Respuesta inválida de Python: ${stdout || stderr}`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

app.post("/api/calculate", async (req, res) => {
  try {
    const { method, function: fn, params } = req.body;

    if (!method || !fn) {
      return res.status(400).json({ ok: false, error: "Método y función son obligatorios." });
    }

    const result = await runPython(PYTHON_RUNNER, {
      method,
      function: fn,
      params: params || {}
    });

    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/export-excel", async (req, res) => {
  try {
    const payload = req.body;
    const tempPath = path.join(os.tmpdir(), `metodos-${Date.now()}.xlsx`);

    await runPython(PYTHON_EXPORT, {
      method_name: payload.method_name || "Método numérico",
      result: payload.result,
      output_path: tempPath
    });

    res.download(tempPath, `${payload.method_name || "metodo-numerico"}.xlsx`, () => {
      fs.unlink(tempPath, () => {});
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "localhost";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend de Métodos Numéricos: http://${HOST}:${PORT}`);
});
