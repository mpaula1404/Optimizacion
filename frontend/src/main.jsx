import React, { useMemo, useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import "./styles.css";

const API = import.meta.env.VITE_API || "http://localhost:5001";

const METHODS = [
  {
    id: "bisection",
    name: "Bisección",
    category: "Raíces",
    description:
      "Encuentra una raíz dividiendo repetidamente un intervalo que contiene un cambio de signo."
  },
  {
    id: "false-position",
    name: "Falsa Posición",
    category: "Raíces",
    description:
      "Aproxima la raíz usando una recta secante sobre el intervalo."
  },
  {
    id: "newton-raphson",
    name: "Newton-Raphson",
    category: "Raíces",
    description:
      "Usa la derivada para aproximarse iterativamente a una raíz."
  },
  {
    id: "golden-section",
    name: "Sección Dorada",
    category: "Optimización",
    description:
      "Busca un mínimo o máximo en un intervalo usando la proporción áurea."
  },
  {
    id: "quadratic-interpolation",
    name: "Interpolación Cuadrática",
    category: "Optimización",
    description:
      "Ajusta una parábola a tres puntos para aproximar un óptimo."
  },
  {
    id: "newton-optimization",
    name: "Newton de Optimización",
    category: "Optimización",
    description:
      "Usa primera y segunda derivada para localizar un punto crítico."
  },
  {
    id: "random-search",
    name: "Búsqueda Aleatoria 1D",
    category: "Búsqueda",
    description:
      "Genera puntos aleatorios y conserva la mejor solución encontrada."
  },
  {
    id: "random-search-2d",
    name: "Búsqueda Aleatoria 2D",
    category: "Búsqueda",
    description:
      "Busca aleatoriamente en una región de dos variables."
  }
];

const initialParams = {
  a: 2,
  b: 3,
  x0: 3,
  x1: 2,
  x2: 4,
  tolerance: 0.0001,
  max_iterations: 100,
  derivative: "",
  second_derivative: "",
  maximize: false,
  seed: 42,
  x_min: -5,
  x_max: 5,
  y_min: -5,
  y_max: 5
};

function App() {
  const [method, setMethod] = useState("bisection");
  const [fn, setFn] = useState("x^3 - 4*x - 9");
  const [params, setParams] = useState(initialParams);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const desmosRef = useRef(null);
  const desmosCalcRef = useRef(null);

  const [desmosReady, setDesmosReady] = useState(false);

  const selected = METHODS.find((m) => m.id === method);

  const update = (key, value) => {
    setParams((p) => ({
      ...p,
      [key]: value
    }));
  };

  const fields = useMemo(() => {
    if (
      method === "bisection" ||
      method === "false-position" ||
      method === "golden-section" ||
      method === "random-search"
    ) {
      return [
        ["a", "Límite inferior / a", "number"],
        ["b", "Límite superior / b", "number"]
      ];
    }

    if (method === "quadratic-interpolation") {
      return [
        ["x0", "x₀", "number"],
        ["x1", "x₁", "number"],
        ["x2", "x₂", "number"]
      ];
    }

    if (method === "newton-raphson") {
      return [
        ["x0", "Valor inicial x₀", "number"],
        ["derivative", "Derivada f'(x) — opcional", "text"]
      ];
    }

    if (method === "newton-optimization") {
      return [
        ["x0", "Valor inicial x₀", "number"],
        ["derivative", "Primera derivada f'(x) — opcional", "text"],
        [
          "second_derivative",
          "Segunda derivada f''(x) — opcional",
          "text"
        ]
      ];
    }

    if (method === "random-search-2d") {
      return [
        ["x_min", "X mínimo", "number"],
        ["x_max", "X máximo", "number"],
        ["y_min", "Y mínimo", "number"],
        ["y_max", "Y máximo", "number"]
      ];
    }

    return [];
  }, [method]);

  const calculate = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).map(([k, v]) => {
          if (
            [
              "tolerance",
              "a",
              "b",
              "x0",
              "x1",
              "x2",
              "x_min",
              "x_max",
              "y_min",
              "y_max"
            ].includes(k)
          ) {
            return [k, v === "" ? v : Number(v)];
          }

          if (["max_iterations", "seed"].includes(k)) {
            return [k, Number(v)];
          }

          return [k, v];
        })
      );

      const response = await fetch(`${API}/api/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          method,
          function: fn,
          params: cleanParams
        })
      });

      if (!response.ok) {
        throw new Error(
          `Error del servidor: ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(
          data.error || "Error al realizar el cálculo."
        );
      }

      setResult(data.result);
    } catch (e) {
      console.error(e);
      setError(
        e.message ||
          "No fue posible conectar con el servidor."
      );
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResult(null);
    setError("");

    if (desmosCalcRef.current) {
      try {
        desmosCalcRef.current.removeExpression({
          id: "solution-point"
        });
      } catch (e) {
        console.warn(
          "No se pudo limpiar el punto de resultado."
        );
      }
    }
  };

  const exportExcel = async () => {
    if (!result) return;

    try {
      const response = await fetch(
        `${API}/api/export-excel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            method_name: selected.name,
            result
          })
        }
      );

      if (!response.ok) {
        setError("No se pudo generar el Excel.");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${selected.name.replaceAll(
        " ",
        "_"
      )}.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      setError("No se pudo descargar el Excel.");
    }
  };

  const errorChart = (result?.errors || []).map(
    (value, index) => ({
      iteration: index + 1,
      error: value
    })
  );

  const toDesmosExpr = (expr) => {
    if (!expr) return "";

    return String(expr)
      .trim()
      .replace(/\*\*/g, "^");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const initializeDesmos = () => {
      if (
        !window.Desmos ||
        !desmosRef.current
      ) {
        return false;
      }

      if (!desmosCalcRef.current) {
        try {
          desmosCalcRef.current =
            window.Desmos.GraphingCalculator(
              desmosRef.current,
              {
                keypad: false,
                expressions: false,
                settingsMenu: false,
                zoomButtons: true,
                expressionsTopbar: false,
                border: false
              }
            );

          setDesmosReady(true);
        } catch (e) {
          console.error(
            "Error inicializando Desmos:",
            e
          );

          return false;
        }
      }

      return true;
    };

    if (initializeDesmos()) {
      return;
    }

    const timer = setInterval(() => {
      if (initializeDesmos()) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (
      !desmosReady ||
      !desmosCalcRef.current ||
      !desmosRef.current ||
      !fn ||
      method === "random-search-2d"
    ) {
      return;
    }

    const calc = desmosCalcRef.current;
    const expression = toDesmosExpr(fn);

    if (!expression) return;

    try {

      calc.removeExpression({
        id: "original-function"
      });
      calc.removeExpression({
        id: "solution-point"
      });
      calc.setExpression({
        id: "original-function",
        latex: `y=${expression}`,
        color: "#2563eb"
      });
      if (
        result &&
        typeof result.final_x === "number"
      ) {
        const fx =
          typeof result.final_fx === "number"
            ? result.final_fx
            : 0;

        calc.setExpression({
          id: "solution-point",
          latex: `(${result.final_x},${fx})`,
          pointStyle: "POINT",
          pointSize: 10,
          color: "#dc2626",
          showLabel: true,
          label:
            `Resultado: x = ` +
            result.final_x.toFixed(6)
        });
      }
      const a = Number(params.a);
      const b = Number(params.b);

      if (
        Number.isFinite(a) &&
        Number.isFinite(b) &&
        a !== b
      ) {
        const minX = Math.min(
  typeof params.a === "number" ? params.a : -3,
  typeof result?.final_x === "number"
    ? result.final_x
    : -3
);

    const maxX = Math.max(
      typeof params.b === "number" ? params.b : 3,
      typeof result?.final_x === "number"
      ? result.final_x
      : 3
    );

    const rangeX = Math.max(maxX - minX, 10);

    calc.setMathBounds({
      left: minX - rangeX,
      right: maxX + rangeX,
      bottom: -10,
      top: 10
    });
      } else {
        calc.setMathBounds({
          left: -10,
          right: 10,
          bottom: -10,
          top: 10
        });
      }
    } catch (e) {
      console.error(
        "Error mostrando la función en Desmos:",
        e
      );
    }
  }, [
    fn,
    result,
    method,
    desmosReady,
    params.a,
    params.b
  ]);

  const desmosAvailable =
    typeof window !== "undefined" &&
    typeof window.Desmos !== "undefined";

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="eyebrow">
            INGENIERÍA DE SISTEMAS · MARIA PAULA MOSQUERA
          </div>

          <h1>Métodos Numéricos</h1>
          <p>
            Raíces, optimización, iteraciones y análisis gráfico
          </p>
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <section className="card">
            <h2>Configuración</h2>

            <label>Método</label>

            <select
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                clear();
              }}
            >
              {["Raíces", "Optimización", "Búsqueda"].map(
                (category) => (
                  <optgroup
                    key={category}
                    label={category}
                  >
                    {METHODS.filter(
                      (m) =>
                        m.category === category
                    ).map((m) => (
                      <option
                        key={m.id}
                        value={m.id}
                      >
                        {m.name}
                      </option>
                    ))}
                  </optgroup>
                )
              )}
            </select>

            <label>Función f(x)</label>

            <input
              value={fn}
              onChange={(e) =>
                setFn(e.target.value)
              }
              placeholder="Ej: x^3 - 4*x - 9"
            />

            <div className="methodHelp">
              <strong>{selected.name}</strong>

              <span>
                {selected.description}
              </span>
            </div>

            {fields.map(
              ([key, label, type]) => (
                <div key={key}>
                  <label>{label}</label>

                  <input
                    type={
                      type === "number"
                        ? "number"
                        : "text"
                    }
                    step={
                      type === "number"
                        ? "any"
                        : undefined
                    }
                    value={params[key]}
                    onChange={(e) =>
                      update(
                        key,
                        e.target.value
                      )
                    }
                    placeholder={
                      type === "text"
                        ? "Opcional"
                        : ""
                    }
                  />
                </div>
              )
            )}

            <label>Tolerancia</label>

            <input
              type="number"
              step="any"
              value={params.tolerance}
              onChange={(e) =>
                update(
                  "tolerance",
                  e.target.value
                )
              }
            />
            <label>Máximo de iteraciones</label>
            <input
              type="number"
              value={
                params.max_iterations
              }
              onChange={(e) =>
                update(
                  "max_iterations",
                  e.target.value
                )
              }
            />

            {["golden-section", "quadratic-interpolation", "random-search", "random-search-2d"].includes(method) && (
              <label className="check">
                <input type="checkbox" checked={params.maximize}onChange={(e) =>
                    update(
                      "maximize",
                      e.target.checked
                    )
                  }
                />Buscar máximo</label>
            )}
            {["random-search", "random-search-2d"].includes(method) && (
              <>
                <label>Semilla</label>
                <input
                  type="number"
                  value={params.seed}
                  onChange={(e) =>
                    update(
                      "seed",
                      e.target.value
                    )
                  }
                />
              </>
            )}

            <div className="actions">
              <button
                className="primary"
                onClick={calculate}
                disabled={loading}
              >
                {loading
                  ? "Calculando..."
                  : "▶ Ejecutar método"}
              </button>

              <button
                className="secondary"
                onClick={clear}
              >Limpiar resultado</button>
            </div>
            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </section>
        </aside>

        <section className="content">
          <div className="resultHeader">
            <div>
              <div className="eyebrow">
                RESULTADOS
              </div>

              <h2>{selected.name}</h2>
            </div>

            <div
              className={`status ${
                result?.converged
                  ? "success"
                  : ""
              }`}
            >
              {result
                ? result.converged
                  ? "✓ Convergencia"
                  : "⚠ Máximo de iteraciones"
                : "Listo para ejecutar"}
            </div>
          </div>

          <div className="metrics">
            <div className="metric">
              <span>x final</span>

              <strong>
                {result?.final_x ?? "—"}
              </strong>
            </div>

            <div className="metric">
              <span>f(x)</span>

              <strong>
                {result?.final_fx ?? "—"}
              </strong>
            </div>

            <div className="metric">
              <span>Iteraciones</span>

              <strong>
                {result?.iterations ?? "—"}
              </strong>
            </div>

            {method ===
              "random-search-2d" && (
              <div className="metric">
                <span>y final</span>

                <strong>
                  {result?.final_y ?? "—"}
                </strong>
              </div>
            )}
          </div>
          {method !== "random-search-2d" && (
            <section className="panel original-function-panel">
              <div className="panelTitle">
                <div>
                  <h3>📈 Función original</h3>
                  <span>
                    f(x) = {fn}
                  </span>
                </div>
                {result &&
                  typeof result.final_x ===
                    "number" && (
                  <span className="function-result">
                    Raíz encontrada:{" "}
                    {result.final_x.toFixed(
                      6
                    )}
                  </span>
                )}
              </div>

              <div className="desmos-wrapper">
                <div
                  ref={desmosRef}
                  className="desmos-calc"
                />

                {!desmosAvailable && (
                  <div className="desmos-error">
                    No se pudo cargar Desmos.
                  </div>
                )}

                {desmosAvailable &&
                  !desmosReady && (
                  <div className="desmos-loading">
                    Cargando gráfica...
                  </div>
                )}
              </div>
            </section>
          )}

          {result ? (
            <>
              <div className="message">
                {result.message}
              </div>

              {method !==
                "random-search-2d" && (
                <section className="panel">
                  <div className="panelTitle">
                    <h3>
                      📉 Error por iteración
                    </h3>

                    <span>
                      Error absoluto
                    </span>
                  </div>

                  <div className="chart">
                    <ResponsiveContainer
                      width="100%"
                      height={280}
                    >
                      <LineChart
                        data={errorChart}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="iteration"
                        />

                        <YAxis />

                        <Tooltip />

                        <Line
                          type="monotone"
                          dataKey="error"
                          dot={false}
                          strokeWidth={2}
                          name="Error"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              <section className="panel">
                <div className="panelTitle">
                  <div>
                    <h3>
                      📋 Tabla de iteraciones
                    </h3><span>Formato detallado pararevisar el procedimiento revisar el procedimiento del método.</span>
                  </div>
                  <button
                    className="excel"
                    onClick={exportExcel}
                  >
                    ↓ Descargar Excel
                  </button>
                </div>

                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        {result.columns.map(
                          (c) => (
                            <th key={c}>
                              {c}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {result.table.map(
                        (row, i) => (
                          <tr key={i}>
                            {result.columns.map(
                              (c) => (
                                <td key={c}>
                                  {typeof row[c] ===
                                  "number"
                                    ? Number(
                                        row[c]
                                      )
                                        .toPrecision(
                                          10
                                        )
                                        .replace(
                                          /\.?0+$/,
                                          ""
                                        )
                                    : row[c]}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="empty">
              <div className="emptyIcon">
                ∑
              </div>
              <h3>
                Configura un método y ejecútalo
              </h3><p>Aquí aparecerán la función original, la gráfica del error y la tabla completa de iteraciones.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
