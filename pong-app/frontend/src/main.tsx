import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import App from './app';

console.log("React is mounting..."); // Add this line
let x = localStorage.getItem('token');
console.log('token:', x, 'isAuthenticated:', !!x); // Log the token and authentication status

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);