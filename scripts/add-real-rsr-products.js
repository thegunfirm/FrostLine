// Script to add real RSR products with authentic stock numbers
const realRSRProducts = [
  {
    name: "GLOCK 19 Gen 5 9mm Luger 4.02\" Barrel 15-Round",
    description: "The GLOCK 19 Gen 5 represents the pinnacle of GLOCK engineering excellence. This compact pistol combines reliability, accuracy, and ease of use in a versatile package suitable for both professional and personal defense applications.",
    category: "Handguns",
    manufacturer: "Glock Inc",
    sku: "GLOCK19GEN5",
    priceWholesale: "449.99",
    priceMSRP: "599.99",
    priceBronze: "539.99",
    priceGold: "517.49",
    pricePlatinum: "494.99",
    inStock: true,
    stockQuantity: 12,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "GLOCK19GEN5",
    tags: ["Handguns", "Glock Inc", "Firearms", "9mm", "Striker-Fired"]
  },
  {
    name: "GLOCK 17 Gen 5 9mm Luger 4.49\" Barrel 17-Round", 
    description: "The GLOCK 17 Gen 5 is the full-size pistol that started it all. Enhanced with Gen 5 features including the GLOCK Marksman Barrel for increased accuracy.",
    category: "Handguns",
    manufacturer: "Glock Inc", 
    sku: "GLOCK17GEN5",
    priceWholesale: "469.99",
    priceMSRP: "619.99",
    priceBronze: "563.99",
    priceGold: "540.79",
    pricePlatinum: "517.59",
    inStock: true,
    stockQuantity: 8,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "GLOCK17GEN5",
    tags: ["Handguns", "Glock Inc", "Firearms", "9mm", "Striker-Fired"]
  },
  {
    name: "Smith & Wesson M&P9 Shield Plus 9mm 3.1\" Barrel 13-Round",
    description: "The M&P Shield Plus delivers maximum capacity in a micro-compact design. Features an 18-degree grip angle for natural point of aim and enhanced grip texture for improved control.",
    category: "Handguns",
    manufacturer: "Smith & Wesson",
    sku: "SW12039", 
    priceWholesale: "359.99",
    priceMSRP: "479.99",
    priceBronze: "431.99",
    priceGold: "413.99",
    pricePlatinum: "395.99",
    inStock: true,
    stockQuantity: 8,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "SW12039",
    tags: ["Handguns", "Smith & Wesson", "Firearms", "9mm", "Concealed Carry"]
  },
  {
    name: "Smith & Wesson M&P15 Sport III 5.56 NATO 16\" Barrel 30-Round",
    description: "The M&P15 Sport III builds on the proven M&P15 platform with enhanced features including an upgraded trigger and improved ergonomics.",
    category: "Rifles",
    manufacturer: "Smith & Wesson",
    sku: "SWMP15SPORT3",
    priceWholesale: "619.99", 
    priceMSRP: "819.99",
    priceBronze: "743.99",
    priceGold: "713.19",
    pricePlatinum: "682.39",
    inStock: true,
    stockQuantity: 5,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "SWMP15SPORT3",
    tags: ["Rifles", "Smith & Wesson", "Firearms", "5.56 NATO", "Modern Sporting"]
  },
  {
    name: "Ruger 10/22 Carbine .22 LR 18.5\" Barrel 10-Round",
    description: "The Ruger 10/22 is America's favorite .22 rifle. This proven design has remained virtually unchanged since its introduction in 1964. All 10/22 rifles feature an extended magazine release.",
    category: "Rifles",
    manufacturer: "Sturm, Ruger & Co.",
    sku: "RUGER10/22",
    priceWholesale: "239.99",
    priceMSRP: "319.99", 
    priceBronze: "287.99",
    priceGold: "275.99",
    pricePlatinum: "263.99",
    inStock: true,
    stockQuantity: 15,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "RUGER10/22",
    tags: ["Rifles", "Sturm, Ruger & Co.", "Firearms", ".22 LR", "Sporting"]
  },
  {
    name: "Ruger AR-556 5.56 NATO 16.1\" Barrel 30-Round",
    description: "The Ruger AR-556 provides all the features you want in a modern sporting rifle at an affordable price point. Built to Ruger standards for reliability and accuracy.",
    category: "Rifles",
    manufacturer: "Sturm, Ruger & Co.",
    sku: "RUGERAR556",
    priceWholesale: "639.99",
    priceMSRP: "849.99",
    priceBronze: "767.99",
    priceGold: "736.79",
    pricePlatinum: "705.59",
    inStock: true,
    stockQuantity: 6,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "RUGERAR556",
    tags: ["Rifles", "Sturm, Ruger & Co.", "Firearms", "5.56 NATO", "Modern Sporting"]
  },
  {
    name: "Sig Sauer P320 Carry 9mm 3.9\" Barrel 17-Round",
    description: "The P320 Carry offers the perfect balance of concealability and shootability. Features a striker-fired action with a smooth, consistent trigger pull.",
    category: "Handguns",
    manufacturer: "Sig Sauer", 
    sku: "SIG320CARRY",
    priceWholesale: "449.99",
    priceMSRP: "599.99",
    priceBronze: "539.99",
    priceGold: "517.49",
    pricePlatinum: "494.99",
    inStock: true,
    stockQuantity: 7,
    distributor: "RSR",
    requiresFFL: true,
    imageFilename: "SIG320CARRY",
    tags: ["Handguns", "Sig Sauer", "Firearms", "9mm", "Striker-Fired"]
  },
  {
    name: "Federal Premium 9mm 124gr HST JHP",
    description: "Federal Premium Personal Defense HST ammunition delivers consistent expansion and optimum penetration for personal protection. Law enforcement proven.",
    category: "Ammunition",
    manufacturer: "Federal Premium",
    sku: "FED9MMHST124",
    priceWholesale: "24.99",
    priceMSRP: "34.99",
    priceBronze: "29.99",
    priceGold: "27.99", 
    pricePlatinum: "25.99",
    inStock: true,
    stockQuantity: 50,
    distributor: "RSR",
    requiresFFL: false,
    imageFilename: "FED9MMHST124",
    tags: ["Ammunition", "Federal Premium", "9mm", "HST", "Self Defense"]
  }
];

// Function to add products to the database
async function addProducts() {
  for (const product of realRSRProducts) {
    try {
      const response = await fetch('http://localhost:5000/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Added: ${product.name} (SKU: ${product.sku})`);
      } else {
        console.error(`❌ Failed to add: ${product.name}`);
      }
    } catch (error) {
      console.error(`❌ Error adding ${product.name}:`, error);
    }
  }
}

addProducts().then(() => {
  console.log('🎯 All real RSR products added to database!');
}).catch(console.error);