import React from 'react';
import { createRoot } from 'react-dom/client';
import ResourcePalette from '../components/ResourcePalette.jsx';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<ResourcePalette />);
