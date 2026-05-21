export function verifyPickupProof(params: {
  expectedQrToken?: string;
  expectedOtp?: string;
  providedQrToken?: string;
  providedOtp?: string;
  gps?: { lat?: number; lng?: number };
  sellerScan?: boolean;
  faceVerified?: boolean;
  requireFace?: boolean;
}) {
  const qr = Boolean(params.expectedQrToken) && params.expectedQrToken === params.providedQrToken;
  const otp = Boolean(params.expectedOtp) && params.expectedOtp === params.providedOtp;
  const gps = Number.isFinite(params.gps?.lat) && Number.isFinite(params.gps?.lng);
  const sellerScan = Boolean(params.sellerScan);
  const face = params.requireFace ? Boolean(params.faceVerified) : true;

  const ok = qr && otp && gps && sellerScan && face;
  return {
    ok,
    checks: {
      qr,
      otp,
      gps,
      sellerScan,
      face,
    },
  };
}
