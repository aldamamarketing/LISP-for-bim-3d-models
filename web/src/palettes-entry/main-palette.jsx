import React from 'react';
import { createRoot } from 'react-dom/client';
import UnifiedPalette from '../components/UnifiedPalette.jsx';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<UnifiedPalette />);
