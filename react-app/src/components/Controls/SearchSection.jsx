import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, X } from 'lucide-react';
import './SearchSection.css';

function SearchSection({ searchTerm, onSearch, onClearSearch }) {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  const handleSearch = () => {
    onSearch(localSearchTerm);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClear = () => {
    setLocalSearchTerm('');
    onClearSearch();
  };

  return (
    <div className="search-section-shadcn">
      <Input
        type="text"
        placeholder="계정 ID로 검색..."
        value={localSearchTerm}
        onChange={(e) => setLocalSearchTerm(e.target.value)}
        onKeyPress={handleKeyPress}
        className="search-input-shadcn"
      />
      <div className="search-buttons-shadcn">
        <Button
          onClick={handleSearch}
          size="sm"
          className="search-btn"
        >
          <Search className="w-2.5 h-2.5 mr-0.5" />
          검색
        </Button>
        <Button
          onClick={handleClear}
          variant="outline"
          size="sm"
          className="clear-btn"
        >
          <X className="w-2.5 h-2.5 mr-0.5" />
          초기화
        </Button>
      </div>
    </div>
  );
}

export default SearchSection;