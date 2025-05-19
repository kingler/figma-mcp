import { 
  Money,
  Image,
  ProductProvider
} from '@shopify/hydrogen-react';
import type { 
  Collection,
  Product
} from '@shopify/hydrogen-react/storefront-api-types';
import styles from './CollectionComponent.module.css';

export interface COMPONENT_NAMEProps {
  collection: Collection;
  showProductPrices?: boolean;
  showProductImages?: boolean;
  gridColumns?: 2 | 3 | 4;
}

export default function COMPONENT_NAME({ 
  collection,
  showProductPrices = true,
  showProductImages = true,
  gridColumns = 3
}: COMPONENT_NAMEProps) {
  if (!collection) return null;

  const products = collection.products?.nodes || [];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>{collection.title}</h1>
        {collection.description && (
          <div className={styles.description}>
            {collection.description}
          </div>
        )}
      </header>

      <div 
        className={styles.grid}
        style={{ 
          '--grid-columns': gridColumns 
        } as React.CSSProperties}
      >
        {products.map((product: Product) => (
          <ProductCard
            key={product.id}
            product={product}
            showPrice={showProductPrices}
            showImage={showProductImages}
          />
        ))}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  showPrice: boolean;
  showImage: boolean;
}

function ProductCard({ product, showPrice, showImage }: ProductCardProps) {
  const firstVariant = product.variants?.nodes?.[0];
  const firstImage = product.images?.nodes?.[0];

  return (
    <div className={styles.productCard}>
      {showImage && firstImage && (
        <div className={styles.imageContainer}>
          <Image
            data={firstImage}
            className={styles.image}
            sizes="(min-width: 768px) 33vw, 50vw"
            loading="lazy"
          />
        </div>
      )}

      <div className={styles.productInfo}>
        <h2 className={styles.productTitle}>{product.title}</h2>
        
        {showPrice && firstVariant?.price && (
          <div className={styles.productPrice}>
            <Money data={firstVariant.price} />
          </div>
        )}
      </div>
    </div>
  );
}
