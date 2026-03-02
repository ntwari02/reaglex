import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SellerList from './sellers/SellerList';
import SellerProfile from './sellers/SellerProfile';

export default function SellerStoreManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  // Check if we're viewing a specific seller profile
  const sellerIdFromUrl = new URLSearchParams(location.search).get('seller');

  React.useEffect(() => {
    if (sellerIdFromUrl) {
      setSelectedSellerId(sellerIdFromUrl);
    }
  }, [sellerIdFromUrl]);

  const handleViewSeller = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    navigate(`/admin/sellers?seller=${sellerId}`);
  };

  const handleBackToList = () => {
    setSelectedSellerId(null);
    navigate('/admin/sellers');
  };

  if (selectedSellerId || sellerIdFromUrl) {
    return (
      <SellerProfile
        sellerId={selectedSellerId || sellerIdFromUrl || ''}
        onBack={handleBackToList}
      />
    );
  }

  return <SellerList onViewSeller={handleViewSeller} />;
}
