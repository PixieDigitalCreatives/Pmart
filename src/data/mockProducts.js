// PMart Realistic Quick-Commerce Product Catalog

export const mockProducts = [
  // --- Dairy & Breakfast ---
  {
    id: 'prod-101',
    name: 'Amul Taaza Fresh Toned Milk',
    slug: 'amul-taaza-fresh-toned-milk-1l',
    brand: 'Amul',
    categorySlug: 'dairy-breakfast',
    subcategory: 'Milk & Cream',
    price: 56,
    mrp: 58,
    unit: '1 L',
    discount: 3,
    rating: 4.8,
    reviewsCount: 3420,
    inStock: true,
    stockCount: 85,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Pasteurized homogenized toned milk with 3.0% fat and 8.5% SNF. Wholesome and nutritious for everyday tea, coffee, and family health.',
    specifications: {
      'Shelf Life': '2 Days from packing',
      'Fat Content': '3.0% Min',
      'SNF': '8.5% Min',
      'Storage': 'Keep refrigerated below 4°C',
      'Manufacturer': 'Gujarat Cooperative Milk Marketing Federation Ltd.'
    },
    nutrition: {
      'Energy': '58 kcal per 100ml',
      'Protein': '3.1 g',
      'Carbohydrates': '4.7 g',
      'Fat': '3.0 g',
      'Calcium': '120 mg'
    },
    tags: ['daily-essentials', 'most-bought', 'fresh-picks']
  },
  {
    id: 'prod-102',
    name: 'Amul Pasteurized Salted Butter',
    slug: 'amul-pasteurized-salted-butter-500g',
    brand: 'Amul',
    categorySlug: 'dairy-breakfast',
    subcategory: 'Butter & Cheese',
    price: 275,
    mrp: 285,
    unit: '500 g',
    discount: 4,
    rating: 4.9,
    reviewsCount: 5210,
    inStock: true,
    stockCount: 60,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'The iconic taste of India. Pure milk butter with just the right amount of salt. Irreplaceable on toasts, paranthas, and gourmet cooking.',
    specifications: {
      'Shelf Life': '12 Months',
      'Storage': 'Refrigerate at or below 4°C',
      'Country of Origin': 'India'
    },
    nutrition: {
      'Energy': '722 kcal',
      'Total Fat': '80 g',
      'Saturated Fat': '51 g',
      'Cholesterol': '180 mg'
    },
    tags: ['daily-essentials', 'most-bought']
  },
  {
    id: 'prod-103',
    name: 'Mother Dairy Classic Dahi (Curd)',
    slug: 'mother-dairy-classic-dahi-400g',
    brand: 'Mother Dairy',
    categorySlug: 'dairy-breakfast',
    subcategory: 'Curd & Yogurt',
    price: 35,
    mrp: 35,
    unit: '400 g',
    discount: 0,
    rating: 4.7,
    reviewsCount: 1890,
    inStock: true,
    stockCount: 45,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Thick, creamy and delicious curd prepared from pasteurized milk under stringent hygienic conditions. Excellent source of calcium and gut probiotics.',
    specifications: {
      'Shelf Life': '15 Days',
      'Storage': 'Store in refrigerator'
    },
    nutrition: {
      'Energy': '60 kcal per 100g',
      'Protein': '3.7 g',
      'Calcium': '150 mg'
    },
    tags: ['daily-essentials', 'fresh-picks', 'under-99']
  },
  {
    id: 'prod-104',
    name: 'Amul Malai Fresh Paneer',
    slug: 'amul-malai-fresh-paneer-200g',
    brand: 'Amul',
    categorySlug: 'dairy-breakfast',
    subcategory: 'Paneer & Tofu',
    price: 89,
    mrp: 95,
    unit: '200 g',
    discount: 6,
    rating: 4.8,
    reviewsCount: 2980,
    inStock: true,
    stockCount: 38,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Soft and melt-in-mouth cottage cheese crafted from pure milk. Rich in high-grade dairy proteins, perfect for shahi paneer and tikkas.',
    specifications: {
      'Shelf Life': '30 Days vacuum packed',
      'Storage': 'Refrigerate below 4°C'
    },
    nutrition: {
      'Energy': '289 kcal per 100g',
      'Protein': '18.0 g',
      'Fat': '23.0 g'
    },
    tags: ['daily-essentials', 'under-99', 'best-deals']
  },

  // --- Fruits & Vegetables ---
  {
    id: 'prod-201',
    name: 'Fresh Hybrid Tomatoes (Tamatar)',
    slug: 'fresh-hybrid-tomatoes-1kg',
    brand: 'Farm Fresh',
    categorySlug: 'fruits-vegetables',
    subcategory: 'Fresh Vegetables',
    price: 32,
    mrp: 45,
    unit: '1 kg',
    discount: 28,
    rating: 4.6,
    reviewsCount: 4120,
    inStock: true,
    stockCount: 120,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Juicy, farm-harvested red hybrid tomatoes. Ideal balance of sweet and tangy flavors for curries, salads, and freshly crushed purée.',
    specifications: {
      'Origin': 'Selected Farms, Nashik & Himachal',
      'Grade': 'A Grade Produce'
    },
    nutrition: {
      'Vitamin C': '13.7 mg',
      'Potassium': '237 mg',
      'Calories': '18 kcal'
    },
    tags: ['fresh-picks', 'daily-essentials', 'under-99', 'best-deals']
  },
  {
    id: 'prod-202',
    name: 'Shimla Royal Gala Apples',
    slug: 'shimla-royal-gala-apples-4pcs',
    brand: 'Farm Fresh',
    categorySlug: 'fruits-vegetables',
    subcategory: 'Fresh Fruits',
    price: 159,
    mrp: 199,
    unit: '4 pcs (approx 650g)',
    discount: 20,
    rating: 4.7,
    reviewsCount: 1650,
    inStock: true,
    stockCount: 40,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Handpicked crisp and sweet apples straight from the orchards of Shimla. Rich in dietary fiber, flavonoids, and antioxidants.',
    specifications: {
      'Origin': 'Himachal Pradesh, India',
      'Wax Free': 'Yes, 100% natural peel'
    },
    nutrition: {
      'Energy': '52 kcal per 100g',
      'Fiber': '2.4 g',
      'Vitamin C': '4.6 mg'
    },
    tags: ['fresh-picks', 'best-deals']
  },
  {
    id: 'prod-203',
    name: 'Fresh Coriander (Dhaniya) & Mint Combo',
    slug: 'fresh-coriander-mint-combo',
    brand: 'Farm Fresh',
    categorySlug: 'fruits-vegetables',
    subcategory: 'Leafy Greens & Herbs',
    price: 24,
    mrp: 35,
    unit: '1 Bunch each (200g total)',
    discount: 31,
    rating: 4.8,
    reviewsCount: 890,
    inStock: true,
    stockCount: 75,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Fragrant, crisp fresh coriander and aromatic mint leaves carefully sorted and washed. Quintessential garnish and base for spicy green chutney.',
    specifications: {
      'Harvested': 'Early Morning Harvest'
    },
    nutrition: {
      'Vitamin A': '6748 IU',
      'Vitamin K': '310 mcg'
    },
    tags: ['fresh-picks', 'under-99']
  },
  {
    id: 'prod-204',
    name: 'Fresh Nagpur Seedless Sweet Oranges',
    slug: 'fresh-nagpur-sweet-oranges-1kg',
    brand: 'Farm Fresh',
    categorySlug: 'fruits-vegetables',
    subcategory: 'Fresh Fruits',
    price: 95,
    mrp: 120,
    unit: '1 kg (5-6 pcs)',
    discount: 21,
    rating: 4.5,
    reviewsCount: 740,
    inStock: true,
    stockCount: 30,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Juicy, sun-ripened oranges bursting with citrus freshness and Vitamin C immunity booster.',
    specifications: {
      'Origin': 'Nagpur, Maharashtra'
    },
    nutrition: {
      'Vitamin C': '53.2 mg',
      'Energy': '47 kcal'
    },
    tags: ['fresh-picks', 'under-99']
  },

  // --- Atta, Rice & Dal ---
  {
    id: 'prod-301',
    name: 'Aashirvaad Superior MP Shudh Chakki Atta',
    slug: 'aashirvaad-superior-mp-shudh-chakki-atta-5kg',
    brand: 'Aashirvaad',
    categorySlug: 'atta-rice-dal',
    subcategory: 'Atta & Flours',
    price: 248,
    mrp: 295,
    unit: '5 kg',
    discount: 16,
    rating: 4.9,
    reviewsCount: 8400,
    inStock: true,
    stockCount: 110,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80'
    ],
    description: '100% pure whole wheat grain flour ground with traditional modern stone chakki process. Absorbs more water to keep rotis soft and fluffy for hours.',
    specifications: {
      'Grain Type': '100% Shudh MP Whole Wheat',
      'Shelf Life': '3 Months',
      'Manufacturer': 'ITC Limited'
    },
    nutrition: {
      'Energy': '366 kcal',
      'Carbohydrate': '76.2 g',
      'Dietary Fiber': '11.1 g',
      'Protein': '10.8 g'
    },
    tags: ['daily-essentials', 'most-bought', 'best-deals']
  },
  {
    id: 'prod-302',
    name: 'India Gate Feast Rozzana Basmati Rice',
    slug: 'india-gate-feast-rozzana-basmati-rice-5kg',
    brand: 'India Gate',
    categorySlug: 'atta-rice-dal',
    subcategory: 'Basmati & Regular Rice',
    price: 435,
    mrp: 520,
    unit: '5 kg',
    discount: 16,
    rating: 4.8,
    reviewsCount: 3950,
    inStock: true,
    stockCount: 55,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Aged long-grain aromatic basmati rice for daily family meals, fragrant pulao, and biryani. Grains don’t stick together upon cooking.',
    specifications: {
      'Aging': 'Aged 1+ Year',
      'Shelf Life': '24 Months'
    },
    nutrition: {
      'Energy': '350 kcal',
      'Protein': '8.1 g',
      'Carbohydrates': '77.7 g'
    },
    tags: ['daily-essentials', 'most-bought']
  },
  {
    id: 'prod-303',
    name: 'Tata Sampann Unpolished Toor Dal (Arhar)',
    slug: 'tata-sampann-unpolished-toor-dal-1kg',
    brand: 'Tata Sampann',
    categorySlug: 'atta-rice-dal',
    subcategory: 'Moong, Toor & Chana Dal',
    price: 178,
    mrp: 205,
    unit: '1 kg',
    discount: 13,
    rating: 4.7,
    reviewsCount: 2190,
    inStock: true,
    stockCount: 65,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1585992638530-398601438995?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1585992638530-398601438995?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Unpolished naturally sourced toor dal without chemical water, leather, or oil polish. Retains wholesome natural nutrients and earthy aroma.',
    specifications: {
      'Processing': '100% Unpolished',
      'Chef Recommended': 'Sanjeev Kapoor Recommended'
    },
    nutrition: {
      'Protein': '22.0 g',
      'Dietary Fiber': '9.1 g',
      'Iron': '4.5 mg'
    },
    tags: ['daily-essentials', 'best-deals']
  },

  // --- Oil, Masala & Spices ---
  {
    id: 'prod-401',
    name: 'Fortune Sunlite Refined Sunflower Oil Pouch',
    slug: 'fortune-sunlite-refined-sunflower-oil-1l',
    brand: 'Fortune',
    categorySlug: 'oil-masala-spices',
    subcategory: 'Cooking Oils & Ghee',
    price: 138,
    mrp: 165,
    unit: '1 L',
    discount: 16,
    rating: 4.8,
    reviewsCount: 6100,
    inStock: true,
    stockCount: 90,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Light and healthy sunflower oil enriched with vitamins A & D. Low absorption technology ensures your food stays light and crispy.',
    specifications: {
      'Enriched with': 'Vitamin A and Vitamin D',
      'Shelf Life': '9 Months'
    },
    nutrition: {
      'Energy': '900 kcal',
      'Monounsaturated': '29 g',
      'Polyunsaturated': '57 g'
    },
    tags: ['daily-essentials', 'most-bought', 'best-deals']
  },
  {
    id: 'prod-402',
    name: 'Tata Salt Vacuum Evaporated Iodised Salt',
    slug: 'tata-salt-iodised-1kg',
    brand: 'Tata Salt',
    categorySlug: 'oil-masala-spices',
    subcategory: 'Salt, Sugar & Jaggery',
    price: 28,
    mrp: 30,
    unit: '1 kg',
    discount: 7,
    rating: 4.9,
    reviewsCount: 12500,
    inStock: true,
    stockCount: 150,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Desh Ka Namak. Pure vacuum evaporated food-grade salt with guaranteed iodine content for healthy mental development.',
    specifications: {
      'Iodine': '15 ppm min',
      'Purity': '99.5% NaCl'
    },
    nutrition: {
      'Sodium': '38.7 g'
    },
    tags: ['daily-essentials', 'under-99', 'most-bought']
  },

  // --- Snacks & Munchies ---
  {
    id: 'prod-501',
    name: 'Lay\'s Classic Salted Potato Chips',
    slug: 'lays-classic-salted-potato-chips-50g',
    brand: 'Lay\'s',
    categorySlug: 'snacks-munchies',
    subcategory: 'Chips & Crisps',
    price: 20,
    mrp: 20,
    unit: '50 g',
    discount: 0,
    rating: 4.7,
    reviewsCount: 7800,
    inStock: true,
    stockCount: 80,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Crispy wafer-thin golden potato chips tossed with savory edible salt. The timeless snack for every moment.',
    specifications: {
      'Vegetarian': '100% Veg',
      'Shelf Life': '4 Months'
    },
    nutrition: {
      'Energy': '544 kcal per 100g',
      'Carbohydrate': '52.7 g',
      'Protein': '6.9 g'
    },
    tags: ['under-99', 'most-bought', 'best-deals']
  },
  {
    id: 'prod-502',
    name: 'Haldiram\'s Nagpur Aloo Bhujia Namkeen',
    slug: 'haldirams-nagpur-aloo-bhujia-400g',
    brand: 'Haldiram\'s',
    categorySlug: 'snacks-munchies',
    subcategory: 'Bhujia & Mixture',
    price: 110,
    mrp: 125,
    unit: '400 g',
    discount: 12,
    rating: 4.8,
    reviewsCount: 4600,
    inStock: true,
    stockCount: 70,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1621996346565-e3d5d62811b4?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1621996346565-e3d5d62811b4?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Crispy crunchy strands made from spicy mashed potatoes, gram flour, and signature royal spices. The king of evening chai snacks.',
    specifications: {
      'Shelf Life': '6 Months'
    },
    nutrition: {
      'Energy': '582 kcal per 100g',
      'Protein': '9.6 g'
    },
    tags: ['most-bought', 'best-deals']
  },

  // --- Bakery & Biscuits ---
  {
    id: 'prod-601',
    name: 'Parle-G Gold Glucose Biscuits Big Pack',
    slug: 'parle-g-gold-glucose-biscuits-1kg',
    brand: 'Parle',
    categorySlug: 'bakery-biscuits',
    subcategory: 'Cookies & Glucose',
    price: 120,
    mrp: 135,
    unit: '1 kg',
    discount: 11,
    rating: 4.9,
    reviewsCount: 9200,
    inStock: true,
    stockCount: 88,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'India\'s largest selling biscuit brand with added milk and wheat goodness. Crisper, richer, and packed with nostalgia and quick energy.',
    specifications: {
      'Shelf Life': '6 Months'
    },
    nutrition: {
      'Energy': '451 kcal per 100g',
      'Sugar': '25.6 g'
    },
    tags: ['daily-essentials', 'most-bought', 'best-deals']
  },

  // --- Cold Drinks & Juices ---
  {
    id: 'prod-701',
    name: 'Coca-Cola Zero Sugar Can',
    slug: 'coca-cola-zero-sugar-can-300ml',
    brand: 'Coca-Cola',
    categorySlug: 'cold-drinks-juices',
    subcategory: 'Soft Drinks & Colas',
    price: 40,
    mrp: 40,
    unit: '300 ml Can',
    discount: 0,
    rating: 4.7,
    reviewsCount: 3890,
    inStock: true,
    stockCount: 110,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Real Coca-Cola taste with zero calories and zero sugar. Serve chilled with lemon wedges and ice for crisp refreshment.',
    specifications: {
      'Calorie Free': '0 kcal',
      'Serve': 'Chilled'
    },
    nutrition: {
      'Sugar': '0 g',
      'Calories': '0'
    },
    tags: ['under-99', 'most-bought']
  },
  {
    id: 'prod-702',
    name: 'Thums Up Charged Soft Drink Bottle',
    slug: 'thums-up-charged-750ml',
    brand: 'Thums Up',
    categorySlug: 'cold-drinks-juices',
    subcategory: 'Soft Drinks & Colas',
    price: 45,
    mrp: 45,
    unit: '750 ml',
    discount: 0,
    rating: 4.8,
    reviewsCount: 5120,
    inStock: true,
    stockCount: 95,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Taste the thunder. Strong fizzy carbonated beverage packed with spicy kola punch and bold fizz.',
    specifications: {
      'Shelf Life': '6 Months'
    },
    nutrition: {
      'Energy': '40 kcal per 100ml'
    },
    tags: ['under-99', 'most-bought']
  },

  // --- Instant & Frozen Food ---
  {
    id: 'prod-801',
    name: 'Maggi 2-Minute Masala Instant Noodles (Pack of 4)',
    slug: 'maggi-2-minute-masala-noodles-pack-of-4',
    brand: 'Maggi',
    categorySlug: 'instant-frozen-food',
    subcategory: 'Instant Noodles',
    price: 56,
    mrp: 60,
    unit: '4 x 70 g (280 g)',
    discount: 7,
    rating: 4.9,
    reviewsCount: 11400,
    inStock: true,
    stockCount: 140,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Favorite Indian instant noodles enriched with iron and authentic roasted whole spices in the special tastemaker sachet.',
    specifications: {
      'Cooking Time': '2 Minutes',
      'Fortified': 'Iron Fortified'
    },
    nutrition: {
      'Energy': '312 kcal per serve',
      'Protein': '6.8 g'
    },
    tags: ['daily-essentials', 'under-99', 'most-bought', 'best-deals']
  },

  // --- Tea, Coffee & Health Drinks ---
  {
    id: 'prod-901',
    name: 'Tata Tea Gold Leaf Black Tea Jar',
    slug: 'tata-tea-gold-leaf-black-tea-500g',
    brand: 'Tata Tea',
    categorySlug: 'tea-coffee-health-drinks',
    subcategory: 'Leaf & Dust Tea',
    price: 310,
    mrp: 350,
    unit: '500 g',
    discount: 11,
    rating: 4.8,
    reviewsCount: 4320,
    inStock: true,
    stockCount: 50,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Exquisite blend of rich Assam CTC tea gently laced with 15% long tea leaves for an irresistible aromatic cup of chai.',
    specifications: {
      'Blend': 'CTC & Long Leaf Blend',
      'Shelf Life': '12 Months'
    },
    nutrition: {
      'Antioxidants': 'High Flavonoid content'
    },
    tags: ['daily-essentials', 'most-bought', 'best-deals']
  },

  // --- Home & Cleaning ---
  {
    id: 'prod-1001',
    name: 'Surf Excel Matic Front Load Detergent Liquid',
    slug: 'surf-excel-matic-front-load-liquid-1l',
    brand: 'Surf Excel',
    categorySlug: 'home-cleaning',
    subcategory: 'Detergents & Fabric Care',
    price: 220,
    mrp: 260,
    unit: '1 L',
    discount: 15,
    rating: 4.9,
    reviewsCount: 3800,
    inStock: true,
    stockCount: 40,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Engineered specifically for high water level washing machines with powerful stain removal technology that leaves no residue behind.',
    specifications: {
      'Type': 'Liquid Detergent',
      'For': 'Front & Top Load Washing Machines'
    },
    nutrition: {},
    tags: ['daily-essentials', 'most-bought', 'best-deals']
  },
  {
    id: 'prod-1002',
    name: 'Harpic Power Plus 10X Disinfectant Toilet Cleaner',
    slug: 'harpic-power-plus-disinfectant-1l',
    brand: 'Harpic',
    categorySlug: 'home-cleaning',
    subcategory: 'Toilet Cleaners',
    price: 195,
    mrp: 230,
    unit: '1 L',
    discount: 15,
    rating: 4.8,
    reviewsCount: 5100,
    inStock: true,
    stockCount: 65,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Thick liquid formula clings to toilet bowls kills 99.9% of germs and removes tough yellow limescale stains effortlessly.',
    specifications: {
      'Disinfectant': 'Kills 99.9% germs',
      'Form': 'Thick Gel'
    },
    nutrition: {},
    tags: ['daily-essentials', 'best-deals']
  },

  // --- Personal Care ---
  {
    id: 'prod-1101',
    name: 'Dettol Original Germ Protection Liquid Handwash Refill',
    slug: 'dettol-original-liquid-handwash-refill-750ml',
    brand: 'Dettol',
    categorySlug: 'personal-care',
    subcategory: 'Bath & Body',
    price: 99,
    mrp: 125,
    unit: '750 ml Pouch',
    discount: 21,
    rating: 4.9,
    reviewsCount: 7100,
    inStock: true,
    stockCount: 85,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1608248597359-31e9c8bc8ea7?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1608248597359-31e9c8bc8ea7?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Trusted pine fragrance formula provides 100% better protection against illness-causing germs and keeps hands soft and clean.',
    specifications: {
      'Skin Friendly': 'pH-Balanced formula with added moisturizers'
    },
    nutrition: {},
    tags: ['daily-essentials', 'under-99', 'most-bought', 'best-deals']
  },
  {
    id: 'prod-1102',
    name: 'Colgate Strong Teeth Anticavity Toothpaste (Saver Pack)',
    slug: 'colgate-strong-teeth-anticavity-500g',
    brand: 'Colgate',
    categorySlug: 'personal-care',
    subcategory: 'Oral Care',
    price: 185,
    mrp: 220,
    unit: '500 g (2 x 250 g)',
    discount: 16,
    rating: 4.8,
    reviewsCount: 6540,
    inStock: true,
    stockCount: 70,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1559591937-e160a22a30bb?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1559591937-e160a22a30bb?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Amino Shakti formula adds natural calcium to teeth making them 2x stronger and defending against cavity-causing acid attacks.',
    specifications: {
      'Dentist Recommended': '#1 Recommended by IDA'
    },
    nutrition: {},
    tags: ['daily-essentials', 'most-bought']
  },
  {
    id: 'prod-1103',
    name: 'Dove Daily Shine Shampoo with Nutritive Serum',
    slug: 'dove-daily-shine-shampoo-650ml',
    brand: 'Dove',
    categorySlug: 'personal-care',
    subcategory: 'Hair Care & Oils',
    price: 460,
    mrp: 580,
    unit: '650 ml Bottle',
    discount: 21,
    rating: 4.8,
    reviewsCount: 3100,
    inStock: true,
    stockCount: 35,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Infused with Nutritive Serum that surrounds hair fibers to shield against daily environmental stress and hair frizz.',
    specifications: {
      'Hair Type': 'Normal to Dull Hair',
      'Net Volume': '650 ml'
    },
    nutrition: {},
    tags: ['best-deals']
  },

  // --- Sweet Tooth ---
  {
    id: 'prod-1201',
    name: 'Cadbury Dairy Milk Silk Chocolate Bar',
    slug: 'cadbury-dairy-milk-silk-150g',
    brand: 'Cadbury',
    categorySlug: 'sweet-tooth',
    subcategory: 'Chocolates & Bars',
    price: 165,
    mrp: 175,
    unit: '150 g',
    discount: 6,
    rating: 4.9,
    reviewsCount: 8900,
    inStock: true,
    stockCount: 95,
    deliveryTime: '10 MINS',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=500&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=600&q=80'
    ],
    description: 'Impossibly smooth, velvety milk chocolate that melts gracefully on your tongue with rich Ghanaian cocoa beans.',
    specifications: {
      'Vegetarian': '100% Veg'
    },
    nutrition: {
      'Energy': '532 kcal per 100g'
    },
    tags: ['most-bought', 'best-deals']
  }
];
