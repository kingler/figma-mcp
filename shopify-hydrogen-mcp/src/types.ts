import type { 
  Cart,
  CartLine,
  Collection,
  Product,
  MoneyV2,
  Image,
  ProductVariantConnection,
  ProductConnection,
  CartCost,
  Maybe,
  ProductVariant
} from '@shopify/hydrogen-react/storefront-api-types';

// Component Types
export type ComponentType = 'product' | 'collection' | 'cart';
export type StylingOption = 'tailwind' | 'css-modules';

// Component Configurations
export interface ComponentConfig {
  name: string;
  type: ComponentType;
  features: string[];
  styling: StylingOption;
  outputDir: string;
}

// Shopify Partial Types (for component props)
export interface PartialProduct {
  id: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  handle: string;
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      price: MoneyV2;
      image?: Maybe<Image>;
      availableForSale: boolean;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  images?: {
    nodes: Image[];
  };
}

export interface PartialCollection {
  id: string;
  title: string;
  description?: string;
  handle: string;
  image?: Maybe<Image>;
  products: {
    nodes: PartialProduct[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
}

export interface PartialCart {
  id: string;
  lines: CartLine[];
  cost: {
    subtotalAmount: MoneyV2;
    totalAmount: MoneyV2;
    totalTaxAmount?: MoneyV2;
    checkoutChargeAmount: MoneyV2;
    subtotalAmountEstimated: boolean;
    totalAmountEstimated: boolean;
    totalDutyAmountEstimated: boolean;
    totalTaxAmountEstimated: boolean;
  };
  totalQuantity: number;
}

// Response Types
export interface ComponentGenerationResult {
  path: string;
  files: string[];
}

// Error Types
export class HydrogenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HydrogenError';
  }
}

// GraphQL Types
export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations: Array<{
      line: number;
      column: number;
    }>;
    path: string[];
  }>;
}

export interface ShopInfoResponse {
  shop: {
    name: string;
    primaryDomain: {
      url: string;
    };
  };
}

// Feature Types
export interface ProductFeatures {
  showGallery: boolean;
  showVariants: boolean;
  showAddToCart: boolean;
}

export interface CollectionFeatures {
  showProductPrices: boolean;
  showProductImages: boolean;
  gridColumns: 2 | 3 | 4;
}

export interface CartFeatures {
  showImages: boolean;
  showQuantityControls: boolean;
  enableCheckout: boolean;
}

// Client Types
export interface StorefrontClientConfig {
  storeDomain: string;
  publicStorefrontToken: string;
  privateStorefrontToken?: string;
}
