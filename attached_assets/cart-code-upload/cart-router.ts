import { z } from "zod"
import { privateProcedure, publicProcedure, router } from "./trpc"
import { getPayloadClient } from "../get-payload"
import cartItemSchema from "../lib/validators/cart-item-validator"

export const cartRouter = router({
    syncCart: privateProcedure.input(z.object({ items: z.array(cartItemSchema) })).mutation(async ({ input, ctx }) => {
        const payload = await getPayloadClient()

        const { user } = ctx

        // Wrap each item in an 'item' object to match database structure
        const wrappedItems = input.items.map(item => ({ item }))

        // Update the user's cart in PayloadCMS
        await payload.update({
            collection: "users",
            id: user.id,
            data: {
                // @ts-ignore
                cart: wrappedItems,
            },
        })

        return { success: true }
    }),
    removeItemFromCart: privateProcedure
        .input(z.object({ productId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const payload = await getPayloadClient()

            const { user } = ctx;

            const { cart } = user;

            if (!cart?.length) {
                return { success: false, message: "Cart is already empty" };
            }

            // Find the index of the item with the specified productId
            // @ts-ignore
            const itemIndex = cart.findIndex((item) => item.item.product?.id === input.productId);

            if (itemIndex === -1) {
                return { success: false, message: "Item not found in cart" };
            }

            // Remove the item from the cart
            // @ts-ignore
            const newCart = [...cart.slice(0, itemIndex), ...cart.slice(itemIndex + 1)];

            console.log("newCart after deletion", newCart);

            // Update the user's cart in PayloadCMS
            await payload.update({
                collection: "users",
                id: user.id,
                data: {
                    // @ts-ignore
                    cart: newCart, // Update the cart with the filtered array
                },
            });

            return { success: true, message: "Item removed from cart" };
        }),
    addItemToCart: privateProcedure.input(cartItemSchema).mutation(async ({ input, ctx }) => {
        const payload = await getPayloadClient()

        const { user } = ctx

        const { cart } = user
        let newCart = []
        
        if (cart?.length) {
            // @ts-ignore - Find existing item in cart
            const existingItemIndex = cart.findIndex((item) => item.item.product?.id === input.product?.id)
            
            if (existingItemIndex !== -1) {
                // Found existing item
                // @ts-ignore
                const existingItem = cart[existingItemIndex];
                
                // Simply increment quantity for any item type
                const updatedCart = [...cart];
                // @ts-ignore
                const currentQuantity = existingItem.item.quantity || 1;
                // @ts-ignore
                updatedCart[existingItemIndex] = {
                    ...existingItem,
                    item: {
                        // Create a new object with all properties from existingItem.item
                        // @ts-ignore
                        product: existingItem.item.product,
                        // @ts-ignore
                        currentTierLevel: existingItem.item.currentTierLevel,
                        // @ts-ignore
                        isShowcase: existingItem.item.isShowcase,
                        // @ts-ignore
                        upgradeablePrices: existingItem.item.upgradeablePrices,
                        quantity: currentQuantity + 1
                    }
                };
                
                newCart = updatedCart;
            } else {
                // Item not in cart, add it
                newCart = [...cart, { item: input }];
            }
        } else {
            // Cart is empty, add as first item
            newCart = [{ item: input }];
        }

        console.log('newCart', newCart)
        // Update the user's cart in PayloadCMS
        await payload.update({
            collection: "users",
            id: user.id,
            data: {
                // @ts-ignore
                cart: newCart,
            },
        })

        return { success: true }
    }),
    getCart: privateProcedure.query(async ({ ctx }) => {
        const payload = await getPayloadClient()

        const { user } = ctx

        // Fetch the user's cart from PayloadCMS
        const userData = await payload.findByID({
            collection: "users",
            id: user.id,
        })

        // @ts-ignore
        return userData.cart || []
    }),
})
