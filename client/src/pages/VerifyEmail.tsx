import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email') || '';
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('tab', 'login');
    params.set('verifyEmail', '1');
    if (emailFromUrl) params.set('email', emailFromUrl);
    navigate(`/auth?${params.toString()}`, { replace: true });
  }, [emailFromUrl, navigate]);

  return null;
}
