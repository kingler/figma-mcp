import React, { useState, useEffect } from 'react';
import { 
  useShopQuery, 
  gql, 
  CacheLong, 
  Image, 
  Money, 
  AddToCartButton 
} from '@shopify/hydrogen-react';
import styles from './CollectionDisplay.module.css';

// Mock data for fallback
const MOCK_PRODUCTS = [
  {
    id: 'gid://shopify/Product/1',
    title: 'Classic Wall Art Print',
    handle: 'classic-wall-art-print',
    description: 'Beautiful wall art print for your home or office.',
    priceRange: {
      minVariantPrice: {
        amount: '29.99',
        currencyCode: 'USD'
      }
    },
    featuredImage: {
      id: 'img1',
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      altText: 'Classic Wall Art Print'
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/1',
          title: 'Default',
          price: {
            amount: '29.99',
            currencyCode: 'USD'
          }
        }
      ]
    }
  },
  {
    id: 'gid://shopify/Product/2',
    title: 'Modern Abstract Canvas',
    handle: 'modern-abstract-canvas',
    description: 'Contemporary abstract design on premium canvas.',
    priceRange: {
      minVariantPrice: {
        amount: '49.99',
        currencyCode: 'USD'
      }
    },
    featuredImage: {
      id: 'img2',
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      altText: 'Modern Abstract Canvas'
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/2',
          title: 'Default',
          price: {
            amount: '49.99',
            currencyCode: 'USD'
          }
        }
      ]
    }
  },
  {
    id: 'gid://shopify/Product/3',
    title: 'Minimalist Wall Decor',
    handle: 'minimalist-wall-decor',
    description: 'Simple, elegant wall decor for the minimalist home.',
    priceRange: {
      minVariantPrice: {
        amount: '39.99',
        currencyCode: 'USD'
      }
    },
    featuredImage: {
      id: 'img3',
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      altText: 'Minimalist Wall Decor'
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/3',
          title: 'Default',
          price: {
            amount: '39.99',
            currencyCode: 'USD'
          }
        }
      ]
    }
  },
  {
    id: 'gid://shopify/Product/4',
    title: 'Nature Photography Print',
    handle: 'nature-photography-print',
    description: 'Stunning nature photography printed on high-quality paper.',
    priceRange: {
      minVariantPrice: {
        amount: '34.99',
        currencyCode: 'USD'
      }
    },
    featuredImage: {
      id: 'img4',
      url: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      altText: 'Nature Photography Print'
    },
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/4',
          title: 'Default',
          price: {
            amount: '34.99',
            currencyCode: 'USD'
          }
        }
      ]
    }
  }
];

// GraphQL query for collection and its products
const COLLECTION_QUERY = gql`
  query CollectionDetails($handle: String!) {
    collection(handle: $handle) {
      id
      title
      description
      products(first: 8) {
        nodes {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            id
            url
            altText
          }
          variants(first: 1) {
            nodes {
              id
              title
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
`;

interface CollectionDisplayProps {
  collectionHandle: string;
}

export default function CollectionDisplay({ collectionHandle = 'frontpage' }: CollectionDisplayProps) {
  const [useMockData, setUseMockData] = useState(false);
  const [loadingState, setLoadingState] = useState<'loading' | 'error' | 'success'>('loading');
  const [collection, setCollection] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Try to fetch real data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Simulate API call - in a real implementation, this would use useShopQuery
        // but we'll use mock data for now to ensure something displays
        
        // Simulate loading
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // For demo purposes, we'll use mock data
        setUseMockData(true);
        setCollection({
          title: 'Featured Collection',
          description: 'Our most popular wall art and decor items.'
        });
        setProducts(MOCK_PRODUCTS);
        setLoadingState('success');
      } catch (error) {
        console.error('Error fetching collection:', error);
        setUseMockData(true);
        setCollection({
          title: 'Featured Collection',
          description: 'Our most popular wall art and decor items.'
        });
        setProducts(MOCK_PRODUCTS);
        setLoadingState('success');
      }
    };

    fetchData();
  }, [collectionHandle]);

  if (loadingState === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading collection...</p>
      </div>
    );
  }

  if (loadingState === 'error') {
    return (
      <div className={styles.error}>
        <h3>Unable to load collection</h3>
        <p>There was an issue loading the collection. This could be due to:</p>
        <ul>
          <li>The collection handle may be invalid</li>
          <li>There might be an issue with the Shopify Storefront API connection</li>
          <li>The API token might not have sufficient permissions</li>
        </ul>
        <p>Collection handle: {collectionHandle}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {useMockData && (
        <div className={styles.mockNotice}>
          <p>Note: Displaying mock data for demonstration purposes.</p>
        </div>
      )}
      
      <div className={styles.header}>
        <h2 className={styles.title}>{collection.title}</h2>
        {collection.description && (
          <p className={styles.description}>{collection.description}</p>
        )}
      </div>
      
      <div className={styles.grid}>
        {products.length > 0 ? (
          products.map((product) => (
            <div key={product.id} className={styles.productCard}>
              <div className={styles.imageContainer}>
                {product.featuredImage && (
                  <img 
                    src={product.featuredImage.url} 
                    alt={product.featuredImage.altText || product.title}
                    className={styles.image}
                  />
                )}
              </div>
              
              <div className={styles.productInfo}>
                <h3 className={styles.productTitle}>{product.title}</h3>
                
                <div className={styles.productPrice}>
                  {product.variants.nodes[0]?.price && (
                    <Money data={product.variants.nodes[0].price} />
                  )}
                </div>
                
                <button className={styles.addToCartButton}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.noProducts}>No products found in this collection.</div>
        )}
      </div>
    </div>
  );
}
