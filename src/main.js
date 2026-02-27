/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  const discountMultiplier = 1 - purchase.discount / 100;
  return purchase.sale_price * purchase.quantity * discountMultiplier;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  if (index === 0) return seller.profit * 0.15;
  if (index === 1 || index === 2) return seller.profit * 0.1;
  if (index === total - 1) return 0;
  return seller.profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
  const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;
  const round2 = (value) => +value.toFixed(2);

  if (
    !data ||
    typeof data !== "object" ||
    !isNonEmptyArray(data.sellers) ||
    !isNonEmptyArray(data.products) ||
    !isNonEmptyArray(data.purchase_records)
  ) {
    throw new Error("");
  }

  if (
    !options ||
    typeof options !== "object" ||
    typeof options.calculateRevenue !== "function" ||
    typeof options.calculateBonus !== "function"
  ) {
    throw new Error("");
  }

  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0,
    profit: 0,
    sales_count: 0,
    products_sold: {}
  }));

  const sellerIndex = {};
  for (const seller of sellerStats) {
    sellerIndex[seller.seller_id] = seller;
  }

  const productIndex = {};
  for (const product of data.products) {
    productIndex[product.sku] = product;
  }

  for (const record of data.purchase_records) {
    const seller = sellerIndex[record.seller_id];
    if (!seller) continue;

    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    for (const item of record.items) {
      const product = productIndex[item.sku];
      if (!product) continue;

      const revenue = options.calculateRevenue(item, product);
      const cost = product.purchase_price * item.quantity;

      seller.profit += revenue - cost;

      if (seller.products_sold[item.sku] === undefined) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    }
  }

  sellerStats.sort((a, b) => b.profit - a.profit);

  const total = sellerStats.length;
  for (let i = 0; i < total; i += 1) {
    const seller = sellerStats[i];

    seller.bonus = options.calculateBonus(i, total, seller);

    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }

  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id,
    name: seller.name,
    revenue: round2(seller.revenue),
    profit: round2(seller.profit),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: round2(seller.bonus)
  }));
}