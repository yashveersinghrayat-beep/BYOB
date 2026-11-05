// ==============================================================================
// 💎 ONYX COMMERCIAL RESTAURANT POS — OFFICIAL MENU & TABLE LAYOUT
// Brand: BYOB INDIRAPURAM / BAITHAK (NEW MACHAN VASUNDHARA)
// 100% Exact Match with Official Menu Cards
// ==============================================================================

const CATEGORIES = [
  { id: "top_hits", name: "Top Hits", icon: "⭐" },
  { id: "all", name: "All Items", icon: "📋" },
  { id: "mixers", name: "Mixers & Beverages", icon: "🍾" },
  { id: "chakna", name: "Veg Starters & Bar Bites", icon: "🥜" },
  { id: "nonveg_starters", name: "Non-Veg Starters", icon: "🍗" },
  { id: "indochinese", name: "Indo-Chinese & Pasta", icon: "🍝" },
  { id: "mains", name: "Main Course", icon: "🍛" },
  { id: "breads", name: "Breads", icon: "🫓" },
  { id: "desserts_salads", name: "Desserts & Salads", icon: "🍨" },
  { id: "smoke", name: "Smoke", icon: "🚬" }
];

// Most frequent fast-moving items in BYOB:
const TOP_HITS_IDS = [
  "m_ice",
  "m_soda",
  "m_glass",
  "m_water",
  "m_soft_can",
  "v_peanut_masala",
  "v_masala_papad",
  "v_crispy_corn",
  "v_paneer_tikka",
  "nv_chicken_tikka",
  "nv_chilli_chicken",
  "nv_chicken_seekh",
  "mc_butter_chicken",
  "b_butter_naan"
];

// Quick 1-tap re-order chips in POS
const QUICK_BAR = [
  { id: "m_ice", name: "Ice Bucket", price: 69, icon: "🧊" },
  { id: "m_soda", name: "Soda", price: 49, icon: "🍾" },
  { id: "m_glass", name: "Glass", price: 10, icon: "🥛" },
  { id: "m_water", name: "Water (1L)", price: 40, icon: "💧" },
  { id: "m_soft_can", name: "Cold Drink", price: 99, icon: "🥤" },
  { id: "m_redbull", name: "Red Bull", price: 220, icon: "⚡" },
  { id: "m_lime", name: "Fresh Lime", price: 120, icon: "🍋" }
];

// ================= RESTAURANT ROOM LAYOUT (12 TABLES) =================
const RESTAURANT_TABLES = [
  // ================= 1st FLOOR (15 TABLES: T-01 to T-15) =================
  { id: "T-01", name: "Table 1", floor: "1st Floor", row: "Front Row", position: "Front • Left", landmark: "Front Entrance Window", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-02", name: "Table 2", floor: "1st Floor", row: "Front Row", position: "Front • Center", landmark: "Opposite Cashier Counter", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-03", name: "Table 3", floor: "1st Floor", row: "Front Row", position: "Front • Right", landmark: "Front Wall Sofas", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-04", name: "Table 4", floor: "1st Floor", row: "Middle Row", position: "Middle • Left", landmark: "Center Hall Left Column", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-05", name: "Table 5", floor: "1st Floor", row: "Middle Row", position: "Middle • Center", landmark: "Center Main Pathway", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-06", name: "Table 6", floor: "1st Floor", row: "Middle Row", position: "Middle • Right", landmark: "Center Hall Right Column", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-07", name: "Table 7", floor: "1st Floor", row: "Courtyard", position: "Courtyard • Left", landmark: "Near Pillar Left", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-08", name: "Table 8", floor: "1st Floor", row: "Courtyard", position: "Courtyard • Center", landmark: "Center Pathway South", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-09", name: "Table 9", floor: "1st Floor", row: "Courtyard", position: "Courtyard • Right", landmark: "Beside Wall Woodwork", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-10", name: "Table 10", floor: "1st Floor", row: "Back Row", position: "Back • Left", landmark: "Near Back AC Vent", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-11", name: "Table 11", floor: "1st Floor", row: "Back Row", position: "Back • Center", landmark: "Front of Bar Counter", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-12", name: "Table 12", floor: "1st Floor", row: "Back Row", position: "Back • Right", landmark: "Adjacent to Mixer Station", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-13", name: "Table 13", floor: "1st Floor", row: "Lounge", position: "Ground • Lounge Corner", landmark: "Ground Floor Corner Booth", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-14", name: "Table 14", floor: "1st Floor", row: "Lounge", position: "Ground • Family Booth", landmark: "Ground Floor Family Table", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-15", name: "Table 15", floor: "1st Floor", row: "VIP", position: "Ground • VIP Enclosure", landmark: "Ground Floor VIP Lounge", seats: 8, status: "vacant", activeBill: 0, time: "" },

  // ================= 2nd FLOOR (10 TABLES: T-16 to T-25) =================
  { id: "T-16", name: "Table 16", floor: "2nd Floor", row: "Balcony", position: "2nd Fl • Front Left", landmark: "Balcony View Left", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-17", name: "Table 17", floor: "2nd Floor", row: "Balcony", position: "2nd Fl • Front Center", landmark: "Balcony Center Railing", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-18", name: "Table 18", floor: "2nd Floor", row: "Balcony", position: "2nd Fl • Front Right", landmark: "Balcony View Right", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-19", name: "Table 19", floor: "2nd Floor", row: "AC Hall", position: "2nd Fl • Hall Left", landmark: "AC Dining Hall Left", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-20", name: "Table 20", floor: "2nd Floor", row: "AC Hall", position: "2nd Fl • Hall Center", landmark: "AC Dining Hall Main", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-21", name: "Table 21", floor: "2nd Floor", row: "AC Hall", position: "2nd Fl • Hall Right", landmark: "AC Dining Hall Right", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-22", name: "Table 22", floor: "2nd Floor", row: "Family", position: "2nd Fl • Family Booth 1", landmark: "Private Family Section 1", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-23", name: "Table 23", floor: "2nd Floor", row: "Family", position: "2nd Fl • Family Booth 2", landmark: "Private Family Section 2", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-24", name: "Table 24", floor: "2nd Floor", row: "VIP", position: "2nd Fl • VIP Lounge 1", landmark: "Executive VIP Lounge 1", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-25", name: "Table 25", floor: "2nd Floor", row: "VIP", position: "2nd Fl • VIP Lounge 2", landmark: "Executive VIP Lounge 2", seats: 10, status: "vacant", activeBill: 0, time: "" },

  // ================= ROOFTOP (10 TABLES: T-26 to T-35) =================
  { id: "T-26", name: "Table 26", floor: "Rooftop", row: "Sky Deck", position: "Rooftop • Sky View 1", landmark: "North Sky View Railing", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-27", name: "Table 27", floor: "Rooftop", row: "Sky Deck", position: "Rooftop • Sky View 2", landmark: "North Sky View Center", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-28", name: "Table 28", floor: "Rooftop", row: "Sky Deck", position: "Rooftop • Sky View 3", landmark: "North Sky View Right", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-29", name: "Table 29", floor: "Rooftop", row: "Garden", position: "Rooftop • Garden 1", landmark: "Terrace Garden Left", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-30", name: "Table 30", floor: "Rooftop", row: "Garden", position: "Rooftop • Garden 2", landmark: "Terrace Garden Pergola", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-31", name: "Table 31", floor: "Rooftop", row: "Garden", position: "Rooftop • Garden 3", landmark: "Terrace Garden Right", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-32", name: "Table 32", floor: "Rooftop", row: "Cabana", position: "Rooftop • Cabana 1", landmark: "Luxury Open Air Cabana 1", seats: 6, status: "vacant", activeBill: 0, time: "" },
  { id: "T-33", name: "Table 33", floor: "Rooftop", row: "Cabana", position: "Rooftop • Cabana 2", landmark: "Luxury Open Air Cabana 2", seats: 8, status: "vacant", activeBill: 0, time: "" },
  { id: "T-34", name: "Table 34", floor: "Rooftop", row: "Live Bar", position: "Rooftop • Bar Counter", landmark: "Beside Rooftop Live Bar", seats: 4, status: "vacant", activeBill: 0, time: "" },
  { id: "T-35", name: "Table 35", floor: "Rooftop", row: "Sunset Deck", position: "Rooftop • Sunset View", landmark: "Sunset Horizon Deck", seats: 10, status: "vacant", activeBill: 0, time: "" }
];

// ================= COMPLETE OFFICIAL MENU ITEMS =================
const MENU_ITEMS = [
  // -------------------------------------------------------------
  // 1. MIXERS & BEVERAGES (Page 1)
  // -------------------------------------------------------------
  {
    id: "m_glass",
    name: "Glass",
    category: "mixers",
    price: 10,
    isVeg: true,
    desc: "Clean crystal drinking glass for liquor.",
    image: "images/dishes/m_glass.jpg"
  },
  {
    id: "m_water",
    name: "Plain Water (1L)",
    category: "mixers",
    price: 40,
    isVeg: true,
    desc: "Sealed packaged mineral drinking water.",
    image: "images/dishes/m_water.jpg"
  },
  {
    id: "m_ice",
    name: "Ice Cube Bucket",
    category: "mixers",
    price: 69,
    isVeg: true,
    desc: "Full insulated bucket packed with clear ice cubes.",
    image: "images/dishes/m_ice.jpg"
  },
  {
    id: "m_soft_can",
    name: "Soft Drinks (Can)",
    category: "mixers",
    price: 99,
    isVeg: true,
    desc: "Chilled 300ml can (Coke, Thums Up, Sprite).",
    image: "images/dishes/m_soft_can.jpg"
  },
  {
    id: "m_flav_soda",
    name: "Flavoured Soda",
    category: "mixers",
    price: 99,
    isVeg: true,
    desc: "Chilled sparkling flavored soda.",
    image: "images/dishes/m_flav_soda.jpg"
  },
  {
    id: "m_soda",
    name: "Soda",
    category: "mixers",
    price: 49,
    isVeg: true,
    desc: "Chilled club carbonated mixer soda.",
    image: "images/dishes/m_soda.jpg"
  },
  {
    id: "m_diet_coke",
    name: "Diet Coke (Can)",
    category: "mixers",
    price: 100,
    isVeg: true,
    desc: "Chilled 300ml zero calorie Diet Coke can.",
    image: "images/dishes/m_diet_coke.jpg"
  },
  {
    id: "m_tonic",
    name: "Tonic Water",
    category: "mixers",
    price: 120,
    isVeg: true,
    desc: "Crisp botanical tonic water for gin & vodka.",
    image: "images/dishes/m_tonic.jpg"
  },
  {
    id: "m_lime",
    name: "Fresh Lime Soda",
    category: "mixers",
    price: 120,
    isVeg: true,
    desc: "Fresh lemon juice, mint, and bubbling club soda.",
    image: "images/dishes/m_lime.jpg"
  },
  {
    id: "m_icetea",
    name: "Lemon Iced Tea",
    category: "mixers",
    price: 120,
    isVeg: true,
    desc: "Refreshing chilled lemon iced tea with mint.",
    image: "images/dishes/m_icetea.jpg"
  },
  {
    id: "m_mojito",
    name: "Virgin Mojito",
    category: "mixers",
    price: 167,
    isVeg: true,
    desc: "Fresh mint, lime wedges, simple syrup & crushed ice.",
    image: "images/dishes/m_mojito.jpg"
  },
  {
    id: "m_campa",
    name: "Energy Drink (Campa)",
    category: "mixers",
    price: 129,
    isVeg: true,
    desc: "Chilled Campa Energy drink can.",
    image: "images/dishes/m_campa.jpg"
  },
  {
    id: "m_redbull",
    name: "Energy Drink (Red Bull)",
    category: "mixers",
    price: 220,
    isVeg: true,
    desc: "Chilled 250ml Red Bull energy can.",
    image: "images/dishes/m_redbull.jpg"
  },
  {
    id: "m_juice",
    name: "Juice (By the Pack)",
    category: "mixers",
    price: 299,
    isVeg: true,
    desc: "Full 1-litre pack of Cranberry, Orange, or Pineapple juice.",
    image: "images/dishes/m_juice.jpg"
  },

  // -------------------------------------------------------------
  // 2. VEG STARTERS & BAR BITES (Page 1)
  // -------------------------------------------------------------
  {
    id: "v_plain_papad",
    name: "Plain Papad",
    category: "chakna",
    price: 149,
    isVeg: true,
    desc: "Crispy roasted or fried urad dal papad.",
    image: "images/dishes/v_plain_papad.jpg"
  },
  {
    id: "v_masala_papad",
    name: "Masala Papad",
    category: "chakna",
    price: 199,
    isVeg: true,
    desc: "Crispy papad topped with diced onion, tomato, chili & chaat masala.",
    image: "images/dishes/v_masala_papad.jpg"
  },
  {
    id: "v_peanut_masala",
    name: "Peanut Masala",
    category: "chakna",
    price: 199,
    isVeg: true,
    desc: "Roasted peanuts tossed with diced onion, tomato, green chili & lemon.",
    image: "images/dishes/v_peanut_masala.jpg"
  },
  {
    id: "v_kala_chana",
    name: "Kala Chana Masaledar Garm",
    category: "chakna",
    price: 199,
    isVeg: true,
    desc: "Hot pan-tossed spiced desi black chickpeas with ginger & herbs.",
    image: "images/dishes/v_kala_chana.jpg"
  },
  {
    id: "v_potato_veggies",
    name: "Potato Veggies / Peri Peri Fries",
    category: "chakna",
    price: 199,
    isVeg: true,
    desc: "Golden potato wedges seasoned with herbs (Regular ₹199 / Peri Peri ₹229).",
    image: "images/dishes/v_potato_veggies.jpg"
  },
  {
    id: "v_peri_peri_fries",
    name: "Peri Peri French Fries",
    category: "chakna",
    price: 229,
    isVeg: true,
    desc: "Crisp golden potato fingers dusted with spicy peri-peri seasoning.",
    image: "images/dishes/v_peri_peri_fries.jpg"
  },
  {
    id: "v_crispy_corn",
    name: "Crispy Corn",
    category: "chakna",
    price: 289,
    isVeg: true,
    desc: "Tender American sweet corn tossed with cracked black pepper & spring onion.",
    image: "images/dishes/v_crispy_corn.jpg"
  },
  {
    id: "v_onion_ring",
    name: "Onion Ring",
    category: "chakna",
    price: 289,
    isVeg: true,
    desc: "Thick onion rings dipped in seasoned batter, deep fried golden.",
    image: "images/dishes/v_onion_ring.jpg"
  },
  {
    id: "v_cheese_balls",
    name: "Potato Cheese Balls",
    category: "chakna",
    price: 329,
    isVeg: true,
    desc: "Crispy molten cheese and mashed potato croquettes.",
    image: "images/dishes/v_cheese_balls.jpg"
  },
  {
    id: "v_soya_malai",
    name: "Soya Malai Tikka",
    category: "chakna",
    price: 359,
    isVeg: true,
    desc: "Tender soya chaap grilled in rich cream, cashew paste & cardamom.",
    image: "images/dishes/v_soya_malai.jpg"
  },
  {
    id: "v_hara_bhara",
    name: "Hara Bhara Kabab",
    category: "chakna",
    price: 359,
    isVeg: true,
    desc: "Spinach, green peas & paneer patties spiced and pan-seared.",
    image: "images/dishes/v_hara_bhara.jpg"
  },
  {
    id: "v_dahi_kabab",
    name: "Dahi ke Kabab",
    category: "chakna",
    price: 369,
    isVeg: true,
    desc: "Crispy exterior with smooth hung curd & roasted spices inside.",
    image: "images/dishes/v_dahi_kabab.jpg"
  },
  {
    id: "v_paneer_tikka",
    name: "Paneer Tikka",
    category: "chakna",
    price: 369,
    isVeg: true,
    desc: "Fresh cottage cheese cubes marinated in tandoori masala and chargrilled.",
    image: "images/dishes/v_paneer_tikka.jpg"
  },
  {
    id: "v_saute_veg",
    name: "Sauté Vegetable",
    category: "chakna",
    price: 389,
    isVeg: true,
    desc: "Fresh broccoli, baby corn, mushrooms & bell peppers tossed in butter.",
    image: "images/dishes/v_saute_veg.jpg"
  },
  {
    id: "v_veg_shami",
    name: "Veg Shami Kabab",
    category: "chakna",
    price: 389,
    isVeg: true,
    desc: "Melt-in-mouth spiced lentil and vegetable tawa patties.",
    image: "images/dishes/v_veg_shami.jpg"
  },

  // -------------------------------------------------------------
  // 3. NON-VEG STARTERS (Page 1)
  // -------------------------------------------------------------
  {
    id: "nv_egg_bhurji",
    name: "Masala Omelette / Egg Bhurji",
    category: "nonveg_starters",
    price: 199,
    isVeg: false,
    desc: "Fluffy 3-egg masala omelette or desi spiced egg bhurji.",
    image: "images/dishes/nv_egg_bhurji.jpg"
  },
  {
    id: "nv_chicken_popcorn",
    name: "Chicken Popcorn",
    category: "nonveg_starters",
    price: 359,
    isVeg: false,
    desc: "Crispy battered bite-sized tender chicken chunks.",
    image: "images/dishes/nv_chicken_popcorn.jpg"
  },
  {
    id: "nv_chicken_fries",
    name: "Chicken Fries",
    category: "nonveg_starters",
    price: 359,
    isVeg: false,
    desc: "Crunchy seasoned chicken strips shaped like fries.",
    image: "images/dishes/nv_chicken_fries.jpg"
  },
  {
    id: "nv_chicken_wings",
    name: "Chicken Wings Fried",
    category: "nonveg_starters",
    price: 399,
    isVeg: false,
    desc: "Crispy fried juicy chicken wings seasoned with special rubs.",
    image: "images/dishes/nv_chicken_wings.jpg"
  },
  {
    id: "nv_chicken_shami",
    name: "Chicken Shami Kabab",
    category: "nonveg_starters",
    price: 389,
    isVeg: false,
    desc: "Tender minced chicken patties prepared with whole aromatic spices.",
    image: "images/dishes/nv_chicken_shami.jpg"
  },
  {
    id: "nv_chicken_seekh",
    name: "Chicken Seekh Kebab",
    category: "nonveg_starters",
    price: 389,
    isVeg: false,
    desc: "Charcoal grilled spiced minced chicken skewers with herbs.",
    image: "images/dishes/nv_chicken_seekh.jpg"
  },
  {
    id: "nv_chicken_tikka",
    name: "Chicken Tikka",
    category: "nonveg_starters",
    price: 399,
    isVeg: false,
    desc: "Boneless chicken thighs in Kashmiri chili marinade, roasted in tandoor.",
    image: "images/dishes/nv_chicken_tikka.jpg"
  },
  {
    id: "nv_chicken_malai",
    name: "Chicken Malai Tikka",
    category: "nonveg_starters",
    price: 399,
    isVeg: false,
    desc: "Mild & velvety chicken chunks marinated in cream, cheese & cashew.",
    image: "images/dishes/nv_chicken_malai.jpg"
  },
  {
    id: "nv_amritsari_fish",
    name: "Amritsari Fish Fry",
    category: "nonveg_starters",
    price: 399,
    isVeg: false,
    desc: "Crispy river sole fish fillets coated in carom seed (ajwain) batter.",
    image: "images/dishes/nv_amritsari_fish.jpg"
  },
  {
    id: "nv_fish_tikka",
    name: "Fish Tikka",
    category: "nonveg_starters",
    price: 489,
    isVeg: false,
    desc: "Boneless fish cubes marinated in yellow chili tandoori spices.",
    image: "images/dishes/nv_fish_tikka.jpg"
  },
  {
    id: "nv_mutton_seekh",
    name: "Mutton Seekh Kebab",
    category: "nonveg_starters",
    price: 399,
    isVeg: false,
    desc: "Tender minced mutton mixed with onions and spices, grilled on skewers.",
    image: "images/dishes/nv_mutton_seekh.jpg"
  },
  {
    id: "nv_tandoori_chicken_half",
    name: "Tandoori Chicken (Half)",
    category: "nonveg_starters",
    price: 389,
    isVeg: false,
    desc: "Classic half spring chicken roasted in authentic clay tandoor.",
    image: "images/dishes/nv_tandoori_chicken_half.jpg"
  },
  {
    id: "nv_tandoori_chicken_full",
    name: "Tandoori Chicken (Full)",
    category: "nonveg_starters",
    price: 679,
    isVeg: false,
    desc: "Whole spring chicken marinated with roasted spices and mustard oil.",
    image: "images/dishes/nv_tandoori_chicken_full.jpg"
  },

  // -------------------------------------------------------------
  // 4. INDO-CHINESE & CONTINENTAL (Page 1)
  // -------------------------------------------------------------
  {
    id: "v_spring_roll",
    name: "Veg Spring Roll",
    category: "indochinese",
    price: 289,
    isVeg: true,
    desc: "Crispy sheets rolled with seasoned shredded vegetables & noodles.",
    image: "images/dishes/v_spring_roll.jpg"
  },
  {
    id: "v_chilli_potato",
    name: "Chilli Potato",
    category: "indochinese",
    price: 299,
    isVeg: true,
    desc: "Crispy potato fingers wok-tossed with chili garlic and soy sauce.",
    image: "images/dishes/v_chilli_potato.jpg"
  },
  {
    id: "v_honey_chilli_potato",
    name: "Honey Chilli Potato",
    category: "indochinese",
    price: 329,
    isVeg: true,
    desc: "Crisp potato fingers glazed with sweet chili honey sauce & sesame.",
    image: "images/dishes/v_honey_chilli_potato.jpg"
  },
  {
    id: "v_manchurian",
    name: "Veg Manchurian (Dry)",
    category: "indochinese",
    price: 339,
    isVeg: true,
    desc: "Golden vegetable dumplings tossed in tangy Indo-Chinese Manchurian glaze.",
    image: "images/dishes/v_manchurian.jpg"
  },
  {
    id: "p_veg_arrabbiata",
    name: "Veg Arrabbiata Pasta",
    category: "indochinese",
    price: 340,
    isVeg: true,
    desc: "Penne tossed in spicy Italian tomato, garlic and basil arrabbiata sauce.",
    image: "images/dishes/p_veg_arrabbiata.jpg"
  },
  {
    id: "p_veg_alfredo",
    name: "Veg Alfredo Pasta",
    category: "indochinese",
    price: 349,
    isVeg: true,
    desc: "Penne in creamy parmesan garlic butter white sauce with herbs.",
    image: "images/dishes/p_veg_alfredo.jpg"
  },
  {
    id: "p_chicken_arrabbiata",
    name: "Chicken Arrabbiata Pasta",
    category: "indochinese",
    price: 340,
    isVeg: false,
    desc: "Penne with pan-seared chicken chunks in fiery red tomato sauce.",
    image: "images/dishes/p_chicken_arrabbiata.jpg"
  },
  {
    id: "p_chicken_alfredo",
    name: "Chicken Alfredo Pasta",
    category: "indochinese",
    price: 399,
    isVeg: false,
    desc: "Penne pasta with grilled chicken in rich parmesan cheese sauce.",
    image: "images/dishes/p_chicken_alfredo.jpg"
  },
  {
    id: "v_chilli_mushroom",
    name: "Chilli Mushroom",
    category: "indochinese",
    price: 359,
    isVeg: true,
    desc: "Crispy button mushrooms tossed with green chilies, onions & capsicum.",
    image: "images/dishes/v_chilli_mushroom.jpg"
  },
  {
    id: "v_chilli_paneer",
    name: "Chilli Paneer",
    category: "indochinese",
    price: 389,
    isVeg: true,
    desc: "Wok-seared paneer cubes tossed in spicy soy-chili sauce.",
    image: "images/dishes/v_chilli_paneer.jpg"
  },
  {
    id: "nv_chilli_chicken",
    name: "Chilli Chicken (Dry)",
    category: "indochinese",
    price: 391,
    isVeg: false,
    desc: "Classic Indo-Chinese diced chicken tossed with scallions and dark soy.",
    image: "images/dishes/nv_chilli_chicken.jpg"
  },
  {
    id: "nv_chicken_lollipop",
    name: "Chicken Lollipop",
    category: "indochinese",
    price: 499,
    isVeg: false,
    desc: "Crisp frenched chicken drumettes with spicy Schezwan dip.",
    image: "images/dishes/nv_chicken_lollipop.jpg"
  },

  // -------------------------------------------------------------
  // 5. MAIN COURSE (Page 2)
  // -------------------------------------------------------------
  {
    id: "mc_steamed_rice",
    name: "Steamed Rice",
    category: "mains",
    price: 231,
    isVeg: true,
    desc: "Fluffy steamed long-grain basmati rice.",
    image: "images/dishes/mc_steamed_rice.jpg"
  },
  {
    id: "mc_dal_tadka",
    name: "Yellow Dal Tadka",
    category: "mains",
    price: 319,
    isVeg: true,
    desc: "Yellow lentils tempered with ghee, cumin seeds, garlic & dried chili.",
    image: "images/dishes/mc_dal_tadka.jpg"
  },
  {
    id: "mc_veg_biryani",
    name: "Veg Biryani",
    category: "mains",
    price: 319,
    isVeg: true,
    desc: "Fragrant basmati rice layered with vegetables and aromatic spices.",
    image: "images/dishes/mc_veg_biryani.jpg"
  },
  {
    id: "mc_egg_curry",
    name: "Egg Curry (4 Pcs)",
    category: "mains",
    price: 369,
    isVeg: false,
    desc: "Four boiled eggs simmered in rich Punjabi onion-tomato gravy.",
    image: "images/dishes/mc_egg_curry.jpg"
  },
  {
    id: "mc_dal_makhani",
    name: "Dal Makhani",
    category: "mains",
    price: 379,
    isVeg: true,
    desc: "Slow-cooked black lentils simmered overnight with butter & cream.",
    image: "images/dishes/mc_dal_makhani.jpg"
  },
  {
    id: "mc_paneer_butter",
    name: "Paneer Butter Masala / Kadai",
    category: "mains",
    price: 399,
    isVeg: true,
    desc: "Paneer in velvety tomato butter makhani or wok-cooked kadai gravy.",
    image: "images/dishes/mc_paneer_butter.jpg"
  },
  {
    id: "mc_chicken_biryani",
    name: "Chicken Biryani",
    category: "mains",
    price: 449,
    isVeg: false,
    desc: "Traditional chicken dum biryani with saffron basmati rice.",
    image: "images/dishes/mc_chicken_biryani.jpg"
  },
  {
    id: "mc_chicken_curry",
    name: "Chicken Curry / Rara / Jalfrezi",
    category: "mains",
    price: 489,
    isVeg: false,
    desc: "Choice of Dhaba Chicken Curry, Chicken Rara with keema, or Jalfrezi.",
    image: "images/dishes/mc_chicken_curry.jpg"
  },
  {
    id: "mc_butter_chicken",
    name: "Butter Chicken / Kadhai Chicken",
    category: "mains",
    price: 489,
    isVeg: false,
    desc: "Tandoori chicken in smooth tomato makhani sauce or spiced kadhai.",
    image: "images/dishes/mc_butter_chicken.jpg"
  },

  // -------------------------------------------------------------
  // 6. BREADS (Page 2)
  // -------------------------------------------------------------
  {
    id: "b_tandoori_roti",
    name: "Tandoori Roti (Plain)",
    category: "breads",
    price: 29,
    isVeg: true,
    desc: "Traditional clay-oven whole wheat flatbread.",
    image: "images/dishes/b_tandoori_roti.jpg"
  },
  {
    id: "b_butter_roti",
    name: "Butter Roti",
    category: "breads",
    price: 39,
    isVeg: true,
    desc: "Whole wheat tandoori roti brushed with creamy butter.",
    image: "images/dishes/b_butter_roti.jpg"
  },
  {
    id: "b_plain_naan",
    name: "Plain Naan",
    category: "breads",
    price: 49,
    isVeg: true,
    desc: "Refined flour leavened bread baked inside tandoor.",
    image: "images/dishes/b_plain_naan.jpg"
  },
  {
    id: "b_butter_naan",
    name: "Butter Naan",
    category: "breads",
    price: 69,
    isVeg: true,
    desc: "Soft, pillowy naan generously brushed with pure butter.",
    image: "images/dishes/b_butter_naan.jpg"
  },
  {
    id: "b_laccha_parantha",
    name: "Laccha Parantha",
    category: "breads",
    price: 69,
    isVeg: true,
    desc: "Flaky, multi-layered tandoori parantha with butter.",
    image: "images/dishes/b_laccha_parantha.jpg"
  },
  {
    id: "b_garlic_naan",
    name: "Garlic Naan",
    category: "breads",
    price: 95,
    isVeg: true,
    desc: "Naan topped with minced roasted garlic and fresh coriander.",
    image: "images/dishes/b_garlic_naan.jpg"
  },

  // -------------------------------------------------------------
  // 7. DESSERTS & SALADS (Page 2)
  // -------------------------------------------------------------
  {
    id: "s_onion_salad",
    name: "Onion Salad",
    category: "desserts_salads",
    price: 49,
    isVeg: true,
    desc: "Fresh sliced onion rings with lemon wedge & green chili.",
    image: "images/dishes/s_onion_salad.jpg"
  },
  {
    id: "s_masala_onion",
    name: "Masala Onion",
    category: "desserts_salads",
    price: 59,
    isVeg: true,
    desc: "Sliced onion rings tossed in tangy chaat masala & lemon juice.",
    image: "images/dishes/s_masala_onion.jpg"
  },
  {
    id: "d_gulab_jamun",
    name: "Gulab Jamun",
    category: "desserts_salads",
    price: 150,
    isVeg: true,
    desc: "Two warm fried khoya dumplings soaked in rose cardamom sugar syrup.",
    image: "images/dishes/d_gulab_jamun.jpg"
  },
  {
    id: "s_raita",
    name: "Raita (Cumin Seasoned)",
    category: "desserts_salads",
    price: 169,
    isVeg: true,
    desc: "Chilled fresh yogurt with boondi and roasted jeera powder.",
    image: "images/dishes/s_raita.jpg"
  },
  {
    id: "s_green_salad",
    name: "Garden / Green Salad",
    category: "desserts_salads",
    price: 189,
    isVeg: true,
    desc: "Fresh garden cucumber, carrots, tomatoes and beetroot slices.",
    image: "images/dishes/s_green_salad.jpg"
  },
  {
    id: "d_brownie",
    name: "Brownie with Ice Cream / Lava Cake",
    category: "desserts_salads",
    price: 249,
    isVeg: true,
    desc: "Warm gooey chocolate brownie or lava cake served with vanilla scoop.",
    image: "images/dishes/d_brownie.jpg"
  },

  // -------------------------------------------------------------
  // 8. SMOKE (Page 2)
  // -------------------------------------------------------------
  {
    id: "x_smoke_reg",
    name: "Smoke (Regular)",
    category: "smoke",
    price: 20,
    isVeg: true,
    desc: "Regular single stick.",
    image: "images/dishes/x_smoke_reg.jpg"
  },
  {
    id: "x_smoke_med",
    name: "Smoke (Medium)",
    category: "smoke",
    price: 25,
    isVeg: true,
    desc: "Medium single stick.",
    image: "images/dishes/x_smoke_med.jpg"
  },
  {
    id: "x_smoke_large",
    name: "Smoke (Large)",
    category: "smoke",
    price: 30,
    isVeg: true,
    desc: "Large single stick.",
    image: "images/dishes/x_smoke_large.jpg"
  }
];
