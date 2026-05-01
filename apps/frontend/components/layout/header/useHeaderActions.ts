'use client';

import { useState } from 'react';

export function useHeaderActions() {
  const [searchQuery, setSearchQuery] = useState('');

  function handleSearch(query: string) {
    setSearchQuery(query);
  }

  return {
    searchQuery,
    handleSearch,
  };
}
