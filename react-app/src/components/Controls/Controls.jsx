import React from 'react';
import ViewToggle from './ViewToggle';

function Controls({
  currentView,
  onViewChange
}) {
  return (
    <div className="controls">
      <ViewToggle
        currentView={currentView}
        onViewChange={onViewChange}
      />
    </div>
  );
}

export default Controls;