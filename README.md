# Métodos Numéricos

Aplicación web para ejecutar métodos numéricos, mostrar:
- gráfica de la función original
- gráfica del error por iteración
- tabla completa de iteraciones
- resumen del resultado
- exportación de la tabla a Excel


## Métodos incluidos

1. Bisección
2. Falsa Posición
3. Sección Dorada
4. Interpolación Cuadrática
5. Newton-Raphson
6. Newton de Optimización
7. Búsqueda Aleatoria 1D
8. Búsqueda Aleatoria 2D

La lógica matemática parte de los métodos del notebook realizado


## Ejecutar

Necesitas dos terminales.

### Terminal 1 — backend

```bash
cd backend
npm run dev
```

### Terminal 2 — frontend

```bash
cd frontend
npm run dev
```

Luego abre la dirección que indique Vite, normalmente:

## Notas

- En las funciones puedes usar `^` o `**` para potencias.
- Para funciones trigonometricas se utiliza `sin`, `cos`.
- Para Newton-Raphson y Newton de Optimización, la derivada puede calcularse automáticamente a partir de la función.

## Entrega - Maria Paula Mosquera Alvarez 1022002020