import React, { useState, useEffect } from 'react';

export default function MultiFilter({ storageKey, placeholder, onFilterChange }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTags(parsed);
        // Call onFilterChange immediately with the parsed tags
        onFilterChange(parsed);
      }
    } catch (e) {
      console.error('Failed to load filters', e);
    }
  }, [storageKey]); 

  // Compute active filters combining tags + current input text
  const notifyFilterChange = (currentTags, currentInput) => {
    const text = currentInput.trim().toLowerCase();
    const active = [...currentTags];
    if (text && !active.includes(text)) {
      active.push(text);
    }
    onFilterChange(active);
  };

  const handleInputChange = (e) => {
    const newVal = e.target.value;
    setInputValue(newVal);
    notifyFilterChange(tags, newVal);
  };

  const saveTags = (newTags) => {
    setTags(newTags);
    notifyFilterChange(newTags, inputValue);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newTags));
    } catch (e) {
      console.error('Failed to save filters', e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const val = inputValue.trim().toLowerCase();
      if (!tags.includes(val)) {
        const newTags = [...tags, val];
        setTags(newTags);
        // Input is cleared, so notify only with newTags
        onFilterChange(newTags);
        try { localStorage.setItem(storageKey, JSON.stringify(newTags)); } catch (e) {}
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove last tag
      const newTags = [...tags];
      newTags.pop();
      saveTags(newTags);
    }
  };

  const removeTag = (tagToRemove) => {
    saveTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      alignItems: 'center'
    }}>
      {/* Search Input Box */}
      <input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        style={{
          flex: '1 1 180px',
          minWidth: '150px',
          backgroundColor: '#222',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          fontSize: '0.8rem',
          outline: 'none',
          padding: '6px 10px',
        }}
      />

      {/* Pills Container */}
      {tags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center',
          flex: '0 1 auto'
        }}>
          {tags.map(tag => (
            <div key={tag} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'rgba(242,109,33,0.15)',
              border: '1px solid rgba(242,109,33,0.3)',
              color: 'var(--tmd-orange)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.7rem'
            }}>
              <span>{tag}</span>
              <button
                onClick={() => removeTag(tag)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--tmd-orange)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem',
                  lineHeight: 1,
                  marginLeft: '2px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
