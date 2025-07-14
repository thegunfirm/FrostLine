/**
 * Fallback Search Routes - Database-Only Search
 * Emergency fallback when Algolia is unavailable
 * Created: July 14, 2025
 */

import { db } from "./db";
import { products } from "@shared/schema";
import { eq, sql, and, or, like, desc, asc } from "drizzle-orm";

// Fallback search using database only
export async function fallbackSearch(req: any, res: any) {
  try {
    const { query = "", filters = {}, sort = "relevance", page = 0, hitsPerPage = 24 } = req.body;
    
    console.log("🔄 Using fallback database search (Algolia unavailable)");
    
    // Build database query conditions
    const conditions = [];
    
    // Text search
    if (query) {
      conditions.push(
        or(
          like(products.name, `%${query}%`),
          like(products.description, `%${query}%`),
          like(products.manufacturerName, `%${query}%`)
        )
      );
    }
    
    // Category filtering
    if (filters.category) {
      if (filters.category === "Handguns") {
        conditions.push(eq(products.departmentNumber, "01"));
      } else if (filters.category === "Rifles") {
        conditions.push(and(
          eq(products.departmentNumber, "05"),
          eq(products.categoryName, "Rifles")
        ));
      } else if (filters.category === "Shotguns") {
        conditions.push(and(
          eq(products.departmentNumber, "05"),
          eq(products.categoryName, "Shotguns")
        ));
      } else if (filters.category === "Ammunition") {
        conditions.push(eq(products.departmentNumber, "18"));
      } else if (filters.category === "Optics") {
        conditions.push(eq(products.departmentNumber, "08"));
      } else if (filters.category === "Parts") {
        conditions.push(eq(products.departmentNumber, "34"));
      } else if (filters.category === "NFA Products") {
        conditions.push(eq(products.departmentNumber, "06"));
      } else if (filters.category === "Magazines") {
        conditions.push(eq(products.departmentNumber, "10"));
      } else if (filters.category === "Accessories") {
        conditions.push(
          or(
            eq(products.departmentNumber, "09"),
            eq(products.departmentNumber, "11"),
            eq(products.departmentNumber, "12"),
            eq(products.departmentNumber, "13"),
            eq(products.departmentNumber, "14"),
            eq(products.departmentNumber, "17"),
            eq(products.departmentNumber, "20"),
            eq(products.departmentNumber, "21"),
            eq(products.departmentNumber, "25"),
            eq(products.departmentNumber, "26"),
            eq(products.departmentNumber, "27"),
            eq(products.departmentNumber, "30"),
            eq(products.departmentNumber, "31"),
            eq(products.departmentNumber, "35")
          )
        );
      }
    }
    
    // Manufacturer filtering
    if (filters.manufacturer) {
      conditions.push(eq(products.manufacturerName, filters.manufacturer));
    }
    
    // Caliber filtering
    if (filters.caliber) {
      conditions.push(eq(products.caliber, filters.caliber));
    }
    
    // Stock filtering
    if (filters.inStock === true) {
      conditions.push(sql`${products.inventoryQuantity} > 0`);
    }
    
    // Price range filtering
    if (filters.priceMin || filters.priceMax) {
      if (filters.priceMin) {
        conditions.push(sql`${products.bronzePrice} >= ${filters.priceMin}`);
      }
      if (filters.priceMax) {
        conditions.push(sql`${products.bronzePrice} <= ${filters.priceMax}`);
      }
    }
    
    // Build the main query
    let query_builder = db.select({
      objectID: products.stockNumber,
      name: products.name,
      description: products.description,
      manufacturerName: products.manufacturerName,
      categoryName: products.categoryName,
      departmentNumber: products.departmentNumber,
      stockNumber: products.stockNumber,
      inventoryQuantity: products.inventoryQuantity,
      inStock: sql`${products.inventoryQuantity} > 0`,
      dropShippable: products.dropShippable,
      upc: products.upc,
      weight: products.weight,
      tierPricing: sql`json_build_object(
        'bronze', ${products.bronzePrice},
        'gold', ${products.goldPrice},
        'platinum', ${products.platinumPrice}
      )`,
      caliber: products.caliber,
      capacity: products.capacity,
      barrelLength: products.barrelLength,
      finish: products.finish,
      frameSize: products.frameSize,
      actionType: products.actionType,
      sightType: products.sightType,
      newItem: products.newItem,
      internalSpecial: products.internalSpecial,
      retailPrice: products.retailPrice,
      retailMap: products.retailMap,
      msrp: products.msrp,
      dealerPrice: products.dealerPrice,
      price: products.bronzePrice,
      fflRequired: products.fflRequired,
      mpn: products.mpn
    }).from(products);
    
    // Apply conditions
    if (conditions.length > 0) {
      query_builder = query_builder.where(and(...conditions));
    }
    
    // Apply sorting
    if (sort === "price_asc") {
      query_builder = query_builder.orderBy(asc(products.bronzePrice));
    } else if (sort === "price_desc") {
      query_builder = query_builder.orderBy(desc(products.bronzePrice));
    } else if (sort === "name") {
      query_builder = query_builder.orderBy(asc(products.name));
    } else {
      // Default: in-stock items first, then by name
      query_builder = query_builder.orderBy(
        desc(sql`${products.inventoryQuantity} > 0`),
        asc(products.name)
      );
    }
    
    // Apply pagination
    const offset = page * hitsPerPage;
    query_builder = query_builder.limit(hitsPerPage).offset(offset);
    
    // Execute query
    const results = await query_builder;
    
    // Get total count for pagination
    const countQuery = db.select({ count: sql`count(*)` }).from(products);
    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }
    const [{ count }] = await countQuery;
    
    // Format response to match Algolia structure
    const response = {
      hits: results.map(product => ({
        ...product,
        tierPricing: typeof product.tierPricing === 'string' 
          ? JSON.parse(product.tierPricing) 
          : product.tierPricing
      })),
      nbHits: parseInt(count.toString()),
      page: page,
      nbPages: Math.ceil(parseInt(count.toString()) / hitsPerPage),
      hitsPerPage: hitsPerPage,
      exhaustiveNbHits: true,
      params: `query=${query}&hitsPerPage=${hitsPerPage}&page=${page}`,
      processingTimeMS: 0,
      serverTimeMS: 0,
      index: "rsr_products_fallback"
    };
    
    console.log(`📊 Fallback search returned ${results.length} products (${count} total)`);
    res.json(response);
    
  } catch (error) {
    console.error("❌ Fallback search error:", error);
    res.status(500).json({ error: "Search temporarily unavailable" });
  }
}

// Fallback filter options using database
export async function fallbackFilterOptions(req: any, res: any) {
  try {
    const { category, filters = {} } = req.body;
    
    console.log("🔄 Using fallback filter options (Algolia unavailable)");
    
    // Build base conditions for the category
    const conditions = [];
    
    if (category === "Handguns") {
      conditions.push(eq(products.departmentNumber, "01"));
    } else if (category === "Rifles") {
      conditions.push(and(
        eq(products.departmentNumber, "05"),
        eq(products.categoryName, "Rifles")
      ));
    } else if (category === "Shotguns") {
      conditions.push(and(
        eq(products.departmentNumber, "05"),
        eq(products.categoryName, "Shotguns")
      ));
    } else if (category === "Ammunition") {
      conditions.push(eq(products.departmentNumber, "18"));
    } else if (category === "Optics") {
      conditions.push(eq(products.departmentNumber, "08"));
    } else if (category === "Parts") {
      conditions.push(eq(products.departmentNumber, "34"));
    } else if (category === "Magazines") {
      conditions.push(eq(products.departmentNumber, "10"));
    } else if (category === "Accessories") {
      conditions.push(
        or(
          eq(products.departmentNumber, "09"),
          eq(products.departmentNumber, "11"),
          eq(products.departmentNumber, "12"),
          eq(products.departmentNumber, "13"),
          eq(products.departmentNumber, "14"),
          eq(products.departmentNumber, "17"),
          eq(products.departmentNumber, "20"),
          eq(products.departmentNumber, "21"),
          eq(products.departmentNumber, "25"),
          eq(products.departmentNumber, "26"),
          eq(products.departmentNumber, "27"),
          eq(products.departmentNumber, "30"),
          eq(products.departmentNumber, "31"),
          eq(products.departmentNumber, "35")
        )
      );
    }
    
    // Apply additional filters
    if (filters.manufacturer) {
      conditions.push(eq(products.manufacturerName, filters.manufacturer));
    }
    if (filters.caliber) {
      conditions.push(eq(products.caliber, filters.caliber));
    }
    if (filters.inStock === true) {
      conditions.push(sql`${products.inventoryQuantity} > 0`);
    }
    
    // Get unique manufacturers
    const manufacturersQuery = db.select({
      value: products.manufacturerName,
      count: sql`count(*)`
    }).from(products)
      .where(and(...conditions, sql`${products.manufacturerName} IS NOT NULL`))
      .groupBy(products.manufacturerName)
      .orderBy(asc(products.manufacturerName));
    
    const manufacturers = await manufacturersQuery;
    
    // Get unique calibers
    const calibersQuery = db.select({
      value: products.caliber,
      count: sql`count(*)`
    }).from(products)
      .where(and(...conditions, sql`${products.caliber} IS NOT NULL`))
      .groupBy(products.caliber)
      .orderBy(asc(products.caliber));
    
    const calibers = await calibersQuery;
    
    const response = {
      manufacturers: manufacturers.map(m => ({
        value: m.value,
        count: parseInt(m.count.toString())
      })),
      calibers: calibers.map(c => ({
        value: c.value,
        count: parseInt(c.count.toString())
      })),
      capacities: [],
      actionTypes: [],
      finishes: [],
      frameSizes: [],
      sightTypes: [],
      types: [],
      zooms: []
    };
    
    console.log(`📊 Fallback filter options: ${manufacturers.length} manufacturers, ${calibers.length} calibers`);
    res.json(response);
    
  } catch (error) {
    console.error("❌ Fallback filter options error:", error);
    res.status(500).json({ error: "Filter options temporarily unavailable" });
  }
}