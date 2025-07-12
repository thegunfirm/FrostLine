/**
 * Extract Accessory Filters - Comprehensive Implementation
 * Extract accessory type, compatibility, material/finish, and mount type from product names
 */

import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

// Accessory Type Patterns
const accessoryTypePatterns = {
  'Sights': /sight|iron sight|red dot|reflex sight|buis|backup sight|rear sight|front sight/i,
  'Scopes': /scope|riflescope|rifle scope|magnified|variable scope|fixed scope|hunting scope/i,
  'Optics': /optic|optical|dot sight|holographic|prism|magnifier|flip|co-witness/i,
  'Grips': /grip|pistol grip|vertical grip|fore grip|foregrip|angled grip|hand grip/i,
  'Cases': /case|gun case|rifle case|pistol case|hard case|soft case|storage case|transport case/i,
  'Holsters': /holster|iwb|owb|shoulder holster|ankle holster|paddle holster|belt holster|concealment/i,
  'Lights': /light|flashlight|weapon light|tactical light|wml|torch|illumination/i,
  'Lasers': /laser|laser sight|laser pointer|red laser|green laser|ir laser|visible laser/i,
  'Mounts': /mount|rail mount|scope mount|ring|base|cantilever|one piece|two piece|30mm|1 inch/i,
  'Rails': /rail|picatinny|weaver|handguard|quad rail|mlok|keymod|modular/i,
  'Slings': /sling|strap|swivel|quick detach|qd|two point|single point|three point/i,
  'Magazines': /magazine|mag|clip|drum|pmag|gi mag|steel mag|polymer mag|extended mag/i,
  'Stocks': /stock|buttstock|collapsible|adjustable stock|fixed stock|minimalist|precision/i,
  'Triggers': /trigger|trigger guard|trigger kit|drop-in|single stage|two stage|curved|straight/i,
  'Bipods': /bipod|bi-pod|shooting rest|harris|atlas|magpul|adjustable legs/i,
  'Cleaning': /cleaning|bore|solvent|oil|patch|rod|brush|jag|mop|snake|kit/i,
  'Safes': /safe|vault|lock|security|gun safe|pistol safe|rifle safe|biometric/i,
  'Clothing': /shirt|jacket|hat|cap|glove|vest|pants|tactical clothing|range wear/i,
  'Tools': /tool|wrench|punch|multi-tool|armorer|field strip|maintenance|gunsmith/i,
  'Suppressors': /suppressor|silencer|can|thread|direct thread|qd suppressor|rifle suppressor/i,
  'Brakes': /brake|muzzle brake|compensator|flash hider|muzzle device|thread|recoil/i,
  'Barrels': /barrel|match barrel|heavy barrel|fluted|stainless barrel|chrome lined/i,
  'Handguards': /handguard|quad rail|free float|drop in|mlok|keymod|carbine length/i,
  'Charging': /charging handle|ch|extended|tactical|ambidextrous|ar15|ar10/i,
  'Bolt': /bolt|bolt carrier|bcg|carrier group|enhanced|coated|matched/i,
  'Buffer': /buffer|spring|tube|carbine buffer|rifle buffer|h1|h2|h3/i,
  'Gas': /gas block|gas tube|adjustable|low profile|set screw|clamp on/i,
  'Pins': /pin|takedown|pivot|trigger pin|hammer pin|roll pin|detent/i,
  'Springs': /spring|buffer spring|trigger spring|hammer spring|magazine spring/i,
  'Plates': /plate|carrier|armor|level iii|level iv|ceramic|steel|lightweight/i,
  'Pouches': /pouch|magazine pouch|utility pouch|admin pouch|medical pouch|dump pouch/i,
  'Belts': /belt|tactical belt|rigger belt|cobra belt|inner belt|outer belt/i,
  'Packs': /pack|backpack|assault pack|range bag|tactical pack|day pack|hydration/i,
  'Knives': /knife|tactical knife|folding knife|fixed blade|utility knife|multi-tool/i,
  'Targets': /target|shooting target|reactive target|steel target|paper target|training/i,
  'Ear Protection': /ear|hearing|electronic|passive|earmuff|earplug|noise reduction/i,
  'Eye Protection': /eye|glasses|safety glasses|shooting glasses|ballistic|wraparound/i,
  'Gloves': /glove|tactical glove|shooting glove|mechanix|fingerless|full finger/i,
  'Batteries': /battery|lithium|cr123|aa|aaa|rechargeable|coin cell|power/i,
  'Ammo Boxes': /ammo box|ammunition box|storage box|plastic box|metal box|can/i,
  'Reloading': /reloading|press|powder|primer|brass|bullet|die|scale|tumbler/i,
  'Books': /book|manual|guide|dvd|training|instruction|reference|educational/i,
  'Range Equipment': /range|chronograph|shooting rest|bench rest|shooting mat|timer/i,
  'Survival': /survival|emergency|first aid|fire starter|paracord|compass|whistle/i,
  'Electronics': /electronic|timer|chronograph|ballistic|calculator|app|software/i
};

// Compatibility Patterns
const compatibilityPatterns = {
  'AR-15': /ar-15|ar15|m4|m16|223|556|5\.56|carbine|rifle length|mid length/i,
  'AR-10': /ar-10|ar10|lr-308|308|7\.62|dpms|armalite|large frame/i,
  'AK': /ak-47|ak47|ak74|kalash|7\.62x39|5\.45|akm|rpk|saiga/i,
  'Glock': /glock|g17|g19|g20|g21|g22|g23|g24|g25|g26|g27|g28|g29|g30|g31|g32|g33|g34|g35|g36|g37|g38|g39|g40|g41|g42|g43|g44|g45|g46|g47|g48|g49|g50/i,
  '1911': /1911|colt 45|45 acp|commander|government|officer|defender|full size/i,
  'Sig Sauer': /sig|p226|p229|p230|p238|p239|p250|p320|p365|p938|mcx|mpx|rattler/i,
  'Smith & Wesson': /s&w|smith|wesson|m&p|shield|bodyguard|sd|ve|sw|governor/i,
  'Ruger': /ruger|10\/22|mini-14|sr|lcp|lc9|pc|american|precision|mark iv/i,
  'Beretta': /beretta|92f|92fs|px4|a400|m9|apx|nano|pico|tomcat/i,
  'Remington': /remington|870|700|1100|11-87|783|model 7|seven|vtr/i,
  'Mossberg': /mossberg|500|590|shockwave|930|940|international|flex/i,
  'CZ': /cz|75|82|85|p-01|p-07|p-09|p-10|scorpion|shadow|tactical sport/i,
  'HK': /hk|heckler|koch|usp|p30|vp9|mp5|416|g36|mr556|mr762/i,
  'FN': /fn|five-seven|509|fns|scar|ps90|p90|fal|m249|m240/i,
  'Walther': /walther|p99|ppq|pps|pk380|ccp|q5|pdp|creed/i,
  'Springfied': /springfield|xd|xds|xdm|hellcat|saint|loaded|range officer/i,
  'Taurus': /taurus|pt|g2|g3|judge|raging|spectrum|tx22/i,
  'Savage': /savage|axis|110|stevens|mark ii|93|b-mag|msr/i,
  'Winchester': /winchester|70|94|sx|xpr|wildcat|22|lever action/i,
  'Marlin': /marlin|336|1895|795|60|papoose|dark|guide gun/i,
  'Benelli': /benelli|m4|super black eagle|montefeltro|nova|supernova|ethos/i,
  'Stoeger': /stoeger|condor|coach gun|p350|m3000|m3500|uplander/i,
  'Tikka': /tikka|t3|t3x|compact|lite|hunter|tactical|varmint/i,
  'Weatherby': /weatherby|vanguard|mark v|element|camilla|18i/i,
  'Universal': /universal|standard|generic|fits most|multi-platform|any|all/i,
  'Picatinny': /picatinny|pic rail|1913|mil-std|nato|standard rail/i,
  'Weaver': /weaver|weaver rail|weaver mount|weaver style|weaver base/i,
  'Dovetail': /dovetail|dove tail|dovetail mount|dovetail cut|dovetail sight/i
};

// Material/Finish Patterns
const materialPatterns = {
  'Aluminum': /aluminum|aluminium|al|alloy|aircraft aluminum|6061|7075/i,
  'Steel': /steel|stainless|carbon steel|blued|parkerized|nitride|melonite/i,
  'Polymer': /polymer|plastic|nylon|composite|reinforced|glass filled/i,
  'Carbon Fiber': /carbon fiber|carbon fibre|cf|graphite|lightweight/i,
  'Titanium': /titanium|ti|grade 2|grade 5|lightweight|corrosion resistant/i,
  'Brass': /brass|bronze|copper|yellow metal|cartridge brass/i,
  'Leather': /leather|genuine leather|cowhide|full grain|top grain/i,
  'Kydex': /kydex|thermoplastic|holster material|boltaron|concealex/i,
  'Cordura': /cordura|ballistic nylon|denier|ripstop|tactical fabric/i,
  'Black': /black|matte black|anodized black|tactical black|midnight/i,
  'FDE': /fde|flat dark earth|tan|coyote|desert tan|burnt bronze/i,
  'ODG': /odg|olive drab|od green|olive|foliage|military green/i,
  'Gray': /gray|grey|tungsten|wolf gray|urban gray|graphite/i,
  'Brown': /brown|chocolate|dark brown|earth|mud|coffee/i,
  'Cerakote': /cerakote|ceramic coating|duracoat|gun kote|protective coating/i,
  'Anodized': /anodized|hard anodized|type ii|type iii|mil-a|clear coat/i,
  'Parkerized': /parkerized|phosphate|manganese|zinc phosphate|military finish/i,
  'Nitride': /nitride|melonite|tenifer|salt bath|black nitride|qpq/i,
  'Stainless': /stainless|ss|316|410|416|17-4|bright|satin|brushed/i,
  'Nickel': /nickel|nickel plated|hard chrome|bright nickel|satin nickel/i,
  'Copper': /copper|antique copper|weathered copper|patina|bronze/i,
  'Multicam': /multicam|camo|camouflage|woodland|digital|acu|marpat/i,
  'Clear': /clear|transparent|natural|uncoated|raw|bare/i
};

// Mount Type Patterns
const mountPatterns = {
  'Picatinny': /picatinny|pic rail|1913|mil-std-1913|nato standard|tactical rail/i,
  'Weaver': /weaver|weaver rail|weaver mount|weaver style|weaver base/i,
  'Dovetail': /dovetail|dove tail|dovetail mount|dovetail cut|dovetail sight/i,
  'Quick Detach': /quick detach|qd|quick release|lever release|cam lever/i,
  'Screw-On': /screw|thread|threaded|screwed|allen screw|socket head/i,
  'Clamp-On': /clamp|c-clamp|clamp on|barrel clamp|tube clamp|slip on/i,
  'Magnetic': /magnetic|magnet|mag mount|magnetic base|rare earth/i,
  'Adhesive': /adhesive|stick|sticky|tape|3m|velcro|hook loop/i,
  'Integral': /integral|integrated|built-in|machined|one piece|monolithic/i,
  'Low Profile': /low profile|low|compact mount|flush|minimal/i,
  'High Profile': /high|tall|extended mount|riser|elevated|see over/i,
  'Cantilever': /cantilever|extended|forward|offset|over bore/i,
  'Direct Thread': /direct thread|threaded|1\/2x28|5\/8x24|thread pitch/i,
  'Bayonet': /bayonet|twist|quarter turn|locking|indexed/i,
  'Friction': /friction|tension|pressure|tight fit|interference/i,
  'Pin Mount': /pin|cross pin|roll pin|spring pin|detent/i,
  'Slide Mount': /slide|slide mount|slide cut|milled|rmr|deltapoint/i,
  'Barrel Mount': /barrel|barrel mount|barrel band|clamp|gas block/i,
  'Handguard': /handguard|free float|drop in|mlok|keymod|quad rail/i,
  'Stock Mount': /stock|buttstock|cheek rest|adjustable|collapsible/i,
  'Sling Mount': /sling|attachment|stud|swivel|qd socket|push button/i
};

async function extractAccessoryFilters() {
  console.log('🔧 Starting Accessory Filter Extraction...');
  
  // Get all accessories from relevant departments
  const accessoryDepartments = ['09', '11', '12', '13', '14', '17', '20', '21', '25', '26', '27', '30', '31', '35'];
  
  console.log('📊 Fetching accessories from departments:', accessoryDepartments.join(', '));
  
  // Use raw SQL to avoid column name issues
  const accessories = await db.execute(sql`
    SELECT * FROM products 
    WHERE department_number IN ('09', '11', '12', '13', '14', '17', '20', '21', '25', '26', '27', '30', '31', '35')
  `);

  console.log(`📦 Processing ${accessories.rows.length} accessories...`);

  let updates = 0;
  let accessoryTypeUpdates = 0;
  let compatibilityUpdates = 0;
  let materialUpdates = 0;
  let mountUpdates = 0;

  // Process accessories in batches
  const batchSize = 100;
  for (let i = 0; i < accessories.rows.length; i += batchSize) {
    const batch = accessories.rows.slice(i, i + batchSize);
    
    console.log(`⚡ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(accessories.rows.length / batchSize)}`);
    
    for (const accessory of batch) {
      const name = accessory.name;
      const description = accessory.description || '';
      const searchText = `${name} ${description}`;
      
      let accessoryType = null;
      let compatibility = null;
      let material = null;
      let mountType = null;
      let hasUpdates = false;

      // Extract Accessory Type
      for (const [type, pattern] of Object.entries(accessoryTypePatterns)) {
        if (pattern.test(searchText)) {
          accessoryType = type;
          break;
        }
      }

      // Extract Compatibility
      for (const [platform, pattern] of Object.entries(compatibilityPatterns)) {
        if (pattern.test(searchText)) {
          compatibility = platform;
          break;
        }
      }

      // Extract Material/Finish
      for (const [mat, pattern] of Object.entries(materialPatterns)) {
        if (pattern.test(searchText)) {
          material = mat;
          break;
        }
      }

      // Extract Mount Type
      for (const [mount, pattern] of Object.entries(mountPatterns)) {
        if (pattern.test(searchText)) {
          mountType = mount;
          break;
        }
      }

      // Update database if we found any data
      if (accessoryType || compatibility || material || mountType) {
        try {
          await db.execute(sql`
            UPDATE products 
            SET "accessoryType" = ${accessoryType}, 
                "compatibility" = ${compatibility}, 
                "materialFinish" = ${material}, 
                "mountType" = ${mountType}
            WHERE id = ${accessory.id}
          `);
          
          updates++;
          if (accessoryType) accessoryTypeUpdates++;
          if (compatibility) compatibilityUpdates++;
          if (material) materialUpdates++;
          if (mountType) mountUpdates++;
          hasUpdates = true;
        } catch (error) {
          console.error(`❌ Error updating ${accessory.name}:`, error);
        }
      }

      if (hasUpdates && updates % 50 === 0) {
        console.log(`✅ Updated ${updates} accessories so far...`);
      }
    }
  }

  console.log('\n🎉 Accessory filter extraction complete!');
  console.log(`📊 Results:`);
  console.log(`  - Total accessories processed: ${accessories.rows.length}`);
  console.log(`  - Total updates: ${updates}`);
  console.log(`  - Accessory type updates: ${accessoryTypeUpdates}`);
  console.log(`  - Compatibility updates: ${compatibilityUpdates}`);
  console.log(`  - Material updates: ${materialUpdates}`);
  console.log(`  - Mount type updates: ${mountUpdates}`);
  console.log(`  - Coverage: ${((updates / accessories.rows.length) * 100).toFixed(1)}%`);
}

// Run the extraction
extractAccessoryFilters().catch(console.error);