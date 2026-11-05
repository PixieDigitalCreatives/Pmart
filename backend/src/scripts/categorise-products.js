'use strict';

/**
 * Puts products that have no category into one, from keywords in the product name (the imported CSV has no
 * category or HSN column). Products that already have a category are never changed, and a name no rule recognises
 * stays uncategorised for manual assignment in Admin → Products.
 *
 * Categories are matched by name. The five non-food categories below are created if they don't exist; new
 * subcategories are added to a category's list. Each change writes an audit entry (`bulk: true`).
 *
 * Usage (from backend/):
 *   node src/scripts/categorise-products.js --by <admin id or phone> --dry-run --out <review.csv>
 *   node src/scripts/categorise-products.js --by <admin id or phone> [--out <review.csv>]
 * The review CSV lists every product with the proposed category, subcategory and the rule that matched.
 */
const fs = require('fs');

// Category names (existing ones must match the live names exactly).
const C = {
  GROCERY: 'Grocery & Staples',
  DAIRY: 'Dairy & Eggs',
  FROZEN: 'Ice Cream & Frozen Desserts',
  VEG: 'Vegetables',
  FRUITS: 'Fruits',
  DRY: 'Dry Fruits, Nuts & Seeds',
  PERSONAL: 'Personal Care',
  HEALTH: 'Health & Wellness',
  BABY: 'Baby Care',
  HOUSE: 'Household & Cleaning',
  POOJA: 'Pooja Needs'
};

// Created when missing (sortOrder after the existing seven).
const NEW_CATEGORIES = [
  { name: C.PERSONAL, slug: 'personal-care', sortOrder: 8, description: 'Bath and body, hair, skin, oral care, grooming and hygiene.', subcategories: ['Bath & Body', 'Hair Care', 'Skin Care', 'Oral Care', 'Makeup & Cosmetics', 'Deodorants & Perfumes', "Men's Grooming", 'Feminine Hygiene'] },
  { name: C.HEALTH, slug: 'health-wellness', sortOrder: 9, description: 'Ayurveda, digestive care, pain relief, first aid and supplements.', subcategories: ['Ayurveda', 'Digestive Care', 'Pain Relief', 'First Aid & Antiseptic', 'ORS & Glucose', 'Vitamins & Supplements', 'Sexual Wellness'] },
  { name: C.BABY, slug: 'baby-care', sortOrder: 10, description: 'Diapers, wipes, baby food, bath and skin care.', subcategories: ['Diapers & Wipes', 'Baby Food', 'Baby Bath & Skin', 'Feeding & Accessories'] },
  { name: C.HOUSE, slug: 'household-cleaning', sortOrder: 11, description: 'Laundry, dishwash, cleaners, repellents and home essentials.', subcategories: ['Laundry', 'Dishwash', 'Floor & Toilet Cleaners', 'Air Fresheners', 'Repellents & Insecticides', 'Cleaning Tools', 'Home Essentials', 'Shoe Care', 'Kitchen & Disposables'] },
  { name: C.POOJA, slug: 'pooja-needs', sortOrder: 12, description: 'Agarbatti, dhoop, camphor and pooja essentials.', subcategories: ['Agarbatti & Dhoop', 'Camphor & Sambrani', 'Pooja Essentials'] }
];

// Subcategories added to existing categories when used.
const EXTRA_SUBCATEGORIES = { [C.FROZEN]: ['Frozen Food'] };

// Ordered rules: the first match wins. Patterns run on the upper-cased name with punctuation turned into spaces.
const R = (re, category, subcategory) => ({ re, category, subcategory });
const RULES = [
  // Pooja (distinctive words first)
  R(/\b(DHOOP|DHUP|DHHOP|AGARBAT\w*|AGARBAAT\w*|AGGARBAT\w*|AGARBATHI|INCENSE|ZED BLACK|CYCLE|MANGALDEEP|GHOOP|HARI DARSHAN|LIA)\b/, C.POOJA, 'Agarbatti & Dhoop'),
  R(/\b(CAMPHOR|CMPHOR|KAPOOR|KAPUR|SAMBRANI|LOBAN|GUGGAL|HAVAN|HAWAN)\b/, C.POOJA, 'Camphor & Sambrani'),
  R(/\b(DIYA|DIYE|COTTON WICKS?|RUI BATTI|RUI|JYOT|ROLI|KUMKUM|SINDOOR|SINDUR|GANGAJAL|KALAWA|JANEU|POOJA|PUJA|CHUNARI|LAMP OIL|DEEPAM|TIKA|CHANDAN LAKDI)\b/, C.POOJA, 'Pooja Essentials'),

  // Baby care
  R(/\b(HUGGIES|HUGGEIS|HUGIES|MAMY ?POKO|MAMAY ?POKO|MAMMY ?POKO|MOMMY ?POKO|MAMYPOKO|POKO|POCO|PAMPERS|DIAPERS?|DAIPERS?|PANTNS|PANTS|\d*PANTS)\b/, C.BABY, 'Diapers & Wipes'),
  R(/\b(BABY WIPES|WIPES)\b/, C.BABY, 'Diapers & Wipes'),
  R(/\b(CERELAC|LACTOGEN|NAN PRO|FAREX|BABY FOOD|INFANT|SIMILAC|NANPRO|CEREGROW)\b/, C.BABY, 'Baby Food'),
  R(/\b(FEEDER|FEEDING BOTTLE|NIPPLE|TEETHER|SIPPER)\b/, C.BABY, 'Feeding & Accessories'),
  R(/\b(BABY(?! CORN| POTATO)|JOHNSON\w*|SEBAMED)\b/, C.BABY, 'Baby Bath & Skin'),

  // Feminine hygiene
  R(/\b(WHISPER|STAYFREE|STAY FREE|SOFY|CAREFREE|SANITARY|SANITRY|PANTY ?LINERS?|V WASH|INTIMATE|\d*PADS)\b/, C.PERSONAL, 'Feminine Hygiene'),

  // Skin-care words that would otherwise be caught by household or health rules (bleach, balm, vitamin C …)
  R(/\b(LIP BALM|LIP CARE|FACE ?WASH|FACEWASH|F W|SERUM|CREME BLEACH|BLEACH CREAM|FEM|OXY BLEACH|GULABARI|ROSE WATER|GULAB ?JAL|ALO?MOND CREAM|HONEY AL\w*MOND|SAUNDARYA|A V GEL|ROOP MANTRA)\b/, C.PERSONAL, 'Skin Care'),

  // Household & cleaning
  R(/\b(SURF|TIDE|ARIEL|RIN|WHEEL|GHADI|NIRMA|HENKO|DETERGENT|WASHING POWDER|DET (POWDER|CAKE|BAR)|SASA|MR WHITE|COMFORT|FABRIC|REVIVE|ROBIN|UJALA|SAFEWASH|GENTEEL|EZEE|FENA|VANISH)\b/, C.HOUSE, 'Laundry'),
  R(/\b(VIM|PRIL|EXO|DISH ?WASH|DISHWASH|BARTAN|PITAMBARI)\b/, C.HOUSE, 'Dishwash'),
  R(/\b(ODONIL|ODOPIC|AIR FRESHENER|FRESHNER|FRESHENER|AMBI PUR|AER|ROOM SPRAY)\b/, C.HOUSE, 'Air Fresheners'),
  R(/\b(HARPIC|LIZOL|PHENYL\w*|PHYNYL\w*|PHENOLE|DOMEX|COLIN|CLEANER|ACID|BLEACH|BLEACHING|SANIFRESH|SANI CUBE|NAPHTHALENE|NAPTHALENE|GOONJ|GLENZO)\b/, C.HOUSE, 'Floor & Toilet Cleaners'),
  R(/\b(GOOD ?KNIGHT|GOODKNIGHT|ALL ?OUT|MORTEIN|HIT|BAYGON|MOSQUITO|COCKROACH|RAT KILL\w*|LAXMAN REKHA|MACHAR|COIL)\b/, C.HOUSE, 'Repellents & Insecticides'),
  R(/\b(SCRUBBER|SCRUB PAD|SPONGE|BROOM|JHADU|MOP|WIPER|DUSTER|SCOTCH ?BRITE|STEEL WOOL|DUSTBIN|GARBAGE BAGS?|TOILET BRUSH|CLOTH BRUSH|FLOOR BRUSH|POCHA)\b/, C.HOUSE, 'Cleaning Tools'),
  R(/^(?!.*\bGHEE\b).*\b(BATTERY|BATTERIES|BETTERY|BATTARY|DURACELL|EVEREADY|NIPPO|BULB|BALB|TORCH|CANDLES?|MATCH ?BOX|MATCHBOX|MATCHES|MATICH|LIGHTER|FEVICOL|FEVIKWIK|TAPE|MACHINE OIL)\b/, C.HOUSE, 'Home Essentials'),
  R(/\b(SHOE POLISH|KIWI (INSTANT|POLISH|LIQUID|NEUTRAL|BLACK|BROWN)|CHERRY BLOSSOM|CHERRY (DARK|BLACK|BROWN|TAN))\b/, C.HOUSE, 'Shoe Care'),
  R(/^(?!.*\b(NESCAFE|BRU|COFFEE)\b).*\b(MILTON|CELLO|TIFFIN|CASSEROLE|LUNCH BOX|ALUMINIUM FOIL|FOIL|CLING ?FILM|TISSUES?|PAPER (NAPKIN|PLATE|CUP)S?|DRINKING STRAWS?|ZIPLOCK|STEEL MUG|MUG)\b/, C.HOUSE, 'Kitchen & Disposables'),

  // Personal care that shares words with health products
  R(/\b(GILLETTE|GILLETE|SHAVING|SHAVE|SAVING CREAM|RAZOR|BLADES?|TRIMMER|AFTER ?SHAVE|7 O CLOCK|VI JOHN|GOOD MORNING|G M CREAM|MENZ FOAM)\b/, C.PERSONAL, "Men's Grooming"),
  R(/\b(COLGATE|PEPSODENT|CLOSE ?UP|CLOSEUP|SENSODYNE|DABUR RED|RED PASTE|RED PESTE|DANT ?KANTI|DANTKANTI|MESWAK|BABOOL|BABUL|VAJRADANTI|TOOTH\w*|ORAL ?B|ORL B|MOUTH ?WASH|MOUTHWASH|LISTERINE|MANJAN|MUNJAN|CIBACA|DANT|DNT|DENT|BRUSH)\b/, C.PERSONAL, 'Oral Care'),
  R(/\b(SOAPS?|SOP|SOPA|SHOP|BODY ?WASH|SHOWER GEL|S G|HANDWASH|HAND WASH|HANAD WASH|H W|SANITI[SZ]ER|BATHING BARS?)\b/, C.PERSONAL, 'Bath & Body'),

  // Health & wellness
  R(/\b(CHYAWANPRASH|CHYAVANPRASH|CHAWANPRASH|MADHUGRIT|DIVYA|BAIDYANATH|ASHWAGANDHA|TRIPHALA|GILOY|SHILAJIT|DABUR (HONITUS|LAL TAIL)|ALOE ?VERA JUICE|AMLA JUICE|KARELA JAMUN|NONI|\w*PRASH|ERAND TAIL|CASTOR OIL)\b/, C.HEALTH, 'Ayurveda'),
  R(/\b(HAJMOLA|ENO|DIGENE|GELUSIL|CHURAN|ISABGOL|PUDIN ?HARA|HING ?GOLI|HINGOLI|KAYAM|SAFI|LIV ?52|POUDIN)\b/, C.HEALTH, 'Digestive Care'),
  R(/\b(BALM|VICKS|AMRUTANJAN|MOOV|VOLINI|IODEX|PAIN|RELIEF|RELIFE|ORTHO|RELISPRAY)\b/, C.HEALTH, 'Pain Relief'),
  R(/\b(DETTOL|SAVLON|BETADINE|ANTISEPTIC|ANSEPTIC|BAND ?AID|BANDAGE|COTTON|BURNOL|SOFRAMYCIN|THERMOMETER)\b/, C.HEALTH, 'First Aid & Antiseptic'),
  R(/\b(ORS|ELECTRAL|GLUCON ?D|GLUCOSE|ENERZAL)\b/, C.HEALTH, 'ORS & Glucose'),
  R(/^(?!.*\b(GARNIER|GARNIEAR|LOTUS|MAMAEARTH|HIMALAYA|JOY|LOVELY|CREAM|CREME|CREAME|GEL|LOTION|MUKHWAS)\b).*\b(VITAMIN|CAPSULS?|CAPSULES?|TABLETS?|PROTEIN POWDER|WHEY|OMEGA|HONITUS|COUGH|THREPTIN)\b/, C.HEALTH, 'Vitamins & Supplements'),
  R(/\b(\d*CONDOMS?|MANFORCE|DUREX|KAMASUTRA|MOODS|PREGA)\b/, C.HEALTH, 'Sexual Wellness'),

  // Personal care
  R(/\b(TALC|TACL|DERMI ?COOL|DERMI FRESH|NYCIL|CANDID|PRICKLY|SHOWER TO SHOWER|SANDAL POWDER|DREAMFLOWER|(DENVER|PARK AVENUE|ENGAGE|WILD ?STONE|PONDS|NIVEA|NAVRATNA|NAVRATAN|CINTHOL|GOKUL|SPINZ|YARDLEY)\b.*\bPOWDER)\b/, C.PERSONAL, 'Bath & Body'),
  R(/\b(SHAMPOO|CONDITIONER|CONDTIONER|CONDITONER|HAIR|RITHA|KESH\w*|PARACHUTE|NIHAR|NAVRATNA|NAVRATAN (AYURVEDIC|OIL|EXTRA|COOL)|DABUR AMLA|AMLA OIL|AWLA|AAMLA|BAJAJ|ALMOND DROPS|CLINIC PLUS|HEAD SHOULDERS?|HEAD SOLDER|H S|PANTENE|SUNSILK|TRESEMME|CHIK|MEERA|INDULEKHA|HAIR COLOU?R|GODREJ (EXPERT|RICH|NUPUR)|GARNIER (COLOU?R|BROWN|BLACK|NATURAL)|COLOR BURGUNDY|BURGUNDY|BLACK ROSE|KALI MEHNDI|MEHANDI|MEHNDI|HENNA|STREAX|BRYLCREEM|COCONUT OIL|JASMINE OIL|LOREAL|L OREAL|DANDRUFF|DANDRAFF|INTENSE REPAIR|HIMGANG\w*|LICE|MEDIKER|ADIVASI|LIVON)\b/, C.PERSONAL, 'Hair Care'),
  R(/^(?!.*\b(POWDER|SOAP|F W|FACE ?WASH)\b).*\b(DEO|DEODORANT|DEODRANT|PERFUME|BODY SPRAY|BODY MIST|FOGG|DENVER|DANVER|WILD ?STONE|WIND ?STONE|ENGAGE|AXE|SECRET TEMPTATION|YARDLEY|ATTAR|ITTAR|PARK AVENUE|SET WET|RAMSONS|ENVY|MAJMUA)\b/, C.PERSONAL, 'Deodorants & Perfumes'),
  R(/\b(LAKME|LIPSTICK|KAJAL|EYELINER|MASCARA|NAIL ?POLISH|NAIL ?PAINT|NAIL REMOVER|COMPACT|FOUNDATION|BINDI|MAYBELLINE|ELLE ?18|SWISS BEAUTY|LIP ?GLOSS)\b/, C.PERSONAL, 'Makeup & Cosmetics'),
  R(/\b(LIFEBUOY|LUX|SANTOOR|CINTHOL|MEDIMIX|MYSORE SANDAL|MASYORE SANDAL|PEARS|HAMAM|MARGO|VIVEL|DYNA|LIRIL|FIAMA|CHANDRIKA|LOOFAH|DOVE (BAR|CREAM BAR)|GODREJ NO ?1|HERB WASH|AYUR HERBAL|HALDI CHANDAN|KANTI)\b/, C.PERSONAL, 'Bath & Body'),
  R(/\b(FACE CREAM|FACE PACK|FAIR|GLOW|PONDS|POND S|NIVEA|NIVIA|NEVIA|VASELINE|BORO ?PLUS|BOROPLUS|BOROLINE|LOTION|MOISTURI\w*|SUNSCREEN|COLD CREAM|SKIN|ALOE ?VERA GEL|GLYCERIN\w*|GLYVERIN|UBTAN|SCRUB|MULTANI|WHITE TONE|OLAY|CETAPHIL|MAMAEARTH|VICCO|GARNIER|GARNIEAR|MEGLOW|LOTUS|DOVE|HIMALAYA|BIOTIQUE|CREAME|VITAMIN C)\b/, C.PERSONAL, 'Skin Care'),

  // Frozen and ice cream
  R(/\b(ICE ?CREAM|ICECREAM|KULFI|CONES?|CORNETTO|VADILAL|KWALITY|HAVMOR|SUNDAE|CHOCOBAR|BUTTER ?SCOTCH|BUTTERSCOTCH|(VANILLA|VANILA|STRAWBERRY|CHOCOLATE|MANGO|KESAR PISTA|TUTTI FRUTTI|BLACK CURRANT|AMERICAN NUTS?) \d+ ?(ML|L|LTR)|\d+ ?(ML|L) TUB)\b/, C.FROZEN, 'Ice Cream Tubs'),
  R(/\b(FROZEN|FRENCH FRIES|NUGGETS|PARATHA|SMILES|TIKKI|MCCAIN|SUMERU|SAFAL)\b/, C.FROZEN, 'Frozen Food'),

  // Grocery & staples (specific food types before generic words)
  R(/\b(CORN ?FLAKES|CORNFLAKES|CORNFLEKS|CORNFLEX|CHOCOS|KELLOGG\w*|KELLOGES|MUESLI|OATS|CEREAL|QUAKER|GRANOLA|WHEAT FLAKES)\b(?!.*NAMKEEN)/, C.GROCERY, 'Breakfast & Cereals'),
  R(/\b(BISCUITS?|BIS|BISC|BISK|COOKIES?|COOKIS\w*|CRACKERS?|RUSK|TOAST|BRITANNIA|BRITANIA|SUNFEAST|GOOD ?DAY|MARIE|MERIE|MONACO|KRACK ?JACK|HIDE SEEK|HIDE AND SEEK|BOURBON|BAKERY|NICE TIME|20 20|TIGER|BIKIS|DARK FANTASY|JIM ?JAM|HAPPY HAPPY|NUTRI ?CHOICE|KHARI|BUTTER BITE|BAKES|PARLE G|MAZELO|FAB|BOUNCE|MALKIST|OREO|ORIO|DIGESTIVE|BISCUITE|BISKFARM|SOBISCO|FANTASTY|20 20NICE)\b/, C.GROCERY, 'Biscuits & Cookies'),
  R(/\b(HORLICKS|HOR ICKS|BOURNVITA|BOURN VITA|COMPLAN|CPMPLIAN|BOOST|PEDIASURE|PEDAISURE|PEDIA SURE|PROTINEX|MILO|ENSURE)\b/, C.GROCERY, 'Beverages'),
  R(/\b(SYRUP)\b/, C.GROCERY, 'Sauces & Spreads'),
  R(/\b(BAKING SODA|BAKING POWDER|MITHA SODA|MEETHA SODA)\b/, C.GROCERY, 'Baking Essentials'),
  R(/^(?!.*\b(MIX|MASALA|DET|DETERGENT)\b).*\b(CAKES?|SWISS ROLL|DONUT|MUFFINS?|BROWNIE|PASTRY)\b/, C.DAIRY, 'Bread & Bakery'),
  R(/\b(CHOCOLATES?|CHOCO\w*|CHOCLATE|CADBURY|DAIRY ?MILK|SILK|5 ?STAR|5STAR|FIVE STAR|KIT ?KAT|KITKAT|MUNCH|PERK|BOURNVILLE|FUSE|GEMS|MELODY|ECLAIRS?|KISMI|TOFFEE|TOFFY|CANDY|LOLLIPOP|POPPINS|PULSE|ALPENLIEBE|CENT[ER][RE] FRESH|CHEWING|BUBBLE GUM|GUM|MENTOS|POLO|HERSHEY\w*(?! S? SYRUP)|SNICKERS|BOUNTY|GALAXY|TOBLERONE|FERRERO|KINDER|ORBIT|CELEBRATIONS?|SWEETS|SWEET(?! CORN| SPICY)|MITHAI|LADDU|LADOO|LADDOO|BARFI|BURFI|PEDA|SOAN ?PAPDI|SONPAPDI|RASGULLA|RASOGOLLA|GULAB ?JAMUN|GULAB GAMUN|JALEBI|PETHA|GAJAK|CHIKKI|REWRI|REVDI|TILKUT|KHEER KADAM|HALWA|KAJU KATLI|MILKY HEART|GUR TIL|TIL GUR|MILKY ?BAR|MUKHWAS|PATISA|LOLYPOP|LICKABLES|HAPPYDENT|BOOMER|DARK PASSION|AMUL DARK|CACAO)\b/, C.GROCERY, 'Chocolates & Sweets'),
  R(/\b(TEA|CHAI|TAJ MAHAL|BROOKE ?BOND|RED LABEL|TAAZA|TATA (GOLD|AGNI|PREMIUM)|WAGH ?BAKRI|LIPTON|TETLEY|COFFEE|NESCAFE|BRU|TEA BAGS?|\d+ ?BAGS?)\b/, C.GROCERY, 'Tea & Coffee'),
  R(/\b(SAUCE|SOUCE|SCHEZWAN|KETCHUP|MAYONNAISE|MAYONAISE|MAYO|MYFITNESS|MY FITNESS|PICKEL|JAM|SPREAD|PEANUT BUTTER|NUTELLA|HONEY|SHAHAD|MADH|PICKLE|ACHAR|ACHAAR|CHUTNEY|VINEGAR|SIRKA|GINGER GARLIC PASTE|TOMATO PUREE|OLIVES|JALAPENO|DIP|SYRUP)\b/, C.GROCERY, 'Sauces & Spreads'),
  R(/\b(MAGGI|NOODLES?|YIPPEE|YIPPE|TOP ?RAMEN|CHING S|CHINGS|KNORR|SOUP|PASTA|MACARONI|VERMICELLI|VERMIGELLI|SEVAI|SEWAI|SEVIYAN|READY TO (EAT|COOK)|MTR|INSTANT|UPMA|IDLI MIX|DOSA MIX|JELLY|CUSTARD|FUSILLI|PENNE|SPAGHETTI|POHA MIX|PAPAD|PIZZA|CHOWMIN\w*|CHOWMEIN|MAAGI|SEBAI|GITS (RICE|BASMATI|KHAMAN|DHOKLA|IDLI|DOSA|UPMA|KHEER|POHA))\b/, C.GROCERY, 'Instant Food'),
  R(/\b(LASSI|CHHACH|CHAAS|BUTTER ?MILK|BUTTERMILK|MATTHA)\b/, C.DAIRY, 'Lassi & Buttermilk'),
  R(/\b(BISLERI|KINLEY|AQUAFINA|MINERAL WATER|WATER|PEPSI|COCA COLA|COKE|THUMS ?UP|SPRITE|FANTA|LIMCA|MAAZA|MAZA|FROOTI|SLICE|7 ?UP|MOUNTAIN DEW|MIRINDA|STING|RED ?BULL|TANG|RASNA|ROOH ?AFZA|SHARBAT|SQUASH|JUICE|REAL|TROPICANA|PAPER BOAT|SODA|TONIC|ENERGY DRINK|DRINK|SHAKE|AXN NIMBU|AXN LIME|COLD COFFEE|KOOL|THANDAI|TENDER COCONUT)\b/, C.GROCERY, 'Beverages'),
  R(/\b(NAMKEEN|NAMKIN|BHUJIA|BHUJIYA|BHUJIAA|MIXTURE|MIXCHER|SEV|GATHIYA|GATHIA|DALMOTH|DAL MOTH|DAL MOT|KHATTA MEETHA|NAVRATAN|NAVRATTAN|CHANACHUR|HALDIRAM\w*|BIKANO|BIKAJI|BALAJI|LAYS|LAY S|KURKURE|UNCLE ?CHIPPS|BINGO|CHIPS|PRINGLES|DORITOS|CHEETOS|PUFFS?|POPCORN|NACHOS|BHUJA|ALL IN ONE|MATHRI|KACHORI|SAMOSA|CHAKLI|MURUKKU|BONDIYA|BOONDI|TEDHE MEDHE|CRAX|SNACKS?|NIMKI|CHIWRA|CHIVDA|CHIWDA|CHANA JOR|JOR GARAM|CHATPATA DAL|BIKANER MOONG DAL)\b/, C.GROCERY, 'Snacks & Namkeen'),
  R(/\b(BAKING|YEAST|COCOA|ESSENCE|ESSENS|ASSENS|FOOD COLOU?R|GELATIN|SPRINKLES?|ICING|CAKE MIX|BROWNIE MIX|AGAR)\b/, C.GROCERY, 'Baking Essentials'),

  // Dairy
  R(/\b(CURD|DAHI|YOGURT|YOGHURT|RAITA|SHRIKHAND|MISHTI DOI|MISTI DOI|DHOI|DOI)\b/, C.DAIRY, 'Curd & Yogurt'),
  R(/\b(CHEESE|CHESE|MOZZ?ARELL?A|MOZZERELA|MOZZRELA|CHEDDAR|CHEEZ)\b/, C.DAIRY, 'Cheese'),
  R(/\b(PANEER|PANIR|TOFU)\b/, C.DAIRY, 'Paneer & Tofu'),
  R(/\b(GHEE|GHI|FRESH CREAM|COOKING CREAM|WHIPPING CREAM)\b/, C.DAIRY, 'Ghee & Cream'),
  R(/\b(BUTTER)\b/, C.DAIRY, 'Butter'),
  R(/\b(MILK POWDER|DAIRY WHITENER|WHITENER|EVERYDAY|AMULYA|AMUL SPRAY|SAGAR)\b/, C.DAIRY, 'Milk Powder'),
  R(/\b(MILK|DOODH|TONED)\b/, C.DAIRY, 'Milk'),
  R(/^(?!.*\bMASALA\b).*\b(BREAD|PAV|BUNS?)\b/, C.DAIRY, 'Bread & Bakery'),
  R(/\b(EGGS?|ANDA)\b/, C.DAIRY, 'Eggs'),

  // Dry fruits (before spices and dals, which share some words)
  R(/\b(BADAM|ALMONDS?)\b/, C.DRY, 'Almonds'),
  R(/\b(KAJU|CASHEWS?)\b/, C.DRY, 'Cashews'),
  R(/\b(PISTA|PISTACHIOS?)\b/, C.DRY, 'Pistachios'),
  R(/\b(AKHROT|WALNUTS?)\b/, C.DRY, 'Walnuts'),
  R(/\b(KISMIS|KISHMISH|KISMISH|RAISINS?|MUNNAKA|MUNAKKA)\b/, C.DRY, 'Raisins'),
  R(/\b(DATES|\w+DATES|KHAJUR|KHAJOOR|KHARIK|CHUHARA|CHHUHARA|CHOHARA)\b/, C.DRY, 'Dates'),
  R(/\b(ANJEER|ANJIR|FIGS?)\b/, C.DRY, 'Figs & Anjeer'),
  R(/\b(CHIA|FLAX ?SEEDS?|ALSI|PUMPKIN SEEDS?|SUNFLOWER SEEDS?|WATERMELON SEEDS?|MAGAJ|CHIRONJI|CHAROLI|SEEDS|MIX SEED|KALA TILL?|WHITE TILL?)\b/, C.DRY, 'Seeds'),
  R(/\b(MIX(ED)? DRY ?FRUITS?|DRY ?FRUITS?|TRAIL MIX)\b/, C.DRY, 'Mixed Dry Fruits'),
  R(/\b(MAKHANA|MAKHANE|FOX ?NUTS?|APRICOTS?|KHUMANI|PEANUTS?|MOONGPHALI|MUNGFALI|GOND|GOOND|COPRA|KHOPRA|NARIYAL GOLA|NUTS)\b/, C.DRY, 'Other Nuts'),

  // Rice before spices (FORTUNE BIRYANI 1KG is rice; BIRYANI MASALA is a spice)
  R(/\b(RICE(?! BRAN| WATER)|BASMATI|CHAWAL|POHA|CHIURA|CHURA|MURMURA|MURI|SABUDANA|SAGO|JOWAR|BAJRA|RAGI|MILLET|QUINOA|BIRYANI \d+ ?KG)\b(?!.*FLOUR)/, C.GROCERY, 'Rice & Grains'),

  // Spices before oils, flours and dals (DAL CHINI, KALI MIRCH, CHANA MASALA …)
  R(/^(?!.* OIL\b).*\b(MASALA|MASLA|MASHALA|MDH|EVEREST|CATCH|BADSHAH|SUHANA|GOLDIEE|RAMDEV|HALDI|TURMERIC|MIRCH|MIRCHA|CHILLI POWDER|CHILI POWDER|RED CHILLI|JEERA|CUMIN|DHANIA|DHANIYA|CORIANDER|AJWAIN|AJWAN|METHI DANA|HING|HINGRAJ|ASAFOETIDA|ELAICHI|ELICHI|ELICHE|ELACHI|CARDAMOM|LAUNG|LOANG|CLOVES?|DAL ?CHINI|DALCHINI|CINNAMON|KALI MIRCH|BLACK PEPPER|PEPPER|MARICH|TEJ ?PATTA|BAY LEAF|JAIPHAL|JAVITRI|KESAR|SAFFRON|SAUNF|SONF|FENNEL|KALONJI|RAI|SARSO|SARSON|MUSTARD|AMCHUR|KASURI|KASOORI|STAR ANISE|KAWAB CHINI|KABAB ?CHINI|GARAM|SPICES?|SAMBHAR|SAMBAR|BIRYANI|BRIYANI|KITCHEN KING|JALJEERA|TANDOORI|KALA NAMAK|BLACK SALT|POSTA|KHUS ?KHUS|POPPY|HGE|PANCH PHORAN|PANCHPHORAN|CAROM|OREGANO|CHILLI FLAKES|SEASONING|PERI PERI|PIRI PIRI|SASFFRON)\b/, C.GROCERY, 'Spices & Masala'),

  // Oils
  R(/\b(MUSTARD OIL|MUSTAED OIL|SARSO TEL|SARSON TEL|KACHI GHANI|KACHCHI GHANI|REFINED|SUNFLOWER OIL|SOYABEAN OIL|SOYA OIL|RICE BRAN|GROUNDNUT OIL|GROUDNUT OIL|OLIVE OIL|FORTUNE (OIL|REFINED|KACHI|SOYA|SUNLITE|MUSTARD)|DHARA|SAFFOLA|TIL OIL|SESAME OIL|VANASPATI|DALDA|GEMINI|SUNDROP|HEALTHY VALUE|ENGINE|P MARK|BAIL KOLHU|KOLHU|OIL)\b/, C.GROCERY, 'Oil & Ghee'),

  // Flours, dals, salt and sugar
  R(/\b(ATTA|AATA|AATTA|MAIDA|SUJI|SOOJI|RAVA|RAWA|BESAN|BESHAN|DESAN|CORN ?FLOUR|CORNFLOUR|ARAROT|AARAROT|ARROWROOT|SATTU|SATTOO|SATU|FLOUR|CHAKKI|DALIA|DALIYA)\b/, C.GROCERY, 'Atta & Flour'),
  R(/\b(DAL|DAAL|DHAL|MOONG|MUNG|MASOOR|MASUR|MASHUR|URAD|ARHAR|RAHAR|TOOR|TUR|CHANA|CHANNA|RAJMA|KABULI|KABLI|LOBIA|MATAR|MATTAR|PEAS|SOYABEAN|SOYA ?BEAN|SOYA ?CHUNKS?|SOYA|KULTHI|MOTH|PULSES)\b/, C.GROCERY, 'Dal & Pulses'),
  R(/\b(SALT|NAMAK|SENDHA|SUGAR|CHINI|SHAKKAR|GUR|JAGGERY|GUD|MISHRI|KHAND|SUGAR ?FREE|I M LITE|BOORA)\b/, C.GROCERY, 'Salt & Sugar'),

  // Fresh produce: only names that are just the item (plus a weight), so flavours like "LEMON" in other products don't match.
  R(/^(GREEN CHILLI|HARI MIRCH|LAHSHUN|LAHSUN|LEHSUN|GARLIC|ADRAK|GINGER|ONIONS?|PYAZ|PYAJ|POTATO(ES)?|ALOO|TOMATO(ES)?|BAINGAN|BRINJAL|BHINDI|LADY ?FINGER|CABBAGE|GOBHI|CAULIFLOWER|CARROTS?|GAJAR|BEANS|CAPSICUM|CUCUMBER|KHEERA|LAUKI|KARELA|PALAK|SPINACH|PUDINA|LEMON|NIMBU|MUSHROOMS?|BABY CORN|KALA TORI|TORI|TINDA|PARWAL|ARBI|SHAKARKAND|BEETROOT|MULI|RADISH|SWEET CORN)( \d.*| KG| G| GM| PCS)?$/, C.VEG, 'Daily Essentials'),
  R(/^(BANANA|KELA|BANANA KELA|APPLES?|SEB|MANGO(ES)?|AAM|ORANGES?|SANTRA|GRAPES|ANGOOR|PAPAYA|PAPITA|POMEGRANATE|ANAR|GUAVA|AMROOD|PINEAPPLE|WATERMELON|TARBOOJ|KIWI|PEARS?|CHERRY|CHERRIES|LITCHI|LICHI|CHIKOO|SAPOTA|COCONUT|NARIYAL|STRAWBERR(Y|IES)|MUSAMBI|MOSAMBI)( \d.*| KG| G| GM| PCS| DOZEN)?$/, C.FRUITS, 'Everyday Fruits')
];

function normalise(name) {
  return ` ${String(name || '').toUpperCase().replace(/[^A-Z0-9+]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
}

/** Returns { category, subcategory, rule } or null when no rule recognises the name. */
function classify(name) {
  const n = normalise(name);
  const anchored = n.trim();
  for (let i = 0; i < RULES.length; i += 1) {
    const { re, category, subcategory } = RULES[i];
    if (re.source.startsWith('^') ? re.test(anchored) : re.test(n)) return { category, subcategory, rule: i + 1 };
  }
  return null;
}

module.exports = { classify, RULES, C, NEW_CATEGORIES, EXTRA_SUBCATEGORIES };

if (require.main === module) {
  const mongoose = require('mongoose');
  const { connectDB } = require('../config/db');
  const { User, UserRole } = require('../modules/auth/auth.model');
  const { Category, Product } = require('../modules/catalog/catalog.model');
  const { AuditLog, AuditAction } = require('../modules/admin/audit.model');
  const { normalizeMobileNumber } = require('../utils/auth');
  const { toCsv } = require('../utils/csv');
  const { memoryCache } = require('../utils/cache');

  const arg = (name) => {
    const i = process.argv.indexOf(`--${name}`);
    return i > -1 ? process.argv[i + 1] : undefined;
  };

  (async () => {
    const by = arg('by') || '';
    const out = arg('out');
    const dryRun = process.argv.includes('--dry-run');
    await connectDB();
    const who = /^[0-9a-fA-F]{24}$/.test(by) ? { _id: by } : { phone: normalizeMobileNumber(by) };
    const user = await User.findOne({ ...who, role: UserRole.ADMIN, isActive: true });
    if (!user) throw new Error('Usage: node src/scripts/categorise-products.js --by <id or phone of an active admin> [--dry-run] [--out review.csv]');

    const products = await Product.find({ $or: [{ category: { $exists: false } }, { category: null }] })
      .select('_id code name isActive imageUrl price')
      .lean();
    const proposals = products.map((p) => ({ p, c: classify(p.name) }));
    const counts = {};
    for (const { c } of proposals) {
      const key = c ? `${c.category} › ${c.subcategory}` : '(no match)';
      counts[key] = (counts[key] || 0) + 1;
    }
    const matched = proposals.filter((x) => x.c).length;
    console.log(`${products.length} products without a category; ${matched} matched a rule, ${products.length - matched} left uncategorised.${dryRun ? ' (dry run)' : ''}`);
    for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`${String(v).padStart(5)}  ${k}`);

    if (out) {
      const rows = [['product_code', 'product_name', 'listed_online', 'has_photo', 'category', 'subcategory', 'rule']];
      for (const { p, c } of proposals) {
        rows.push([p.code || '', p.name || '', p.isActive ? 'yes' : 'no', p.imageUrl ? 'yes' : 'no', c ? c.category : '', c ? c.subcategory : '', c ? c.rule : '']);
      }
      fs.writeFileSync(out, `﻿${toCsv(rows)}`);
      console.log(`Review file: ${out}`);
    }
    if (dryRun) return mongoose.disconnect();

    // Categories: create the missing ones, add any new subcategories.
    const byName = new Map((await Category.find({}).lean()).map((c) => [c.name, c]));
    const used = new Map();
    for (const { c } of proposals) {
      if (!c) continue;
      if (!used.has(c.category)) used.set(c.category, new Set());
      used.get(c.category).add(c.subcategory);
    }
    for (const [name, subs] of used) {
      let cat = byName.get(name);
      if (!cat) {
        const def = NEW_CATEGORIES.find((d) => d.name === name);
        if (!def) throw new Error(`Category "${name}" does not exist and is not one the script may create`);
        cat = (await Category.create({ ...def, isActive: true })).toObject();
        await AuditLog.create({ user: user._id, action: AuditAction.CREATE, resource: 'Category', resourceId: String(cat._id), details: { name, bulk: true }, ipAddress: 'cli:categorise-products' });
        console.log(`Created category ${name}`);
      }
      const missing = [...subs].filter((s) => !(cat.subcategories || []).includes(s));
      if (missing.length) {
        await Category.updateOne({ _id: cat._id }, { $addToSet: { subcategories: { $each: missing } } });
        console.log(`Added to ${name}: ${missing.join(', ')}`);
      }
      byName.set(name, cat);
    }

    // Products: one update per (category, subcategory), only where the product still has no category.
    const groups = new Map();
    for (const { p, c } of proposals) {
      if (!c) continue;
      const key = `${c.category}\u0000${c.subcategory}`;
      if (!groups.has(key)) groups.set(key, { c, ids: [] });
      groups.get(key).ids.push(p._id);
    }
    let modified = 0;
    for (const { c, ids } of groups.values()) {
      const cat = byName.get(c.category);
      const res = await Product.updateMany(
        { _id: { $in: ids }, $or: [{ category: { $exists: false } }, { category: null }] },
        { $set: { category: cat._id, categorySlug: cat.slug, subcategory: c.subcategory } }
      );
      modified += res.modifiedCount;
      await AuditLog.insertMany(
        ids.map((id) => ({
          user: user._id,
          action: AuditAction.UPDATE,
          resource: 'Product',
          resourceId: String(id),
          details: { category: c.category, subcategory: c.subcategory, bulk: true },
          ipAddress: 'cli:categorise-products'
        }))
      );
    }
    memoryCache.clear();
    console.log(`Categorised ${modified} products as ${user.name}. Restart the API so the storefront drops its cached lists.`);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error(err.message);
    await mongoose.disconnect();
    process.exit(1);
  });
}
