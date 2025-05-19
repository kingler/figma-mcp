import React, { useState, useEffect } from 'react';
import { useProduct, ProductProvider, Image, Money, AddToCartButton } from '@shopify/hydrogen-react';
import styles from './ProductDisplay.module.css';

interface ProductDisplayProps {
  productId: string;
}

export default function ProductDisplay({ productId }: ProductDisplayProps) {
  return (
    <ProductProvider data={{ id: productId }}>
      <ProductContent productId={productId} />
    </ProductProvider>
  );
}

function ProductContent({ productId }: ProductDisplayProps) {
  const { product, selectedVariant } = useProduct();
  const [loadingState, setLoadingState] = useState<'loading' | 'error' | 'success'>('loading');
  
  useEffect(() => {
    // Check if product and variant data is available
    const timer = setTimeout(() => {
      if (product && selectedVariant) {
        setLoadingState('success');
      } else {
        setLoadingState('error');
      }
    }, 2000); // Give it some time to load
    
    return () => clearTimeout(timer);
  }, [product, selectedVariant]);

  if (loadingState === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading product information...</p>
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className={styles.error}>
        <h3>Unable to load product</h3>
        <p>There was an issue loading the product information. This could be due to:</p>
        <ul>
          <li>The product ID may be invalid or not exist in the store</li>
          <li>There might be an issue with the Shopify Storefront API connection</li>
          <li>The API token might not have sufficient permissions</li>
        </ul>
        <p>Product ID: {productId}</p>
      </div>
    );
  }

  // At this point, we know product and selectedVariant exist
  if (!product || !selectedVariant) {
    return null; // TypeScript safety
  }

  return (
    <div className={styles.container}>
      <div className={styles.gallery}>
        {product.images?.nodes && product.images.nodes.length > 0 ? (
          product.images.nodes.map((image) => (
            image && (
              <div key={image.id} className={styles.imageContainer}>
                <Image 
                  data={image} 
                  className={styles.image}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="eager"
                />
              </div>
            )
          ))
        ) : (
          <div className={styles.noImages}>No product images available</div>
        )}
      </div>
      
      <div className={styles.details}>
        <h1 className={styles.title}>{product.title}</h1>
        
        <div className={styles.price}>
          {selectedVariant.price && <Money data={selectedVariant.price} />}
        </div>
        
        <div className={styles.description}>
          {product.descriptionHtml ? (
            <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
          ) : (
            <p>No product description available.</p>
          )}
        </div>
        
        <div className={styles.actions}>
          <AddToCartButton
            variantId={selectedVariant.id}
            quantity={1}
            className={styles.addToCartButton}
          >
            Add to Cart
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}
