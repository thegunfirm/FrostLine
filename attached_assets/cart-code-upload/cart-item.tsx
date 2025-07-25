import { useCart } from "@/hooks/use-cart"
import { formatPrice } from "@/lib/utils"
import { ImageIcon, X } from "lucide-react"
import Image from "next/image"

const CartItem = ({ product }: { product: any }) => {
  // @ts-ignore
  const { image } = product.images[0]
  const { removeItem } = useCart()

  // Get the current tier level from the product
  const currentTierLevel =
    product.currentTier?.toLowerCase() === "platinum"
      ? 3
      : product.currentTier?.toLowerCase() === "silver"
        ? 2
        : product.currentTier?.toLowerCase() === "bronze"
          ? 1
          : 0

  return (
    <div className="flex flex-col gap-2 py-4 border-b w-full max-w-[180px] mx-auto">
      {/* Product Image */}
      <div className="relative w-full h-[120px] overflow-hidden rounded-md border bg-white">
        {typeof image !== "string" && image.url ? (
          <Image
            src={image.url || "/placeholder.svg"}
            alt={product.title}
            fill
            className="absolute object-contain p-2"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-secondary">
            <ImageIcon
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-col gap-1.5">
        {/* Title */}
        <span className="font-medium text-sm line-clamp-2 text-center">
          {product.title}
        </span>

        {/* Current Price and Tier */}
        <div className="flex flex-col items-center gap-1">
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary font-medium rounded-full">
            {product.currentTier}
          </span>
          <div className="text-lg font-semibold">
            {formatPrice(product.price)}
          </div>
        </div>

        {/* Upgradeable prices */}
        <div className="flex flex-wrap justify-center gap-1.5 mt-1">
          {product.upgradeablePrices?.map((price: any, index: number) => {
            const tierLevel =
              price.tierName.toLowerCase() === "platinum"
                ? 3
                : price.tierName.toLowerCase() === "silver"
                  ? 2
                  : price.tierName.toLowerCase() === "bronze"
                    ? 1
                    : 0

            const shouldLineThrough = tierLevel < currentTierLevel

            return (
              <div key={index} className="flex items-center gap-1 text-center">
                <span
                  className={`
                  px-1.5 py-0.5 rounded-full text-[11px] flex-shrink-0
                  ${price.tierName.toLowerCase() === "bronze" ? "bg-orange-100 text-orange-800" : ""}
                  ${price.tierName.toLowerCase() === "silver" ? "bg-gray-100 text-gray-800" : ""}
                  ${price.tierName.toLowerCase() === "platinum" ? "bg-yellow-50 text-yellow-800" : ""}
                `}
                >
                  {price.tierName}
                </span>
                <span
                  className={`
                  text-xs
                  ${shouldLineThrough ? "line-through text-muted-foreground/70" : "text-muted-foreground"}
                `}
                >
                  {formatPrice(price.price)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center pt-2">
          {/* <select
            className="w-14 h-7 rounded-md border border-input bg-background px-2 text-xs ring-offset-background"
            defaultValue="1"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select> */}

          <button
            onClick={() => removeItem(product.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <X className="w-3 h-3" />
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartItem
