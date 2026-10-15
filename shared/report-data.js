/*
  Datos mock del custom report "Total sales by order" (Display table).
  Replica el reporte de Shopify usado como referencia en ENG-2308:
  FROM sales SHOW gross_sales, discounts, sales_reversals, net_sales, shipping_charges, taxes, total_sales
  GROUP BY month, sale_id, order_name, product_title_at_time_of_sale WITH TOTALS, CURRENCY 'GBP'
*/
(function () {
  const COLUMNS = [
    { key: 'month', label: 'Month', format: 'base', listSlot: 'kicker', priority: 1 },
    { key: 'saleId', label: 'Sale ID', format: 'base', listSlot: 'labeled', priority: 3 },
    { key: 'order', label: 'Order name', format: 'base', listSlot: 'secondary', priority: 1 },
    { key: 'product', label: 'Product title at time of sale', format: 'base', listSlot: 'primary', priority: 1 },
    { key: 'gross', label: 'Gross sales', format: 'currency', listSlot: 'labeled', priority: 2 },
    { key: 'discounts', label: 'Discounts', format: 'currency', listSlot: 'labeled', priority: 4 },
    { key: 'reversals', label: 'Sales reversals', format: 'currency', listSlot: 'labeled', priority: 4 },
    { key: 'net', label: 'Net sales', format: 'currency', listSlot: 'labeled', priority: 2 },
    { key: 'shipping', label: 'Shipping charges', format: 'currency', listSlot: 'labeled', priority: 3 },
    { key: 'taxes', label: 'Taxes', format: 'currency', listSlot: 'labeled', priority: 3 },
    { key: 'total', label: 'Total sales', format: 'currency', listSlot: 'inline', priority: 1 },
  ];

  const PRODUCTS = [
    { name: 'The 3p Fulfilled Snowboard', img: 'teal' },
    { name: 'The Collection Snowboard: Liquid', img: 'violet' },
    { name: 'The Collection Snowboard: Hydrogen', img: 'violet' },
    { name: 'Fresh Gold Salad', img: null },
    { name: 'The Multi-managed Snowboard', img: 'teal' },
    { name: 'Gift Card', img: null },
    { name: null, img: null }, // "None": líneas de envío / ajustes
  ];
  const MONTHS = ['Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026', 'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026'];

  // PRNG determinista para que el prototipo siempre muestre lo mismo
  let seed = 27019;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const r2 = (n) => Math.round(n * 100) / 100;

  const ROWS = [];
  let order = 27019;
  for (let i = 0; i < 132; i++) {
    const month = MONTHS[Math.min(MONTHS.length - 1, Math.floor(i / 11))];
    if (rnd() > 0.55) order++;
    const p = PRODUCTS[Math.floor(rnd() * PRODUCTS.length)];
    const row = { month, saleId: String(21682293407905 + Math.floor(rnd() * 9e11)), order: '#' + order, product: p.name, img: p.img, gross: 0, discounts: 0, reversals: 0, net: 0, shipping: 0, taxes: 0 };
    if (p.name) {
      row.gross = r2(60 + rnd() * 2600);
      row.discounts = rnd() > 0.6 ? -r2(row.gross * 0.015) : 0;
      row.reversals = rnd() > 0.92 ? -r2(row.gross) : 0;
      row.net = r2(row.gross + row.discounts + row.reversals);
      row.taxes = rnd() > 0.7 ? r2(row.net * 0.2) : 0;
    } else {
      row.shipping = rnd() > 0.85 ? -15 : r2([4, 80, 120, 233, 300, 500][Math.floor(rnd() * 6)]);
    }
    row.total = r2(row.net + row.shipping + row.taxes);
    ROWS.push(row);
  }

  const TOTALS = COLUMNS.reduce((acc, c) => {
    if (c.format === 'currency') acc[c.key] = r2(ROWS.reduce((s, r) => s + r[c.key], 0));
    return acc;
  }, {});

  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

  window.CifraReport = {
    id: 'total-sales-by-order',
    title: 'Total sales by order',
    range: 'Oct 15, 2025–Oct 15, 2026',
    columns: COLUMNS,
    rows: ROWS,
    totals: TOTALS,
    fmt: (v) => money.format(v),
  };
})();
