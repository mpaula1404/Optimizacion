import math
import random
from typing import Callable

import numpy as np
import sympy as sp


def _safe_value(fn: Callable, x: float) -> float:
    y = float(fn(x))
    if not math.isfinite(y):
        raise ValueError(f"f({x:g}) no es finita")
    return y


def parse_1d_function(expression: str):
    expression = expression.strip().replace("^", "**")
    x = sp.Symbol("x")
    expr = sp.sympify(expression, locals={
        "x": x,
        "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
        "exp": sp.exp, "sqrt": sp.sqrt, "log": sp.log,
        "ln": sp.log, "pi": sp.pi, "e": sp.E,
        "abs": sp.Abs
    })
    fn = sp.lambdify(x, expr, modules=["numpy"])
    return expr, x, fn


def parse_2d_function(expression: str):
    expression = expression.strip().replace("^", "**")
    x, y = sp.symbols("x y")
    expr = sp.sympify(expression, locals={
        "x": x, "y": y,
        "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
        "exp": sp.exp, "sqrt": sp.sqrt, "log": sp.log,
        "ln": sp.log, "pi": sp.pi, "e": sp.E
    })
    fn = sp.lambdify((x, y), expr, modules=["numpy"])
    return expr, x, y, fn


def result(message, converged, final_x, final_fx, errors, history, table, columns=None, extra=None):
    payload = {
        "converged": bool(converged),
        "message": message,
        "final_x": None if final_x is None else float(final_x),
        "final_fx": None if final_fx is None else float(final_fx),
        "iterations": len(table),
        "errors": [float(e) for e in errors],
        "x_history": [float(x) for x in history],
        "table": table,
        "columns": columns or (list(table[0].keys()) if table else []),
    }
    if extra:
        payload.update(extra)
    return payload


def bisection(fn, a, b, tol, max_iter):
    fa, fb = _safe_value(fn, a), _safe_value(fn, b)
    if fa == 0:
        return result("Raíz encontrada en el extremo izquierdo", True, a, fa, [], [a], [])
    if fb == 0:
        return result("Raíz encontrada en el extremo derecho", True, b, fb, [], [b], [])
    if fa * fb > 0:
        raise ValueError("El intervalo debe contener un cambio de signo: f(a)·f(b) < 0.")

    errors, history, table = [], [], []
    previous = None

    for i in range(0, max_iter):
        xr = (a + b) / 2
        fxr = _safe_value(fn, xr)
        error = abs(b - xr) if previous is None else abs(xr - previous)
        product = fa * fxr

        row = {
            "i": i,
            "xl": a,
            "xu": b,
            "xr": xr,
            "f(xl)": fa,
            "f(xu)": fb,
            "f(xr)": fxr,
            "f(xl)f(xr)": product,
            "Error calculado": error,
            "Error a alcanzar": tol,
        }
        table.append(row)
        errors.append(error)
        history.append(xr)

        if abs(fxr) <= tol or error <= tol:
            return result("Convergencia alcanzada", True, xr, fxr, errors, history, table)

        if product < 0:
            b, fb = xr, fxr
        else:
            a, fa = xr, fxr
        previous = xr

    return result("Se alcanzó el máximo de iteraciones", False, xr, fxr, errors, history, table)


def false_position(fn, a, b, tol, max_iter):
    fa, fb = _safe_value(fn, a), _safe_value(fn, b)
    if fa == 0:
        return result("Raíz encontrada", True, a, fa, [], [a], [])
    if fb == 0:
        return result("Raíz encontrada", True, b, fb, [], [b], [])
    if fa * fb > 0:
        raise ValueError("El intervalo debe contener un cambio de signo: f(a)·f(b) < 0.")

    errors, history, table = [], [], []
    previous = None

    for i in range(0, max_iter):
        den = fb - fa
        if abs(den) < 1e-15:
            raise ValueError("División por cero en falsa posición.")

        xr = b - fb * (a - b) / (fa - fb)
        fxr = _safe_value(fn, xr)
        error = abs(b - xr) if previous is None else abs(xr - previous)
        product = fa * fxr

        table.append({
            "i": i, "xl": a, "xu": b, "xr": xr,
            "f(xl)": fa, "f(xu)": fb, "f(xr)": fxr,
            "f(xl)f(xr)": product,
            "Error calculado": error, "Error a alcanzar": tol
        })
        errors.append(error)
        history.append(xr)

        if abs(fxr) <= tol or error <= tol:
            return result("Convergencia alcanzada", True, xr, fxr, errors, history, table)

        if product < 0:
            b, fb = xr, fxr
        else:
            a, fa = xr, fxr
        previous = xr

    return result("Se alcanzó el máximo de iteraciones", False, xr, fxr, errors, history, table)


def golden(fn, a, b, tol, max_iter, maximize=False):
    if not a < b:
        raise ValueError("Se requiere a < b.")

    phi = (math.sqrt(5) - 1) / 2
    c = b - phi * (b - a)
    d = a + phi * (b - a)
    fc, fd = _safe_value(fn, c), _safe_value(fn, d)

    errors, history, table = [], [], []

    for i in range(0, max_iter):
        x = (a + b) / 2
        fx = _safe_value(fn, x)
        error = abs(b - a)

        table.append({
            "i": i, "xl": a, "xu": b, "x1": c, "x2": d,
            "f(x1)": fc, "f(x2)": fd, "x": x, "f(x)": fx,
            "Error": error, "Error a alcanzar": tol
        })
        errors.append(error)
        history.append(x)

        if error <= tol:
            return result("Convergencia alcanzada", True, x, fx, errors, history, table)

        better_left = fc > fd if maximize else fc < fd
        if better_left:
            b, d, fd = d, c, fc
            c = b - phi * (b - a)
            fc = _safe_value(fn, c)
        else:
            a, c, fc = c, d, fd
            d = a + phi * (b - a)
            fd = _safe_value(fn, d)

    return result("Se alcanzó el máximo de iteraciones", False, x, fx, errors, history, table)


def quadratic(fn, x0, x1, x2, tol, max_iter, maximize=False):
    errors, history, table = [], [], []
    previous = None

    for i in range(0, max_iter):
        f0, f1, f2 = map(lambda z: _safe_value(fn, z), (x0, x1, x2))
        den = 2*f0*(x1-x2) + 2*f1*(x2-x0) + 2*f2*(x0-x1)
        if abs(den) < 1e-15:
            raise ValueError("Interpolación cuadrática degenerada.")

        x = (
            f0*(x1**2-x2**2)
            + f1*(x2**2-x0**2)
            + f2*(x0**2-x1**2)
        ) / den
        fx = _safe_value(fn, x)
        error = abs(x-x1) if previous is None else abs(x-previous)

        table.append({
            "i": i, "x0": x0, "x1": x1, "x2": x2,
            "f(x0)": f0, "f(x1)": f1, "f(x2)": f2,
            "x": x, "f(x)": fx, "Error": error,
            "Error a alcanzar": tol
        })
        errors.append(error)
        history.append(x)

        if error <= tol:
            return result("Convergencia alcanzada", True, x, fx, errors, history, table)

        better = fx > f1 if maximize else fx < f1
        if x > x1:
            if better:
                x0, x1 = x1, x
            else:
                x2 = x
        elif x < x1:
            if better:
                x2, x1 = x1, x
            else:
                x0 = x
        else:
            raise ValueError("La interpolación produjo un punto igual a x1.")

        previous = x

    return result("Se alcanzó el máximo de iteraciones", False, x, fx, errors, history, table)


def newton_root(fn, derivative, x, tol, max_iter):
    errors, history, table = [], [], []

    for i in range(0, max_iter):
        fx = _safe_value(fn, x)
        d = _safe_value(derivative, x)
        if abs(d) < 1e-15:
            raise ValueError(f"La derivada es cero en x = {x:g}.")

        nxt = x - fx/d
        error = abs(nxt-x)

        table.append({
            "i": i, "xi": x, "f(xi)": fx,
            "f'(xi)": d, "xi+1": nxt,
            "Error": error, "Error a alcanzar": tol
        })
        errors.append(error)
        history.append(nxt)

        x = nxt
        fx_new = _safe_value(fn, x)

        if abs(fx_new) <= tol or error <= tol:
            return result("Convergencia alcanzada", True, x, fx_new, errors, history, table)

    return result("Se alcanzó el máximo de iteraciones", False, x, _safe_value(fn, x), errors, history, table)


def newton_optimization(fn, derivative, second, x, tol, max_iter):
    errors, history, table = [], [], []

    for i in range(0, max_iter):
        fx = _safe_value(fn, x)
        d = _safe_value(derivative, x)
        dd = _safe_value(second, x)
        if abs(dd) < 1e-15:
            raise ValueError(f"La segunda derivada es cero en x = {x:g}.")

        nxt = x - d/dd
        error = abs(nxt-x)

        table.append({
            "i": i, "xi": x, "f(xi)": fx,
            "f'(xi)": d, "f''(xi)": dd,
            "xi+1": nxt, "Error": error,
            "Error a alcanzar": tol
        })
        errors.append(error)
        history.append(nxt)

        x = nxt
        if error <= tol:
            return result("Convergencia alcanzada", True, x, _safe_value(fn, x), errors, history, table)

    return result("Se alcanzó el máximo de iteraciones", False, x, _safe_value(fn, x), errors, history, table)


def random_search(fn, a, b, max_iter, maximize=False, seed=42):
    if not a < b:
        raise ValueError("Se requiere a < b.")

    rng = np.random.default_rng(seed)
    best = None
    errors, history, table = [], [], []

    for i in range(0, max_iter):
        x = float(rng.uniform(a, b))
        fx = _safe_value(fn, x)
        old_best = best[1] if best is not None else fx

        if best is None or (fx > best[1] if maximize else fx < best[1]):
            best = (x, fx)

        error = abs(old_best-best[1])
        table.append({
            "i": i, "x": x, "f(x)": fx,
            "Mejor x": best[0], "Mejor f(x)": best[1],
            "Error": error
        })
        errors.append(error)
        history.append(best[0])

    return result("Búsqueda completada", True, best[0], best[1], errors, history, table)


def random_search_2d(fn, x_min, x_max, y_min, y_max, max_iter, maximize=False, seed=42):
    if not (x_min < x_max and y_min < y_max):
        raise ValueError("Se requieren rangos válidos para x e y.")

    rng = np.random.default_rng(seed)
    best = None
    errors, history, table = [], [], []

    for i in range(0, max_iter):
        x = float(rng.uniform(x_min, x_max))
        y = float(rng.uniform(y_min, y_max))
        fx = float(fn(x, y))
        if not math.isfinite(fx):
            raise ValueError(f"f({x:g}, {y:g}) no es finita.")

        old_best = best[2] if best is not None else fx
        if best is None or (fx > best[2] if maximize else fx < best[2]):
            best = (x, y, fx)

        error = abs(old_best-best[2])
        table.append({
            "i": i, "x": x, "y": y, "f(x,y)": fx,
            "Mejor x": best[0], "Mejor y": best[1],
            "Mejor f(x,y)": best[2], "Error": error
        })
        errors.append(error)
        history.append(best[0])

    return result(
        "Búsqueda completada", True, best[0], best[2],
        errors, history, table,
        extra={"final_y": best[1]}
    )


def curve_data(fn, xmin, xmax, points=300):
    if xmin >= xmax:
        raise ValueError("El rango de la gráfica debe cumplir mínimo < máximo.")

    xs = np.linspace(xmin, xmax, points)
    data = []
    for x in xs:
        try:
            y = float(fn(float(x)))
            if math.isfinite(y):
                data.append({"x": float(x), "y": y})
        except Exception:
            continue
    return data


def run(payload):
    method = payload["method"]
    expr, x_symbol, fn = parse_1d_function(payload["function"])

    p = payload.get("params", {})
    tol = float(p.get("tolerance", 1e-4))
    max_iter = int(p.get("max_iterations", 100))
    maximize = bool(p.get("maximize", False))

    if method == "bisection":
        out = bisection(fn, float(p["a"]), float(p["b"]), tol, max_iter)
        plot_min, plot_max = float(p["a"]), float(p["b"])
    elif method == "false-position":
        out = false_position(fn, float(p["a"]), float(p["b"]), tol, max_iter)
        plot_min, plot_max = float(p["a"]), float(p["b"])
    elif method == "golden-section":
        out = golden(fn, float(p["a"]), float(p["b"]), tol, max_iter, maximize)
        plot_min, plot_max = float(p["a"]), float(p["b"])
    elif method == "quadratic-interpolation":
        out = quadratic(fn, float(p["x0"]), float(p["x1"]), float(p["x2"]), tol, max_iter, maximize)
        vals = [float(p["x0"]), float(p["x1"]), float(p["x2"])]
        plot_min, plot_max = min(vals), max(vals)
    elif method == "newton-raphson":
        derivative_expr = p.get("derivative", "").strip()
        derivative = sp.lambdify(x_symbol, sp.diff(expr, x_symbol) if not derivative_expr else sp.sympify(derivative_expr.replace("^", "**")), modules=["numpy"])
        out = newton_root(fn, derivative, float(p["x0"]), tol, max_iter)
        plot_min, plot_max = float(p["x0"])-5, float(p["x0"])+5
    elif method == "newton-optimization":
        derivative_expr = p.get("derivative", "").strip()
        second_expr = p.get("second_derivative", "").strip()
        d_expr = sp.diff(expr, x_symbol) if not derivative_expr else sp.sympify(derivative_expr.replace("^", "**"))
        dd_expr = sp.diff(d_expr, x_symbol) if not second_expr else sp.sympify(second_expr.replace("^", "**"))
        derivative = sp.lambdify(x_symbol, d_expr, modules=["numpy"])
        second = sp.lambdify(x_symbol, dd_expr, modules=["numpy"])
        out = newton_optimization(fn, derivative, second, float(p["x0"]), tol, max_iter)
        plot_min, plot_max = float(p["x0"])-5, float(p["x0"])+5
    elif method == "random-search":
        out = random_search(fn, float(p["a"]), float(p["b"]), max_iter, maximize, int(p.get("seed", 42)))
        plot_min, plot_max = float(p["a"]), float(p["b"])
    elif method == "random-search-2d":
        expr2, _, _, fn2 = parse_2d_function(payload["function"])
        out = random_search_2d(fn2, float(p["x_min"]), float(p["x_max"]), float(p["y_min"]), float(p["y_max"]), max_iter, maximize, int(p.get("seed", 42)))
        return out
    else:
        raise ValueError("Método no soportado.")

    # Rango razonable para visualizar la función.
    span = max(1.0, abs(plot_max-plot_min))
    plot_min -= 0.15 * span
    plot_max += 0.15 * span

    out["function"] = str(expr)
    out["curve"] = curve_data(fn, plot_min, plot_max)
    out["plot_range"] = {"min": plot_min, "max": plot_max}
    return out
