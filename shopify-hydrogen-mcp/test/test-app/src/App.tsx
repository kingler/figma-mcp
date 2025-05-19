import React, { useState } from 'react';
import { useShop } from '@shopify/hydrogen-react';
import './styles/App.css';
import ProductDisplay from './components/ProductDisplay';

// Example product ID from the store
const EXAMPLE_PRODUCT_ID = 'gid://shopify/Product/6857243132988';

export default function App() {
  const { storeDomain } = useShop();
  const [productId, setProductId] = useState<string>(EXAMPLE_PRODUCT_ID);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Shopify Hydrogen Test App</h1>
        <p>Connected to store: {storeDomain}</p>
      </header>
      <main className="app-main">
        <div className="test-container">
          <h2>Component Test Area</h2>
          <p className="component-description">
            This is a demonstration of a Shopify Hydrogen component generated using our MCP server.
            The component below is a product display that connects to the Shopify Storefront API.
          </p>
          
          <div className="component-showcase">
            <ProductDisplay productId={productId} />
          </div>
        </div>
      </main>
    </div>
  );
}
