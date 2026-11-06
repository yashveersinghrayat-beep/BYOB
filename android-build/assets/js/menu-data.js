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

// ================= RESTAURANT ROOM LAYOUT (42 TABLES - 1ST LOCATION) =================
const RESTAURANT_TABLES = [
  {
    "id": "T-01",
    "name": "Table 1",
    "floor": "Ground Floor",
    "row": "Front Area",
    "position": "Ground • Front #1",
    "landmark": "Near Front Entrance",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-02",
    "name": "Table 2",
    "floor": "Ground Floor",
    "row": "Front Area",
    "position": "Ground • Front #2",
    "landmark": "Near Entrance Sofas",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-03",
    "name": "Table 3",
    "floor": "Ground Floor",
    "row": "Front Area",
    "position": "Ground • Front #3",
    "landmark": "Front Window Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-04",
    "name": "Table 4",
    "floor": "Ground Floor",
    "row": "Front Area",
    "position": "Ground • Front #4",
    "landmark": "Opposite Cashier Counter",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-05",
    "name": "Table 5",
    "floor": "Ground Floor",
    "row": "Front Area",
    "position": "Ground • Front #5",
    "landmark": "Front Wall Sofas",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-06",
    "name": "Table 6",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #6",
    "landmark": "Center Hall Column Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-07",
    "name": "Table 7",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #7",
    "landmark": "Main Pathway Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-08",
    "name": "Table 8",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #8",
    "landmark": "Center Pathway Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-09",
    "name": "Table 9",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #9",
    "landmark": "Center Hall Column Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-10",
    "name": "Table 10",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #10",
    "landmark": "Courtyard Pathway Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-11",
    "name": "Table 11",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #11",
    "landmark": "Courtyard Center",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-12",
    "name": "Table 12",
    "floor": "Ground Floor",
    "row": "Main Dining",
    "position": "Ground • Center #12",
    "landmark": "Courtyard Wall Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-13",
    "name": "Table 13",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #13",
    "landmark": "Back Wall Left (Near AC)",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-14",
    "name": "Table 14",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #14",
    "landmark": "Front of Bar Counter",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-15",
    "name": "Table 15",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #15",
    "landmark": "Adjacent to Mixer Station",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-16",
    "name": "Table 16",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #16",
    "landmark": "Corner Lounge Booth",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-17",
    "name": "Table 17",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #17",
    "landmark": "Central Lounge Booth",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-18",
    "name": "Table 18",
    "floor": "Ground Floor",
    "row": "Lounge & Bar",
    "position": "Ground • Lounge #18",
    "landmark": "Side Garden Window",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-19",
    "name": "Table 19",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #1",
    "landmark": "Balcony Window Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-20",
    "name": "Table 20",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #2",
    "landmark": "Center Dining Hall",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-21",
    "name": "Table 21",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #3",
    "landmark": "Balcony Window Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-22",
    "name": "Table 22",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #4",
    "landmark": "AC Dining Left Column",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-23",
    "name": "Table 23",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #5",
    "landmark": "AC Dining Center Pathway",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-24",
    "name": "Table 24",
    "floor": "1st Floor",
    "row": "1st Floor Dining",
    "position": "1st Fl • Hall #6",
    "landmark": "AC Dining Right Column",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-25",
    "name": "Table 25",
    "floor": "1st Floor",
    "row": "VIP Family",
    "position": "1st Fl • VIP Family",
    "landmark": "VIP 6-Seater Family Enclosure",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-26",
    "name": "Table 26",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #1",
    "landmark": "Front Balcony Railing Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-27",
    "name": "Table 27",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #2",
    "landmark": "Front Balcony Center",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-28",
    "name": "Table 28",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #3",
    "landmark": "Front Balcony Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-29",
    "name": "Table 29",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #4",
    "landmark": "Terrace Garden Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-30",
    "name": "Table 30",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #5",
    "landmark": "Terrace Pergola Center",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-31",
    "name": "Table 31",
    "floor": "2nd Floor",
    "row": "Terrace & Balcony",
    "position": "2nd Fl • Deck #6",
    "landmark": "Terrace Garden Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-32",
    "name": "Table 32",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #7",
    "landmark": "Sky Deck Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-33",
    "name": "Table 33",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #8",
    "landmark": "Sky Deck Center",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-34",
    "name": "Table 34",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #9",
    "landmark": "Sky Deck Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-35",
    "name": "Table 35",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #10",
    "landmark": "AC Lounge Booth 1",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-36",
    "name": "Table 36",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #11",
    "landmark": "AC Lounge Booth 2",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-37",
    "name": "Table 37",
    "floor": "2nd Floor",
    "row": "Sky Lounge",
    "position": "2nd Fl • Deck #12",
    "landmark": "AC Lounge Booth 3",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-38",
    "name": "Table 38",
    "floor": "2nd Floor",
    "row": "Sunset Deck",
    "position": "2nd Fl • Deck #13",
    "landmark": "Open Air Deck Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-39",
    "name": "Table 39",
    "floor": "2nd Floor",
    "row": "Sunset Deck",
    "position": "2nd Fl • Deck #14",
    "landmark": "Open Air Deck Center",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-40",
    "name": "Table 40",
    "floor": "2nd Floor",
    "row": "Sunset Deck",
    "position": "2nd Fl • Deck #15",
    "landmark": "Open Air Deck Right",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-41",
    "name": "Table 41",
    "floor": "2nd Floor",
    "row": "Sunset Deck",
    "position": "2nd Fl • Deck #16",
    "landmark": "Sunset View Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-42",
    "name": "Table 42",
    "floor": "2nd Floor",
    "row": "Sunset Deck",
    "position": "2nd Fl • Deck #17",
    "landmark": "Sunset View Panorama Deck",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  }
];

// ================= COMPLETE OFFICIAL MENU ITEMS =================
const MENU_ITEMS = [
  {
    "id": "m_glass",
    "name": "Glass",
    "category": "mixers",
    "price": 10,
    "isVeg": true,
    "desc": "Clean crystal rock tumbler glass with paper coaster.",
    "image": "images/dishes/m_glass.jpg"
  },
  {
    "id": "m_water",
    "name": "Plain Water (1L)",
    "category": "mixers",
    "price": 40,
    "isVeg": true,
    "desc": "Packaged 1-Litre chilled drinking water bottle.",
    "image": "images/dishes/m_water.jpg"
  },
  {
    "id": "m_soda",
    "name": "Soda",
    "category": "mixers",
    "price": 49,
    "isVeg": true,
    "desc": "Chilled effervescent club soda bottle (750ml).",
    "image": "images/dishes/m_soda.jpg"
  },
  {
    "id": "m_ice",
    "name": "Ice Cube Bucket",
    "category": "mixers",
    "price": 69,
    "isVeg": true,
    "desc": "Stainless insulated bucket packed with fresh ice cubes and tongs.",
    "image": "images/dishes/m_ice.jpg"
  },
  {
    "id": "m_soft_can",
    "name": "Soft Drinks (Can)",
    "category": "mixers",
    "price": 99,
    "isVeg": true,
    "desc": "Choice of chilled Coke, Thums Up, Sprite, or Limca (300ml can).",
    "image": "images/dishes/m_soft_can.jpg"
  },
  {
    "id": "m_soft_750",
    "name": "Soft Drink (750 ml)",
    "category": "mixers",
    "price": 99,
    "isVeg": true,
    "desc": "Chilled 750ml pet bottle mixer.",
    "image": "images/dishes/m_soft_can.jpg"
  },
  {
    "id": "m_diet_coke",
    "name": "Diet Coke (Can)",
    "category": "mixers",
    "price": 109,
    "isVeg": true,
    "desc": "Zero-sugar chilled carbonated mixer can (300ml).",
    "image": "images/dishes/m_diet_coke.jpg"
  },
  {
    "id": "m_flav_soda",
    "name": "Flavoured Soda",
    "category": "mixers",
    "price": 119,
    "isVeg": true,
    "desc": "Choice of Jeera, Masala Lemon or Peach infused soda.",
    "image": "images/dishes/m_flav_soda.jpg"
  },
  {
    "id": "m_tonic",
    "name": "Tonic Water",
    "category": "mixers",
    "price": 120,
    "isVeg": true,
    "desc": "Premium botanical quinine tonic mixer (Schweppes/Sepoy).",
    "image": "images/dishes/m_tonic.jpg"
  },
  {
    "id": "m_lime",
    "name": "Fresh Lime Soda",
    "category": "mixers",
    "price": 120,
    "isVeg": true,
    "desc": "Freshly squeezed lemon juice, rock salt & chilled club soda (Sweet/Salt).",
    "image": "images/dishes/m_lime.jpg"
  },
  {
    "id": "m_icetea",
    "name": "Lemon Iced Tea",
    "category": "mixers",
    "price": 120,
    "isVeg": true,
    "desc": "Brewed black tea infused with lemon zest & mint served over crushed ice.",
    "image": "images/dishes/m_icetea.jpg"
  },
  {
    "id": "m_mojito",
    "name": "Virgin Mojito",
    "category": "mixers",
    "price": 199,
    "isVeg": true,
    "desc": "Muddled mint leaves, lime chunks, raw sugar syrup and sparkling soda.",
    "image": "images/dishes/m_mojito.jpg"
  },
  {
    "id": "m_campa",
    "name": "Energy Drink (Campa)",
    "category": "mixers",
    "price": 129,
    "isVeg": true,
    "desc": "Campa Energy chilled can.",
    "image": "images/dishes/m_campa.jpg"
  },
  {
    "id": "m_redbull",
    "name": "Energy Drink (Red Bull)",
    "category": "mixers",
    "price": 220,
    "isVeg": true,
    "desc": "Original Red Bull vitality energy can (250ml).",
    "image": "images/dishes/m_redbull.jpg"
  },
  {
    "id": "m_juice",
    "name": "Juice (By the Pack)",
    "category": "mixers",
    "price": 299,
    "isVeg": true,
    "desc": "1-Litre Real/Tropicana fruit pack (Cranberry, Orange, Pineapple).",
    "image": "images/dishes/m_juice.jpg"
  },
  {
    "id": "v_plain_papad",
    "name": "Plain Papad",
    "category": "chakna",
    "price": 149,
    "isVeg": true,
    "desc": "Two crisp roasted or deep-fried urad dal papads with mint chutney.",
    "image": "images/dishes/v_plain_papad.jpg"
  },
  {
    "id": "v_masala_papad",
    "name": "Masala Papad",
    "category": "chakna",
    "price": 199,
    "isVeg": true,
    "desc": "Crisp fried papad loaded with onion, tomato, coriander & chaat masala.",
    "image": "images/dishes/v_masala_papad.jpg"
  },
  {
    "id": "v_peanut_masala",
    "name": "Peanut Masala",
    "category": "chakna",
    "price": 199,
    "isVeg": true,
    "desc": "Crispy roasted peanuts tossed with green chilies, onions, tomatoes & lime.",
    "image": "images/dishes/v_peanut_masala.jpg"
  },
  {
    "id": "v_kala_chana",
    "name": "Kala Chana Masaledar Garm",
    "category": "chakna",
    "price": 239,
    "isVeg": true,
    "desc": "Pan-roasted black chickpeas tossed with mustard oil, ginger & hot spices.",
    "image": "images/dishes/v_kala_chana.jpg"
  },
  {
    "id": "v_potato_veggies",
    "name": "Potato Veggies",
    "category": "chakna",
    "price": 199,
    "isVeg": true,
    "desc": "Crispy skin-on seasoned potato wedges tossed with herbs & paprika.",
    "image": "images/dishes/v_potato_veggies.jpg"
  },
  {
    "id": "v_peri_peri_fries",
    "name": "Peri Peri Fries",
    "category": "chakna",
    "price": 229,
    "isVeg": true,
    "desc": "Crisp seasoned fries tossed in spicy peri peri herbs.",
    "image": "images/dishes/v_peri_peri_fries.jpg"
  },
  {
    "id": "v_french_fries",
    "name": "French Fries (Salted)",
    "category": "chakna",
    "price": 199,
    "isVeg": true,
    "desc": "Crispy golden salted classic french fries.",
    "image": "images/dishes/v_french_fries.jpg"
  },
  {
    "id": "v_peri_peri_french_fries",
    "name": "Peri Peri French Fries",
    "category": "chakna",
    "price": 245,
    "isVeg": true,
    "desc": "Golden shoestring fries tossed in fiery African peri peri spice blend.",
    "image": "images/dishes/v_peri_peri_fries.jpg"
  },
  {
    "id": "v_onion_ring",
    "name": "Onion Ring",
    "category": "chakna",
    "price": 299,
    "isVeg": true,
    "desc": "Crunchy golden-crumbed onion rings served with tandoori mayo dip.",
    "image": "images/dishes/v_onion_ring.jpg"
  },
  {
    "id": "v_crispy_corn",
    "name": "Crispy Corn",
    "category": "chakna",
    "price": 349,
    "isVeg": true,
    "desc": "Tender American sweet corn tossed in cornstarch, fried crisp & spiced.",
    "image": "images/dishes/v_crispy_corn.jpg"
  },
  {
    "id": "v_cheese_balls",
    "name": "Potato Cheese Balls",
    "category": "chakna",
    "price": 389,
    "isVeg": true,
    "desc": "Melted mozzarella & mashed spiced potato spheres crumbed & fried.",
    "image": "images/dishes/v_cheese_balls.jpg"
  },
  {
    "id": "v_hara_bhara",
    "name": "Hara Bhara Kabab",
    "category": "chakna",
    "price": 389,
    "isVeg": true,
    "desc": "Nutritious spinach, green peas, and paneer patties pan-grilled.",
    "image": "images/dishes/v_hara_bhara.jpg"
  },
  {
    "id": "v_saute_veg",
    "name": "Sauté Vegetable",
    "category": "chakna",
    "price": 389,
    "isVeg": true,
    "desc": "Broccoli, zucchini, bell peppers, baby corn & mushrooms tossed in garlic butter.",
    "image": "images/dishes/v_saute_veg.jpg"
  },
  {
    "id": "v_veg_shami",
    "name": "Veg Shami Kabab",
    "category": "chakna",
    "price": 389,
    "isVeg": true,
    "desc": "Melt-in-mouth spiced chana dal & vegetable kababs served with pickled onions.",
    "image": "images/dishes/v_veg_shami.jpg"
  },
  {
    "id": "v_soya_malai",
    "name": "Soya Malai Tikka",
    "category": "chakna",
    "price": 399,
    "isVeg": true,
    "desc": "Soft soya chaap chunks marinated in rich cashew cream & char-grilled.",
    "image": "images/dishes/v_soya_malai.jpg"
  },
  {
    "id": "v_dahi_kabab",
    "name": "Dahi Ke Kabab",
    "category": "chakna",
    "price": 399,
    "isVeg": true,
    "desc": "Hung curd, roasted gram flour, crushed green chillies & fresh coriander.",
    "image": "images/dishes/v_dahi_kabab.jpg"
  },
  {
    "id": "v_paneer_tikka",
    "name": "Paneer Tikka",
    "category": "chakna",
    "price": 399,
    "isVeg": true,
    "desc": "Juicy fresh cottage cheese cubes marinated in Kashmiri red chili & hung curd.",
    "image": "images/dishes/v_paneer_tikka.jpg"
  },
  {
    "id": "nv_masala_omelette",
    "name": "Masala Omelette",
    "category": "nonveg_starters",
    "price": 239,
    "isVeg": false,
    "desc": "Fluffy folded farm eggs with onion, tomato, green chillies & fresh coriander.",
    "image": "images/dishes/nv_egg_bhurji.jpg"
  },
  {
    "id": "nv_egg_bhurji",
    "name": "Egg Bhurji",
    "category": "nonveg_starters",
    "price": 239,
    "isVeg": false,
    "desc": "Spiced scrambled farm eggs cooked with onions, tomatoes & desi spices.",
    "image": "images/dishes/nv_egg_bhurji.jpg"
  },
  {
    "id": "nv_chicken_popcorn",
    "name": "Chicken Popcorn",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Bite-sized boneless chicken cubes seasoned and batter-fried ultra crisp.",
    "image": "images/dishes/nv_chicken_popcorn.jpg"
  },
  {
    "id": "nv_chicken_fries",
    "name": "Chicken Fries",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Tender white meat chicken strips crumb-coated and fried golden crisp.",
    "image": "images/dishes/nv_chicken_fries.jpg"
  },
  {
    "id": "nv_chicken_wings",
    "name": "Chicken Wings Fried",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Juicy bone-in chicken wings tossed in signature fiery BBQ sauce.",
    "image": "images/dishes/nv_chicken_wings.jpg"
  },
  {
    "id": "nv_chicken_shami",
    "name": "Chicken Shami Kabab",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Silky Awadhi chicken mince and lentil patties infused with whole spices.",
    "image": "images/dishes/nv_chicken_shami.jpg"
  },
  {
    "id": "nv_chicken_seekh",
    "name": "Chicken Seekh Kebab",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Minced chicken seasoned with fresh herbs, skewered & charcoal-grilled in tandoor.",
    "image": "images/dishes/nv_chicken_seekh.jpg"
  },
  {
    "id": "nv_chicken_boti",
    "name": "Chicken Boti Kabab",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Tender boneless chicken boti marinated in spiced curd and charcoal grilled.",
    "image": "images/dishes/nv_chicken_tikka.jpg"
  },
  {
    "id": "nv_chicken_tikka",
    "name": "Chicken Tikka",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Succulent boneless chicken thigh chunks steeped in tandoori masala & roasted.",
    "image": "images/dishes/nv_chicken_tikka.jpg"
  },
  {
    "id": "nv_chicken_malai",
    "name": "Chicken Malai (Dry)",
    "category": "nonveg_starters",
    "price": 391,
    "isVeg": false,
    "desc": "Creamy boneless chicken kebab marinated with cream, cheese, white pepper.",
    "image": "images/dishes/nv_chicken_malai.jpg"
  },
  {
    "id": "nv_chicken_lollipop",
    "name": "Chicken Lollipop",
    "category": "nonveg_starters",
    "price": 499,
    "isVeg": false,
    "desc": "Frenched chicken winglets tossed in tangy Schezwan sauce.",
    "image": "images/dishes/nv_chicken_lollipop.jpg"
  },
  {
    "id": "nv_amritsari_fish",
    "name": "Amritsari Fish Fry",
    "category": "nonveg_starters",
    "price": 449,
    "isVeg": false,
    "desc": "Fresh river sole fish fillets coated in carom-infused besan batter and fried crisp.",
    "image": "images/dishes/nv_amritsari_fish.jpg"
  },
  {
    "id": "nv_fish_tikka",
    "name": "Fish Tikka",
    "category": "nonveg_starters",
    "price": 449,
    "isVeg": false,
    "desc": "Boneless fish cubes marinated in yellow mustard, yogurt and char-grilled.",
    "image": "images/dishes/nv_fish_tikka.jpg"
  },
  {
    "id": "nv_chilli_mutton_half",
    "name": "Chilli Mutton (Half)",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Tender boneless mutton cubes tossed with capsicum, onions & spicy chillies.",
    "image": "images/dishes/nv_mutton_seekh.jpg"
  },
  {
    "id": "nv_chilli_mutton_full",
    "name": "Chilli Mutton (Full)",
    "category": "nonveg_starters",
    "price": 499,
    "isVeg": false,
    "desc": "Full portion spicy wok-tossed mutton cubes with oriental chillies & herbs.",
    "image": "images/dishes/nv_mutton_seekh.jpg"
  },
  {
    "id": "nv_tandoori_chicken_half",
    "name": "Tandoori Chicken (Half)",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Traditional bone-in chicken marinated in hung curd, Kashmiri deghi mirch & spices.",
    "image": "images/dishes/nv_tandoori_chicken_half.jpg"
  },
  {
    "id": "nv_tandoori_chicken_full",
    "name": "Tandoori Chicken (Full)",
    "category": "nonveg_starters",
    "price": 679,
    "isVeg": false,
    "desc": "Full whole chicken marinated overnight and slow-roasted in clay tandoor.",
    "image": "images/dishes/nv_tandoori_chicken_full.jpg"
  },
  {
    "id": "v_spring_roll",
    "name": "Veg Spring Roll",
    "category": "indochinese",
    "price": 289,
    "isVeg": true,
    "desc": "Crispy fried rolls filled with julienned vegetables and glass noodles.",
    "image": "images/dishes/v_spring_roll.jpg"
  },
  {
    "id": "v_chilli_potato",
    "name": "Chilli Potato",
    "category": "indochinese",
    "price": 299,
    "isVeg": true,
    "desc": "Crispy fried potato fingers tossed in spicy soya-chilli garlic sauce.",
    "image": "images/dishes/v_chilli_potato.jpg"
  },
  {
    "id": "v_honey_chilli_potato",
    "name": "Honey Chilli Potato",
    "category": "indochinese",
    "price": 329,
    "isVeg": true,
    "desc": "Crisp potato fingers glazed with raw honey, red chilies & toasted sesame.",
    "image": "images/dishes/v_honey_chilli_potato.jpg"
  },
  {
    "id": "v_manchurian",
    "name": "Veg Manchurian (Dry)",
    "category": "indochinese",
    "price": 389,
    "isVeg": true,
    "desc": "Vegetable dumplings wok-tossed with chopped garlic, green chilies & soya sauce.",
    "image": "images/dishes/v_manchurian.jpg"
  },
  {
    "id": "p_veg_arrabbiata",
    "name": "Veg Arrabbiata Pasta",
    "category": "indochinese",
    "price": 349,
    "isVeg": true,
    "desc": "Penne pasta simmered in spicy garlic tomato marinara with basil & olives.",
    "image": "images/dishes/p_veg_arrabbiata.jpg"
  },
  {
    "id": "p_veg_alfredo",
    "name": "Veg Alfredo Pasta",
    "category": "indochinese",
    "price": 389,
    "isVeg": true,
    "desc": "Penne pasta coated in velvety parmesan cream cheese sauce with sautéed mushrooms.",
    "image": "images/dishes/p_veg_alfredo.jpg"
  },
  {
    "id": "p_chicken_arrabbiata",
    "name": "Chicken Arrabbiata Pasta",
    "category": "indochinese",
    "price": 389,
    "isVeg": false,
    "desc": "Grilled chicken slices & penne tossed in fiery Italian arrabbiata tomato sauce.",
    "image": "images/dishes/p_chicken_arrabbiata.jpg"
  },
  {
    "id": "p_chicken_alfredo",
    "name": "Chicken Alfredo Pasta",
    "category": "indochinese",
    "price": 399,
    "isVeg": false,
    "desc": "Rich butter-cream alfredo penne tossed with juicy grilled herb chicken strips.",
    "image": "images/dishes/p_chicken_alfredo.jpg"
  },
  {
    "id": "v_chilli_mushroom",
    "name": "Chilli Mushroom",
    "category": "indochinese",
    "price": 399,
    "isVeg": true,
    "desc": "Button mushrooms batter-fried and tossed in dark soya, capsicum & chilies.",
    "image": "images/dishes/v_chilli_mushroom.jpg"
  },
  {
    "id": "v_chilli_paneer",
    "name": "Chilli Paneer",
    "category": "indochinese",
    "price": 399,
    "isVeg": true,
    "desc": "Crisp cottage cheese cubes stir-fried with diced bell peppers, scallions & chilli sauce.",
    "image": "images/dishes/v_chilli_paneer.jpg"
  },
  {
    "id": "nv_chilli_chicken",
    "name": "Chilli Chicken (Dry)",
    "category": "indochinese",
    "price": 391,
    "isVeg": false,
    "desc": "Classic Kolkata-style chicken cubes stir-fried with garlic, ginger, and green chillies.",
    "image": "images/dishes/nv_chilli_chicken.jpg"
  },
  {
    "id": "mc_steamed_rice",
    "name": "Steamed Rice",
    "category": "mains",
    "price": 231,
    "isVeg": true,
    "desc": "Fluffy steamed long-grain aromatic Dehraduni basmati rice.",
    "image": "images/dishes/mc_steamed_rice.jpg"
  },
  {
    "id": "mc_dal_tadka",
    "name": "Yellow Dal Tadka",
    "category": "mains",
    "price": 319,
    "isVeg": true,
    "desc": "Arhar dal tempered with desi ghee, cumin seeds, garlic, dried red chilies.",
    "image": "images/dishes/mc_dal_tadka.jpg"
  },
  {
    "id": "mc_veg_biryani",
    "name": "Veg Biryani",
    "category": "mains",
    "price": 319,
    "isVeg": true,
    "desc": "Fragrant basmati layered with seasonal veggies & aromatic spices, served with raita.",
    "image": "images/dishes/mc_veg_biryani.jpg"
  },
  {
    "id": "mc_egg_curry",
    "name": "Egg Curry (4 Pcs)",
    "category": "mains",
    "price": 369,
    "isVeg": false,
    "desc": "Four shallow-fried hard-boiled eggs simmered in homestyle spiced onion-tomato curry.",
    "image": "images/dishes/mc_egg_curry.jpg"
  },
  {
    "id": "mc_dal_makhani",
    "name": "Dal Makhani",
    "category": "mains",
    "price": 379,
    "isVeg": true,
    "desc": "Slow-cooked whole black urad lentils simmered overnight with cream & white butter.",
    "image": "images/dishes/mc_dal_makhani.jpg"
  },
  {
    "id": "mc_paneer_butter",
    "name": "Paneer Butter Masala",
    "category": "mains",
    "price": 399,
    "isVeg": true,
    "desc": "Fresh cottage cheese cubes in rich velvety tomato-butter makhani gravy.",
    "image": "images/dishes/mc_paneer_butter.jpg"
  },
  {
    "id": "mc_kadai_paneer",
    "name": "Kadai Paneer",
    "category": "mains",
    "price": 399,
    "isVeg": true,
    "desc": "Cottage cheese tossed with bell peppers and freshly ground kadai spices.",
    "image": "images/dishes/mc_paneer_butter.jpg"
  },
  {
    "id": "mc_chicken_biryani",
    "name": "Chicken Biryani",
    "category": "mains",
    "price": 449,
    "isVeg": false,
    "desc": "Traditional chicken dum biryani with saffron basmati rice.",
    "image": "images/dishes/mc_chicken_biryani.jpg"
  },
  {
    "id": "mc_chicken_curry",
    "name": "Chicken Curry",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Homestyle dhaba chicken cooked in rich onion-tomato gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg"
  },
  {
    "id": "mc_chicken_rara",
    "name": "Chicken Rara",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Succulent chicken pieces simmered in spicy minced keema gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg"
  },
  {
    "id": "mc_chicken_jalfrezi",
    "name": "Chicken Jalfrezi",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Tender chicken stir-fried with capsicum, onions & tangy spiced gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg"
  },
  {
    "id": "mc_butter_chicken",
    "name": "Butter Chicken",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Classic tandoori chicken simmered in rich creamy butter-tomato gravy.",
    "image": "images/dishes/mc_butter_chicken.jpg"
  },
  {
    "id": "mc_kadhai_chicken",
    "name": "Kadhai Chicken",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Spicy chicken cooked in iron wok with bell peppers and roasted coriander.",
    "image": "images/dishes/mc_butter_chicken.jpg"
  },
  {
    "id": "b_rumali_roti",
    "name": "Rumali Roti (Plain)",
    "category": "breads",
    "price": 49,
    "isVeg": true,
    "desc": "Ultra-thin, soft handkerchief bread cooked over inverted tawa.",
    "image": "images/dishes/b_plain_naan.jpg"
  },
  {
    "id": "b_tandoori_roti",
    "name": "Tandoori Roti (Plain)",
    "category": "breads",
    "price": 29,
    "isVeg": true,
    "desc": "Traditional clay-oven whole wheat flatbread.",
    "image": "images/dishes/b_tandoori_roti.jpg"
  },
  {
    "id": "b_butter_roti",
    "name": "Butter Roti",
    "category": "breads",
    "price": 39,
    "isVeg": true,
    "desc": "Whole wheat tandoori roti brushed with creamy butter.",
    "image": "images/dishes/b_butter_roti.jpg"
  },
  {
    "id": "b_plain_naan",
    "name": "Plain Naan",
    "category": "breads",
    "price": 49,
    "isVeg": true,
    "desc": "Refined flour leavened bread baked inside tandoor.",
    "image": "images/dishes/b_plain_naan.jpg"
  },
  {
    "id": "b_butter_naan",
    "name": "Butter Naan",
    "category": "breads",
    "price": 69,
    "isVeg": true,
    "desc": "Soft, pillowy naan generously brushed with pure butter.",
    "image": "images/dishes/b_butter_naan.jpg"
  },
  {
    "id": "b_laccha_parantha",
    "name": "Laccha Parantha",
    "category": "breads",
    "price": 69,
    "isVeg": true,
    "desc": "Flaky, multi-layered tandoori parantha with butter.",
    "image": "images/dishes/b_laccha_parantha.jpg"
  },
  {
    "id": "b_garlic_naan",
    "name": "Garlic Naan",
    "category": "breads",
    "price": 95,
    "isVeg": true,
    "desc": "Naan topped with minced roasted garlic and fresh coriander.",
    "image": "images/dishes/b_garlic_naan.jpg"
  },
  {
    "id": "s_onion_salad",
    "name": "Onion Salad",
    "category": "desserts_salads",
    "price": 49,
    "isVeg": true,
    "desc": "Fresh sliced onion rings with lemon wedge & green chili.",
    "image": "images/dishes/s_onion_salad.jpg"
  },
  {
    "id": "s_masala_onion",
    "name": "Masala Onion",
    "category": "desserts_salads",
    "price": 59,
    "isVeg": true,
    "desc": "Sliced onion rings tossed in tangy chaat masala & lemon juice.",
    "image": "images/dishes/s_masala_onion.jpg"
  },
  {
    "id": "d_gulab_jamun",
    "name": "Gulab Jamun",
    "category": "desserts_salads",
    "price": 150,
    "isVeg": true,
    "desc": "Two warm fried khoya dumplings soaked in rose cardamom sugar syrup.",
    "image": "images/dishes/d_gulab_jamun.jpg"
  },
  {
    "id": "s_raita",
    "name": "Raita (Cumin Seasoned)",
    "category": "desserts_salads",
    "price": 169,
    "isVeg": true,
    "desc": "Chilled fresh yogurt with boondi and roasted jeera powder.",
    "image": "images/dishes/s_raita.jpg"
  },
  {
    "id": "s_green_salad",
    "name": "Green Salad",
    "category": "desserts_salads",
    "price": 189,
    "isVeg": true,
    "desc": "Fresh cucumber, carrots, tomatoes and beetroot slices with lemon.",
    "image": "images/dishes/s_green_salad.jpg"
  },
  {
    "id": "d_brownie",
    "name": "Brownie with Ice Cream",
    "category": "desserts_salads",
    "price": 249,
    "isVeg": true,
    "desc": "Warm gooey chocolate brownie served with a scoop of vanilla ice cream.",
    "image": "images/dishes/d_brownie.jpg"
  },
  {
    "id": "d_lava_cake",
    "name": "Choco Lava Cake",
    "category": "desserts_salads",
    "price": 249,
    "isVeg": true,
    "desc": "Molten chocolate cake with rich oozing center.",
    "image": "images/dishes/d_brownie.jpg"
  },
  {
    "id": "x_smoke_reg",
    "name": "Smoke (Regular)",
    "category": "smoke",
    "price": 20,
    "isVeg": true,
    "desc": "Regular single stick.",
    "image": "images/dishes/x_smoke_reg.jpg"
  },
  {
    "id": "x_smoke_med",
    "name": "Smoke (Medium)",
    "category": "smoke",
    "price": 25,
    "isVeg": true,
    "desc": "Medium single stick.",
    "image": "images/dishes/x_smoke_med.jpg"
  },
  {
    "id": "x_smoke_large",
    "name": "Smoke (Large)",
    "category": "smoke",
    "price": 30,
    "isVeg": true,
    "desc": "Large single stick.",
    "image": "images/dishes/x_smoke_large.jpg"
  }
];
