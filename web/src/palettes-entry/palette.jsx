import React from 'react';
import { createRoot } from 'react-dom/client';
import LispCommandPalette from '../components/LispCommandPalette.jsx';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<LispCommandPalette />);
