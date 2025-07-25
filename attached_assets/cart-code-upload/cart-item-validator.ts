import { z } from "zod";

// Schema for individual attributes
const attributeSchema = z.object({
    name: z.string(),
    value: z.string(),
    _id: z.string(),
});

// Schema for images
const imageSchema = z.object({
    image: z.object({
        id: z.string(),
        url: z.string(),
    }),
    _id: z.string(),
});

// Schema for price
const priceSchema = z.object({
    msrp: z.number(),
    retailMap: z.number(),
    dealerPrice: z.number(),
});

// Schema for the product
const productSchema = z.object({
    id: z.string(),
    supplierProductId: z.string(),
    approvedForSale: z.string(),
    attributes: z.array(attributeSchema),
    description: z.string(),
    images: z.array(imageSchema),
    price: priceSchema,
    sku: z.string(),
    title: z.string(),
    weight: z.number(),
});

// Schema for upgradeable prices
const upgradeablePriceSchema = z.object({
    price: z.number(),
    availableByTier: z.object({
        tierLevel: z.number(),
        title: z.string(),
    }),
});

// Main schema for the input
const cartItemSchema = z.object({
    // product: productSchema,
    product: z.any(),
    currentTierLevel: z.number(),
    isShowcase: z.boolean(),
    quantity: z.number(),
    upgradeablePrices: z.array(upgradeablePriceSchema),
});

// Export the schema for use in tRPC
export default cartItemSchema;