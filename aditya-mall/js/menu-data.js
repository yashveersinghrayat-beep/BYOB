// ==============================================================================
// 💎 ONYX COMMERCIAL RESTAURANT POS — OFFICIAL MENU & TABLE LAYOUT
// Branch: Aditya Mall (Indirapuram)
// 100% Exact Match with Official Menu Cards with Smart Portion Support
// ==============================================================================

const CATEGORIES = [
  {
    "id": "top_hits",
    "name": "Top Hits",
    "icon": "⭐"
  },
  {
    "id": "all",
    "name": "All Items",
    "icon": "📋"
  },
  {
    "id": "mixers",
    "name": "Mixers & Beverages",
    "icon": "🍾"
  },
  {
    "id": "chakna",
    "name": "Veg Starters & Bar Bites",
    "icon": "🥜"
  },
  {
    "id": "nonveg_starters",
    "name": "Non-Veg Starters",
    "icon": "🍗"
  },
  {
    "id": "indochinese",
    "name": "Indo-Chinese & Pasta",
    "icon": "🍝"
  },
  {
    "id": "mains",
    "name": "Main Course",
    "icon": "🍛"
  },
  {
    "id": "breads",
    "name": "Breads",
    "icon": "🫓"
  },
  {
    "id": "desserts_salads",
    "name": "Desserts & Salads",
    "icon": "🍨"
  },
  {
    "id": "smoke",
    "name": "Smoke",
    "icon": "🚬"
  }
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
  {
    "id": "m_ice",
    "name": "Ice Bucket",
    "price": 69,
    "icon": "🧊"
  },
  {
    "id": "m_soda",
    "name": "Soda",
    "price": 49,
    "icon": "🍾"
  },
  {
    "id": "m_glass",
    "name": "Glass",
    "price": 10,
    "icon": "🥛"
  },
  {
    "id": "m_water",
    "name": "Water (1L)",
    "price": 40,
    "icon": "💧"
  },
  {
    "id": "m_soft_can",
    "name": "Cold Drink",
    "price": 99,
    "icon": "🥤"
  },
  {
    "id": "m_redbull",
    "name": "Red Bull",
    "price": 220,
    "icon": "⚡"
  },
  {
    "id": "m_lime",
    "name": "Fresh Lime",
    "price": 120,
    "icon": "🍋"
  }
];

// Backward-compatible alias map for split legacy item IDs
const MENU_ITEM_ALIASES = {
  "nv_tandoori_chicken_half": {
    "targetId": "nv_tandoori_chicken",
    "portionKey": "half",
    "label": "Half",
    "price": 399
  },
  "nv_tandoori_chicken_full": {
    "targetId": "nv_tandoori_chicken",
    "portionKey": "full",
    "label": "Full",
    "price": 679
  },
  "nv_chilli_mutton_half": {
    "targetId": "nv_chilli_mutton",
    "portionKey": "half",
    "label": "Half",
    "price": 399
  },
  "nv_chilli_mutton_full": {
    "targetId": "nv_chilli_mutton",
    "portionKey": "full",
    "label": "Full",
    "price": 499
  }
};

// ================= RESTAURANT ROOM LAYOUT (33 TABLES - ADITYA MALL) =================
const RESTAURANT_TABLES = [
  {
    "id": "T-01",
    "name": "Table 1",
    "floor": "1st Floor",
    "row": "Front Area",
    "position": "1st Floor • Front #1",
    "landmark": "Near 1st Floor Entrance",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-02",
    "name": "Table 2",
    "floor": "1st Floor",
    "row": "Front Area",
    "position": "1st Floor • Front #2",
    "landmark": "Front Center Window",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-03",
    "name": "Table 3",
    "floor": "1st Floor",
    "row": "Front Area",
    "position": "1st Floor • Front #3",
    "landmark": "Beside Wall Sofas",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-04",
    "name": "Table 4",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #4",
    "landmark": "Center Hall Left Column",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-05",
    "name": "Table 5",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #5",
    "landmark": "Center Main Pathway",
    "seats": 8,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-06",
    "name": "Table 6",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #6",
    "landmark": "Central Hall Right Column",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-07",
    "name": "Table 7",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #7",
    "landmark": "Near Pillar Left",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-08",
    "name": "Table 8",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #8",
    "landmark": "Center Pathway South",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-09",
    "name": "Table 9",
    "floor": "1st Floor",
    "row": "Middle Area",
    "position": "1st Floor • Middle #9",
    "landmark": "Beside Wall Woodwork",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-10",
    "name": "Table 10",
    "floor": "1st Floor",
    "row": "Back Area",
    "position": "1st Floor • Back #10",
    "landmark": "Near Service Station",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-11",
    "name": "Table 11",
    "floor": "1st Floor",
    "row": "Back Area",
    "position": "1st Floor • Back #11",
    "landmark": "Front of Bar Counter",
    "seats": 8,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-12",
    "name": "Table 12",
    "floor": "1st Floor",
    "row": "Back Area",
    "position": "1st Floor • Back #12",
    "landmark": "Adjacent to Mixer Station",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-13",
    "name": "Table 13",
    "floor": "1st Floor",
    "row": "Corner Lounge",
    "position": "1st Floor • Corner #13",
    "landmark": "Corner Lounge Left",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-14",
    "name": "Table 14",
    "floor": "1st Floor",
    "row": "Corner Lounge",
    "position": "1st Floor • Corner #14",
    "landmark": "Corner Lounge Right",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-15",
    "name": "Table 15",
    "floor": "1st Floor",
    "row": "VIP Section",
    "position": "1st Floor • VIP #15",
    "landmark": "VIP Family Section",
    "seats": 8,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-16",
    "name": "Table 16",
    "floor": "2nd Floor",
    "row": "Front Landing",
    "position": "2nd Floor • Front #16",
    "landmark": "Staircase Landing Area",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-17",
    "name": "Table 17",
    "floor": "2nd Floor",
    "row": "Front Landing",
    "position": "2nd Floor • Front #17",
    "landmark": "Opposite Service Counter",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-18",
    "name": "Table 18",
    "floor": "2nd Floor",
    "row": "Central Dining",
    "position": "2nd Floor • Center #18",
    "landmark": "Central Dining Area",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-19",
    "name": "Table 19",
    "floor": "2nd Floor",
    "row": "Central Dining",
    "position": "2nd Floor • Center #19",
    "landmark": "Beside Glass Partition",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-20",
    "name": "Table 20",
    "floor": "2nd Floor",
    "row": "Central Dining",
    "position": "2nd Floor • Center #20",
    "landmark": "Central Hall Pathway",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-21",
    "name": "Table 21",
    "floor": "2nd Floor",
    "row": "Atrium View",
    "position": "2nd Floor • Window #21",
    "landmark": "Mall Atrium View Window",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-22",
    "name": "Table 22",
    "floor": "2nd Floor",
    "row": "Atrium View",
    "position": "2nd Floor • Window #22",
    "landmark": "Mall Atrium View Corner",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-23",
    "name": "Table 23",
    "floor": "2nd Floor",
    "row": "Inner Lounge",
    "position": "2nd Floor • Inner #23",
    "landmark": "Inner Lounge Section",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-24",
    "name": "Table 24",
    "floor": "2nd Floor",
    "row": "Inner Lounge",
    "position": "2nd Floor • Inner #24",
    "landmark": "Inner Dining Booth",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-25",
    "name": "Table 25",
    "floor": "2nd Floor",
    "row": "VIP Dining",
    "position": "2nd Floor • VIP #25",
    "landmark": "2nd Floor Family Dining",
    "seats": 8,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-26",
    "name": "Table 26",
    "floor": "Rooftop",
    "row": "Terrace Open",
    "position": "Rooftop • Terrace #26",
    "landmark": "Rooftop Entrance Canopy",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-27",
    "name": "Table 27",
    "floor": "Rooftop",
    "row": "Terrace Open",
    "position": "Rooftop • Terrace #27",
    "landmark": "Open Sky Seating East",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-28",
    "name": "Table 28",
    "floor": "Rooftop",
    "row": "Center Island",
    "position": "Rooftop • Center #28",
    "landmark": "Rooftop Center Island",
    "seats": 8,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-29",
    "name": "Table 29",
    "floor": "Rooftop",
    "row": "Center Island",
    "position": "Rooftop • Center #29",
    "landmark": "Beside Gazebo Canopy",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-30",
    "name": "Table 30",
    "floor": "Rooftop",
    "row": "Skyline Railing",
    "position": "Rooftop • Railing #30",
    "landmark": "Skyline City View Railing 1",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-31",
    "name": "Table 31",
    "floor": "Rooftop",
    "row": "Skyline Railing",
    "position": "Rooftop • Railing #31",
    "landmark": "Skyline City View Railing 2",
    "seats": 4,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-32",
    "name": "Table 32",
    "floor": "Rooftop",
    "row": "Cabana Booth",
    "position": "Rooftop • Lounge #32",
    "landmark": "Rooftop Cabana Booth",
    "seats": 6,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  },
  {
    "id": "T-33",
    "name": "Table 33",
    "floor": "Rooftop",
    "row": "VIP Sky Deck",
    "position": "Rooftop • VIP #33",
    "landmark": "Rooftop VIP Sky Deck",
    "seats": 10,
    "status": "vacant",
    "activeBill": 0,
    "time": ""
  }
];

// ================= COMPLETE OFFICIAL MENU ITEMS (WITH SMART PORTIONS) =================
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
    "image": "images/dishes/v_soya_malai.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
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
    "image": "images/dishes/v_paneer_tikka.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
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
    "image": "images/dishes/nv_chicken_shami.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "nv_chicken_seekh",
    "name": "Chicken Seekh Kebab",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Minced chicken seasoned with fresh herbs, skewered & charcoal-grilled in tandoor.",
    "image": "images/dishes/nv_chicken_seekh.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "nv_chicken_boti",
    "name": "Chicken Boti Kabab",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Tender boneless chicken boti marinated in spiced curd and charcoal grilled.",
    "image": "images/dishes/nv_chicken_tikka.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "nv_chicken_tikka",
    "name": "Chicken Tikka",
    "category": "nonveg_starters",
    "price": 399,
    "isVeg": false,
    "desc": "Succulent boneless chicken thigh chunks steeped in tandoori masala & roasted.",
    "image": "images/dishes/nv_chicken_tikka.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "nv_chicken_malai",
    "name": "Chicken Malai (Dry)",
    "category": "nonveg_starters",
    "price": 391,
    "isVeg": false,
    "desc": "Creamy boneless chicken kebab marinated with cream, cheese, white pepper.",
    "image": "images/dishes/nv_chicken_malai.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 391
      }
    ]
  },
  {
    "id": "nv_chicken_lollipop",
    "name": "Chicken Lollipop",
    "category": "nonveg_starters",
    "price": 499,
    "isVeg": false,
    "desc": "Frenched chicken winglets tossed in tangy Schezwan sauce.",
    "image": "images/dishes/nv_chicken_lollipop.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 329
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 499
      }
    ]
  },
  {
    "id": "nv_amritsari_fish",
    "name": "Amritsari Fish Fry",
    "category": "nonveg_starters",
    "price": 449,
    "isVeg": false,
    "desc": "Fresh river sole fish fillets coated in carom-infused besan batter and fried crisp.",
    "image": "images/dishes/nv_amritsari_fish.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 299
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 449
      }
    ]
  },
  {
    "id": "nv_fish_tikka",
    "name": "Fish Tikka",
    "category": "nonveg_starters",
    "price": 449,
    "isVeg": false,
    "desc": "Boneless fish cubes marinated in yellow mustard, yogurt and char-grilled.",
    "image": "images/dishes/nv_fish_tikka.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 299
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 449
      }
    ]
  },
  {
    "id": "nv_chilli_mutton",
    "name": "Chilli Mutton",
    "category": "nonveg_starters",
    "price": 499,
    "isVeg": false,
    "desc": "Tender boneless mutton cubes tossed with capsicum, onions & spicy oriental chillies.",
    "image": "images/dishes/nv_mutton_seekh.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 499
      }
    ]
  },
  {
    "id": "nv_tandoori_chicken",
    "name": "Tandoori Chicken",
    "category": "nonveg_starters",
    "price": 679,
    "isVeg": false,
    "desc": "Traditional bone-in chicken marinated in hung curd, Kashmiri deghi mirch & spices, slow-roasted in clay tandoor.",
    "image": "images/dishes/nv_tandoori_chicken_half.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 249
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 679
      }
    ]
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
    "image": "images/dishes/v_manchurian.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 259
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 389
      }
    ]
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
    "image": "images/dishes/v_chilli_mushroom.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "v_chilli_paneer",
    "name": "Chilli Paneer",
    "category": "indochinese",
    "price": 399,
    "isVeg": true,
    "desc": "Crisp cottage cheese cubes stir-fried with diced bell peppers, scallions & chilli sauce.",
    "image": "images/dishes/v_chilli_paneer.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "nv_chilli_chicken",
    "name": "Chilli Chicken (Dry)",
    "category": "indochinese",
    "price": 391,
    "isVeg": false,
    "desc": "Classic Kolkata-style chicken cubes stir-fried with garlic, ginger, and green chillies.",
    "image": "images/dishes/nv_chilli_chicken.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 391
      }
    ]
  },
  {
    "id": "mc_steamed_rice",
    "name": "Steamed Rice",
    "category": "mains",
    "price": 231,
    "isVeg": true,
    "desc": "Fluffy steamed long-grain aromatic Dehraduni basmati rice.",
    "image": "images/dishes/mc_steamed_rice.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 149
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 231
      }
    ]
  },
  {
    "id": "mc_dal_tadka",
    "name": "Yellow Dal Tadka",
    "category": "mains",
    "price": 319,
    "isVeg": true,
    "desc": "Arhar dal tempered with desi ghee, cumin seeds, garlic, dried red chilies.",
    "image": "images/dishes/mc_dal_tadka.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 209
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 319
      }
    ]
  },
  {
    "id": "mc_veg_biryani",
    "name": "Veg Biryani",
    "category": "mains",
    "price": 319,
    "isVeg": true,
    "desc": "Fragrant basmati layered with seasonal veggies & aromatic spices, served with raita.",
    "image": "images/dishes/mc_veg_biryani.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 219
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 319
      }
    ]
  },
  {
    "id": "mc_egg_curry",
    "name": "Egg Curry (4 Pcs)",
    "category": "mains",
    "price": 369,
    "isVeg": false,
    "desc": "Four shallow-fried hard-boiled eggs simmered in homestyle spiced onion-tomato curry.",
    "image": "images/dishes/mc_egg_curry.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half (2 Pcs)",
        "short": "Half",
        "price": 219
      },
      {
        "key": "full",
        "label": "Full (4 Pcs)",
        "short": "Full",
        "price": 369
      }
    ]
  },
  {
    "id": "mc_dal_makhani",
    "name": "Dal Makhani",
    "category": "mains",
    "price": 379,
    "isVeg": true,
    "desc": "Slow-cooked whole black urad lentils simmered overnight with cream & white butter.",
    "image": "images/dishes/mc_dal_makhani.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 249
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 379
      }
    ]
  },
  {
    "id": "mc_paneer_butter",
    "name": "Paneer Butter Masala",
    "category": "mains",
    "price": 399,
    "isVeg": true,
    "desc": "Fresh cottage cheese cubes in rich velvety tomato-butter makhani gravy.",
    "image": "images/dishes/mc_paneer_butter.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "mc_kadai_paneer",
    "name": "Kadai Paneer",
    "category": "mains",
    "price": 399,
    "isVeg": true,
    "desc": "Cottage cheese tossed with bell peppers and freshly ground kadai spices.",
    "image": "images/dishes/mc_paneer_butter.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 269
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 399
      }
    ]
  },
  {
    "id": "mc_chicken_biryani",
    "name": "Chicken Biryani",
    "category": "mains",
    "price": 449,
    "isVeg": false,
    "desc": "Traditional chicken dum biryani with saffron basmati rice.",
    "image": "images/dishes/mc_chicken_biryani.jpg",
    "portions": [
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 289
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 449
      }
    ]
  },
  {
    "id": "mc_chicken_curry",
    "name": "Chicken Curry",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Homestyle dhaba chicken cooked in rich onion-tomato gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 279
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 489
      }
    ]
  },
  {
    "id": "mc_chicken_rara",
    "name": "Chicken Rara",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Succulent chicken pieces simmered in spicy minced keema gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 279
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 489
      }
    ]
  },
  {
    "id": "mc_chicken_jalfrezi",
    "name": "Chicken Jalfrezi",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Tender chicken stir-fried with capsicum, onions & tangy spiced gravy.",
    "image": "images/dishes/mc_chicken_curry.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 279
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 489
      }
    ]
  },
  {
    "id": "mc_butter_chicken",
    "name": "Butter Chicken",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Classic tandoori chicken simmered in rich creamy butter-tomato gravy.",
    "image": "images/dishes/mc_butter_chicken.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 279
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 489
      }
    ]
  },
  {
    "id": "mc_kadhai_chicken",
    "name": "Kadhai Chicken",
    "category": "mains",
    "price": 489,
    "isVeg": false,
    "desc": "Spicy chicken cooked in iron wok with bell peppers and roasted coriander.",
    "image": "images/dishes/mc_butter_chicken.jpg",
    "portions": [
      {
        "key": "quarter",
        "label": "Quarter",
        "short": "Qtr",
        "price": 279
      },
      {
        "key": "half",
        "label": "Half",
        "short": "Half",
        "price": 399
      },
      {
        "key": "full",
        "label": "Full",
        "short": "Full",
        "price": 489
      }
    ]
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CATEGORIES, TOP_HITS_IDS, QUICK_BAR, MENU_ITEM_ALIASES, RESTAURANT_TABLES, MENU_ITEMS };
}
