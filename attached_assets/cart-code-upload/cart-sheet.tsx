"use client"

import { ShoppingCart } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet"
import { Separator } from "../ui/separator"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"
import { Button, buttonVariants } from "../ui/button"
import Image from "next/image"
import { useCart } from "@/hooks/use-cart"
import { ScrollArea } from "../ui/scroll-area"
import CartItem from "./cart-item"
import { useEffect, useState } from "react"
import useUser from "@/hooks/use-User"

const USER_TIERS = {
  BASIC: "Basic",
  PRO: "Pro",
}

const CartSheet = () => {
  const { isFetching, data } = useUser()

  const { items } = useCart()
  // console.log("items", items)
  // console.log("items", items)
  const itemCount = items.length

  const [isMounted, setIsMounted] = useState<boolean>(false)

  const [cartItems, setCartItems] = useState<any>([])

  useEffect(() => {
    setIsMounted(true)
  }, [])
  useEffect(() => {
    if (items.length >= 0) {
      const cartItemsMap = items.map(({ product: item }: any) => {
        let price
        if (data?.tier?.id)
          price = item.prices.find(
            (item: any) => item.availableByTier?.id === data?.tier?.id
          )?.price
        return {
          id: item.id,
          title: item.title,
          price: price || item.price,
          images: item.images,
          quantity: 1,
        }
      })
      setCartItems(cartItemsMap)
    }
  }, [data, items])

  // @ts-ignore
  const cartTotal = cartItems.reduce((total, item) => total + item?.price, 0)
  // const cartTotal = items.reduce(
  //   (total, { product }) => total + product.price,
  //   0
  // )

  const fee = 1

  return (
    <Sheet>
      <SheetTrigger className="group -m-2 flex items-center p-2">
        <Button size={"sm"}>
          <ShoppingCart aria-hidden="true" className="h-4 w-4" />
          {/* <ShoppingCart aria-hidden="true" className="h-6 w-6 flex-shrink-0" /> */}
          {/* <span className="ml-2 text-sm font-medium ">
            {isMounted ? itemCount : 0}
          </span> */}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col pr-0 sm:max-w-lg">
        <SheetHeader className="space-y-2.5 pr-6">
          <SheetTitle>Cart ({itemCount})</SheetTitle>
        </SheetHeader>
        {itemCount > 0 ? (
          <>
            <div className="flex w-full flex-col pr-6">
              <ScrollArea>
                {/* @ts-ignore */}
                {cartItems.map((item) => (
                  <CartItem product={item} key={item.id} />
                ))}
                {/* {items.map(({ product }) => (
                  <CartItem product={product} key={product.id} />
                ))} */}
              </ScrollArea>
            </div>
            <div className="space-y-4 pr-6">
              <Separator />
              <div className="space-y-1.5 text-sm">
                <div className="flex">
                  <span className="flex-1">Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex">
                  <span className="flex-1">Transaction Fee</span>
                  <span>{formatPrice(fee)}</span>
                </div>
                <div className="flex">
                  <span className="flex-1">Total</span>
                  <span>{formatPrice(cartTotal + fee)}</span>
                </div>
              </div>

              <SheetFooter>
                <SheetTrigger asChild>
                  <Link
                    href="/cart"
                    className={buttonVariants({
                      className: "w-full",
                    })}
                  >
                    Continue to Checkout
                  </Link>
                </SheetTrigger>
              </SheetFooter>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center space-y-1">
            <div
              aria-hidden="true"
              className="relative mb-4 h-60 w-60 text-muted-foreground"
            >
              <Image
                src="/empty-cart-gun.png"
                fill
                alt="empty shopping cart "
              />
            </div>
            <div className="text-xl font-semibold">Your cart is empty</div>
            <SheetTrigger asChild>
              <Link
                href="/products"
                className={buttonVariants({
                  variant: "link",
                  size: "sm",
                  className: "text-sm text-muted-foreground",
                })}
              >
                Add items to your cart to checkout
              </Link>
            </SheetTrigger>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default CartSheet
