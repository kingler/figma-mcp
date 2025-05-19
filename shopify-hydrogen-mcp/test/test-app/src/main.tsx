import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { ShopifyProvider } from '@shopify/hydrogen-react';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ShopifyProvider 
      storeDomain={import.meta.env.VITE_SHOPIFY_STORE_DOMAIN}
      storefrontToken={import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN}
      storefrontApiVersion="2025-01"
      countryIsoCode="US"
      languageIsoCode="EN"
    >
      <App />
    </ShopifyProvider>
  </React.StrictMode>
);
