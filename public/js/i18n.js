// ==============================================================================
// 🌐 ONYX COMMERCIAL POS — OFFICIAL BILINGUAL ENGINE (ENGLISH / हिंदी)
// Comprehensive Professional Devanagari Translation Engine
// ==============================================================================

const I18N = {
  currentLang: (typeof localStorage !== 'undefined' ? localStorage.getItem('onyx_lang') : null) || 'en',

  // UI Strings Dictionary
  strings: {
    en: {
      // Header & Navigation
      waiterTerminal: "📱 Waiter Terminal",
      cashierCounter: "🖥️ Cashier Counter",
      operationsConsole: "👑 Operations Console",
      mgrConsoleTitle: "ONYX OPERATIONS CONSOLE",
      mgrConsoleSubtitle: "Hospitality Management • Revenue Audit & Multi-Floor Governance",
      mgrBadge: "EXECUTIVE",
      serverOk: "Server: OK",
      dbLive: "DB: Live",
      kiosk: "Kiosk",
      installApp: "Install App",
      phoneQr: "Phone QR",
      manager: "Manager",
      floorMap: "Floor Tables",
      changeTable: "Change Table",

      // Floor & Table Selection
      floorTables: "Floor Tables",
      tablesCountSuffix: "Tables",
      free: "Free",
      occupied: "Occupied",
      selected: "Selected",
      allFloors: "All (42)",
      groundFloor: "Ground Floor (18)",
      firstFloor: "1st Floor (7)",
      secondFloor: "2nd Floor (17)",
      touchTableNotice: "⚡ Touch any table to take order",
      oneTapWorkflow: "1-Tap Workflow",
      seats: "Seats",
      available: "Available",
      ready: "Ready",

      // Menu & Item Selection
      searchPlaceholder: "Search dishes & drinks (e.g. 'naan', 'tikka', 'ice')...",
      dietAll: "All",
      dietVeg: "🟢 Veg",
      dietNonveg: "🔴 Non",
      runningBillHeader: "🧾 Running:",
      itemsCountSuffix: "Items",
      itemCountSingular: "Item",
      roundNotSent: "Current round items",
      confirmOrderBtn: "Confirm Order →",
      reviewOrderBtn: "Review Order →",
      addBtn: "+ ADD",
      pending: "Pending",

      // Order Summary / Review Screen
      orderSummaryTitle: "Order Summary",
      orderSummaryStep: "STEP 3: ORDER SUMMARY",
      backToMenu: "Back to Menu",
      orderItemsHeading: "📋 Order Items",
      orderSubtotal: "Order Subtotal:",
      specialInstructionsHeading: "📝 Special Instructions / Notes",
      lessSpicy: "🌶️ Less Spicy",
      extraSpicy: "🌶️🌶️ Extra Spicy",
      lessOil: "🍃 Less Oil",
      jainNote: "🧄 Jain (No Onion/Garlic)",
      startersFirst: "🕒 Starters First",
      extraIce: "🧊 Extra Ice",
      customNotesPlaceholder: "Custom instructions (e.g. deliver drinks before food, extra glasses)...",
      confirmSaveOrderBtn: "✅ CONFIRM & SAVE ORDER",

      // Running Bill Screen
      runningBillTitle: "Running Bill",
      backToTables: "Floor Tables",
      placedOrderDetailsHeading: "📋 Placed Order Details",
      noOrdersPlaced: "No orders placed on this table yet. Tap 'Add More Food / Drinks' to take order.",
      paymentSummaryHeading: "🧾 Payment Summary",
      itemsSubtotalLabel: "Items Subtotal:",
      gstLabel: "GST (5%):",
      roundOffLabel: "Round Off:",
      grandTotalLabel: "Grand Total:",
      addMoreFoodBtn: "➕ Add More Food / Drinks",
      printBillBtn: "🖨️ Print Bill",
      settlePaymentBtn: "💳 Settle Payment (Cash / UPI) →",

      // Occupied Table Action Sheet
      takeOrderOption: "➕ Take Order / Add Items →",
      viewBillOption: "🧾 View Running Bill & Settlement →",
      cancel: "Cancel",

      // Web Cashier POS Labels
      activeTable: "Active Table",
      tableStatus: "Status",
      placedOrdersList: "Placed Orders",
      newRoundCart: "New Round / Items",
      saveOrderWeb: "Save Order",
      printReceiptWeb: "Print Receipt",
      settleCashWeb: "💵 Cash Settle",
      settleUpiWeb: "📱 UPI QR Settle",
      customerName: "Customer Name",
      customerPhone: "Customer Phone",
      applyDiscount: "Discount",
      splitBill: "Split Bill",
      lastOrders: "Last Orders",
      voidAlert: "0 Voids",

      // Feedback Toasts
      orderSavedToast: "Order saved for",
      tableSelectedToast: "Selected",
      itemAddedToast: "added to",
      cartEmptyWarning: "Cart is empty. Please add dishes from menu first!",

      // Post-Print Settle Prompt
      billPrintedBadge: "BILLED",
      billPrintedStatus: "Bill Printed",
      awaitingPayment: "Awaiting Payment",
      billPrintedModalTitle: "🖨️ Bill Printed • Settle Table?",
      billPrintedModalSubtitle: "Has the customer paid? Settle and free table now:",
      postPrintCashBtn: "💵 Cash Received • Settle & Free Table",
      postPrintUpiBtn: "📱 UPI / QR Received • Settle & Free Table",
      postPrintCardBtn: "💳 Card / EDC Machine Settled",
      postPrintLaterBtn: "⏳ Not Yet (Bill Given, Awaiting Payment)",
      postPrintLaterHint: "Table will show as '🧾 BILLED' on Floor Map until payment is settled.",
      postPrintLaterToast: "🧾 Table marked 'Bill Given'. Don't forget to settle when payment arrives!",
      postPrintViewBillBtn: "➕ View Bill / Add Items",

      // Waiter Flow & Customer Payment Proof
      waiterBillPreview: "🧾 View Bill",
      waiterCollectPaymentProof: "📱 Show Payment QR & Collect Proof →",
      viewRunningBillOnly: "🧾 View Running Bill →",
      paymentProofDesk: "📱 WAITER PAYMENT DESK",
      collectUpiPaymentTitle: "Collect UPI Payment",
      paymentProofInstruction: "Show QR to customer & take photo of their phone screen after payment",
      takeProofPhoto: "📸 Take Photo of Customer's Phone",
      retakePhoto: "🔄 Retake Photo",
      submitProof: "✅ Submit Proof to Manager",
      proofAttachedBadge: "✅ Proof Attached",
      lockNotice: "🔒 Only Manager can settle bills. Once photo is submitted, show table to Manager.",
      proofViewerTitle: "Customer Payment Proof",
      verifiedSettleBtn: "✅ Verified • Proceed to Settle Table →",
      onlyManagerSettleAlert: "🔒 Access Restricted: Only Manager can settle bills. Please show payment proof to Manager at Counter.",
      proofSubmittedStatus: "🧾 BILLED (Proof Attached 📸)",
      proofSubmittedToast: "Payment proof saved! Please show to Manager at Counter."
    },

    hi: {
      // Header & Navigation
      waiterTerminal: "📱 वेटर टर्मिनल",
      cashierCounter: "🖥️ कैशियर काउंटर",
      operationsConsole: "👑 ऑपरेशंस कंसोल",
      mgrConsoleTitle: "ओनिक्स ऑपरेशंस कंसोल",
      mgrConsoleSubtitle: "हॉस्पिटैलिटी प्रबंधन • रेवेन्यू ऑडिट एवं बहु-मंज़िल प्रशासन",
      mgrBadge: "कार्यकारी",
      serverOk: "सर्वर: ठीक है",
      dbLive: "डेटाबेस: सक्रिय",
      kiosk: "कियोस्क",
      installApp: "ऐप इंस्टॉल करें",
      phoneQr: "फोन क्यूआर",
      manager: "मैनेजर",
      floorMap: "टेबल फ्लोर",
      changeTable: "टेबल बदलें",

      // Floor & Table Selection
      floorTables: "फ्लोर टेबल्स",
      tablesCountSuffix: "टेबल",
      free: "खाली",
      occupied: "व्यस्त",
      selected: "चयनित",
      allFloors: "सभी (42)",
      groundFloor: "ग्राउंड फ्लोर (18)",
      firstFloor: "पहली मंजिल (7)",
      secondFloor: "दूसरी मंजिल (17)",
      touchTableNotice: "⚡ ऑर्डर लेने के लिए किसी भी टेबल पर टच करें",
      oneTapWorkflow: "1-टच वर्कफ्लो",
      seats: "सीटें",
      available: "उपलब्ध",
      ready: "तैयार",

      // Menu & Item Selection
      searchPlaceholder: "आइटम खोजें (जैसे 'नान', 'टिक्का', 'आइस')...",
      dietAll: "सभी",
      dietVeg: "🟢 वेज",
      dietNonveg: "🔴 नॉन-वेज",
      runningBillHeader: "🧾 रनिंग बिल:",
      itemsCountSuffix: "आइटम",
      itemCountSingular: "आइटम",
      roundNotSent: "वर्तमान ऑर्डर आइटम",
      confirmOrderBtn: "ऑर्डर सुरक्षित करें →",
      reviewOrderBtn: "ऑर्डर देखें →",
      addBtn: "+ जोड़ें",
      pending: "पेंडिंग",

      // Order Summary / Review Screen
      orderSummaryTitle: "ऑर्डर विवरण",
      orderSummaryStep: "स्टेप 3: ऑर्डर विवरण व पुष्टि",
      backToMenu: "मेन्यू पर वापस",
      orderItemsHeading: "📋 चुने गए ऑर्डर आइटम",
      orderSubtotal: "ऑर्डर उपकुल:",
      specialInstructionsHeading: "📝 विशेष निर्देश / टिप्पणियां",
      lessSpicy: "🌶️ कम तीखा",
      extraSpicy: "🌶️🌶️ ज्यादा तीखा",
      lessOil: "🍃 कम तेल",
      jainNote: "🧄 जैन (बिना प्याज/लहसुन)",
      startersFirst: "🕒 स्टार्टर पहले लाएं",
      extraIce: "🧊 ज्यादा बर्फ",
      customNotesPlaceholder: "अन्य निर्देश (जैसे ड्रिंक पहले लाएं, अतिरिक्त ग्लास, पार्सल)...",
      confirmSaveOrderBtn: "✅ ऑर्डर सुरक्षित करें (SAVE)",

      // Running Bill Screen
      runningBillTitle: "रनिंग बिल",
      backToTables: "फ्लोर टेबल्स",
      placedOrderDetailsHeading: "📋 दिए गए ऑर्डर का विवरण",
      noOrdersPlaced: "इस टेबल पर अभी कोई ऑर्डर नहीं दिया गया है। ऑर्डर लेने के लिए 'और आइटम जोड़ें' पर टैप करें।",
      paymentSummaryHeading: "🧾 भुगतान विवरण",
      itemsSubtotalLabel: "कुल आइटम मूल्य:",
      gstLabel: "जीएसटी (5%):",
      roundOffLabel: "राउंड ऑफ:",
      grandTotalLabel: "कुल राशि:",
      addMoreFoodBtn: "➕ और आइटम जोड़ें",
      printBillBtn: "🖨️ बिल प्रिंट करें",
      settlePaymentBtn: "💳 भुगतान पूरा करें (नकद / UPI) →",

      // Occupied Table Action Sheet
      takeOrderOption: "➕ नया ऑर्डर लें / आइटम जोड़ें →",
      viewBillOption: "🧾 रनिंग बिल व भुगतान देखें →",
      cancel: "रद्द करें",

      // Web Cashier POS Labels
      activeTable: "सक्रिय टेबल",
      tableStatus: "स्थिति",
      placedOrdersList: "दिए गए ऑर्डर",
      newRoundCart: "नया राउंड / आइटम",
      saveOrderWeb: "ऑर्डर सुरक्षित करें",
      printReceiptWeb: "रसीद प्रिंट करें",
      settleCashWeb: "💵 नकद भुगतान",
      settleUpiWeb: "📱 UPI भुगतान",
      customerName: "ग्राहक का नाम",
      customerPhone: "ग्राहक का फोन",
      applyDiscount: "छूट (डिस्काउंट)",
      splitBill: "बिल विभाजन",
      lastOrders: "पिछले ऑर्डर्स",
      voidAlert: "0 वॉयड",

      // Feedback Toasts
      orderSavedToast: "ऑर्डर सुरक्षित किया गया टेबल",
      tableSelectedToast: "चुना गया",
      itemAddedToast: "जोड़ा गया",
      cartEmptyWarning: "कार्ट खाली है। कृपया पहले मेन्यू से आइटम जोड़ें!",

      // Post-Print Settle Prompt
      billPrintedBadge: "बिल दिया",
      billPrintedStatus: "बिल दिया गया",
      awaitingPayment: "भुगतान बाकी है",
      billPrintedModalTitle: "🖨️ बिल प्रिंट हो गया • टेबल सेटल करें?",
      billPrintedModalSubtitle: "क्या ग्राहक ने बिल चुका दिया? टेबल को अभी सेटल और फ्री करना है?",
      postPrintCashBtn: "💵 कैश मिला • सेटल करके टेबल खाली करें",
      postPrintUpiBtn: "📱 UPI / QR पेमेंट मिली • सेटल करके टेबल खाली करें",
      postPrintCardBtn: "💳 कार्ड / EDC मशीन पेमेंट मिली",
      postPrintLaterBtn: "⏳ अभी नहीं (बिल दिया है, पेमेंट बाकी है)",
      postPrintLaterHint: "पेमेंट आने तक फ्लोर मैप पर टेबल '🧾 बिल दिया' दिखेगी।",
      postPrintLaterToast: "🧾 टेबल पर 'बिल दिया' मार्क हुआ। पेमेंट आते ही सेटल करना न भूलें!",
      postPrintViewBillBtn: "➕ बिल देखें / और ऑर्डर जोड़ें",

      // Waiter Flow & Customer Payment Proof
      waiterBillPreview: "🧾 बिल देखें",
      waiterCollectPaymentProof: "📱 भुगतान QR दिखाएं व प्रूफ लें →",
      viewRunningBillOnly: "🧾 चालू बिल देखें →",
      paymentProofDesk: "📱 वेटर पेमेंट डेस्क",
      collectUpiPaymentTitle: "UPI भुगतान व प्रूफ सत्यापन",
      paymentProofInstruction: "ग्राहक को QR दिखाएं व भुगतान के बाद उनके फोन स्क्रीन का फोटो लें",
      takeProofPhoto: "📸 ग्राहक के फोन का फोटो लें",
      retakePhoto: "🔄 दोबारा फोटो लें",
      submitProof: "✅ मैनेजर को प्रूफ भेजें",
      proofAttachedBadge: "✅ प्रूफ अटैच",
      lockNotice: "🔒 केवल मैनेजर ही बिल सेटल कर सकते हैं। फोटो लेने के बाद टेबल काउंटर पर मैनेजर को दिखाएं।",
      proofViewerTitle: "ग्राहक भुगतान प्रूफ",
      verifiedSettleBtn: "✅ सत्यापित • टेबल सेटल करें →",
      onlyManagerSettleAlert: "🔒 केवल मैनेजर ही बिल सेटल कर सकते हैं। कृपया काउंटर पर मैनेजर को पेमेंट प्रूफ दिखाएं।",
      proofSubmittedStatus: "🧾 बिल दिया (प्रूफ अटैच 📸)",
      proofSubmittedToast: "पेमेंट प्रूफ सेव हो गया! कृपया काउंटर पर मैनेजर को दिखाएं।"
    }
  },

  // Categories Translation
  categories: {
    en: {
      top_hits: "Top Hits",
      all: "All Items",
      mixers: "Mixers & Beverages",
      chakna: "Veg Starters & Bar Bites",
      nonveg_starters: "Non-Veg Starters",
      indochinese: "Indo-Chinese & Pasta",
      mains: "Main Course",
      breads: "Breads",
      desserts_salads: "Desserts & Salads",
      smoke: "Smoke"
    },
    hi: {
      top_hits: "टॉप हिट्स ⭐",
      all: "सभी आइटम 📋",
      mixers: "बेवरेज व मिक्सर 🍾",
      chakna: "वेज स्टार्टर्स 🥜",
      nonveg_starters: "नॉन-वेज स्टार्टर्स 🍗",
      indochinese: "इंडो-चाइनीज व पास्ता 🍝",
      mains: "मेन कोर्स 🍛",
      breads: "रोटियां व नान 🫓",
      desserts_salads: "डेजर्ट व सलाद 🍨",
      smoke: "स्मोक 🚬"
    }
  },

  // 100% Authentic Professional Dish Translations in Devanagari Script
  dishes: {
    // Breads
    b_butter_naan: "बटर नान",
    b_butter_roti: "बटर रोटी",
    b_garlic_naan: "गार्लिक नान",
    b_laccha_parantha: "लच्छा परांठा",
    b_plain_naan: "प्लेन नान",
    b_rumali_roti: "रुमाली रोटी",
    b_tandoori_roti: "तंदूरी रोटी",

    // Chakna & Veg Starters
    v_crispy_corn: "क्रिस्पी कॉर्न",
    v_dahi_kabab: "दही के कबाब",
    v_fries: "फ्रेंच फ्राइज",
    v_french_fries: "फ्रेंच फ्राइज (साल्टेड)",
    v_hara_bhara: "हरा भरा कबाब",
    v_kala_chana: "काला चना मसालेदार",
    v_masala_papad: "मसाला पापड़",
    v_onion_ring: "अनियन रिंग्स",
    v_paneer_tikka: "पनीर टिक्का",
    v_peanut_masala: "पीनट मसाला",
    v_peri_peri_french_fries: "पेरी पेरी फ्रेंच फ्राइज",
    v_peri_peri_fries: "पेरी पेरी फ्राइज",
    v_plain_papad: "प्लेन पापड़",
    v_cheese_balls: "पोटैटो चीज बॉल्स",
    v_potato_veggies: "पोटैटो वेजीज",
    v_saute_veg: "सॉते वेजिटेबल्स",
    v_soya_malai: "सोया मलाई टिक्का",
    v_veg_shami: "वेज शामी कबाब",

    // Desserts & Salads
    d_brownie: "ब्राउनी विथ आइसक्रीम",
    d_lava_cake: "चोको लावा केक",
    s_green_salad: "ग्रीन सलाद",
    d_gulab_jamun: "गुलाब जामुन",
    s_masala_onion: "मसाला प्याज",
    s_onion_salad: "प्याज सलाद",
    s_raita: "जीरा रायता",

    // Indo-Chinese & Pasta
    p_chicken_pasta: "चिकन अल्फ्रेडो पास्ता",
    p_chicken_alfredo: "चिकन अल्फ्रेडो पास्ता",
    p_chicken_arrabbiata: "चिकन अराबीयाता पास्ता",
    nv_chilli_chicken: "चिली चिकन (ड्राई)",
    v_chilli_mushroom: "चिली मशरूम",
    v_chilli_paneer: "चिली पनीर",
    v_chilli_potato: "चिली पोटैटो",
    v_honey_chilli_potato: "हनी चिली पोटैटो",
    p_veg_alfredo: "वेज अल्फ्रेडो पास्ता",
    p_veg_arrabbiata: "वेज अराबीयाता पास्ता",
    v_manchurian: "वेज मंचूरियन (ड्राई)",
    v_spring_roll: "वेज स्प्रिंग रोल",

    // Mains
    mc_butter_chicken: "बटर चिकन",
    mc_chicken_biryani: "चिकन बिरयानी",
    mc_chicken_curry: "चिकन करी",
    mc_chicken_jalfrezi: "चिकन जालफ्रेजी",
    mc_chicken_rara: "चिकन रारा",
    mc_dal_makhani: "दाल मखनी",
    mc_egg_curry: "अंडा करी (4 पीस)",
    mc_kadai_paneer: "कड़ाही पनीर",
    mc_kadhai_chicken: "कड़ाही चिकन",
    mc_paneer_butter: "पनीर बटर मसाला",
    mc_steamed_rice: "स्टीम्ड राइस",
    mc_veg_biryani: "वेज बिरयानी",
    mc_dal_tadka: "पीली दाल तड़का",

    // Mixers & Beverages
    m_diet_coke: "डाइट कोक (कैन)",
    m_campa: "कैम्पा कोला",
    m_redbull: "रेड बुल एनर्जी ड्रिंक",
    m_flav_soda: "फ्लेवर्ड सोडा",
    m_lime: "फ्रेश लाइम सोडा",
    m_glass: "ग्लास",
    m_ice: "आइस क्यूब बकेट",
    m_juice: "जूस पैक",
    m_icetea: "लेमन आइस्ड टी",
    m_water: "मिनरल वाटर (1 ली)",
    m_soda: "सोडा",
    m_soft_750: "कोल्ड ड्रिंक (750 मिली)",
    m_soft_can: "कोल्ड ड्रिंक (कैन)",
    m_tonic: "टॉनिक वाटर",
    m_mojito: "वर्जिन मोहीतो",

    // Non-Veg Starters
    nv_amritsari_fish: "अमृतसरी फिश फ्राई",
    nv_chicken_boti: "चिकन बोटी कबाब",
    nv_chicken_fries: "चिकन फ्राइज",
    nv_chicken_lollipop: "चिकन लॉलीपॉप",
    nv_chicken_malai: "चिकन मलाई टिक्का",
    nv_chicken_popcorn: "चिकन पॉपकॉर्न",
    nv_chicken_seekh: "चिकन सीक कबाब",
    nv_chicken_shami: "चिकन शामी कबाब",
    nv_chicken_tikka: "चिकन टिक्का",
    nv_chicken_wings: "चिकन विंग्स फ्राइड",
    nv_chilli_mutton_full: "चिली मटन (फुल)",
    nv_chilli_mutton_half: "चिली मटन (हाफ)",
    nv_egg_bhurji: "अंडा भुर्जी",
    nv_fish_tikka: "फिश टिक्का",
    nv_masala_omelette: "मसाला आमलेट",
    nv_mutton_seekh: "मटन सीक कबाब",
    nv_tandoori_chicken_full: "तंदूरी चिकन (फुल)",
    nv_tandoori_chicken: "तंदूरी चिकन (हाफ)",
    nv_tandoori_chicken_half: "तंदूरी चिकन (हाफ)",

    // Smoke
    x_smoke_large: "सिगरेट (लार्ज)",
    x_smoke_med: "सिगरेट (मीडियम)",
    x_smoke_reg: "सिगरेट (रेगुलर)"
  },

  // Helper Methods
  setLanguage(lang) {
    if (lang === 'hi' || lang === 'en') {
      this.currentLang = lang;
      try {
        localStorage.setItem('onyx_lang', lang);
      } catch (e) {}
    }
    return this.currentLang;
  },

  t(key, fallback = '') {
    const lang = this.currentLang || 'en';
    const dict = this.strings[lang] || this.strings.en;
    return dict[key] !== undefined ? dict[key] : (fallback || key);
  },

  getDishName(item) {
    if (!item) return '';
    if (this.currentLang !== 'hi') {
      return typeof item === 'object' ? (item.name || item.item_name || item.id || '') : item;
    }

    // 1. Direct ID lookup (prefer item_id, dish_id over database auto-increment numeric primary key)
    let candidateId = '';
    if (typeof item === 'string') {
      candidateId = item;
    } else if (typeof item === 'object') {
      if (item.item_id) candidateId = String(item.item_id);
      else if (item.dish_id) candidateId = String(item.dish_id);
      else if (item.id && typeof item.id === 'string' && isNaN(Number(item.id))) candidateId = String(item.id);
      else if (item.id) candidateId = String(item.id);
    }

    if (candidateId) {
      if (this.dishes[candidateId]) return this.dishes[candidateId];
      const lower = candidateId.toLowerCase();
      if (this.dishes[lower]) return this.dishes[lower];
    }

    // 2. Fallback: match by English dish name against dishes dictionary and MENU_ITEMS
    const name = String(typeof item === 'object' ? (item.name || item.item_name || '') : item).trim();
    if (name) {
      const lowerName = name.toLowerCase();
      const menuList = (typeof MENU_ITEMS !== 'undefined' && Array.isArray(MENU_ITEMS))
        ? MENU_ITEMS
        : ((typeof window !== 'undefined' && window.MENU_ITEMS && Array.isArray(window.MENU_ITEMS))
          ? window.MENU_ITEMS
          : ((typeof window !== 'undefined' && window.DB && Array.isArray(window.DB.menuItems)) ? window.DB.menuItems : []));
      const matched = menuList.find(m => m.name && m.name.toLowerCase() === lowerName);
      if (matched && matched.id && this.dishes[matched.id]) {
        return this.dishes[matched.id];
      }
      for (const [k, v] of Object.entries(this.dishes)) {
        if (k.toLowerCase() === lowerName) return v;
      }
    }

    return typeof item === 'object' ? (item.name || item.item_name || candidateId) : item;
  },

  getCategoryName(cat) {
    if (!cat) return '';
    const id = String(typeof cat === 'string' ? cat : (cat.id || cat.category || ''));
    if (this.currentLang === 'hi' && this.categories.hi[id]) {
      return this.categories.hi[id];
    }
    return typeof cat === 'object' ? (cat.name || this.categories.en[id] || id) : (this.categories.en[id] || id);
  },

  getFloorName(floorName) {
    if (this.currentLang !== 'hi' || !floorName) return floorName;
    const str = String(floorName);
    if (str.includes('Ground')) return 'ग्राउंड फ्लोर';
    if (str.includes('1st')) return 'पहली मंजिल';
    if (str.includes('2nd')) return 'दूसरी मंजिल';
    if (str.includes('all') || str.includes('All')) return 'सभी (42)';
    return str;
  }
};

if (typeof window !== 'undefined') {
  window.I18N = I18N;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18N;
}
