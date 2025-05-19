import { 
  Money,
  CartProvider,
  useCart,
  CartLineProvider,
  CartLineQuantityAdjustButton,
  CartLineQuantity,
  CartCost
} from '@shopify/hydrogen-react';
import type { 
  Cart,
  CartLine,
  MoneyV2,
  Image as ShopifyImage
} from '@shopify/hydrogen-react/storefront-api-types';
import styles from './CartComponent.module.css';

export interface COMPONENT_NAMEProps {
  cart: Cart;
  showImages?: boolean;
  showQuantityControls?: boolean;
  onCheckout?: () => void;
}

export default function COMPONENT_NAME({ 
  cart,
  showImages = true,
  showQuantityControls = true,
  onCheckout
}: COMPONENT_NAMEProps) {
  if (!cart) return null;

  return (
    <CartProvider>
      <CartContent 
        showImages={showImages}
        showQuantityControls={showQuantityControls}
        onCheckout={onCheckout}
      />
    </CartProvider>
  );
}

interface CartContentProps {
  showImages: boolean;
  showQuantityControls: boolean;
  onCheckout?: () => void;
}

type CartStatus = 'uninitialized' | 'fetching' | 'creating' | 'updating' | 'idle';

function CartContent({
  showImages,
  showQuantityControls,
  onCheckout
}: CartContentProps) {
  const { 
    lines,
    status,
    totalQuantity,
    cost
  } = useCart();

  if (status === 'fetching' || status === 'creating' || status === 'updating') {
    return <div className={styles.loading}>Loading cart...</div>;
  }

  if (!lines?.length || totalQuantity === 0) {
    return <div className={styles.empty}>Your cart is empty</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Cart ({totalQuantity})</h1>
      </div>

      <div className={styles.lineItems}>
        {lines.map((line) => {
          if (!line?.id) return null;
          return (
            <CartLineProvider key={line.id} line={line}>
              <CartLineItem 
                line={line as unknown as CartLine}
                showImage={showImages}
                showQuantityControls={showQuantityControls}
              />
            </CartLineProvider>
          );
        })}
      </div>

      <div className={styles.summary}>
        <div className={styles.subtotal}>
          <span>Subtotal</span>
          <CartCost amountType="subtotal" />
        </div>
        
        {cost?.subtotalAmount && (
          <div className={styles.tax}>
            <span>Estimated Tax</span>
            <Money data={cost.subtotalAmount as MoneyV2} />
          </div>
        )}

        <div className={styles.total}>
          <span>Total</span>
          <CartCost amountType="total" />
        </div>

        <button 
          className={styles.checkoutButton}
          onClick={onCheckout}
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

interface CartLineItemProps {
  line: CartLine;
  showImage: boolean;
  showQuantityControls: boolean;
}

interface CartMerchandise {
  id: string;
  title: string;
  product: {
    title: string;
  };
  image?: ShopifyImage;
}

function CartLineItem({
  line,
  showImage,
  showQuantityControls
}: CartLineItemProps) {
  const merchandise = line.merchandise as unknown as CartMerchandise;

  if (!merchandise) return null;

  return (
    <div className={styles.lineItem}>
      {showImage && merchandise.image && (
        <div className={styles.imageContainer}>
          <img
            src={merchandise.image.url}
            alt={merchandise.image.altText || merchandise.title}
            className={styles.image}
          />
        </div>
      )}

      <div className={styles.lineItemContent}>
        <div className={styles.lineItemTitle}>
          {merchandise.product.title}
          {merchandise.title !== 'Default Title' && (
            <span className={styles.lineItemVariant}>
              {merchandise.title}
            </span>
          )}
        </div>

        {line.cost?.totalAmount && (
          <Money data={line.cost.totalAmount as MoneyV2} />
        )}

        {showQuantityControls && (
          <div className={styles.quantityControls}>
            <CartLineQuantityAdjustButton adjust="decrease">
              -
            </CartLineQuantityAdjustButton>
            <CartLineQuantity />
            <CartLineQuantityAdjustButton adjust="increase">
              +
            </CartLineQuantityAdjustButton>
          </div>
        )}
      </div>
    </div>
  );
}
