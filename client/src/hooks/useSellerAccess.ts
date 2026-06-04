import { useCallback } from 'react';
import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export const useSellerAccess = () => {
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = !!user;

  /** Route guards: only accounts with role `seller` may enter seller dashboard shell. */
  const isSeller = user?.role === 'seller';

  const isSellerPending = user?.seller_status === 'pending';

  const canAccessSellerPage = isSeller;

  return {
    user,
    isLoggedIn,
    isSeller,
    isSellerPending: !!isSellerPending,
    canAccessSellerPage,
  };
};

export const useHandleSellerLink = () => {
  const navigate = useNavigate();
  const { isLoggedIn, isSeller } = useSellerAccess();

  const handleSellerLink = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, path: string) => {
      e.preventDefault();

      if (!isLoggedIn) {
        navigate('/become-seller', {
          state: { reason: 'login_required', intended: path },
        });
        return;
      }

      if (!isSeller) {
        navigate('/become-seller', {
          state: { reason: 'not_seller', intended: path },
        });
        return;
      }

      navigate(path);
    },
    [isLoggedIn, isSeller, navigate],
  );

  return handleSellerLink;
};
