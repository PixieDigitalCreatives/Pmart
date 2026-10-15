require('dotenv').config();
const mongoose = require('mongoose');
const { Product, Category } = require('../src/modules/catalog/catalog.model');

// Blinkit-style high-resolution category hero banners
const CATEGORY_IMAGES = {
  'grocery-sgrocery-staplestaples': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  'grocery-staples': 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
  'vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
  'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=800&q=80',
  'dairy-eggs': 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80',
  'ice-cream-frozen-desserts': 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=800&q=80',
  'dry-fruits-nuts-seeds': 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80',
  'diary-product': 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=800&q=80'
};

// Blinkit & Quick-Commerce Category-Scoped Rules:
// - Vegetables & Fruits: Raw, fresh, whole unpeeled produce on clean/neutral backgrounds
// - Dairy, Ice Creams, Snacks, Staples, FMCG: Authentic packaged retail products (cartons, pouches, sacks, bottles, boxes)
// - Never cooked dishes, restaurant plates, or steaming beverage cups!
const CATEGORY_RULES = {
  'vegetables': [
    { match: /sweet potato/i, url: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=80' },
    { match: /frozen french fries|frozen hash brown|frozen potato wedges/i, url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80' },
    { match: /potato/i, url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80' },
    { match: /spring onion/i, url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80' },
    { match: /onion/i, url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80' },
    { match: /cherry tomato/i, url: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=600&q=80' },
    { match: /tomato/i, url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80' },
    { match: /green chilli|jalape/i, url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80' },
    { match: /ginger/i, url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80' },
    { match: /garlic/i, url: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80' },
    { match: /lemon|lime/i, url: 'https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&w=600&q=80' },
    { match: /coriander|mint|curry leave|basil|celery/i, url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80' },
    { match: /spinach|palak|methi|sarson|greens|amaranth/i, url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80' },
    { match: /lady finger|bhindi|okra/i, url: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?auto=format&fit=crop&w=600&q=80' },
    { match: /peas/i, url: 'https://images.unsplash.com/photo-1592394533824-9440e5d68530?auto=format&fit=crop&w=600&q=80' },
    { match: /french beans|cluster beans|beans/i, url: 'https://images.unsplash.com/photo-1551893665-f843f600794e?auto=format&fit=crop&w=600&q=80' },
    { match: /cucumber|kheera/i, url: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=600&q=80' },
    { match: /capsicum|bell pepper/i, url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80' },
    { match: /cabbage/i, url: 'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?auto=format&fit=crop&w=600&q=80' },
    { match: /cauliflower/i, url: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80' },
    { match: /brinjal|baingan|eggplant/i, url: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=80' },
    { match: /carrot|gajar/i, url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80' },
    { match: /radish|mooli|turnip|beetroot/i, url: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80' },
    { match: /gourd|lauki|karela|torai|tinda|parwal|kundru|pumpkin|kaddu/i, url: 'https://images.unsplash.com/photo-1506917728037-b6af01a7d403?auto=format&fit=crop&w=600&q=80' },
    { match: /mushroom/i, url: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=600&q=80' },
    { match: /broccoli/i, url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80' },
    { match: /corn/i, url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80' },
    { match: /lettuce|zucchini|asparagus/i, url: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80' },
    { match: /salad mix|stir-fry|mixed vegetable|mixed veg/i, url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' }
  ],

  'fruits': [
    { match: /fruit bowl|fruit salad|cut fruit|cut mango|cut melon|cut papaya|cut pineapple|cut watermelon/i, url: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80' },
    { match: /banana/i, url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80' },
    { match: /green apple/i, url: 'https://images.unsplash.com/photo-1610397962076-02407a169a5b?auto=format&fit=crop&w=600&q=80' },
    { match: /apple/i, url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80' },
    { match: /orange|mosambi|mandarin|citrus/i, url: 'https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=600&q=80' },
    { match: /mango/i, url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80' },
    { match: /black grapes/i, url: 'https://images.unsplash.com/photo-1596363505729-4190a9506133?auto=format&fit=crop&w=600&q=80' },
    { match: /grapes/i, url: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80' },
    { match: /watermelon/i, url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=600&q=80' },
    { match: /muskmelon|melon/i, url: 'https://images.unsplash.com/photo-1598025362874-49480e049c76?auto=format&fit=crop&w=600&q=80' },
    { match: /papaya/i, url: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80' },
    { match: /pomegranate/i, url: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=600&q=80' },
    { match: /guava/i, url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80' },
    { match: /kiwi/i, url: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=600&q=80' },
    { match: /strawberry/i, url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80' },
    { match: /pineapple/i, url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80' },
    { match: /avocado/i, url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80' },
    { match: /blueberr|raspberr|blackberr|berr/i, url: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=600&q=80' },
    { match: /dragon fruit/i, url: 'https://images.unsplash.com/photo-1527325678964-54921661f888?auto=format&fit=crop&w=600&q=80' },
    { match: /pear/i, url: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=600&q=80' },
    { match: /coconut/i, url: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?auto=format&fit=crop&w=600&q=80' },
    { match: /plum|peach|apricot|cherry|cherries|litchi|fig|passion fruit|rambutan|chikoo|amla|custard apple|jamun|phalsa|persimmon/i, url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80' }
  ],

  'dairy-eggs': [
    { match: /milk|uht/i, url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80' },
    { match: /curd|dahi|yogurt|shrikhand|mishti doi/i, url: 'https://images.unsplash.com/photo-1571212515416-fef01fc43637?auto=format&fit=crop&w=600&q=80' },
    { match: /lassi|chaas|buttermilk/i, url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80' },
    { match: /butter\b/i, url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80' },
    { match: /cheese/i, url: 'https://images.unsplash.com/photo-1624806992066-5ffcf7ca186b?auto=format&fit=crop&w=600&q=80' },
    { match: /paneer|tofu/i, url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80' },
    { match: /cream|condensed milk|whitener/i, url: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=600&q=80' },
    { match: /bread|garlic bread/i, url: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=600&q=80' },
    { match: /bun|pav|pizza base|kulcha/i, url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80' },
    { match: /croissant|donut|muffin|cake/i, url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' },
    { match: /egg/i, url: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80' }
  ],

  'ice-cream-frozen-desserts': [
    { match: /cone/i, url: 'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?auto=format&fit=crop&w=600&q=80' },
    { match: /chocobar|ice candy|bar/i, url: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=600&q=80' },
    { match: /kulfi/i, url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80' },
    { match: /chocolate ice cream|belgian|fudge|brownie/i, url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80' },
    { match: /strawberry ice cream/i, url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80' },
    { match: /vanilla/i, url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80' },
    { match: /sundae|gelato|sorbet|dessert|ice cream sandwich/i, url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80' },
    { match: /ice cream/i, url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80' }
  ],

  'dry-fruits-nuts-seeds': [
    { match: /banana chips/i, url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
    { match: /almond/i, url: 'https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?auto=format&fit=crop&w=600&q=80' },
    { match: /cashew|kaju/i, url: 'https://images.unsplash.com/photo-1514733670139-4d87a1941d55?auto=format&fit=crop&w=600&q=80' },
    { match: /pista/i, url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80' },
    { match: /walnut/i, url: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&w=600&q=80' },
    { match: /raisin|kishmish/i, url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
    { match: /dates|khajoor/i, url: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=600&q=80' },
    { match: /anjeer|fig/i, url: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=600&q=80' },
    { match: /peanut|moongfali/i, url: 'https://images.unsplash.com/photo-1527324688151-0e627063f2b1?auto=format&fit=crop&w=600&q=80' },
    { match: /seed|sabja|poppy|alsi/i, url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80' },
    { match: /dry fruit|trail mix|energy mix|student mix|gift box|hazelnut|pecan|brazil nut|macadamia|pine nut|prune|tutti frutti|dried/i, url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' }
  ],

  'grocery-sgrocery-staplestaples': [
    { match: /ketchup/i, url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80' },
    { match: /sauce|dressing|mayonnaise|pickle|chutney/i, url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80' },
    { match: /chips|nachos|popcorn/i, url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80' },
    { match: /atta|flour|maida|besan|sooji|rava|dalia|baking powder|custard|jelly|pancake/i, url: 'https://images.unsplash.com/photo-1627485937980-221c88ac04f9?auto=format&fit=crop&w=600&q=80' },
    { match: /rice/i, url: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80' },
    { match: /dal|pulses|rajma|chana|moong|urad|arhar|toor|masoor/i, url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80' },
    { match: /soya chunk/i, url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
    { match: /oil\b/i, url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
    { match: /ghee/i, url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=600&q=80' },
    { match: /sugar|jaggery|gur/i, url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80' },
    { match: /salt|namak/i, url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80' },
    { match: /vinegar/i, url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80' },
    { match: /masala|spice|turmeric|chilli powder|cumin|coriander powder|pepper|clove|cardamom|cinnamon|hing|ajwain|methi|bay leave/i, url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
    { match: /noodle|pasta|macaroni|spaghetti|vermicelli/i, url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80' },
    { match: /oats|cornflakes|muesli|granola|poha/i, url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=600&q=80' },
    { match: /soup|ready-to-eat|khichdi/i, url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80' },
    { match: /namkeen|bhujia|roasted chana|papad|fryums/i, url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
    { match: /biscuit|cookie|rusk|wafer|khari/i, url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80' },
    { match: /tea/i, url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80' },
    { match: /coffee/i, url: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?auto=format&fit=crop&w=600&q=80' },
    { match: /cola|soda|water|juice|drink|iced tea/i, url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80' },
    { match: /jam|honey|peanut butter|spread/i, url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=600&q=80' },
    { match: /chocolate|candy|gum|sweet|gulab jamun|cocoa/i, url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80' }
  ]
};

// Aliases for categories
CATEGORY_RULES['grocery-staples'] = CATEGORY_RULES['grocery-sgrocery-staplestaples'];
CATEGORY_RULES['diary-product'] = CATEGORY_RULES['dairy-eggs'];

function resolveProductImage(product, categorySlug) {
  const name = product.name || '';
  const slug = categorySlug || 'grocery-staples';
  const rules = CATEGORY_RULES[slug] || CATEGORY_RULES['grocery-staples'];

  for (const rule of rules) {
    if (rule.match.test(name)) {
      return rule.url;
    }
  }

  // Cross-category fallback scan if not matched in primary category
  for (const [cat, catRules] of Object.entries(CATEGORY_RULES)) {
    if (cat === slug) continue;
    for (const rule of catRules) {
      if (rule.match.test(name)) {
        return rule.url;
      }
    }
  }

  // Category banner fallback
  return CATEGORY_IMAGES[slug] || CATEGORY_IMAGES['grocery-staples'];
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB Atlas');

    // 1. Update Categories
    console.log('\n--- Updating Category Images ---');
    const categories = await Category.find();
    for (const cat of categories) {
      const img = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES['grocery-staples'];
      cat.imageUrl = img;
      await cat.save();
      console.log(`✓ Updated category "${cat.name}" (${cat.slug}) -> ${img.slice(0, 50)}...`);
    }

    // 2. Update Products with Blinkit Retail Images
    console.log('\n--- Matching & Updating 1000 Products with Blinkit Retail Images ---');
    const products = await Product.find().select('_id name category categorySlug imageUrl');
    console.log(`Found ${products.length} products to process`);

    const bulkOps = [];
    const stats = { exactMatched: 0, categoryFallback: 0 };

    for (const p of products) {
      const img = resolveProductImage(p, p.categorySlug);
      bulkOps.push({
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { imageUrl: img } }
        }
      });
      if (img === (CATEGORY_IMAGES[p.categorySlug] || CATEGORY_IMAGES['grocery-staples'])) {
        stats.categoryFallback += 1;
        console.log(`[Fallback] "${p.name}" (${p.categorySlug})`);
      } else {
        stats.exactMatched += 1;
      }
    }

    console.log(`Running bulkWrite with ${bulkOps.length} operations...`);
    const res = await Product.bulkWrite(bulkOps);
    console.log(`✓ Successfully updated ${res.modifiedCount} products in database!`);
    console.log('Stats:', stats);

    // Verify
    const updatedCount = await Product.countDocuments({ imageUrl: { $exists: true, $ne: '' } });
    console.log(`\nVerification: ${updatedCount} / ${products.length} products now have authentic Blinkit-style images.`);

    process.exit(0);
  } catch (err) {
    console.error('Error populating catalog images:', err);
    process.exit(1);
  }
})();
