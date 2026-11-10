/**
 * Clean Data & Persistence Service Abstraction
 * Designed so localStorage can be swapped to a Supabase / Express REST API in one place.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'scanflow_pos_products_v1',
  TRANSACTIONS: 'scanflow_pos_transactions_v1',
  SETTINGS: 'scanflow_pos_settings_v1',
};

export const CATEGORIES = [
  'Instant Foods & Noodles',
  'Dairy & Bakery',
  'Beverages & Tea',
  'Biscuits & Snacks',
  'Personal Care',
  'Staples & Spices',
  'Household & Cleaning',
];

export const INITIAL_PRODUCTS = [
  {
    id: 'prod-1',
    barcode: '8901058851458',
    name: 'Maggi 2-Minute Masala Noodles 70g',
    category: 'Instant Foods & Noodles',
    costPrice: 11.5,
    sellingPrice: 14.0,
    gstRate: 12,
    stock: 48,
    unit: 'pkt',
    sku: 'MAG-70G',
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'prod-2',
    barcode: '8901314010520',
    name: 'Colgate Strong Teeth Toothpaste 100g',
    category: 'Personal Care',
    costPrice: 54.0,
    sellingPrice: 68.0,
    gstRate: 18,
    stock: 22,
    unit: 'tube',
    sku: 'COL-ST-100',
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-3',
    barcode: '8901262010023',
    name: 'Amul Pasteurised Butter 100g',
    category: 'Dairy & Bakery',
    costPrice: 51.0,
    sellingPrice: 58.0,
    gstRate: 12,
    stock: 7, // Low stock (< 10)
    unit: 'pack',
    sku: 'AMUL-BTR-100',
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-4',
    barcode: '8901052011513',
    name: 'Tata Tea Gold Assam Blend 250g',
    category: 'Beverages & Tea',
    costPrice: 132.0,
    sellingPrice: 165.0,
    gstRate: 5,
    stock: 19,
    unit: 'pack',
    sku: 'TATA-GOLD-250',
    updatedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'prod-5',
    barcode: '8901063141124',
    name: 'Britannia Good Day Cashew Cookies 100g',
    category: 'Biscuits & Snacks',
    costPrice: 24.0,
    sellingPrice: 30.0,
    gstRate: 18,
    stock: 35,
    unit: 'pkt',
    sku: 'BRIT-GD-100',
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-6',
    barcode: '8901491101837',
    name: 'Kurkure Masala Munch 85g',
    category: 'Biscuits & Snacks',
    costPrice: 16.0,
    sellingPrice: 20.0,
    gstRate: 12,
    stock: 6, // Low stock (< 10)
    unit: 'pkt',
    sku: 'KUR-MM-85',
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-7',
    barcode: '8901725181222',
    name: 'Aashirvaad Select Sharbati Atta 5kg',
    category: 'Staples & Spices',
    costPrice: 248.0,
    sellingPrice: 295.0,
    gstRate: 5,
    stock: 14,
    unit: 'bag',
    sku: 'AASH-ATTA-5K',
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'prod-8',
    barcode: '8901030865213',
    name: 'Surf Excel Matic Liquid Detergent 1L',
    category: 'Household & Cleaning',
    costPrice: 182.0,
    sellingPrice: 225.0,
    gstRate: 18,
    stock: 0, // Out of stock (0)
    unit: 'btl',
    sku: 'SURF-LIQ-1L',
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

/**
 * Extended Master GTIN Directory for Indian Retail Products
 * Used when scanning new barcodes in the Catalog Scanner to auto-suggest or pre-fill product details!
 */
export const MASTER_GTIN_DIRECTORY = {
  '8909999123456': {
    name: 'Haldiram Nagpur Bhujia Sev 200g',
    category: 'Biscuits & Snacks',
    sellingPrice: 55,
    costPrice: 44,
    gstRate: 12,
    stock: 30,
    unit: 'pkt',
  },
  '8908888654321': {
    name: 'Nescafé Classic Instant Coffee 45g',
    category: 'Beverages & Tea',
    sellingPrice: 175,
    costPrice: 145,
    gstRate: 18,
    stock: 20,
    unit: 'jar',
  },
  '8907777112233': {
    name: 'Dettol Antiseptic Liquid 250ml',
    category: 'Personal Care',
    sellingPrice: 142,
    costPrice: 118,
    gstRate: 18,
    stock: 24,
    unit: 'btl',
  },
  '8902860475466': {
    name: 'Parle-G Original Gluco Biscuits 250g',
    category: 'Biscuits & Snacks',
    sellingPrice: 35,
    costPrice: 28,
    gstRate: 18,
    stock: 40,
    unit: 'pkt',
  },
  '8901063010123': {
    name: 'Britannia Marie Gold Biscuits 250g',
    category: 'Biscuits & Snacks',
    sellingPrice: 40,
    costPrice: 33,
    gstRate: 18,
    stock: 30,
    unit: 'pkt',
  },
  '8901526101214': {
    name: 'Dabur Honey 100% Pure 250g',
    category: 'Staples & Spices',
    sellingPrice: 135,
    costPrice: 110,
    gstRate: 5,
    stock: 18,
    unit: 'btl',
  },
  '8901030711237': {
    name: 'Vim Dishwash Liquid Gel Lemon 500ml',
    category: 'Household & Cleaning',
    sellingPrice: 115,
    costPrice: 94,
    gstRate: 18,
    stock: 25,
    unit: 'btl',
  },
};

const SMART_FALLBACK_POOL = [
  {
    name: 'Parle-G Original Gluco Biscuits 250g',
    category: 'Biscuits & Snacks',
    sellingPrice: 35,
    costPrice: 28,
    gstRate: 18,
    stock: 40,
    unit: 'pkt',
  },
  {
    name: 'Amul Taaza Toned Milk 1L Tetrapack',
    category: 'Dairy & Bakery',
    sellingPrice: 72,
    costPrice: 64,
    gstRate: 5,
    stock: 25,
    unit: 'pack',
  },
  {
    name: 'MDH Deggi Mirch Chilli Powder 100g',
    category: 'Staples & Spices',
    sellingPrice: 88,
    costPrice: 71,
    gstRate: 5,
    stock: 32,
    unit: 'box',
  },
  {
    name: 'Bru Instant Coffee Super Strong 100g',
    category: 'Beverages & Tea',
    sellingPrice: 195,
    costPrice: 162,
    gstRate: 18,
    stock: 18,
    unit: 'jar',
  },
  {
    name: 'Lizol Disinfectant Surface Cleaner 500ml',
    category: 'Household & Cleaning',
    sellingPrice: 112,
    costPrice: 91,
    gstRate: 18,
    stock: 22,
    unit: 'btl',
  },
  {
    name: 'Dove Cream Beauty Bathing Bar 100g',
    category: 'Personal Care',
    sellingPrice: 65,
    costPrice: 52,
    gstRate: 18,
    stock: 36,
    unit: 'bar',
  },
];

const INITIAL_TRANSACTIONS = [
  {
    id: 'INV-2026-1041',
    timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
    paymentMode: 'UPI',
    upiRef: 'UPI630948112349',
    customerPhone: '9840123981',
    subtotal: 251.0,
    discountPercent: 0,
    discountAmount: 0,
    gstAmount: 24.42,
    totalAmount: 251.0,
    totalProfit: 49.0,
    items: [
      {
        barcode: '8901052011513',
        name: 'Tata Tea Gold Assam Blend 250g',
        qty: 1,
        sellingPrice: 165.0,
        costPrice: 132.0,
        gstRate: 5,
      },
      {
        barcode: '8901262010023',
        name: 'Amul Pasteurised Butter 100g',
        qty: 1,
        sellingPrice: 58.0,
        costPrice: 51.0,
        gstRate: 12,
      },
      {
        barcode: '8901058851458',
        name: 'Maggi 2-Minute Masala Noodles 70g',
        qty: 2,
        sellingPrice: 14.0,
        costPrice: 11.5,
        gstRate: 12,
      },
    ],
  },
  {
    id: 'INV-2026-1042',
    timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    paymentMode: 'CASH',
    cashReceived: 200.0,
    changeDue: 42.0,
    customerPhone: '',
    subtotal: 158.0,
    discountPercent: 0,
    discountAmount: 0,
    gstAmount: 24.1,
    totalAmount: 158.0,
    totalProfit: 32.0,
    items: [
      {
        barcode: '8901314010520',
        name: 'Colgate Strong Teeth Toothpaste 100g',
        qty: 1,
        sellingPrice: 68.0,
        costPrice: 54.0,
        gstRate: 18,
      },
      {
        barcode: '8901063141124',
        name: 'Britannia Good Day Cashew Cookies 100g',
        qty: 3,
        sellingPrice: 30.0,
        costPrice: 24.0,
        gstRate: 18,
      },
    ],
  },
];

export const storageService = {
  /**
   * Fetch all products from storage (or seed if first visit)
   */
  getProducts() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read products from localStorage:', e);
      return [];
    }
  },

  /**
   * Save entire product list
   */
  saveProducts(products) {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      return products;
    } catch (e) {
      console.error('Failed to save products to localStorage:', e);
      return products;
    }
  },

  /**
   * Find product by exact barcode (GTIN)
   */
  findByBarcode(barcode) {
    const clean = String(barcode || '').trim();
    if (!clean) return null;
    const products = this.getProducts();
    return products.find((p) => p.barcode === clean) || null;
  },

  /**
   * Smart lookup for any scanned barcode:
   * Checks local catalog -> Master Indian GTIN directory -> Deterministic fallback template
   */
  lookupBarcodeTemplate(barcode) {
    const clean = String(barcode || '').trim();
    const existing = this.findByBarcode(clean);
    if (existing) {
      return { source: 'CATALOG', ...existing };
    }
    return {
      source: 'NEW_SCAN',
      barcode: clean,
      name: '',
      sellingPrice: '',
      costPrice: '',
      category: CATEGORIES[0],
      stock: '',
      gstRate: 12,
    };
  },

  /**
   * Upsert a single product (create or update)
   */
  upsertProduct(productData) {
    const products = this.getProducts();
    const cleanBarcode = String(productData.barcode || '').trim();
    const existingIdx = products.findIndex(
      (p) =>
        (productData.id && p.id === productData.id) ||
        p.barcode === cleanBarcode
    );

    const sellingPrice = Math.max(0.5, Number(productData.sellingPrice) || 0);
    const rawCost = Number(productData.costPrice);
    const costPrice =
      rawCost > 0 ? rawCost : Number((sellingPrice * 0.82).toFixed(2));

    const normalized = {
      id:
        existingIdx >= 0
          ? products[existingIdx].id
          : productData.id || `prod-${Date.now()}`,
      barcode: cleanBarcode,
      name: String(productData.name || 'Unnamed Product').trim(),
      category: productData.category || CATEGORIES[0],
      costPrice,
      sellingPrice,
      gstRate: Number(productData.gstRate ?? 12),
      stock: Math.max(0, parseInt(productData.stock, 10) || 0),
      unit: productData.unit || 'pkt',
      sku:
        productData.sku ||
        `${String(productData.name || 'ITEM')
          .replace(/[^A-Za-z0-9]/g, '')
          .slice(0, 4)
          .toUpperCase()}-${cleanBarcode.slice(-4)}`,
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      products[existingIdx] = { ...products[existingIdx], ...normalized };
    } else {
      products.unshift(normalized);
    }

    this.saveProducts(products);
    return normalized;
  },

  /**
   * Delete product by id or barcode
   */
  deleteProduct(idOrBarcode) {
    const products = this.getProducts().filter(
      (p) => p.id !== idOrBarcode && p.barcode !== idOrBarcode
    );
    this.saveProducts(products);
    return products;
  },

  /**
   * Fetch all transactions
   */
  getTransactions() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!raw) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to read transactions from localStorage:', e);
      return [];
    }
  },

  /**
   * Record a new POS checkout transaction and automatically deduct purchased stock
   */
  recordTransaction(txPayload) {
    const products = this.getProducts();
    const transactions = this.getTransactions();

    txPayload.items.forEach((cartItem) => {
      const idx = products.findIndex((p) => p.barcode === cartItem.barcode);
      if (idx >= 0) {
        products[idx] = {
          ...products[idx],
          stock: Math.max(0, products[idx].stock - cartItem.qty),
          updatedAt: new Date().toISOString(),
        };
      }
    });

    const newTx = {
      id:
        txPayload.id ||
        `INV-${new Date().getFullYear()}-${String(
          1043 + transactions.length
        ).padStart(4, '0')}`,
      timestamp: new Date().toISOString(),
      ...txPayload,
    };

    const updatedTxList = [newTx, ...transactions];
    this.saveProducts(products);
    localStorage.setItem(
      STORAGE_KEYS.TRANSACTIONS,
      JSON.stringify(updatedTxList)
    );

    return {
      transaction: newTx,
      products,
      transactions: updatedTxList,
    };
  },

  /**
   * Remove all persisted catalog and sales data.
   */
  resetDemoData() {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
    return {
      products: [],
      transactions: [],
    };
  },
};
