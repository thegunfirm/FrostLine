"use client"

import { useEffect, useState, useTransition } from "react"
import { useCart } from "@/hooks/use-cart"
import { Product } from "@/payload-types"
import { Button } from "../ui/button"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import { AlertDialogFooter, AlertDialogHeader } from "../ui/alert-dialog"
import useUser from "@/hooks/use-User"

const AddToCartButton = ({ product }: { product: Product }) => {
  const { addItem, items } = useCart()
  const { data: userData } = useUser()

  // @ts-ignore
  const currentTierPrice = product?.prices.find(
    // @ts-ignore
    (p) => p.availableByTier.id === userData?.tier?.id
  )

  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [isUpdatePending, startUpdateTransition] = useTransition()

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsSuccess(false)
    }, 2000)

    return () => clearTimeout(timeout)
  }, [isSuccess])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMessage, setDialogMessage] = useState("")

  const handleAddToCart = async () => {
    // Removed "already in cart" check to allow adding multiple of the same item
    
    const isNewItemFirearm = product.fflNeeded

    addItem({
      // @ts-ignore
      selectedPrice: {
        price: currentTierPrice ? currentTierPrice.price : product.price,
        ...currentTierPrice,
      },
      product,
    })
    
    // Remove toast notification to prevent UI blocking
    // We'll keep a visual indicator in the cart icon count instead
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <AlertDialogHeader>
            <DialogTitle>Cart Update</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setDialogOpen(false)}>OK</Button>
          </AlertDialogFooter>
        </DialogContent>
      </Dialog>
      <Button
        onClick={() => handleAddToCart()}
        // onClick={() => {
        //   addItem(product)
        //   setIsSuccess(true)
        // }}
        size="lg"
        className="w-full"
        // @ts-ignore
        disabled={product.inventory === 0}
      >
        {/* @ts-ignore */}
        {product.inventory > 0 ? (
          <>{isSuccess ? "Added!" : "Add to cart"}</>
        ) : (
          "Out of stock"
        )}
      </Button>
    </>
  )
}

export default AddToCartButton
