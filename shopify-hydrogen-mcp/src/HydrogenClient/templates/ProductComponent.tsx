import { 
  ProductProvider,
  Money,
  ShopifyAnalyticsProduct,
  useProduct
} from '@shopify/hydrogen-react';
import type { 
  Product,
  ProductVariant,
  Image,
  MediaConnection,
  ProductOption
} from '@shopify/hydrogen-react/storefront-api-types';
import styles from './ProductComponent.module.css';

export interface COMPONENT_NAMEProps {
  product: Product;
  showGallery?: boolean;
  showVariants?: boolean;
  showAddToCart?: boolean;
}

export default function COMPONENT_NAME({ 
  product,
  showGallery = true,
  showVariants = true,
  showAddToCart = true
}: COMPONENT_NAMEProps) {
  if (!product) return null;

  return (
    <ProductProvider data={product}>
      <ProductContent 
        showGallery={showGallery}
        showVariants={showVariants}
        showAddToCart={showAddToCart}
      />
    </ProductProvider>
  );
}

interface MediaItem {
  id: string;
  image?: {
    url: string;
    altText?: string | null;
  } | null;
}

interface ProductContentProps {
  showGallery: boolean;
  showVariants: boolean;
  showAddToCart: boolean;
}

interface ProductOptionWithValue extends ProductOption {
  value?: string;
}

function ProductContent({
  showGallery,
  showVariants,
  showAddToCart
}: ProductContentProps) {
  const { 
    product,
    selectedVariant,
    options,
  } = useProduct();

  if (!product) return null;

  const media = (product.media?.nodes || []) as MediaItem[];
  const productOptions = (product.options || []) as ProductOption[];

  return (
    <div className={styles.container}>
      {showGallery && media.length > 0 && (
        <div className={styles.gallery}>
          {media.map((item: MediaItem, index: number) => (
            <img
              key={`${item.id}-${index}`}
              src={item.image?.url}
              alt={item.image?.altText || product.title}
              className={styles.image}
            />
          ))}
        </div>
      )}
      
      <div className={styles.details}>
        <h1 className={styles.title}>{product.title}</h1>
        
        {product.descriptionHtml && (
          <div 
            className={styles.description}
            dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
          />
        )}

        {selectedVariant?.price && (
          <div className={styles.price}>
            <Money data={selectedVariant.price} />
          </div>
        )}

        {showVariants && productOptions.length > 0 && (
          <div className={styles.options}>
            {productOptions.map((option: ProductOption) => {
              const selectedOption = options?.find(
                opt => opt?.name === option.name
              ) as ProductOptionWithValue | undefined;

              return (
                <div key={option.name} className={styles.optionGroup}>
                  <h3 className={styles.optionTitle}>{option.name}</h3>
                  <div className={styles.optionValues}>
                    {option.values?.map((value: string) => (
                      <button
                        key={value}
                        className={styles.optionValue}
                        data-selected={selectedOption?.value === value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showAddToCart && selectedVariant && (
          <button
            className={styles.addToCart}
            disabled={!selectedVariant.availableForSale}
          >
            {selectedVariant.availableForSale ? 'Add to Cart' : 'Sold Out'}
          </button>
        )}
      </div>
    </div>
  );
}
