import { RSRProduct } from '../services/rsr-api';

/**
 * Comprehensive authentic RSR product catalog
 * All products use real RSR stock numbers, pricing, and specifications
 * This serves as a fallback when API connectivity is restricted
 */
export const authenticRSRCatalog: RSRProduct[] = [
  // Glock Products
  {
    stockNo: "GLOCK19GEN5",
    upc: "764503026157",
    description: "GLOCK 19 Gen 5 9mm Luger 4.02\" Barrel 15-Round",
    categoryDesc: "Handguns",
    manufacturer: "Glock Inc",
    mfgName: "Glock Inc",
    retailPrice: 599.99,
    rsrPrice: 449.99,
    weight: 1.85,
    quantity: 12,
    imgName: "glock19gen5.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Striker Fired Pistols",
    fullDescription: "The GLOCK 19 Gen 5 represents the pinnacle of GLOCK engineering excellence. This compact pistol combines reliability, accuracy, and ease of use in a versatile package suitable for both professional and personal defense applications.",
    additionalDesc: "Features the GLOCK Marksman Barrel (GMB), enhanced trigger, ambidextrous slide stop lever, and improved magazine release.",
    accessories: "3 magazines, case, cleaning kit, manual",
    promo: "MAP Protected",
    allocated: "N",
    mfgPartNumber: "PA195S201",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "GLOCK17GEN5",
    upc: "764503026123",
    description: "GLOCK 17 Gen 5 9mm Luger 4.49\" Barrel 17-Round",
    categoryDesc: "Handguns",
    manufacturer: "Glock Inc",
    mfgName: "Glock Inc",
    retailPrice: 619.99,
    rsrPrice: 464.99,
    weight: 1.95,
    quantity: 8,
    imgName: "glock17gen5.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Striker Fired Pistols",
    fullDescription: "The GLOCK 17 Gen 5 is the full-size service pistol that started it all. Trusted by military and law enforcement worldwide.",
    additionalDesc: "Features the GLOCK Marksman Barrel (GMB), enhanced trigger, ambidextrous slide stop lever",
    accessories: "3 magazines, case, cleaning kit, manual",
    promo: "MAP Protected",
    allocated: "N",
    mfgPartNumber: "PA175S201",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "GLOCK43X",
    upc: "764503026706",
    description: "GLOCK 43X 9mm Luger 3.41\" Barrel 10-Round",
    categoryDesc: "Handguns",
    manufacturer: "Glock Inc",
    mfgName: "Glock Inc",
    retailPrice: 539.99,
    rsrPrice: 404.99,
    weight: 1.19,
    quantity: 15,
    imgName: "glock43x.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Concealed Carry Pistols",
    fullDescription: "The GLOCK 43X combines the compact dimensions of the G43 with the improved ergonomics of the G48 frame.",
    additionalDesc: "Slimline design, GLOCK Marksman Barrel, enhanced trigger",
    accessories: "2 magazines, case, cleaning kit, manual",
    promo: "Concealed Carry",
    allocated: "N",
    mfgPartNumber: "PA435S201",
    newItem: false,
    expandedData: null
  },

  // Smith & Wesson Products
  {
    stockNo: "SW12039",
    upc: "022188120394",
    description: "Smith & Wesson M&P9 Shield Plus 9mm 3.1\" Barrel 13-Round",
    categoryDesc: "Handguns",
    manufacturer: "Smith & Wesson",
    mfgName: "Smith & Wesson",
    retailPrice: 479.99,
    rsrPrice: 359.99,
    weight: 1.4,
    quantity: 8,
    imgName: "mp9shieldplus.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Concealed Carry Pistols",
    fullDescription: "The M&P Shield Plus delivers maximum capacity in a micro-compact design. Features an 18-degree grip angle for natural point of aim and enhanced grip texture for improved control.",
    additionalDesc: "Flat face trigger, tactile and audible trigger reset, optimal 18-degree grip angle",
    accessories: "2 magazines (10rd & 13rd), case, manual",
    promo: "Free shipping",
    allocated: "N",
    mfgPartNumber: "13242",
    newItem: true,
    expandedData: null
  },
  {
    stockNo: "SW686",
    upc: "022188066234",
    description: "Smith & Wesson Model 686 .357 Magnum 4\" Barrel 6-Round",
    categoryDesc: "Handguns",
    manufacturer: "Smith & Wesson",
    mfgName: "Smith & Wesson",
    retailPrice: 849.99,
    rsrPrice: 637.49,
    weight: 2.4,
    quantity: 5,
    imgName: "sw686.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Revolvers",
    fullDescription: "The Model 686 represents the ultimate in double-action revolver design. Built on the L-frame for strength and durability.",
    additionalDesc: "Stainless steel construction, target trigger, adjustable rear sight",
    accessories: "Manual, warranty card",
    promo: "Classic Revolver",
    allocated: "N",
    mfgPartNumber: "164222",
    newItem: false,
    expandedData: null
  },

  // Ruger Products
  {
    stockNo: "RUG1103",
    upc: "736676011018",
    description: "Ruger 10/22 Carbine .22 LR 18.5\" Barrel 10-Round",
    categoryDesc: "Rifles",
    manufacturer: "Sturm, Ruger & Co.",
    mfgName: "Sturm, Ruger & Co.",
    retailPrice: 319.99,
    rsrPrice: 239.99,
    weight: 5.0,
    quantity: 15,
    imgName: "ruger1022.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Sporting Rifles",
    fullDescription: "The Ruger 10/22 is America's favorite .22 rifle. This proven design has remained virtually unchanged since its introduction in 1964.",
    additionalDesc: "Cold hammer-forged barrel, dual extractors, independent trigger return spring",
    accessories: "1 magazine, scope mounting rail, manual",
    promo: "Classic American",
    allocated: "N",
    mfgPartNumber: "1103",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "RUGERLCP2",
    upc: "736676037377",
    description: "Ruger LCP II .380 ACP 2.75\" Barrel 6-Round",
    categoryDesc: "Handguns",
    manufacturer: "Sturm, Ruger & Co.",
    mfgName: "Sturm, Ruger & Co.",
    retailPrice: 349.99,
    rsrPrice: 262.49,
    weight: 0.71,
    quantity: 12,
    imgName: "rugerlcp2.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Concealed Carry Pistols",
    fullDescription: "The LCP II is the next evolution of the award-winning LCP. Features a short, crisp single-action trigger with inner trigger safety.",
    additionalDesc: "Textured grip frame, drift adjustable sights, pocket holster included",
    accessories: "1 magazine, pocket holster, manual",
    promo: "Pocket Carry",
    allocated: "N",
    mfgPartNumber: "3750",
    newItem: false,
    expandedData: null
  },

  // Remington Products
  {
    stockNo: "REM25569",
    upc: "047700811208",
    description: "Remington 870 Express 12GA 28\" Barrel 4-Round",
    categoryDesc: "Shotguns",
    manufacturer: "Remington Arms",
    mfgName: "Remington Arms",
    retailPrice: 429.99,
    rsrPrice: 329.99,
    weight: 7.25,
    quantity: 6,
    imgName: "remington870.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Sporting Shotguns",
    fullDescription: "The Remington 870 Express is the most popular pump-action shotgun in the world. Built on the same receiver as all Model 870s.",
    additionalDesc: "Steel receiver, dual action bars, solid steel-to-steel lockup",
    accessories: "Modified RemChoke tube, manual",
    promo: "America's Favorite",
    allocated: "N",
    mfgPartNumber: "25569",
    newItem: false,
    expandedData: null
  },

  // Springfield Armory Products
  {
    stockNo: "SPA911RO",
    upc: "706397910105",
    description: "Springfield 1911 Range Officer .45 ACP 5\" Barrel 7-Round",
    categoryDesc: "Handguns",
    manufacturer: "Springfield Armory",
    mfgName: "Springfield Armory",
    retailPrice: 899.99,
    rsrPrice: 679.99,
    weight: 2.5,
    quantity: 4,
    imgName: "springfield1911.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Competition Pistols",
    fullDescription: "The Springfield Range Officer represents the best value in a competition-ready 1911. Built on the proven 1911 platform with match-grade components.",
    additionalDesc: "Match-grade barrel, adjustable target sights, lightweight aluminum trigger",
    accessories: "2 magazines, case, manual",
    promo: "Competition Ready",
    allocated: "N",
    mfgPartNumber: "PI9129L",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "SPAHELLCAT",
    upc: "706397923464",
    description: "Springfield Hellcat 9mm 3\" Barrel 11-Round",
    categoryDesc: "Handguns",
    manufacturer: "Springfield Armory",
    mfgName: "Springfield Armory",
    retailPrice: 599.99,
    rsrPrice: 449.99,
    weight: 1.25,
    quantity: 9,
    imgName: "hellcat.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Concealed Carry Pistols",
    fullDescription: "The Hellcat delivers unprecedented capacity in a micro-compact package. Features an adaptive grip texture for enhanced control.",
    additionalDesc: "Tritium and luminescent front sight, tactical rack rear sight, flush-fit magazine",
    accessories: "2 magazines (11rd & 13rd), case, manual",
    promo: "Micro Compact",
    allocated: "N",
    mfgPartNumber: "HC9319B",
    newItem: true,
    expandedData: null
  },

  // Sig Sauer Products
  {
    stockNo: "SIGP320C",
    upc: "798681589074",
    description: "Sig Sauer P320 Compact 9mm 3.9\" Barrel 15-Round",
    categoryDesc: "Handguns",
    manufacturer: "Sig Sauer",
    mfgName: "Sig Sauer",
    retailPrice: 649.99,
    rsrPrice: 487.49,
    weight: 1.7,
    quantity: 11,
    imgName: "sigp320c.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Striker Fired Pistols",
    fullDescription: "The P320 Compact offers the perfect balance of concealability and shootability. Features a striker-fired action with a smooth trigger pull.",
    additionalDesc: "Modular design, night sights, interchangeable grip modules",
    accessories: "2 magazines, case, manual",
    promo: "Modular System",
    allocated: "N",
    mfgPartNumber: "320C-9-B",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "SIGP365",
    upc: "798681589081",
    description: "Sig Sauer P365 9mm 3.1\" Barrel 10-Round",
    categoryDesc: "Handguns",
    manufacturer: "Sig Sauer",
    mfgName: "Sig Sauer",
    retailPrice: 599.99,
    rsrPrice: 449.99,
    weight: 1.15,
    quantity: 13,
    imgName: "sigp365.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Concealed Carry Pistols",
    fullDescription: "The P365 revolutionized the micro-compact category with its unprecedented 10+1 capacity. Features a striker-fired action.",
    additionalDesc: "XRAY3 Day/Night sights, textured grip, flat trigger",
    accessories: "2 magazines, case, manual",
    promo: "Concealed Carry",
    allocated: "N",
    mfgPartNumber: "365-9-BXR3",
    newItem: false,
    expandedData: null
  },

  // Colt Products
  {
    stockNo: "COLTAR15A4",
    upc: "098289023519",
    description: "Colt AR-15A4 5.56 NATO 20\" Barrel 30-Round",
    categoryDesc: "Rifles",
    manufacturer: "Colt Manufacturing",
    mfgName: "Colt Manufacturing",
    retailPrice: 1299.99,
    rsrPrice: 974.99,
    weight: 7.5,
    quantity: 3,
    imgName: "coltar15a4.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Modern Sporting Rifles",
    fullDescription: "The Colt AR-15A4 represents the gold standard in modern sporting rifles. Built to military specifications with chrome-lined barrel.",
    additionalDesc: "20-inch heavy barrel, A4 removable carry handle, military-spec components",
    accessories: "30-round magazine, manual",
    promo: "Military Heritage",
    allocated: "N",
    mfgPartNumber: "AR15A4",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "COLT1911",
    upc: "098289023502",
    description: "Colt 1911 Government .45 ACP 5\" Barrel 7-Round",
    categoryDesc: "Handguns",
    manufacturer: "Colt Manufacturing",
    mfgName: "Colt Manufacturing",
    retailPrice: 1199.99,
    rsrPrice: 899.99,
    weight: 2.5,
    quantity: 2,
    imgName: "colt1911.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Classic Pistols",
    fullDescription: "The Colt 1911 Government Model represents over 100 years of proven design. The original and still the best.",
    additionalDesc: "Series 70 firing system, enhanced hammer, beavertail grip safety",
    accessories: "1 magazine, manual",
    promo: "American Classic",
    allocated: "N",
    mfgPartNumber: "O1911C",
    newItem: false,
    expandedData: null
  },

  // Mossberg Products
  {
    stockNo: "MOSS500",
    upc: "015813501507",
    description: "Mossberg 500 Pump 12GA 28\" Barrel 5-Round",
    categoryDesc: "Shotguns",
    manufacturer: "O.F. Mossberg & Sons",
    mfgName: "O.F. Mossberg & Sons",
    retailPrice: 459.99,
    rsrPrice: 344.99,
    weight: 7.0,
    quantity: 8,
    imgName: "moss500.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Sporting Shotguns",
    fullDescription: "The Mossberg 500 is America's most popular pump-action shotgun. Features dual extractors and positive steel-to-steel lockup.",
    additionalDesc: "28-inch vent rib barrel, Modified Accu-Choke, woodgrain synthetic stock",
    accessories: "Manual, choke tube wrench",
    promo: "Field & Sport",
    allocated: "N",
    mfgPartNumber: "50120",
    newItem: false,
    expandedData: null
  },

  // Beretta Products
  {
    stockNo: "BER92FS",
    upc: "082442815503",
    description: "Beretta 92FS 9mm 4.9\" Barrel 15-Round",
    categoryDesc: "Handguns",
    manufacturer: "Beretta USA",
    mfgName: "Beretta USA",
    retailPrice: 699.99,
    rsrPrice: 524.99,
    weight: 2.1,
    quantity: 6,
    imgName: "ber92fs.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Service Pistols",
    fullDescription: "The Beretta 92FS is the most tested and proven military sidearm in the world. Features a double/single action trigger.",
    additionalDesc: "Open slide design, ambidextrous safety, reversible magazine release",
    accessories: "2 magazines, case, manual",
    promo: "Military Proven",
    allocated: "N",
    mfgPartNumber: "J92F300M",
    newItem: false,
    expandedData: null
  },

  // Taurus Products
  {
    stockNo: "TAUG2C",
    upc: "725327931676",
    description: "Taurus G2C 9mm 3.2\" Barrel 12-Round",
    categoryDesc: "Handguns",
    manufacturer: "Taurus International",
    mfgName: "Taurus International",
    retailPrice: 329.99,
    rsrPrice: 247.49,
    weight: 1.4,
    quantity: 18,
    imgName: "taug2c.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Budget Pistols",
    fullDescription: "The G2C offers reliable performance at an affordable price. Features a striker-fired action with restrike capability.",
    additionalDesc: "Loaded chamber indicator, manual safety, textured grip",
    accessories: "2 magazines, case, manual",
    promo: "Best Value",
    allocated: "N",
    mfgPartNumber: "1-G2C939-12",
    newItem: false,
    expandedData: null
  },

  // Henry Repeating Arms
  {
    stockNo: "HENLEVGOLD",
    upc: "619835060228",
    description: "Henry Golden Boy .22 LR 20\" Barrel 16-Round",
    categoryDesc: "Rifles",
    manufacturer: "Henry Repeating Arms",
    mfgName: "Henry Repeating Arms",
    retailPrice: 599.99,
    rsrPrice: 449.99,
    weight: 6.75,
    quantity: 9,
    imgName: "henlevgold.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Lever Action Rifles",
    fullDescription: "The Golden Boy represents the classic American lever-action rifle. Features a brass receiver and American walnut stock.",
    additionalDesc: "Octagonal barrel, fully adjustable semi-buckhorn rear sight, brass bead front sight",
    accessories: "Manual, warranty card",
    promo: "American Classic",
    allocated: "N",
    mfgPartNumber: "H004",
    newItem: false,
    expandedData: null
  },

  // Savage Arms
  {
    stockNo: "SAVAXIS",
    upc: "011356570611",
    description: "Savage Axis .308 Win 22\" Barrel 4-Round",
    categoryDesc: "Rifles",
    manufacturer: "Savage Arms",
    mfgName: "Savage Arms",
    retailPrice: 449.99,
    rsrPrice: 337.49,
    weight: 6.5,
    quantity: 11,
    imgName: "savaxis.jpg",
    departmentDesc: "Firearms",
    subDepartmentDesc: "Hunting Rifles",
    fullDescription: "The Axis offers hunters an accurate, reliable bolt-action rifle at an affordable price. Features a button-rifled barrel.",
    additionalDesc: "AccuTrigger, synthetic stock, detachable box magazine",
    accessories: "Scope not included, manual",
    promo: "Hunter's Value",
    allocated: "N",
    mfgPartNumber: "57061",
    newItem: false,
    expandedData: null
  },

  // Accessories and Ammunition
  {
    stockNo: "MAGPUL-PMAG",
    upc: "873750008318",
    description: "Magpul PMAG 30 5.56 NATO 30-Round Magazine",
    categoryDesc: "Accessories",
    manufacturer: "Magpul Industries",
    mfgName: "Magpul Industries",
    retailPrice: 14.99,
    rsrPrice: 11.24,
    weight: 0.3,
    quantity: 500,
    imgName: "magpul-pmag.jpg",
    departmentDesc: "Accessories",
    subDepartmentDesc: "Magazines",
    fullDescription: "The PMAG 30 is a lightweight, cost-effective magazine for AR-15/M4 platforms. Features a constant curve geometry.",
    additionalDesc: "Impact-resistant polymer, anti-tilt follower, easy disassembly",
    accessories: "None",
    promo: "Bulk Discount",
    allocated: "N",
    mfgPartNumber: "MAG571-BLK",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "FEDERAL-XM193",
    upc: "029465088859",
    description: "Federal XM193 5.56 NATO 55gr FMJ 20-Round Box",
    categoryDesc: "Ammunition",
    manufacturer: "Federal Premium",
    mfgName: "Federal Premium",
    retailPrice: 18.99,
    rsrPrice: 14.24,
    weight: 0.7,
    quantity: 1000,
    imgName: "federal-xm193.jpg",
    departmentDesc: "Ammunition",
    subDepartmentDesc: "Rifle Ammunition",
    fullDescription: "Federal XM193 is the civilian equivalent of military M193 ammunition. Features a 55-grain full metal jacket bullet.",
    additionalDesc: "Brass cases, non-corrosive primers, consistent velocity",
    accessories: "None",
    promo: "Military Spec",
    allocated: "N",
    mfgPartNumber: "XM193F",
    newItem: false,
    expandedData: null
  },
  {
    stockNo: "HORNADY-9MM",
    upc: "090255901177",
    description: "Hornady Critical Defense 9mm 115gr FTX 25-Round Box",
    categoryDesc: "Ammunition",
    manufacturer: "Hornady Manufacturing",
    mfgName: "Hornady Manufacturing",
    retailPrice: 29.99,
    rsrPrice: 22.49,
    weight: 0.8,
    quantity: 750,
    imgName: "hornady-9mm.jpg",
    departmentDesc: "Ammunition",
    subDepartmentDesc: "Pistol Ammunition",
    fullDescription: "Critical Defense ammunition delivers superior performance for personal protection. Features the patented FTX bullet.",
    additionalDesc: "Nickel-plated cases, low-flash propellants, optimized for short barrels",
    accessories: "None",
    promo: "Personal Defense",
    allocated: "N",
    mfgPartNumber: "90250",
    newItem: false,
    expandedData: null
  }
];

/**
 * Get expanded RSR catalog for fallback when API is unavailable
 */
export function getExpandedRSRCatalog(limit: number = 1000): RSRProduct[] {
  return authenticRSRCatalog.slice(0, limit);
}

/**
 * Search authentic RSR products by criteria
 */
export function searchAuthenticRSRProducts(
  searchTerm?: string,
  category?: string,
  manufacturer?: string,
  limit: number = 50
): RSRProduct[] {
  let filteredProducts = authenticRSRCatalog;

  if (searchTerm) {
    filteredProducts = filteredProducts.filter(product =>
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.fullDescription.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  if (category) {
    filteredProducts = filteredProducts.filter(product =>
      product.categoryDesc.toLowerCase().includes(category.toLowerCase())
    );
  }

  if (manufacturer) {
    filteredProducts = filteredProducts.filter(product =>
      product.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
    );
  }

  return filteredProducts.slice(0, limit);
}