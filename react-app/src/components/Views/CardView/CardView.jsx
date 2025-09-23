import React from 'react';
import InfluencerCard from './InfluencerCard';

function CardView({ data, onShowDetail, onShowVideo, onDataUpdate }) {
  return (
    <div id="cardView" className="view-container active">
      <div className="cards-grid" id="cardsContainer">
        {data.map((item) => (
          <InfluencerCard
            key={item.id}
            influencer={item}
            onShowDetail={onShowDetail}
            onShowVideo={onShowVideo}
            onDataUpdate={onDataUpdate}
          />
        ))}
      </div>
    </div>
  );
}

export default CardView;