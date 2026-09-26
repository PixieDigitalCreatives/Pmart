// PMart Category Data (18 Full Quick-Commerce Categories)

export const mockCategories = [
  {
    id: 'cat-1',
    name: 'Fruits & Vegetables',
    slug: 'fruits-vegetables',
    shortName: 'Fresh Produce',
    icon: 'Apple',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=400&q=80',
    description: 'Farm-fresh organic fruits, seasonal greens, and daily vegetables delivered fast to your doorstep.',
    subcategories: ['Fresh Fruits', 'Fresh Vegetables', 'Leafy Greens & Herbs', 'Exotic Fruits', 'Season Specials', 'Organic & Hydroponic'],
    itemCount: 142
  },
  {
    id: 'cat-2',
    name: 'Dairy & Breakfast',
    slug: 'dairy-breakfast',
    shortName: 'Dairy & Eggs',
    icon: 'Milk',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
    description: 'Pure milk, butter, cheese, fresh paneer, curd, bread, and breakfast cereals.',
    subcategories: ['Milk & Cream', 'Butter & Cheese', 'Paneer & Tofu', 'Curd & Yogurt', 'Bread & Buns', 'Eggs', 'Breakfast Cereals'],
    itemCount: 118
  },
  {
    id: 'cat-3',
    name: 'Atta, Rice & Dal',
    slug: 'atta-rice-dal',
    shortName: 'Grains & Pulses',
    icon: 'Wheat',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
    description: 'Premium chakki fresh atta, aged basmati rice, organic pulses, dals, and whole grains.',
    subcategories: ['Atta & Flours', 'Basmati & Regular Rice', 'Moong, Toor & Chana Dal', 'Rajma & Chhole', 'Poha & Suji', 'Organic Millets'],
    itemCount: 96
  },
  {
    id: 'cat-4',
    name: 'Oil, Masala & Spices',
    slug: 'oil-masala-spices',
    shortName: 'Oil & Spices',
    icon: 'Flame',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=400&q=80',
    description: 'Cold-pressed cooking oils, pure ghee, whole & powdered aromatic spices, and cooking pastes.',
    subcategories: ['Cooking Oils & Ghee', 'Mustard & Olive Oil', 'Whole Spices', 'Powdered Spices', 'Salt, Sugar & Jaggery', 'Cooking Pastes'],
    itemCount: 135
  },
  {
    id: 'cat-5',
    name: 'Bakery & Biscuits',
    slug: 'bakery-biscuits',
    shortName: 'Bakery',
    icon: 'CakeSlice',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
    description: 'Crispy cookies, cream biscuits, rusks, cakes, artisanal breads, and croissants.',
    subcategories: ['Cookies & Glucose', 'Cream Biscuits', 'Rusk & Khari', 'Artisanal Breads', 'Muffins & Cakes', 'Baking Ingredients'],
    itemCount: 88
  },
  {
    id: 'cat-6',
    name: 'Snacks & Munchies',
    slug: 'snacks-munchies',
    shortName: 'Snacks',
    icon: 'Cookie',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80',
    description: 'Crisp potato chips, namkeen, roasted nuts, popcorn, and evening tea-time savories.',
    subcategories: ['Chips & Crisps', 'Traditional Namkeen', 'Dry Fruits & Nuts', 'Popcorn & Nachos', 'Bhujia & Mixture', 'Healthy Roasted Snacks'],
    itemCount: 164
  },
  {
    id: 'cat-7',
    name: 'Cold Drinks & Juices',
    slug: 'cold-drinks-juices',
    shortName: 'Cold Drinks',
    icon: 'GlassWater',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80',
    description: 'Chilled soft drinks, 100% natural fruit juices, coconut water, energy drinks, and sodas.',
    subcategories: ['Soft Drinks & Colas', 'Fruit Juices', 'Coconut Water', 'Energy & Sports Drinks', 'Soda & Tonics', 'Syrups & Concentrates'],
    itemCount: 110
  },
  {
    id: 'cat-8',
    name: 'Tea, Coffee & Health Drinks',
    slug: 'tea-coffee-health-drinks',
    shortName: 'Tea & Coffee',
    icon: 'Coffee',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=400&q=80',
    description: 'Assam leaf teas, instant & filter coffee, green tea blends, and malted health nutrition drinks.',
    subcategories: ['Leaf & Dust Tea', 'Instant Coffee', 'Green & Herbal Teas', 'Filter Coffee Powders', 'Health & Malt Drinks', 'Coffee Pods'],
    itemCount: 74
  },
  {
    id: 'cat-9',
    name: 'Sweet Tooth',
    slug: 'sweet-tooth',
    shortName: 'Chocolates & Sweets',
    icon: 'Candy',
    image: 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?auto=format&fit=crop&w=400&q=80',
    description: 'Fine chocolates, traditional Indian mithai, ice creams, desserts, and candies.',
    subcategories: ['Chocolates & Bars', 'Indian Sweets & Mithai', 'Ice Creams & Kulfi', 'Dessert Mixes', 'Candies & Gums', 'Gift Hampers'],
    itemCount: 92
  },
  {
    id: 'cat-10',
    name: 'Instant & Frozen Food',
    slug: 'instant-frozen-food',
    shortName: 'Instant Food',
    icon: 'Soup',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80',
    description: 'Instant noodles, ready-to-eat meals, pasta, frozen snacks, french fries, and heat-and-eat curries.',
    subcategories: ['Instant Noodles', 'Pasta & Macaroni', 'Ready to Eat Meals', 'Frozen Snacks & Fries', 'Soups & Broths', 'Frozen Veggies'],
    itemCount: 105
  },
  {
    id: 'cat-11',
    name: 'Personal Care',
    slug: 'personal-care',
    shortName: 'Personal Care',
    icon: 'Sparkles',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
    description: 'Soaps, body washes, premium shampoos, skincare serums, oral care, and hygiene products.',
    subcategories: ['Bath & Body', 'Hair Care & Oils', 'Skin Care & Moisturizers', 'Oral Care', 'Shaving & Grooming', 'Feminine Hygiene'],
    itemCount: 148
  },
  {
    id: 'cat-12',
    name: 'Home & Cleaning',
    slug: 'home-cleaning',
    shortName: 'Home Cleaning',
    icon: 'SprayCan',
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80',
    description: 'Detergent powders, liquid fabric washes, surface disinfectants, dishwash gels, and mop tools.',
    subcategories: ['Detergents & Fabric Care', 'Dishwashing Cleaners', 'Floor & Surface Cleaners', 'Toilet Cleaners', 'Air Fresheners', 'Repellents & Coils'],
    itemCount: 122
  },
  {
    id: 'cat-13',
    name: 'Baby Care',
    slug: 'baby-care',
    shortName: 'Baby Care',
    icon: 'Baby',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=400&q=80',
    description: 'Diapers, gentle wet wipes, pediatric baby food, baby shampoos, and tear-free lotions.',
    subcategories: ['Diapers & Wipes', 'Baby Food & Cereals', 'Baby Bath & Skincare', 'Feeding Bottles & Accessories', 'Baby Health & Safety'],
    itemCount: 65
  },
  {
    id: 'cat-14',
    name: 'Pet Supplies',
    slug: 'pet-supplies',
    shortName: 'Pet Supplies',
    icon: 'Cat',
    image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=400&q=80',
    description: 'Nutritious dog food, cat wet gravy pouches, pet treats, grooming brushes, and litter sand.',
    subcategories: ['Dog Food & Biscuits', 'Cat Food & Gravy', 'Pet Treats & Chews', 'Pet Grooming & Shampoos', 'Pet Toys & Accessories'],
    itemCount: 54
  },
  {
    id: 'cat-15',
    name: 'Paan Corner',
    slug: 'paan-corner',
    shortName: 'Paan Corner',
    icon: 'Flame',
    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=400&q=80',
    description: 'Mouth fresheners, mints, supari, silver vark supari, and paan masala essentials.',
    subcategories: ['Mouth Fresheners & Mints', 'Digestives & Churan', 'Silvered Elaichi & Saunf', 'Paan Candies'],
    itemCount: 42
  },
  {
    id: 'cat-16',
    name: 'Stationery & More',
    slug: 'stationery-more',
    shortName: 'Stationery',
    icon: 'PenTool',
    image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80',
    description: 'Notebooks, pens, markers, tapes, scissors, batteries, sticky notes, and office basics.',
    subcategories: ['Notebooks & Registers', 'Pens & Pencils', 'Files & Tapes', 'Calculators & Batteries', 'Art & Craft Essentials'],
    itemCount: 78
  },
  {
    id: 'cat-17',
    name: 'Kitchen & Dining',
    slug: 'kitchen-dining',
    shortName: 'Kitchen Needs',
    icon: 'Utensils',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
    description: 'Aluminum foils, cling wraps, airtight containers, disposable cutlery, and kitchen sponges.',
    subcategories: ['Foils & Cling Wraps', 'Storage Containers', 'Disposables & Glasses', 'Cookware & Utensils', 'Kitchen Towels & Napkins'],
    itemCount: 82
  },
  {
    id: 'cat-18',
    name: 'Beauty & Grooming',
    slug: 'beauty-grooming',
    shortName: 'Beauty Care',
    icon: 'Smile',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80',
    description: 'Facial cleansers, sunscreen lotions, cosmetics, lip balms, perfumes, and deodorants.',
    subcategories: ['Facewash & Scrubs', 'Sunscreen & Creams', 'Deodorants & Perfumes', 'Makeup & Nails', 'Men Grooming Trimmers'],
    itemCount: 95
  }
];
