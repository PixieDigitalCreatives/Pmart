require('dotenv').config();
const mongoose = require('mongoose');
const { Product, Category } = require('../src/modules/catalog/catalog.model');

// High-resolution, professional Unsplash grocery photography
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

const PRODUCT_IMAGE_RULES = [
  // --- VEGETABLES ---
  { match: /sweet potato/i, url: 'https://images.unsplash.com/photo-1590165482129-1b8b27698780?auto=format&fit=crop&w=600&q=80' },
  { match: /potato|hash brown/i, url: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80' },
  { match: /onion/i, url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80' },
  { match: /cherry tomato/i, url: 'https://images.unsplash.com/photo-1546470427-0d4db154ceb7?auto=format&fit=crop&w=600&q=80' },
  { match: /tomato/i, url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80' },
  { match: /green chilli|jalape/i, url: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=600&q=80' },
  { match: /ginger/i, url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80' },
  { match: /garlic/i, url: 'https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&w=600&q=80' },
  { match: /lemon/i, url: 'https://images.unsplash.com/photo-1533082645802-b05c56784ea4?auto=format&fit=crop&w=600&q=80' },
  { match: /coriander|mint|curry leave|spring onion|basil|celery/i, url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=600&q=80' },
  { match: /spinach|palak|methi|sarson|greens|leaves/i, url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80' },
  { match: /lady finger|bhindi|okra/i, url: 'https://images.unsplash.com/photo-1425543103986-22abb7d7e8d2?auto=format&fit=crop&w=600&q=80' },
  { match: /peas/i, url: 'https://images.unsplash.com/photo-1592394533824-9440e5d68530?auto=format&fit=crop&w=600&q=80' },
  { match: /french beans|cluster beans|beans/i, url: 'https://images.unsplash.com/photo-1551893665-f843f600794e?auto=format&fit=crop&w=600&q=80' },
  { match: /cucumber|kheera/i, url: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=600&q=80' },
  { match: /capsicum|bell pepper/i, url: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80' },
  { match: /cabbage/i, url: 'https://images.unsplash.com/photo-1598030304671-5aa1d6f21128?auto=format&fit=crop&w=600&q=80' },
  { match: /cauliflower/i, url: 'https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&w=600&q=80' },
  { match: /brinjal|baingan|eggplant/i, url: 'https://images.unsplash.com/photo-1605335193796-0570b55fc733?auto=format&fit=crop&w=600&q=80' },
  { match: /carrot|gajar/i, url: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=600&q=80' },
  { match: /radish|mooli|turnip/i, url: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80' },
  { match: /beetroot/i, url: 'https://images.unsplash.com/photo-1593105544559-ecb03bf76f82?auto=format&fit=crop&w=600&q=80' },
  { match: /gourd|lauki|karela|torai|tinda|parwal|kundru|pumpkin|kaddu/i, url: 'https://images.unsplash.com/photo-1506917728037-b6af01a7d403?auto=format&fit=crop&w=600&q=80' },
  { match: /mushroom/i, url: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=600&q=80' },
  { match: /broccoli/i, url: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=600&q=80' },
  { match: /corn/i, url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80' },
  { match: /lettuce|zucchini|asparagus/i, url: 'https://images.unsplash.com/photo-1556782291-5374668b8e0e?auto=format&fit=crop&w=600&q=80' },
  { match: /fries|potato wedges/i, url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=80' },
  { match: /salad mix|stir-fry/i, url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80' },
  { match: /raw banana/i, url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80' },
  { match: /raw papaya/i, url: 'https://images.unsplash.com/photo-1517282009859-f000ec3b26fe?auto=format&fit=crop&w=600&q=80' },

  // --- FRUITS ---
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
  { match: /pomegranate/i, url: 'https://images.unsplash.com/photo-1541344999736-83eca872f242?auto=format&fit=crop&w=600&q=80' },
  { match: /guava/i, url: 'https://images.unsplash.com/photo-1536511135898-1f31f9d2c206?auto=format&fit=crop&w=600&q=80' },
  { match: /kiwi/i, url: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?auto=format&fit=crop&w=600&q=80' },
  { match: /strawberry/i, url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80' },
  { match: /pineapple/i, url: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&w=600&q=80' },
  { match: /avocado/i, url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80' },
  { match: /blueberr|raspberr|blackberr|berr/i, url: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?auto=format&fit=crop&w=600&q=80' },
  { match: /dragon fruit/i, url: 'https://images.unsplash.com/photo-1527325678964-54921661f888?auto=format&fit=crop&w=600&q=80' },
  { match: /pear/i, url: 'https://images.unsplash.com/photo-1615484477778-ca3b77940c25?auto=format&fit=crop&w=600&q=80' },
  { match: /coconut/i, url: 'https://images.unsplash.com/photo-1525607551316-4a8e16d1f9ba?auto=format&fit=crop&w=600&q=80' },
  { match: /fruit bowl|fruit salad/i, url: 'https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=600&q=80' },
  { match: /plum|peach|apricot|cherry|cherries|litchi|fig|passion fruit|rambutan|chikoo|amla|custard apple|jamun|phalsa|persimmon/i, url: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=600&q=80' },

  // --- DAIRY & EGGS ---
  { match: /milk|uht/i, url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80' },
  { match: /curd|dahi|yogurt|shrikhand|mishti doi/i, url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80' },
  { match: /lassi|chaas|buttermilk/i, url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80' },
  { match: /butter\b/i, url: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=80' },
  { match: /cheese/i, url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&q=80' },
  { match: /paneer|tofu/i, url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80' },
  { match: /cream|condensed milk|whitener/i, url: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?auto=format&fit=crop&w=600&q=80' },
  { match: /bread|kulcha/i, url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
  { match: /bun|pav|pizza base/i, url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80' },
  { match: /croissant|donut|muffin|cake/i, url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' },
  { match: /egg/i, url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80' },

  // --- ICE CREAM & FROZEN DESSERTS ---
  { match: /cone/i, url: 'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?auto=format&fit=crop&w=600&q=80' },
  { match: /chocobar|ice candy|bar/i, url: 'https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?auto=format&fit=crop&w=600&q=80' },
  { match: /kulfi/i, url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80' },
  { match: /chocolate ice cream|belgian|fudge|brownie/i, url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80' },
  { match: /strawberry ice cream/i, url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80' },
  { match: /vanilla/i, url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80' },
  { match: /sundae|gelato|sorbet|dessert|ice cream sandwich/i, url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80' },
  { match: /ice cream/i, url: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?auto=format&fit=crop&w=600&q=80' },

  // --- DRY FRUITS, NUTS & SEEDS ---
  { match: /almond/i, url: 'https://images.unsplash.com/photo-1508061252224-43775270e0a4?auto=format&fit=crop&w=600&q=80' },
  { match: /cashew|kaju/i, url: 'https://images.unsplash.com/photo-1509912760195-455b85a3c942?auto=format&fit=crop&w=600&q=80' },
  { match: /pista/i, url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80' },
  { match: /walnut/i, url: 'https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&w=600&q=80' },
  { match: /raisin|kishmish/i, url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80' },
  { match: /dates|khajoor/i, url: 'https://images.unsplash.com/photo-1576402187878-974f70c890a5?auto=format&fit=crop&w=600&q=80' },
  { match: /anjeer|fig/i, url: 'https://images.unsplash.com/photo-1601297183305-6df142704ea2?auto=format&fit=crop&w=600&q=80' },
  { match: /peanut|moongfali/i, url: 'https://images.unsplash.com/photo-1567892326425-4c026079c1e0?auto=format&fit=crop&w=600&q=80' },
  { match: /seed|sabja|poppy/i, url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&w=600&q=80' },
  { match: /dry fruit|trail mix|gift box|hazelnut|pecan|brazil nut|macadamia|pine nut|prune|tutti frutti|dried/i, url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },

  // --- GROCERY & STAPLES ---
  { match: /atta|flour|maida|besan|sooji|rava|dalia|baking powder|custard|jelly|pancake/i, url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
  { match: /rice/i, url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80' },
  { match: /dal|pulses|rajma|chana|peas|moong/i, url: 'https://images.unsplash.com/photo-1585994192700-1c05d76d49ca?auto=format&fit=crop&w=600&q=80' },
  { match: /soya chunk/i, url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80' },
  { match: /oil\b/i, url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80' },
  { match: /ghee/i, url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=600&q=80' },
  { match: /sugar|jaggery|gur/i, url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=600&q=80' },
  { match: /salt|namak/i, url: 'https://images.unsplash.com/photo-1518110903478-24520c1c84f5?auto=format&fit=crop&w=600&q=80' },
  { match: /vinegar/i, url: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=600&q=80' },
  { match: /masala|spice|turmeric|chilli powder|cumin|coriander powder|pepper|clove|cardamom|cinnamon|hing|ajwain|methi|bay leave/i, url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80' },
  { match: /noodle|pasta|macaroni|spaghetti|vermicelli/i, url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80' },
  { match: /oats|cornflakes|muesli|granola|poha/i, url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?auto=format&fit=crop&w=600&q=80' },
  { match: /soup|ready-to-eat|khichdi/i, url: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80' },
  { match: /chips|nachos|popcorn/i, url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80' },
  { match: /namkeen|bhujia|roasted chana|papad|fryums/i, url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80' },
  { match: /biscuit|cookie|rusk|wafer|khari/i, url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80' },
  { match: /tea/i, url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80' },
  { match: /coffee/i, url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80' },
  { match: /cola|soda|water|juice|drink|iced tea/i, url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80' },
  { match: /ketchup|sauce|mayonnaise|pickle|chutney|dressing/i, url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80' },
  { match: /jam|honey|peanut butter|spread/i, url: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=600&q=80' },
  { match: /chocolate|candy|gum|sweet|gulab jamun|cocoa/i, url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=600&q=80' }
];

function resolveProductImage(product, categorySlug) {
  const name = product.name || '';
  for (const rule of PRODUCT_IMAGE_RULES) {
    if (rule.match.test(name)) {
      return rule.url;
    }
  }

  // Fallback to category default image
  return CATEGORY_IMAGES[categorySlug] || CATEGORY_IMAGES['grocery-staples'];
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

    // 2. Update Products
    console.log('\n--- Matching & Updating 1000 Products ---');
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
    console.log(`\nVerification: ${updatedCount} / ${products.length} products now have images.`);

    process.exit(0);
  } catch (err) {
    console.error('Error populating catalog images:', err);
    process.exit(1);
  }
})();
