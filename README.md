# Cifra · Table widget (ENG-2308)

Prototipo HTML del widget de dashboard para custom reports con visualización **Display table**, construido con Polaris Web Components 2.0-rc (`polaris-2.0-rc.js`). Basado en `cifra-prototipos/dashboard-customize.html`.

## Páginas

- `index.html`: dashboard en modo lectura. El panel amarillo cambia la alternativa UX (A–E), el ancho del widget (S/M/L/XL) y el estado (datos, loading, vacío, error). Al final está la comparativa de alternativas.
- `customize.html`: el editor de referencia con el grupo "Custom reports". "Total sales by order" se agrega con doble clic o arrastrándolo; el menú "…" ofrece "Display table".

## Correr local

```bash
npx --yes http-server@14.1.1 -p 5179 -c-1
```

Abrir http://localhost:5179

## Archivos

- `shared/report-data.js`: datos mock (132 filas, GBP, fila de totales).
- `shared/table-widget.js`: componente `CifraTableWidget.mount(el, { mode, editable })`.
- `shared/table-widget.css`: solo layout custom, sin transiciones propias.
- `shared/cifra.css`, `shared/cifra.js`, `assets/`: copiados de cifra-prototipos.

## Nativo vs custom

| Comportamiento | Cómo |
|---|---|
| Tabla, totales, formato moneda | `s-table` + `format="currency"` |
| Paginación (C) | `paginate` / `hasNextPage` / evento `nextpage` + `loading` |
| Load more (D) | `s-button loading` |
| Expandir (E y botón del header) | `s-modal size="large-100"`, apertura con `commandFor` / `command="--show"` |
| Mobile | `s-table variant="list"` con `listSlot` por columna |
| Columnas según ancho (mín. 4), scroll interno, footer de filas | Custom (`data-custom`) |

**Limitación:** `s-table` renderiza el header en shadow DOM y su scroll horizontal interno impide fijarlo (sticky). En B y D el header se pierde al hacer scroll; por eso se recomienda E (o C).
