import React, { useState, useEffect } from 'react';

export default function MultiFilter({ storageKey, placeholder, onFilterChange }) {
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setTags(parsed);
        onFilterChange(parsed);
      }
    } catch (e) {
      console.error('Failed to load filters', e);
    }
  }, [storageKey]); // onFilterChange deliberately omitted to prevent loops

  // Save to LocalStorage
  const saveTags = (newTags) => {
    setTags(newTags);
    onFilterChange(newTags);
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
        saveTags([...tags, val]);
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
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: '#222',
      border: '1px solid #333',
      borderRadius: '4px',
      alignItems: 'center',
      minHeight: '32px'
    }}>
      {tags.map(tag => (
        <div key={tag} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: 'rgba(242,109,33,0.15)',
          border: '1px solid rgba(242,109,33,0.3)',
          color: 'var(--tmd-orange)',
          padding: '2px 6px',
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
              fontSize: '0.7rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      ))}
      <input
        type="text"
        placeholder={tags.length === 0 ? placeholder : ''}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          minWidth: '60px',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '0.8rem',
          outline: 'none',
          padding: '2px 0'
        }}
      />
    </div>
  );
}
