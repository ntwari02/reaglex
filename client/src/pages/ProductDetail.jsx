import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productKeys } from '../hooks/queries/productKeys';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Heart, Star, ChevronLeft, ChevronRight, ChevronDown,
  Truck, Shield, Plus, Minus, Share2, ZoomIn, Check,
  X, Link2, ThumbsUp, BadgeCheck, Package, RefreshCw,
  Zap, MessageCircle, Play,
} from 'lucide-react';
import './ProductDetail.css';
import BuyerLayout from '../components/buyer/BuyerLayout';
import ProductCard from '../components/ProductCard';
import PremiumAutoProductCarousel from '../components/home/PremiumAutoProductCarousel';
import RecentlyViewedRail from '../components/home/mobile/RecentlyViewedRail';
import ProductDeliveryEstimate from '../components/product/ProductDeliveryEstimate';
import { productAPI } from '../services/api';
import { homeFeedApi } from '../services/homeFeedApi';
import { useBuyerCart } from '../stores/buyerCartStore';
import { useRecentlyViewed } from '../stores/recentlyViewedStore';
import { useCurrencyPricing } from '../hooks/useCurrencyPricing';
import { PageSeo } from '../components/seo/PageSeo';
import { SERVER_URL } from '../lib/config';
import { getPreferredSiteOrigin } from '../lib/siteOrigin';
import { categoryNeedsColor, categoryNeedsSize } from '../constants/categoryAttributes';
import { productImageLayoutId } from '../motion/presets';
import LiveProductTeaser from '../components/live/LiveProductTeaser';
import { resolveMediaUrl, collectProductImages, isProductDetailPreview } from '../components/product/productPreviewUtils';
import { cacheProductDetail } from '../hooks/queries/prefetchProduct';
import ProductColorRail from '../components/product/ProductColorRail';
import ProductReviewGalleryRail from '../components/product/ProductReviewGalleryRail';
import {
  buildProductColorOptions,
  buildProductDetailGallery,
  galleryIndexForColorOption,
  pickVariantForSelection,
  flattenReviewGalleryMedia,
  productPricingForVariant,
} from '../components/product/productDetailVariants';
import { resolveProductPriceUsd } from '../lib/resolveProductPrice';
import { queryClient } from '../lib/queryClient';
import '../styles/product-detail-ali.css';

const PRIMARY = 'var(--brand-primary)';
const ease = [0.25, 0.46, 0.45, 0.94];
const softEase = [0.22, 1, 0.36, 1];

/* ─── helpers ────────────────────────────────────────────────────────────── */
function resolveImage(src) {
  const fallback = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80';
  if (!src) return fallback;
  let c = src;
  if (typeof c === 'object') c = c?.src || c?.url || c?.image || c?.imageUrl || c?.path;
  if (typeof c !== 'string') return fallback;
  const t = c.trim();
  if (!t) return fallback;
  if (t.startsWith('http://') || t.startsWith('https://')) return t;
  if (t.startsWith('//')) return `https:${t}`;
  return `${SERVER_URL}${t.startsWith('/') ? t : `/${t}`}`;
}

/** Safe compare-at / was-price for product objects (avoids null dereference during load/refetch). */
function productOldPrice(p) {
  if (!p || typeof p !== 'object') return null;
  const v = p.compareAtPrice ?? p.originalPrice ?? p.compare_at_price ?? null;
  return v != null && Number(v) > 0 ? Number(v) : null;
}

/* ─── static data ────────────────────────────────────────────────────────── */
const FALLBACK_SIZES  = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const FALLBACK_COLORS = [
  { name: 'Midnight', hex: '#111827' },
  { name: 'Cloud',    hex: '#f1f5f9' },
  { name: 'Navy',     hex: '#1e3a5f' },
  { name: 'Ember',    hex: 'var(--brand-primary)' },
  { name: 'Sage',     hex: '#4ade80' },
];

const TABS = [
  { id: 'description',    label: 'Description'    },
  { id: 'specifications', label: 'Specifications' },
  { id: 'reviews',        label: 'Reviews'        },
  { id: 'qa',             label: 'Q & A'          },
];

const HIGHLIGHTS = [
  { icon: Package,   title: 'Free Shipping',    desc: 'On orders over $35',    color: 'var(--brand-primary)' },
  { icon: RefreshCw, title: '30-Day Returns',   desc: 'Unused items in original packaging', color: '#10b981' },
  { icon: Shield,    title: 'Buyer Protection', desc: 'Your money is safe',     color: '#6366f1' },
  { icon: Zap,       title: 'Fast Dispatch',    desc: 'Ships within 24 hours', color: '#f59e0b' },
];

/* ─── sub-components ─────────────────────────────────────────────────────── */

/** SVG grid mesh */
function GridMesh() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
      <defs>
        <pattern id="pd2-grid" width="52" height="52" patternUnits="userSpaceOnUse">
          <path d="M 52 0 L 0 0 0 52" fill="none" stroke="color-mix(in srgb, var(--brand-primary) 5.5%, transparent)" strokeWidth="1" />
        </pattern>
        <radialGradient id="pd2-fade" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stopColor="var(--bg-page)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--bg-page)" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#pd2-grid)" />
      <rect width="100%" height="100%" fill="url(#pd2-fade)" />
    </svg>
  );
}

/** Star row */
function Stars({ rating, size = 16 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i} size={size}
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke={i <= Math.round(rating) ? '#f59e0b' : '#d1d5db'}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main component
═══════════════════════════════════════════════════════════════════════════ */
export default function ProductDetail() {
  const { id: legacyId, slug: slugParam } = useParams();
  const navigate     = useNavigate();
  const location       = useLocation();
  const navigationType = useNavigationType();
  const productPreview = location.state?.productPreview;
  const addItem      = useBuyerCart((s) => s.addItem);
  const openCart     = useBuyerCart((s) => s.openCart);
  const cartItems    = useBuyerCart((s) => s.items);
  const cartCount    = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const currencyPricing = useCurrencyPricing();
  const addRecent    = useRecentlyViewed((s) => s.addProduct);
  const recentItems  = useRecentlyViewed((s) => s.items);

  /* ── state ── */
  const [product,      setProduct]      = useState(productPreview || null);
  const [related,      setRelated]      = useState([]);
  const [error,        setError]        = useState(null);
  const [activeImage,  setActiveImage]  = useState(0);
  const [quantity,     setQuantity]     = useState(1);
  const [wishlisted,   setWishlisted]   = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [addState,     setAddState]     = useState('idle');
  const [lightbox,     setLightbox]     = useState(false);
  const [tabIndex,     setTabIndex]     = useState(0);
  const [shared,       setShared]       = useState(false);
  const [shareOpen,    setShareOpen]    = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedColorKey, setSelectedColorKey] = useState('');
  const [expandedQa,   setExpandedQa]   = useState(null);
  const [reviewPage,   setReviewPage]   = useState(0);
  const [voteUp,       setVoteUp]       = useState(187);
  const [descExpanded, setDescExpanded] = useState(false);
  const [touchStartX, setTouchStartX] = useState(null);
  const [countdownNow, setCountdownNow] = useState(Date.now());
  /** Mobile stacked sections: which detail accordion is open (null = all collapsed) */
  const [mobileDetailOpen, setMobileDetailOpen] = useState('description');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [selectedVariantSku, setSelectedVariantSku] = useState('');
  const [openCommitmentIdx, setOpenCommitmentIdx] = useState(null);
  const [openDetailIdx, setOpenDetailIdx] = useState(null);
  const [heroVideoPlaying, setHeroVideoPlaying] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);

  /* ── refs ── */
  const ctaRef = useRef(null);
  const relatedScrollRef = useRef(null);
  const trackedProductRef = useRef(null);
  const [relatedPaused, setRelatedPaused] = useState(false);
  const hasInstantPreview = Boolean(productPreview?.image || productPreview?.title);

  /* ── SEO ── */
  const resolvedId   = product?._id || product?.id || legacyId || null;
  const title        = product?.title || product?.name || productPreview?.title || 'Product';
  const category     = product?.category || 'General';
  const images       = useMemo(() => collectProductImages(product), [product]);
  const origin       = typeof window !== 'undefined' ? getPreferredSiteOrigin() : '';
  const canonicalPath = useMemo(() => {
    if (product?.slug) return `/product/${encodeURIComponent(product.slug)}`;
    if (product && (product._id || product.id))
      return `/products/${encodeURIComponent(product._id || product.id)}`;
    if (slugParam) return `/product/${encodeURIComponent(slugParam)}`;
    if (legacyId) return `/products/${encodeURIComponent(legacyId)}`;
    return '/products';
  }, [product, slugParam, legacyId]);
  const canonicalUrl = origin ? `${origin}${canonicalPath}` : canonicalPath;
  const primaryImage = useMemo(() => (images?.[0] ? resolveImage(images[0]) : undefined), [images]);
  const imageLayoutId = productImageLayoutId(product);
  /**
   * Prefer the server-rendered dynamic OG image for richer social shares; fall back to first product image.
   * `SERVER_URL` is the API origin (matches `/api/public/og/product/:slug`).
   */
  const dynamicOgImage = useMemo(() => {
    if (!product?.slug) return undefined;
    const base = String(SERVER_URL || '').replace(/\/$/, '');
    return base ? `${base}/api/public/og/product/${encodeURIComponent(product.slug)}` : undefined;
  }, [product?.slug]);
  const socialImage = dynamicOgImage || primaryImage;
  const seoBundle = useMemo(() => {
    if (!product) {
      return {
        title: slugParam ? `${slugParam.replace(/-/g, ' ')} | Spacilly` : 'Product | Spacilly',
        description: 'View product details on Spacilly marketplace.',
        keywords: undefined,
        jsonLd: undefined,
      };
    }
    const price = resolveProductPriceUsd(product);
    const stock = product?.stockQuantity ?? product?.stock ?? 0;
    const rating = Number(product?.ratingAverage || product?.averageRating || product?.rating || 0);
    const reviewsCount = Number(product?.reviewCount || product?.totalReviews || 0);
    const breadcrumbs = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: origin ? `${origin}/` : '/',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Products',
          item: origin ? `${origin}/products` : '/products',
        },
        ...(category
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: category,
                item: (() => {
                  const slug = product?.categorySlug;
                  const path = slug ? `/category/${encodeURIComponent(slug)}` : `/products?category=${encodeURIComponent(category)}`;
                  return origin ? `${origin}${path}` : path;
                })(),
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: category ? 4 : 3,
          name: title,
          item: canonicalUrl,
        },
      ],
    };
    const currency = product?.currency || product?.listingCurrency || 'USD';
    const shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: product?.flatShippingRate ?? 0,
        currency,
      },
      shippingDestination: {
        '@type': 'DefinedRegion',
        addressCountry: product?.shipsToCountry || product?.country || 'RW',
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: Number(product?.handlingDays || 1),
          unitCode: 'DAY',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: Number(product?.transitDaysMin || 2),
          maxValue: Number(product?.transitDaysMax || 7),
          unitCode: 'DAY',
        },
      },
    };
    const returnPolicy = {
      '@type': 'MerchantReturnPolicy',
      applicableCountry: product?.shipsToCountry || 'RW',
      returnPolicyCategory:
        product?.returnPolicy === 'no-returns'
          ? 'https://schema.org/MerchantReturnNotPermitted'
          : 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: Number(product?.returnWindowDays || 30),
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/FreeReturn',
    };
    const reviewList = Array.isArray(product?.reviews)
      ? product.reviews.slice(0, 5).map((r) => ({
          '@type': 'Review',
          author: { '@type': 'Person', name: r?.author || r?.userName || 'Spacilly shopper' },
          datePublished: r?.createdAt || undefined,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: Number(r?.rating || 5),
            bestRating: 5,
          },
          reviewBody: String(r?.comment || r?.body || '').slice(0, 500),
        }))
      : [];
    const productLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: title,
      description: (product?.description || '').replace(/<[^>]+>/g, '').slice(0, 500),
      sku: product?.sku || String(resolvedId || ''),
      ...(product?.gtin
        ? { gtin: String(product.gtin), gtin13: String(product.gtin) }
        : {}),
      ...(product?.mpn ? { mpn: String(product.mpn) } : {}),
      image: images.slice(0, 6).map(resolveImage),
      brand: { '@type': 'Brand', name: product?.brand || 'Spacilly' },
      category,
      itemCondition:
        product?.condition === 'used'
          ? 'https://schema.org/UsedCondition'
          : product?.condition === 'refurbished'
            ? 'https://schema.org/RefurbishedCondition'
            : 'https://schema.org/NewCondition',
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency: currency,
        availability:
          stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url: canonicalUrl,
        priceValidUntil:
          product?.priceValidUntil ||
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
        seller: {
          '@type': 'Organization',
          name: product?.sellerName || product?.brand || 'Spacilly',
        },
        shippingDetails,
        hasMerchantReturnPolicy: returnPolicy,
      },
      ...(rating || reviewsCount
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating,
              reviewCount: reviewsCount,
              bestRating: 5,
            },
          }
        : {}),
      ...(reviewList.length ? { review: reviewList } : {}),
    };

    return {
      title: product?.seoTitle || `${title} | Spacilly`,
      description:
        product?.seoDescription ||
        product?.description?.replace?.(/<[^>]+>/g, '')?.slice?.(0, 160) ||
        `Buy ${title} on Spacilly.`,
      keywords: product?.seoKeywords,
      jsonLd: [breadcrumbs, productLd],
    };
  }, [product, canonicalUrl, title, category, images, primaryImage, origin, slugParam, resolvedId]);

  const pdpSeo = (
    <PageSeo
      title={seoBundle.title}
      description={seoBundle.description}
      canonicalUrl={canonicalUrl}
      ogImage={socialImage}
      twitterImage={socialImage}
      ogType={product ? 'product' : 'website'}
      keywords={seoBundle.keywords}
      jsonLd={seoBundle.jsonLd}
    />
  );

  const productQueryKey = slugParam
    ? productKeys.detailBySlug(slugParam)
    : legacyId
      ? productKeys.detailById(String(legacyId))
      : ['product', 'none'];

  const {
    data: fetchedProduct,
    isPending: productPending,
    isFetching: productFetching,
    isError: productQueryError,
  } = useQuery({
    queryKey: productQueryKey,
    queryFn: async () => {
      const data = slugParam
        ? await productAPI.getProductBySlug(slugParam)
        : await productAPI.getProductById(String(legacyId));
      const product = data.product || data;
      cacheProductDetail(product);
      return product;
    },
    enabled: Boolean(slugParam || legacyId),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  const detailsReady = Boolean(
    fetchedProduct &&
    typeof fetchedProduct === 'object' &&
    !isProductDetailPreview(fetchedProduct),
  );

  const displayProduct = useMemo(() => {
    if (detailsReady) return fetchedProduct;
    if (product && !isProductDetailPreview(product)) return product;
    if (productPreview) return productPreview;
    if (product) return product;
    if (fetchedProduct) return fetchedProduct;
    return null;
  }, [detailsReady, fetchedProduct, product, productPreview]);

  const hasPageShell = Boolean(displayProduct) || productPending || productFetching;
  const p = displayProduct || product || productPreview || {};

  useEffect(() => {
    trackedProductRef.current = null;
  }, [slugParam, legacyId]);

  useEffect(() => {
    if (!slugParam && !legacyId) return;
    if (navigationType === 'POP') return;
    window.scrollTo({ top: 0, behavior: 'auto' });
    setActiveImage(0);
    setTitleExpanded(false);
  }, [slugParam, legacyId, navigationType]);

  useEffect(() => {
    if (!fetchedProduct || typeof fetchedProduct !== 'object') return;
    if (isProductDetailPreview(fetchedProduct)) return;
    const full = fetchedProduct;
    const rid = String(full._id || full.id || '');

    setProduct((prev) => {
      if (prev && rid && String(prev._id || prev.id) === rid && !isProductDetailPreview(prev)) {
        return prev;
      }
      return full;
    });
    setError(null);
    setWishlisted(!!full?.wishlisted);
    setWishlistCount(Number(full?.wishlistCount || 0));
    addRecent(full);

    if (rid && trackedProductRef.current !== rid) {
      trackedProductRef.current = rid;
      productAPI.trackView(rid).catch(() => null);
      homeFeedApi.track({ type: 'view', productId: rid });
    }

    if (legacyId && full.slug && location.pathname.startsWith('/products/')) {
      cacheProductDetail(full);
      const canonical = `/product/${encodeURIComponent(String(full.slug).trim())}`;
      navigate(canonical, { replace: true, state: location.state });
    }
  }, [fetchedProduct, legacyId, location.pathname, location.state, navigate, addRecent]);

  useEffect(() => {
    if (productQueryError) {
      setError('Product not found.');
      setProduct(null);
    }
  }, [productQueryError]);

  useEffect(() => {
    const excludeId = String(product?._id || product?.id || legacyId || '');
    if (!excludeId) return;
    productAPI
      .getProducts({ limit: 12 })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.products || data.items || [];
        setRelated(
          items
            .filter((p) => p && typeof p === 'object' && String(p._id || p.id) !== excludeId)
            .slice(0, 8)
        );
      })
      .catch(() => {});
  }, [product?._id, product?.id, legacyId]);

  // Wishlist status/count (guest-safe; auth users also get `wishlisted`)
  useEffect(() => {
    const apiId = product?._id || product?.id || legacyId;
    if (!apiId) return undefined;
    let alive = true;
    productAPI
      .getWishlistStatus(String(apiId))
      .then((r) => {
        if (!alive) return;
        setWishlisted(!!r?.wishlisted);
        setWishlistCount(Number(r?.wishlistCount || 0));
      })
      .catch(() => null);
    return () => { alive = false; };
  }, [product?._id, product?.id, legacyId]);

  useEffect(() => {
    if (!product) return;
    const productSizes = Array.isArray(product.sizes) ? product.sizes.filter(Boolean) : [];
    const productColors = Array.isArray(product.colors) ? product.colors.filter(Boolean) : [];
    setSelectedSize((prev) => prev || productSizes[0] || FALLBACK_SIZES[2] || '');
    setSelectedColor((prev) => prev || productColors[0] || FALLBACK_COLORS[0]?.hex || '');
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const maxAllowed = Math.max(1, product.stockQuantity ?? product.stock ?? 99);
    setQuantity((q) => Math.min(maxAllowed, Math.max(1, q)));
  }, [product?.stockQuantity, product?.stock, product]);
  useEffect(() => {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    setSelectedVariantSku((prev) => prev || variants[0]?.sku || '');
  }, [product]);

  const variantOptions = useMemo(() => {
    const source = detailsReady ? fetchedProduct : product;
    const variants = Array.isArray(source?.variants) ? [...source.variants] : [];
    return variants
      .filter((v) => v && typeof v === 'object')
      .sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0))
      .map((v, idx) => ({
        ...v,
        sku: v.sku || v._id || `variant-${idx}`,
      }));
  }, [detailsReady, fetchedProduct, product?.variants]);

  const selectedVariant = useMemo(
    () => variantOptions.find((v) => v?.sku === selectedVariantSku) || variantOptions[0] || null,
    [variantOptions, selectedVariantSku],
  );

  const colorOptions = useMemo(
    () => buildProductColorOptions(displayProduct || product, variantOptions),
    [displayProduct, product, variantOptions],
  );

  const reviewMediaItems = useMemo(
    () => flattenReviewGalleryMedia(p?.reviewGallery || [], resolveImage),
    [p?.reviewGallery],
  );

  const activePricing = useMemo(
    () => productPricingForVariant(displayProduct || product, selectedVariant),
    [displayProduct, product, selectedVariant],
  );

  const galleryItems = useMemo(() => {
    if (!displayProduct) {
      return [{ type: 'image', src: resolveImage(null) }];
    }
    const displayImages = collectProductImages(displayProduct);
    return buildProductDetailGallery(
      {
        ...displayProduct,
        images: displayImages,
        image: displayProduct.image,
        verificationVideoUrl: displayProduct.verificationVideoUrl,
        videoProofUrl: displayProduct.videoProofUrl,
        videoUrl: displayProduct.videoUrl,
      },
      variantOptions,
      { resolveImage, resolveVideo: resolveMediaUrl },
    );
  }, [displayProduct, variantOptions]);

  useEffect(() => {
    if (!colorOptions.length) return;
    setSelectedColorKey((prev) => {
      if (prev && colorOptions.some((c) => c.key === prev)) return prev;
      return colorOptions[0].key;
    });
    const first = colorOptions[0];
    if (first?.color) setSelectedColor(first.color);
  }, [product?._id, product?.id, colorOptions]);

  useEffect(() => {
    const match = pickVariantForSelection(variantOptions, {
      colorKey: selectedColorKey,
      size: selectedSize,
    });
    if (match?.sku) setSelectedVariantSku(match.sku);
    if (match?.color) setSelectedColor(match.color);
    if (match?.size) setSelectedSize(match.size);
    if (match?.thumbnailUrl) {
      const idx = galleryItems.findIndex(
        (g) => g.src === resolveImage(match.thumbnailUrl) || g.variantSku === match.sku,
      );
      if (idx >= 0) setActiveImage(idx);
    }
  }, [selectedColorKey, selectedSize, variantOptions, galleryItems]);

  useEffect(() => {
    const onInventoryUpdated = (e) => {
      const updatedId = e?.detail?.productId;
      const cmp = resolvedId ? String(resolvedId) : legacyId ? String(legacyId) : '';
      if (updatedId && cmp && String(updatedId) === cmp) {
        void queryClient.invalidateQueries({ queryKey: productQueryKey });
      }
    };
    window.addEventListener('inventoryUpdated', onInventoryUpdated);
    return () => window.removeEventListener('inventoryUpdated', onInventoryUpdated);
  }, [resolvedId, legacyId, productQueryKey]);

  /* ── actions ── */
  const handleAddToCart = () => {
    if (!product || !detailsReady || addState !== 'idle') return;
    setAddState('adding');
    addItem(
      {
        ...product,
        price: activePricing.unitUsd,
        sku: selectedVariant?.sku || p?.sku || product?.sku,
        variantSku: selectedVariant?.sku,
        selectedColor: selectedColorKey || selectedColor,
        selectedSize,
      },
      quantity,
    );
    setTimeout(() => setAddState('added'), 500);
    setTimeout(() => setAddState('idle'), 2500);
  };

  const handleToggleWishlist = async () => {
    const optimisticNext = !wishlisted;
    setWishlisted(optimisticNext);
    setWishlistCount((c) => Math.max(0, c + (optimisticNext ? 1 : -1)));
    const wid = product?._id || product?.id || legacyId;
    if (!wid) return;
    try {
      const r = await productAPI.toggleWishlist(String(wid));
      setWishlisted(!!r?.wishlisted);
      if (r?.wishlistCount != null) setWishlistCount(Number(r.wishlistCount || 0));
    } catch {
      try {
        const r2 = await productAPI.getWishlistStatus(String(wid));
        setWishlisted(!!r2?.wishlisted);
        setWishlistCount(Number(r2?.wishlistCount || 0));
      } catch {
        setWishlisted((v) => !v);
      }
    }
  };

  const handleShare = async (method) => {
    const url  = encodeURIComponent(window.location.href);
    const name = product?.title || product?.name || 'Product';
    const text = encodeURIComponent(`Check out "${name}" on Spacilly!`);
    if (method === 'copy') {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true); setTimeout(() => setShared(false), 2000);
    } else if (method === 'whatsapp') window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
    else if (method === 'facebook')  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    else if (method === 'twitter')   window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
    setShareOpen(false);
  };

  const previewPrice = resolveProductPriceUsd(productPreview || product);
  const previewOldPrice = productOldPrice(product);
  useEffect(() => {
    setActiveImage((i) => Math.min(Math.max(0, i), Math.max(0, galleryItems.length - 1)));
  }, [galleryItems.length]);

  useEffect(() => {
    setHeroVideoPlaying(false);
  }, [activeImage, slugParam, legacyId]);

  const couponCode = String(product?.couponCode || product?.coupon || '').trim();
  const campaignLabel = String(product?.campaignLabel || product?.campaign || '').trim();
  const offerEndsAt = product?.offerEndsAt ? new Date(product.offerEndsAt) : null;
  const promoActive = offerEndsAt && !Number.isNaN(offerEndsAt.getTime()) ? offerEndsAt.getTime() > countdownNow : false;
  const couponExpiresAt = product?.couponExpiresAt ? new Date(product.couponExpiresAt) : null;
  const couponIsNotExpired = !couponExpiresAt || (couponExpiresAt.getTime && !Number.isNaN(couponExpiresAt.getTime()) && couponExpiresAt.getTime() > countdownNow);
  const couponActive = couponCode && couponIsNotExpired && product?.couponActive !== false;
  const campaignActive = campaignLabel && (product?.campaignActive !== false) && (!offerEndsAt || promoActive);
  const savingsAmount = previewOldPrice && previewOldPrice > previewPrice ? (previewOldPrice - previewPrice) : 0;
  useEffect(() => {
    if (!offerEndsAt || Number.isNaN(offerEndsAt.getTime())) return;
    if (offerEndsAt.getTime() <= Date.now()) return;
    const t = window.setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [offerEndsAt?.getTime?.()]);
  const offerCountdown = useMemo(() => {
    if (!promoActive || !offerEndsAt) return null;
    const ms = offerEndsAt.getTime() - countdownNow;
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
  }, [promoActive, offerEndsAt, countdownNow]);
  const sizeGuideRows = Array.isArray(p?.sizeGuide?.rows) ? p.sizeGuide.rows : [];
  const serviceCommitments = Array.isArray(p?.serviceCommitments) && p.serviceCommitments.length
    ? p.serviceCommitments
    : [
        { title: 'Authenticity check', description: 'Products are screened before listing.' },
        { title: 'Secure payment', description: 'Checkout is encrypted and monitored.' },
        { title: 'After-sales support', description: 'Quick assistance for delivery and returns.' },
      ];
  const detailSections = Array.isArray(p?.detailSections) ? p.detailSections.filter((s) => s?.title) : [];

  /* ── error (only when nothing to show and fetch failed) ── */
  if ((productQueryError || error) && !hasPageShell) return (
    <BuyerLayout noHeaderPad>
      <PageSeo title="Product not found | Spacilly" description={error || 'Product not found.'} canonicalUrl={canonicalUrl} noIndex />
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6" style={{ background: 'var(--bg-page)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <span className="text-6xl">😕</span>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{error || 'Product not found.'}</p>
        <button onClick={() => navigate(-1)}
          className="px-7 py-3 rounded-full text-white font-bold text-sm"
          style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
          Go Back
        </button>
      </div>
    </BuyerLayout>
  );

  if (!hasPageShell) return (
    <BuyerLayout noHeaderPad>
      <PageSeo title="Product not found | Spacilly" description="Product not found." canonicalUrl={canonicalUrl} noIndex />
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6" style={{ background: 'var(--bg-page)', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <span className="text-6xl">😕</span>
        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Product not found.</p>
        <button onClick={() => navigate(-1)}
          className="px-7 py-3 rounded-full text-white font-bold text-sm"
          style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
          Go Back
        </button>
      </div>
    </BuyerLayout>
  );

  /* ── derived values ── */
  const price        = detailsReady ? activePricing.unitUsd : resolveProductPriceUsd(displayProduct);
  const basePrice    = price;
  const totalPrice   = basePrice * quantity;
  const oldPrice     = detailsReady ? activePricing.compareUsd : productOldPrice(displayProduct);
  const discount     = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;
  const showDiscount = Number(discount || 0) > 0 && p.discountActive !== false;
  const rating       = Number(p.ratingAverage || p.averageRating || p.rating || 0) || 0;
  const reviewsCount = Number(p.reviewCount || p.totalReviews || 0) || 0;
  const reviewThumbs = Array.isArray(p.reviewGallery) ? p.reviewGallery.slice(0, 4).map((r) => resolveImage(r)).filter(Boolean) : [];
  const hasReviewData = reviewsCount > 0 || rating > 0 || reviewThumbs.length > 0;
  const soldCount    = Number(p.soldCount || p.salesCount || 0) || 0;
  const stock        = detailsReady ? (p.stockQuantity ?? p.stock ?? 10) : 0;
  const seller       = p.seller?.storeName || p.sellerName || 'Premium Store';
  const sellerRating = Math.min(5, Number(p.seller?.rating ?? rating) || rating);
  const installment  = currencyPricing.formatLocalWithUsd(totalPrice / 3);
  const totalLocalPrice = currencyPricing.convertUsdToLocal(totalPrice);
  const baseLocalPrice = currencyPricing.convertUsdToLocal(basePrice);
  const totalUsdText = currencyPricing.formatUsd(totalPrice);
  const showSizeSelector = detailsReady && categoryNeedsSize(p.category) && Array.isArray(p.sizes) && p.sizes.length > 0;
  const galleryHasVideo = galleryItems.some((g) => g.type === 'video');
  const galleryImageCount = galleryItems.filter((g) => g.type === 'image').length;
  const activeGalleryItem = galleryItems[activeImage] || galleryItems[0];
  const isVideoSlide = activeGalleryItem?.type === 'video';
  const firstVideoIndex = galleryItems.findIndex((g) => g.type === 'video');
  const showVerifiedBadge = galleryHasVideo || p?.verificationVideoUrl || p?.verified || p?.seller?.verified;
  const titleLong = title.length > 72;
  const jumpToProofVideo = (e) => {
    e?.stopPropagation?.();
    if (firstVideoIndex >= 0) {
      setActiveImage(firstVideoIndex);
      setHeroVideoPlaying(true);
    }
  };
  const showColorRail = colorOptions.length > 0;
  const showGalleryStrip =
    galleryItems.length > 1 ||
    galleryHasVideo ||
    images.length > 1 ||
    colorOptions.length > 1;
  const selectedColorLabel =
    colorOptions.find((c) => c.key === selectedColorKey)?.label || selectedColor || '—';
  const openReviews = () => {
    setTabIndex(2);
    setMobileDetailOpen('reviews');
    document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleColorSelect = (opt) => {
    setSelectedColorKey(opt.key);
    if (opt.color) setSelectedColor(opt.color);
    const idx = galleryIndexForColorOption(galleryItems, opt, resolveImage);
    if (idx >= 0) setActiveImage(idx);
  };
  const colorRail = showColorRail ? (
    <ProductColorRail
      selectedLabel={selectedColorLabel}
      options={colorOptions}
      activeKey={selectedColorKey}
      onSelect={handleColorSelect}
    />
  ) : null;
  const shortDesc    = detailsReady
    ? ((p.description || '').trim().slice(0, 180) || 'Premium quality — see full description below.')
    : '';

  const specs = [
    { prop: 'Brand',          value: p.brand    || 'Spacilly'     },
    { prop: 'SKU',            value: p.sku      || resolvedId    },
    { prop: 'Category',       value: category                          },
    { prop: 'Material',       value: p.material || 'Cotton blend'},
    { prop: 'Sizes',          value: (Array.isArray(p.sizes) && p.sizes.length ? p.sizes : FALLBACK_SIZES).join(', ') },
    { prop: 'Weight',         value: p.weight   || '200g'        },
    { prop: 'Origin',         value: p.origin   || 'Imported'    },
    { prop: 'Warranty',       value: '1 year limited'                  },
  ];

  const reviewBars = [
    { stars: 5, pct: 78 }, { stars: 4, pct: 15 },
    { stars: 3, pct: 5  }, { stars: 2, pct: 2  }, { stars: 1, pct: 0 },
  ];

  const qaList = [
    { q: 'What material is this made of?',     a: 'Premium cotton blend for comfort and durability.' },
    { q: 'How do I choose the right size?',    a: 'Refer to our size guide — we recommend sizing up for a relaxed fit.' },
    { q: 'Is international shipping available?', a: 'Yes! We ship to 180+ countries via tracked courier services.' },
  ];

  const recentFiltered = recentItems.filter((item) => (item._id || item.id) !== resolvedId).slice(0, 6);

  const renderDetailPanel = (panelIndex, opts = { dense: false }) => {
    const { dense } = opts;
    switch (panelIndex) {
      case 0:
        return (
          <div className="pt-3">
            <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              {p.description || 'No description available.'}
            </p>
            <h4 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>Key Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {['Premium quality materials', 'Fast shipping worldwide', '30-day eligible returns', 'Verified seller guarantee'].map((f) => (
                <div key={f} className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
                  <div className="pd2-icon-chip pd2-icon-chip--success w-6 h-6 rounded-lg">
                    <Check size={13} />
                  </div>
                  <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="pt-3 overflow-x-auto">
            <table className="w-full text-sm min-w-0">
              <tbody>
                {specs.map((row, i) => (
                  <tr key={row.prop} className="border-b last:border-0" style={{ borderColor: 'var(--divider)' }}>
                    <td className="py-2.5 pr-3 font-semibold align-top w-[36%] max-w-[120px]" style={{ color: 'var(--text-primary)' }}>{row.prop}</td>
                    <td className="py-2.5 break-words" style={{ color: 'var(--text-secondary)' }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 2:
        return (
          <div className={dense ? 'pt-3 space-y-4' : 'pt-0 space-y-4'} id="reviews-section">
            <div className={`flex flex-col gap-4 p-4 sm:p-6 rounded-2xl ${dense ? '' : 'lg:flex-row lg:items-stretch'}`} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
              <div className={`text-center ${dense ? '' : 'lg:text-left lg:flex-shrink-0'}`}>
                <p className={`font-black mb-1 ${dense ? 'text-4xl' : 'text-4xl sm:text-5xl'}`} style={{ color: PRIMARY }}>{rating ? rating.toFixed(1) : '—'}</p>
                <Stars rating={rating} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{reviewsCount ? `${reviewsCount} reviews` : 'No reviews yet'}</p>
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                {reviewBars.map((r, i) => (
                  <div key={r.stars} className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xs font-medium w-5 sm:w-6 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.stars}★</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: PRIMARY }} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }} transition={{ duration: 0.6, delay: 0.2 + i * 0.06 }} />
                    </div>
                    <span className="text-xs w-7 sm:w-8 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
              <div className={`flex flex-col gap-2 ${dense ? '' : 'lg:justify-center lg:items-end'}`}>
                <button type="button" className="w-full lg:w-auto px-5 py-3 rounded-xl sm:rounded-full text-sm font-bold text-white min-h-[48px]" style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
                  <MessageCircle size={14} className="inline mr-1.5" />Write a Review
                </button>
                <button type="button" onClick={() => setVoteUp((v) => v + 1)} className="pd2-btn-helpful w-full lg:w-auto">
                  <ThumbsUp size={13} /> {voteUp} Helpful
                </button>
              </div>
            </div>

            {Array.isArray(p?.reviewGallery) && p.reviewGallery.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Customer photos</p>
                  <button
                    type="button"
                    className="text-xs font-bold hover:underline py-2 touch-manipulation"
                    style={{ color: PRIMARY }}
                    onClick={() => {
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    See all reviews →
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {p.reviewGallery
                    .flatMap((r) => (Array.isArray(r?.images) ? r.images.map((img) => ({ img })) : []))
                    .slice(0, 12)
                    .map(({ img }, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        type="button"
                        className="rounded-xl overflow-hidden min-h-[44px] touch-manipulation"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <img src={resolveImage(img)} alt="" className="w-full h-full object-cover aspect-square" />
                      </button>
                    ))}
                </div>
              </div>
            )}
            {[
              { author: 'Alex M.', rating: 5, text: 'Absolutely love this product! Quality exceeded my expectations.', date: '2 days ago' },
              { author: 'Sarah K.', rating: 4, text: 'Great quality, fast shipping. Would definitely buy again.', date: '1 week ago' },
            ].map((rev, i) => (
              <div key={i} className="flex gap-3 sm:gap-4 py-4 sm:py-5 border-b last:border-0" style={{ borderColor: 'var(--divider)' }}>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm" style={{ background: 'var(--gradient-brand-cta)' }}>{rev.author.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{rev.author}</span>
                    <Stars rating={rev.rating} size={12} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{rev.date}</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rev.text}</p>
                </div>
              </div>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="pt-3 space-y-3">
            <button type="button" className="w-full py-3 rounded-xl text-sm font-bold text-white min-h-[48px]" style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
              Ask a Question
            </button>
            <div className="space-y-2">
              {qaList.map((qa, i) => (
                <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}>
                  <button type="button" onClick={() => setExpandedQa(expandedQa === i ? null : i)} className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 min-h-[48px] touch-manipulation">
                    <span className="font-semibold text-sm pr-2" style={{ color: 'var(--text-primary)' }}>{qa.q}</span>
                    <span className="text-lg font-light flex-shrink-0" style={{ color: PRIMARY }}>{expandedQa === i ? '−' : '+'}</span>
                  </button>
                  <AnimatePresence>
                    {expandedQa === i && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{qa.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  /* ════════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════════ */
  return (
    <BuyerLayout noHeaderPad>
      {pdpSeo}
      <div className="pd2-page pd2-page--cart relative min-h-screen" style={{ background: 'var(--bg-page)' }}>

        {/* ── Background decoration (desktop only) ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
          <GridMesh />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 7%, transparent) 0%, transparent 65%)' }} />
          <div className="absolute bottom-40 left-0 w-96 h-96 rounded-full"
            style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--brand-primary) 5%, transparent) 0%, transparent 65%)' }} />
        </div>

        <div className="relative z-10 w-full pd2-fluid-wrap pd2-fluid-wrap--cart pt-0 sm:pt-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 lg:pb-12 max-w-[100vw] lg:max-w-none lg:mx-auto">

          {/* Mobile — cart-style top bar */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: softEase }}
            className="pd2-cart-bar md:hidden"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="pd2-cart-bar__icon"
              aria-label="Go back"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
            <span className="pd2-cart-bar__title">Product details</span>
            <button
              type="button"
              onClick={openCart}
              className="pd2-cart-bar__icon pd2-cart-bar__icon--cart"
              aria-label="Open cart"
            >
              <ShoppingBag size={20} strokeWidth={2} />
              {cartCount > 0 && (
                <span className="pd2-cart-bar__badge">{cartCount > 9 ? '9+' : cartCount}</span>
              )}
            </button>
          </motion.div>

          {/* ── Breadcrumb (tablet/desktop) ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: softEase }}
            className="hidden md:flex items-center justify-between gap-2 mb-4 md:mb-8 flex-wrap min-w-0"
          >
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0 flex-1" style={{ color: 'var(--text-muted)' }}>
              <Link to="/" className="hover:text-[var(--brand-primary)] transition-colors shrink-0">Home</Link>
              <span className="shrink-0">›</span>
              <Link
                to={`/products?category=${encodeURIComponent(category)}`}
                className="hover:text-[var(--brand-primary)] transition-colors truncate"
              >
                {category}
              </Link>
              <span className="shrink-0">›</span>
              <span className="font-semibold truncate min-w-0" style={{ color: 'var(--text-primary)' }}>{title}</span>
            </div>
            <button type="button" onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-xs sm:text-sm font-medium hover:text-[var(--brand-primary)] transition-colors shrink-0 touch-manipulation py-2"
              style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft size={16} /> <span>Back</span>
            </button>
          </motion.div>

          {/* ════════════════════════════════════════════════
              HERO: Gallery + Purchase Panel
          ════════════════════════════════════════════════ */}
          <div className="pd2-hero-grid gap-4 md:gap-6 lg:gap-8 mb-6 md:mb-10 min-w-0 max-w-6xl mx-auto w-full">

            {/* ── Gallery ── */}
            <motion.div
              className="pd2-gallery-col"
              initial={hasInstantPreview ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: hasInstantPreview ? 0 : 0.34, ease: softEase }}
            >
              {/* Main media — AliExpress / premium carousel */}
              <div
                className="pd2-main-img pd2-media-stage group relative overflow-hidden rounded-2xl md:rounded-3xl mb-1 md:mb-3"
                style={{ background: 'var(--bg-secondary)' }}
                onClick={() => {
                  if (isVideoSlide) return;
                  setLightbox(true);
                }}
                onTouchStart={(e) => setTouchStartX(e.changedTouches?.[0]?.clientX ?? null)}
                onTouchEnd={(e) => {
                  const endX = e.changedTouches?.[0]?.clientX;
                  if (touchStartX == null || typeof endX !== 'number' || galleryItems.length < 2) return;
                  const delta = endX - touchStartX;
                  if (Math.abs(delta) < 40) return;
                  if (delta < 0) setActiveImage((i) => (i + 1) % galleryItems.length);
                  else setActiveImage((i) => (i - 1 + galleryItems.length) % galleryItems.length);
                }}
              >
                <AnimatePresence initial={false}>
                  {isVideoSlide && heroVideoPlaying ? (
                    <motion.video
                      key={`v-play-${activeImage}`}
                      src={activeGalleryItem?.src}
                      poster={activeGalleryItem?.poster}
                      controls
                      autoPlay
                      preload="metadata"
                      playsInline
                      className="absolute inset-0 z-[1] w-full h-full object-cover bg-black"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : isVideoSlide ? (
                    <motion.div
                      key={`v-poster-${activeImage}`}
                      className="absolute inset-0 z-[1]"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                      <img
                        src={activeGalleryItem?.poster || resolveImage(images[0])}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        draggable={false}
                      />
                      <button
                        type="button"
                        className="pd2-media-play"
                        onClick={(e) => { e.stopPropagation(); setHeroVideoPlaying(true); }}
                        aria-label="Play proof video"
                      >
                        <span className="pd2-media-play__icon"><Play size={22} fill="currentColor" /></span>
                        <span>Video</span>
                      </button>
                    </motion.div>
                  ) : (
                    <motion.img
                      key={`i-${activeImage}`}
                      layoutId={activeImage === 0 ? imageLayoutId : undefined}
                      src={activeGalleryItem?.src || resolveImage(images[activeImage])}
                      alt={title}
                      className="absolute inset-0 z-[1] w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02] cursor-zoom-in"
                      initial={hasInstantPreview && activeImage === 0 ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={hasInstantPreview && activeImage === 0 ? { duration: 0.15 } : { duration: 0.2 }}
                      onError={(e) => { e.target.src = resolveImage(null); }}
                      draggable={false}
                    />
                  )}
                </AnimatePresence>

                <div className="pd2-media-gradient" aria-hidden />

                {showVerifiedBadge && (
                  <span className="pd2-media-verified">
                    <BadgeCheck size={13} strokeWidth={2.5} />
                    Verified
                  </span>
                )}

                {showDiscount && (
                  <span className="pd2-media-sale-tag">-{discount}%</span>
                )}

                {/* Desktop tools */}
                <div className="pd2-media-desktop-tools hidden md:flex">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShareOpen(!shareOpen); }}
                      className="pd2-img-btn"
                      aria-label="Share"
                    >
                      <Share2 size={16} />
                    </button>
                    <AnimatePresence>
                      {shareOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute right-0 top-full mt-2 py-2 rounded-2xl z-20 min-w-[160px]"
                          style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-card)',
                            boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                          }}
                        >
                          {[['whatsapp','WhatsApp'],['facebook','Facebook'],['twitter','Twitter']].map(([k,l]) => (
                            <button key={k} type="button"
                              onClick={(e) => { e.stopPropagation(); handleShare(k); }}
                              className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] transition-colors"
                              style={{ color: 'var(--text-secondary)' }}>
                              {l}
                            </button>
                          ))}
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); handleShare('copy'); }}
                            className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] transition-colors flex items-center gap-2"
                            style={{ color: 'var(--text-secondary)' }}>
                            {shared ? <Check size={14} className="text-green-500" /> : <Link2 size={14} />}
                            {shared ? 'Copied!' : 'Copy Link'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button type="button" className="pd2-img-btn" onClick={(e) => {
                    e.stopPropagation();
                    if (!isVideoSlide) setLightbox(true);
                  }} aria-label="Zoom">
                    <ZoomIn size={16} />
                  </button>
                  <motion.button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
                    className="pd2-img-btn"
                    whileTap={{ scale: 0.88 }}
                    aria-label="Wishlist"
                  >
                    <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : 'currentColor'} />
                  </motion.button>
                </div>

                {galleryItems.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + galleryItems.length) % galleryItems.length); }}
                      className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 pd2-arrow-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Previous image"
                    ><ChevronLeft size={18} /></button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % galleryItems.length); }}
                      className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 pd2-arrow-btn opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 touch-manipulation"
                      aria-label="Next image"
                    ><ChevronRight size={18} /></button>
                  </>
                )}

                <div className="pd2-media-footer">
                  {galleryItems.length > 1 && (
                    <span className="pd2-media-counter" aria-live="polite">
                      {activeImage + 1}/{galleryItems.length}
                    </span>
                  )}
                  <div className="pd2-media-footer__actions">
                    {galleryHasVideo && !isVideoSlide && firstVideoIndex >= 0 && (
                      <button type="button" className="pd2-media-chip" onClick={jumpToProofVideo}>
                        <Play size={12} fill="currentColor" aria-hidden />
                        Video
                      </button>
                    )}
                    <button
                      type="button"
                      className={`pd2-media-wish ${wishlisted ? 'pd2-media-wish--active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleToggleWishlist(); }}
                      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      <Heart size={14} fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : 'currentColor'} />
                      {wishlistCount > 0 && <span>{wishlistCount > 999 ? '999+' : wishlistCount.toLocaleString()}</span>}
                    </button>
                    <button
                      type="button"
                      className="pd2-media-chip md:hidden"
                      onClick={(e) => { e.stopPropagation(); setShareOpen((v) => !v); }}
                      aria-label="Share"
                    >
                      <Share2 size={12} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtle fetch indicator — one request, no full-page swap */}
              {productFetching && !detailsReady && (
                <div className="pd2-fetch-bar md:hidden" role="status" aria-label="Loading product details" />
              )}

              {/* Mobile title + rating (AliExpress-style, below gallery) */}
              <div className="pd2-mobile-product-head md:hidden">
                <p className="pd2-mobile-category">{String(category).toUpperCase()}</p>
                <div className="pd2-mobile-title-row">
                  <h1 className={`pd2-mobile-title ${titleExpanded ? 'pd2-mobile-title--expanded' : ''}`}>{title}</h1>
                  {titleLong && (
                    <button
                      type="button"
                      className="pd2-mobile-title-toggle"
                      onClick={() => setTitleExpanded((v) => !v)}
                      aria-expanded={titleExpanded}
                    >
                      <ChevronDown size={18} className={titleExpanded ? 'rotate-180' : ''} />
                    </button>
                  )}
                </div>
                {detailsReady ? (
                  <div className="pd2-mobile-rating-row">
                    <Stars rating={rating} size={13} />
                    <span className="pd2-mobile-rating-num">{rating ? rating.toFixed(1) : '—'}</span>
                    <span className="pd2-mobile-rating-sep" aria-hidden>|</span>
                    <button type="button" className="pd2-mobile-rating-link" onClick={openReviews}>
                      {reviewsCount ? `${reviewsCount.toLocaleString()} reviews` : 'No reviews yet'}
                    </button>
                    {!!soldCount && (
                      <>
                        <span className="pd2-mobile-rating-sep" aria-hidden>|</span>
                        <span className="pd2-mobile-sold">{soldCount.toLocaleString()}+ sold</span>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="pd2-mobile-rating-row pd2-mobile-rating-row--skeleton" aria-hidden>
                    <div className="h-3.5 w-28 rounded pwa-skeleton" />
                  </div>
                )}
              </div>

              {/* Thumbnails — photos + proof video */}
              {showGalleryStrip && (
                <div className="pd2-gallery-strip mb-3 md:mb-4">
                  <div className="pd2-gallery-strip__head">
                    <p className="pd2-gallery-strip__title">
                      Photos &amp; video
                      <span>
                        {galleryHasVideo ? ' · Proof video' : ''}
                        {galleryImageCount > 0 ? ` · ${galleryImageCount} photo${galleryImageCount > 1 ? 's' : ''}` : ''}
                      </span>
                    </p>
                    <span className="pd2-gallery-strip__count">{activeImage + 1}/{galleryItems.length}</span>
                  </div>
                  <div className="pd2-thumbs-row">
                  {galleryItems.map((m, i) => (
                    <motion.button
                      key={i} type="button"
                      onClick={() => setActiveImage(i)}
                      className={`pd2-thumb-btn touch-manipulation ${i === activeImage ? 'pd2-thumb-btn--active' : ''}`}
                      whileTap={{ scale: 0.96 }}
                      aria-label={m?.type === 'video' ? `Proof video ${i + 1}` : `Photo ${i + 1}`}
                      aria-current={i === activeImage ? 'true' : undefined}
                    >
                      {m?.type === 'video' ? (
                        <div className="pd2-thumb-video">
                          <img src={m.poster || resolveImage(images[0])} alt="" draggable={false} />
                          <span className="pd2-thumb-video__play"><Play size={12} fill="currentColor" /></span>
                        </div>
                      ) : (
                        <img src={m?.src} alt="" draggable={false} />
                      )}
                    </motion.button>
                  ))}
                  </div>
                </div>
              )}

              {/* AliExpress-style commerce stack: color, reviews, commitments */}
              <div className="pd2-ali-commerce-stack">
              <div className="pd2-mobile-commerce-hero md:hidden">
                {(campaignActive || offerCountdown) && (
                  <div className="pd2-mobile-sale-banner">
                    <span>{campaignLabel || 'SALE'}</span>
                    {offerCountdown && <span className="pd2-mobile-sale-banner__ends">Ends {offerCountdown}</span>}
                  </div>
                )}
                <div className="pd2-mobile-price-row">
                  <span className="pd2-mobile-price-current">
                    {currencyPricing.formatLocalWithUsd(price)}
                  </span>
                  {showDiscount && (
                    <span className="pd2-mobile-discount">-{discount}%</span>
                  )}
                  {oldPrice && (
                    <span className="pd2-mobile-price-was">
                      {currencyPricing.formatLocalWithUsd(oldPrice)}
                    </span>
                  )}
                </div>
                <div className="pd2-mobile-delivery">
                  <ProductDeliveryEstimate productId={resolvedId} compact />
                  <span><Shield size={14} /> Buyer protection</span>
                </div>
                {activePricing.priceDiffers && (
                  <p className="pd2-variant-price-hint mt-2">
                    Price for <strong>{selectedColorLabel}</strong>
                  </p>
                )}
              </div>

              {colorRail && <div className="pd2-gallery-media-rail">{colorRail}</div>}

              {reviewMediaItems.length > 0 && (
                <ProductReviewGalleryRail
                  items={reviewMediaItems}
                  totalCount={reviewsCount}
                  onSeeAll={openReviews}
                />
              )}

              {(p?.shippingInfo?.costLabel || p?.returnPolicy?.label || p?.securityNote) && (
                <section className="pd2-ali-block pd2-ali-commitments" aria-label="Store commitments">
                  <p className="pd2-ali-block__title">Spacilly commitment</p>
                  <ul className="pd2-ali-commitments__list">
                    {(p?.shippingInfo?.costLabel || p?.shippingInfo?.estimatedDeliveryLabel) && (
                      <li>
                        <Truck size={16} />
                        <span>
                          {p.shippingInfo?.costLabel || 'Shipping'}
                          {p.shippingInfo?.estimatedDeliveryLabel
                            ? ` · ${p.shippingInfo.estimatedDeliveryLabel}`
                            : ''}
                        </span>
                      </li>
                    )}
                    {p?.returnPolicy?.label && (
                      <li>
                        <RefreshCw size={16} />
                        <span>{p.returnPolicy.label}</span>
                      </li>
                    )}
                    {(p?.securityNote || p?.paymentSafetyNote) && (
                      <li>
                        <Shield size={16} />
                        <span>{p.securityNote || p.paymentSafetyNote}</span>
                      </li>
                    )}
                  </ul>
                </section>
              )}
              </div>

            </motion.div>

            {/* ── Purchase Panel ── */}
            <motion.div
              className="pd2-purchase-col"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.04, ease: softEase }}
            >
              <div className="pd2-purchase-flow min-w-0">

                {/* Campaign / coupon / countdown (only when present) */}
                {(campaignActive || couponActive || offerCountdown) && (
                  <div className="order-0 w-full mb-3 space-y-2">
                    {campaignActive && (
                      <div className="px-3 py-2 rounded-2xl text-xs font-bold"
                        style={{ background: 'var(--brand-tint)', color: PRIMARY, border: '1px solid var(--brand-border-subtle)' }}>
                        {campaignLabel}
                      </div>
                    )}
                    {couponActive && (
                      <div className="pd2-promo-card pd2-promo-card--info">
                        <div className="min-w-0">
                          <p className="pd2-promo-card__label">COUPON</p>
                          <p className="pd2-promo-card__value truncate">{couponCode}</p>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-2 rounded-xl text-xs font-bold min-h-[44px] touch-manipulation"
                          style={{ background: 'var(--brand-primary)', color: 'var(--text-on-accent, #fff)' }}
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(couponCode); }
                            catch {}
                          }}
                        >
                          Copy
                        </button>
                      </div>
                    )}
                    {offerCountdown && (
                      <div className="pd2-promo-card pd2-promo-card--warning">
                        <div className="min-w-0">
                          <p className="pd2-promo-card__label">OFFER ENDS IN</p>
                          <p className="pd2-promo-card__value tabular-nums">{offerCountdown}</p>
                        </div>
                        <span className="text-[11px] font-semibold">Limited time</span>
                      </div>
                    )}
                  </div>
                )}

                <h1 className="pd2-title mb-1.5 lg:mb-2 order-1 lg:order-1 w-full min-w-0 hidden md:block">{title}</h1>

                {/* Rating row */}
                {detailsReady ? (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3 lg:mb-4 pb-2.5 lg:pb-3 border-b order-2 lg:order-2 w-full min-w-0" style={{ borderColor: 'var(--divider)' }}>
                  <Stars rating={rating} />
                  <span className="font-bold text-sm" style={{ color: PRIMARY }}>{rating ? rating.toFixed(1) : '—'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTabIndex(2);
                      setMobileDetailOpen('reviews');
                      document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs sm:text-sm hover:underline touch-manipulation py-1"
                    style={{ color: 'var(--text-muted)' }}>
                    {reviewsCount ? `${reviewsCount} reviews` : 'No reviews yet'}
                  </button>
                  {!!soldCount && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--divider)' }}>
                      {soldCount.toLocaleString()} sold
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '1px solid var(--divider)' }}>
                    <Heart size={12} className="inline -mt-0.5 mr-1" /> {wishlistCount.toLocaleString()} saved
                  </span>
                </div>
                ) : (
                <div className="order-2 lg:order-2 w-full min-w-0 mb-3 lg:mb-4 pb-2.5 lg:pb-3 border-b space-y-2" style={{ borderColor: 'var(--divider)' }} aria-hidden>
                  <div className="h-4 w-40 rounded-lg pwa-skeleton" />
                  <div className="h-3 w-56 rounded-lg pwa-skeleton" />
                </div>
                )}

                {/* Price + discount block (desktop; mobile uses hero under gallery) */}
                <div className="order-3 lg:order-3 w-full min-w-0 mb-3 lg:mb-0 space-y-2 hidden md:block">
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-1">
                      <span className="pd2-price-num tabular-nums">
                        {totalLocalPrice.toLocaleString('en-RW', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}{' '}
                        {currencyPricing.selectedCurrency}
                        {quantity > 1 && (
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#6B7280',
                              marginLeft: '8px',
                              fontWeight: 400,
                            }}
                          >
                            ({baseLocalPrice.toLocaleString('en-RW')} × {quantity})
                          </span>
                        )}
                      </span>
                      {oldPrice && <span className="text-sm sm:text-base line-through" style={{ color: 'var(--text-faint)' }}>{currencyPricing.formatLocalWithUsd(oldPrice)}</span>}
                      {showDiscount && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-black text-white"
                          style={{ background: '#ef4444' }}>SAVE {discount}%</span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                      ~ {totalUsdText} USD
                    </p>
                    {savingsAmount > 0 && (
                      <p className="text-[11px] sm:text-xs leading-snug font-semibold" style={{ color: '#16a34a' }}>
                        You save {currencyPricing.formatLocalWithUsd(savingsAmount)}
                      </p>
                    )}
                    <p className="text-[11px] sm:text-xs leading-snug" style={{ color: 'var(--text-muted)' }}>
                      {stock > 0 ? `${stock} available` : 'Unavailable'}
                      {stock > 0 ? ` · 3 × ${installment}` : ''}
                    </p>
                  </div>
                  <div>
                    {stock === 0 ? (
                      <span className="pd2-status-pill pd2-status-pill--error">Out of stock</span>
                    ) : stock < 10 ? (
                      <span className="pd2-status-pill pd2-status-pill--warning">Only {stock} left</span>
                    ) : (
                      <span className="pd2-status-pill pd2-status-pill--success">In stock</span>
                    )}
                  </div>
                </div>

                {/* Category + badge */}
                <div className="flex flex-wrap items-center gap-2 mb-3 lg:mb-4 order-4 lg:order-4">
                  <Link
                    to={`/search?category=${encodeURIComponent(category)}`}
                    className="px-2.5 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition-all hover:scale-105 touch-manipulation"
                    style={{ background: 'var(--brand-tint)', color: PRIMARY }}
                  >
                    {category}
                  </Link>
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-bold"
                    style={{ background: 'var(--brand-tint)', color: PRIMARY, border: '1px solid var(--brand-border-subtle)' }}>
                    <Star size={10} fill={PRIMARY} stroke={PRIMARY} className="shrink-0" /> Top rated
                  </span>
                </div>

                {/* Short desc */}
                <div className="mb-3 lg:mb-4 order-5 lg:order-5">
                  {detailsReady ? (
                    <>
                      <p
                        className={`text-xs sm:text-sm leading-relaxed ${!descExpanded ? 'line-clamp-3 lg:line-clamp-none' : ''}`}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {descExpanded ? (p.description || shortDesc) : shortDesc}
                      </p>
                      {(p.description || '').length > 180 && (
                        <button
                          type="button"
                          onClick={() => setDescExpanded((v) => !v)}
                          className="mt-1.5 text-xs font-semibold hover:underline py-1 touch-manipulation"
                          style={{ color: PRIMARY }}
                        >
                          {descExpanded ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="h-3 w-full rounded pwa-skeleton" />
                      <div className="h-3 w-11/12 rounded pwa-skeleton" />
                      <div className="h-3 w-4/5 rounded pwa-skeleton" />
                    </div>
                  )}
                </div>

                {/* Size */}
                {showSizeSelector && (
                <div className="mb-4 lg:mb-5 order-7 lg:order-8">
                  <div className="flex items-center justify-between mb-2 lg:mb-3 gap-2">
                    <span className="text-xs sm:text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Size: <span style={{ color: PRIMARY }}>{selectedSize}</span>
                    </span>
                    <button type="button" className="text-xs font-medium hover:underline touch-manipulation py-2 shrink-0" style={{ color: PRIMARY }}>
                      Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(p.sizes || []).map((s) => (
                      <motion.button key={s} type="button"
                        onClick={() => setSelectedSize(s)}
                        whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
                        className="pd2-size-btn-mobile min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:w-10 lg:h-8 rounded-xl lg:rounded-lg text-xs font-bold transition-all duration-200 touch-manipulation"
                        style={{
                          background: selectedSize === s ? PRIMARY : 'var(--bg-secondary)',
                          color: selectedSize === s ? '#fff' : 'var(--text-secondary)',
                          border: `1.5px solid ${selectedSize === s ? PRIMARY : 'var(--border-card)'}`,
                          boxShadow: selectedSize === s ? 'var(--shadow-cta)' : 'none',
                        }}>
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
                )}

                {(showSizeSelector && (sizeGuideRows.length > 0 || p?.sizeGuide?.circumferenceNote)) && (
                  <div className="mb-4 lg:mb-5 order-9 lg:order-9">
                    <button
                      type="button"
                      onClick={() => setSizeGuideOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold"
                      style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)', color: 'var(--text-primary)' }}
                    >
                      Ring Size Chart & Circumference
                      <ChevronDown size={15} className={`transition-transform ${sizeGuideOpen ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {sizeGuideOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--divider)' }}>
                            {p?.sizeGuide?.chartImageUrl && (
                              <img
                                src={resolveImage(p.sizeGuide.chartImageUrl)}
                                alt="Ring size chart"
                                className="w-full rounded-lg mb-2"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            {!!p?.sizeGuide?.circumferenceNote && (
                              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{p.sizeGuide.circumferenceNote}</p>
                            )}
                            {sizeGuideRows.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {sizeGuideRows.map((row) => (
                                  <div key={`${row?.sizeLabel}-${row?.circumferenceMm || ''}`} className="px-2 py-1.5 rounded-lg" style={{ background: 'var(--card-bg)', border: '1px solid var(--divider)' }}>
                                    <span className="font-semibold">{row?.sizeLabel}</span>
                                    {row?.circumferenceMm ? ` - ${row.circumferenceMm}mm` : ''}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Divider */}
                <div className="pd2-divider mb-4 lg:mb-5 order-9 lg:order-10" />

                {/* Quantity */}
                <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6 order-10 lg:order-11">
                  <span className="text-xs sm:text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>Qty</span>
                  <motion.div
                    className="pd2-qty-control flex items-center rounded-xl overflow-hidden"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-card)' }}
                  >
                    <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity === 1}
                      className="min-w-[48px] min-h-[48px] lg:w-10 lg:h-10 flex items-center justify-center transition-colors hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] text-lg font-light touch-manipulation"
                      style={{ color: 'var(--text-secondary)', opacity: quantity === 1 ? 0.4 : 1, cursor: quantity === 1 ? 'not-allowed' : 'pointer' }}>
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[44px] text-center font-bold tabular-nums text-sm" style={{ color: 'var(--text-primary)' }}>
                      {quantity}
                    </span>
                    <button type="button"
                      onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                      disabled={quantity >= (stock || 99)}
                      className="min-w-[48px] min-h-[48px] lg:w-10 lg:h-10 flex items-center justify-center transition-colors hover:bg-[var(--brand-tint)] dark:hover:bg-[var(--brand-tint)] disabled:opacity-40 touch-manipulation"
                      style={{ color: 'var(--text-secondary)', opacity: quantity >= (stock || 99) ? 0.4 : 1, cursor: quantity >= (stock || 99) ? 'not-allowed' : 'pointer' }}>
                      <Plus size={14} />
                    </button>
                  </motion.div>
                </div>

                {/* CTAs desktop */}
                <div ref={ctaRef} className="hidden md:grid md:grid-cols-2 gap-3 mb-6 order-11 lg:order-12">
                  {/* Add to Cart */}
                  <motion.button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!detailsReady || stock === 0 || addState === 'adding'}
                    whileHover={addState === 'idle' ? { y: -1 } : {}}
                    whileTap={{ scale: 0.98 }}
                    className="pd2-btn-primary w-full h-14 flex items-center justify-center gap-3 text-sm font-bold"
                    style={addState === 'added' ? { background: '#16a34a', boxShadow: '0 8px 24px rgba(22,163,74,0.35)' } : {}}
                  >
                    {addState === 'adding' && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {addState === 'idle'   && <ShoppingBag size={18} />}
                    {addState === 'idle'   && 'Add to Cart'}
                    {addState === 'adding' && 'Adding…'}
                    {addState === 'added'  && <><Check size={18} /> Added to Cart</>}
                  </motion.button>

                  {/* Buy Now */}
                  <motion.button
                    type="button"
                    disabled={!detailsReady || stock === 0}
                    onClick={() => {
                      addItem(
                        {
                          ...product,
                          price: activePricing.unitUsd,
                          sku: selectedVariant?.sku || p?.sku || product?.sku,
                        },
                        quantity,
                      );
                      navigate('/checkout');
                    }}
                    whileHover={{ y: -0.5 }} whileTap={{ scale: 0.98 }}
                    className="pd2-btn-secondary w-full h-12 flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-45"
                  >
                    <Zap size={16} /> Buy Now
                  </motion.button>
                </div>

                {/* Compact trust icon bar */}
                <div className="flex items-center justify-between gap-1 pt-3 lg:pt-4 mt-1 flex-wrap pd2-divider-top order-12 lg:order-13">
                  {[
                    { icon: Shield,     label: 'Protected',   color: PRIMARY      },
                    { icon: Truck,      label: 'Free Ship',   color: '#6366f1'    },
                    { icon: RefreshCw,  label: '30-day',      color: '#10b981'    },
                    { icon: BadgeCheck, label: 'Verified',    color: '#f59e0b'    },
                  ].map(({ icon: Icon, label, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1 flex-1 min-w-[52px]">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                        <Icon size={14} style={{ color }} />
                      </div>
                      <span className="text-[10px] font-medium text-center leading-tight" style={{ color: 'var(--text-muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>

              </div>{/* end pd2-purchase-flow */}
            </motion.div>
          </div>{/* end hero grid */}

          {/* Video (if present) is rendered inside the main media gallery. */}

          {/* Shipping / policies (hide gracefully when missing) */}
          {(product?.shippingInfo?.costLabel || product?.shippingInfo?.estimatedDeliveryLabel || product?.returnPolicy?.label || product?.securityNote || product?.paymentSafetyNote) && (
            <motion.section
              className="mb-6 md:mb-10 grid grid-cols-1 md:grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              {(product?.shippingInfo?.costLabel || product?.shippingInfo?.estimatedDeliveryLabel) && (
                <div className="p-4 sm:p-5 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)', border: '1px solid var(--brand-border-subtle)' }}>
                      <Truck size={18} style={{ color: PRIMARY }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Shipping</p>
                      {product?.shippingInfo?.costLabel && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{product.shippingInfo.costLabel}</p>
                      )}
                      {product?.shippingInfo?.estimatedDeliveryLabel && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Est. delivery: {product.shippingInfo.estimatedDeliveryLabel}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(product?.returnPolicy?.label || product?.returnPolicy?.details) && (
                <div className="p-4 sm:p-5 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-start gap-3">
                    <div className="pd2-icon-chip pd2-icon-chip--success">
                      <RefreshCw size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{product?.returnPolicy?.label || 'Returns & refunds'}</p>
                      {product?.returnPolicy?.details && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{product.returnPolicy.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {(product?.securityNote || product?.paymentSafetyNote) && (
                <div className="p-4 sm:p-5 rounded-2xl md:col-span-2"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                      style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
                      <Shield size={18} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Security & payment safety</p>
                      {product?.securityNote && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{product.securityNote}</p>
                      )}
                      {product?.paymentSafetyNote && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{product.paymentSafetyNote}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}
          {/* ════════════════════════════════════════════════
              META STRIP — Seller info + full trust badges
              (moved out of purchase card for a cleaner
               equal-height hero and better organisation)
          ════════════════════════════════════════════════ */}
          <motion.div
            className="pd2-meta-strip !mb-6 md:!mb-14"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.36, ease: softEase }}
          >
            {/* Seller card */}
            <div className="pd2-seller-card max-w-[100vw] lg:max-w-none overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-white text-xl"
                  style={{ background: 'var(--gradient-brand-cta)', boxShadow: 'var(--shadow-cta)' }}>
                  {seller.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm break-words" style={{ color: 'var(--text-primary)' }}>{seller}</p>
                    <span className="pd2-verified-pill">✓ Verified</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Stars rating={sellerRating} size={11} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{reviewsCount} reviews</span>
                  </div>
                </div>
                <Link to="/search" className="text-xs font-bold sm:flex-shrink-0 hover:underline px-3 py-2.5 sm:py-1.5 rounded-full transition-all text-center sm:text-left touch-manipulation w-full sm:w-auto"
                  style={{ color: PRIMARY, background: 'var(--brand-tint)', border: '1px solid var(--brand-border-subtle)' }}>
                  Visit Store →
                </Link>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Responds within 1 hour · 98% positive ratings</span>
              </div>
              <LiveProductTeaser sellerId={product?.sellerId || product?.seller?._id || product?.seller?.id} />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { icon: Shield,     label: 'Buyer Protection', sub: 'Your money is safe',     color: PRIMARY      },
                { icon: Truck,      label: 'Free Shipping',     sub: 'On orders over $35',     color: '#6366f1'    },
                { icon: RefreshCw,  label: '30-Day Returns',    sub: 'Eligibility rules apply', color: '#10b981'    },
                { icon: BadgeCheck, label: 'Verified Seller',   sub: 'Identity confirmed',     color: '#f59e0b'    },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={label}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}14`, border: `1px solid ${color}28` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════
              HIGHLIGHTS STRIP
          ════════════════════════════════════════════════ */}
          <motion.div
            className="flex lg:grid lg:grid-cols-4 gap-3 mb-8 md:mb-10 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 snap-x snap-mandatory lg:snap-none scrollbar-hide -mx-0.5 px-0.5 lg:mx-0 lg:px-0"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.36, ease: softEase }}
          >
            {HIGHLIGHTS.map((h, i) => {
              const Icon = h.icon;
              return (
                <motion.div key={h.title}
                  className="pd2-highlight-card flex items-center gap-3 p-3 sm:p-4 rounded-2xl min-w-[min(85vw,280px)] lg:min-w-0 flex-shrink-0 lg:flex-shrink snap-center lg:snap-none"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
                  initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.32, delay: i * 0.05, ease: softEase }}
                  whileHover={{ y: -1 }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${h.color}14`, border: `1px solid ${h.color}25` }}>
                    <Icon size={18} style={{ color: h.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{h.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ════════════════════════════════════════════════
              Product details — mobile accordions / desktop tabs
          ════════════════════════════════════════════════ */}
          <div className="lg:hidden space-y-2 mb-8">
            {TABS.map((t, i) => (
              <div
                key={t.id}
                className="rounded-2xl overflow-hidden max-w-[100vw]"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}
              >
                <button
                  type="button"
                  className="pd2-mobile-accordion-btn w-full flex items-center justify-between gap-3 px-4 text-sm font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                  aria-expanded={mobileDetailOpen === t.id}
                  id={`pd2-acc-trigger-${t.id}`}
                  onClick={() => {
                    setMobileDetailOpen((cur) => (cur === t.id ? null : t.id));
                    setTabIndex(i);
                  }}
                >
                  <span className="text-left">
                    {t.id === 'reviews' ? `${t.label} (${reviewsCount})` : t.label}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 transition-transform duration-200 ${mobileDetailOpen === t.id ? 'rotate-180' : ''}`}
                    style={{ color: PRIMARY }}
                    aria-hidden
                  />
                </button>
                <AnimatePresence initial={false}>
                  {mobileDetailOpen === t.id && (
                    <motion.div
                      role="region"
                      aria-labelledby={`pd2-acc-trigger-${t.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t"
                      style={{ borderColor: 'var(--divider)' }}
                    >
                      <div className="px-3 py-3 sm:px-4 min-w-0">
                        {renderDetailPanel(i, { dense: true })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <motion.div
            className="hidden lg:block rounded-3xl overflow-hidden mb-10 lg:mb-12"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-card)' }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.5 }}
          >
            <div className="relative flex overflow-x-auto scrollbar-hide border-b" style={{ borderColor: 'var(--divider)' }}>
              {TABS.map((t, i) => (
                <button key={t.id} type="button"
                  onClick={() => setTabIndex(i)}
                  className="flex-shrink-0 flex-1 min-w-[90px] min-h-[52px] py-4 px-5 text-sm font-semibold transition-colors whitespace-nowrap touch-manipulation"
                  style={{ color: tabIndex === i ? PRIMARY : 'var(--text-muted)' }}>
                  {t.id === 'reviews' ? `${t.label} (${reviewsCount})` : t.label}
                </button>
              ))}
              <motion.div
                className="absolute bottom-0 h-0.5 rounded-full"
                style={{ background: PRIMARY, width: `${100 / TABS.length}%` }}
                animate={{ left: `${(tabIndex / TABS.length) * 100}%` }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              />
            </div>

            <div className="p-6 md:p-8 min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tabIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, ease: softEase }}
                >
                  {renderDetailPanel(tabIndex, { dense: false })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>

          <motion.section
            className="mb-6 md:mb-10 grid grid-cols-1 md:grid-cols-2 gap-3"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35 }}
          >
            <div className="p-4 sm:p-5 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-sm font-black mb-3" style={{ color: 'var(--text-primary)' }}>Service commitments</p>
              <div className="space-y-2">
                {serviceCommitments.map((item, idx) => (
                  <div key={`${item?.title}-${idx}`} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--divider)' }}>
                    <button
                      type="button"
                      onClick={() => setOpenCommitmentIdx((cur) => (cur === idx ? null : idx))}
                      className="w-full min-h-[44px] px-3 py-2.5 text-left text-sm font-semibold flex items-center justify-between"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    >
                      {item?.title || 'Commitment'}
                      <ChevronDown size={14} className={`transition-transform ${openCommitmentIdx === idx ? 'rotate-180' : ''}`} />
                    </button>
                    {openCommitmentIdx === idx && !!item?.description && (
                      <div className="px-3 py-2.5 text-xs" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
                        {item.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {detailSections.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}>
                <p className="text-sm font-black mb-3" style={{ color: 'var(--text-primary)' }}>More product details</p>
                <div className="space-y-2">
                  {detailSections.map((section, idx) => (
                    <div key={`${section?.title}-${idx}`} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--divider)' }}>
                      <button
                        type="button"
                        onClick={() => setOpenDetailIdx((cur) => (cur === idx ? null : idx))}
                        className="w-full min-h-[44px] px-3 py-2.5 text-left text-sm font-semibold flex items-center justify-between"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {section?.title}
                        <ChevronDown size={14} className={`transition-transform ${openDetailIdx === idx ? 'rotate-180' : ''}`} />
                      </button>
                      {openDetailIdx === idx && !!section?.content && (
                        <div className="px-3 py-2.5 text-xs whitespace-pre-wrap" style={{ color: 'var(--text-muted)', background: 'var(--card-bg)' }}>
                          {section.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* ════════════════════════════════════════════════
              RELATED PRODUCTS
          ════════════════════════════════════════════════ */}
          {related.length > 0 && (
            <section className="mb-14">
              <PremiumAutoProductCarousel
                products={related.slice(0, 8)}
                title="You might also like"
                subtitle="Recommended for you"
                viewAllHref="/search"
              />
            </section>
          )}

          {false && (
            <section className="mb-14 pd2-homeish-block REMOVED">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute left-0 top-0 bottom-4 w-8 z-[2] pointer-events-none"
                  style={{ background: 'linear-gradient(90deg, var(--pd2-strip-bg), transparent)' }}
                />
                <div
                  aria-hidden
                  className="absolute right-0 top-0 bottom-4 w-8 z-[2] pointer-events-none"
                  style={{ background: 'linear-gradient(270deg, var(--pd2-strip-bg), transparent)' }}
                />
                <div
                  ref={relatedScrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 scroll-touch"
                  onMouseEnter={() => setRelatedPaused(true)}
                  onMouseLeave={() => setRelatedPaused(false)}
                  onTouchStart={() => setRelatedPaused(true)}
                  onTouchEnd={() => setTimeout(() => setRelatedPaused(false), 1100)}
                  style={{
                    scrollbarWidth: 'none',
                    paddingLeft: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
                    paddingRight: 'max(0.2rem, calc((100vw - 1280px) / 2 + 0.2rem))',
                  }}
                >
                  {[...related.slice(0, 6), ...related.slice(0, 6)].map((p, idx) => (
                    <motion.div key={`${p._id || p.id}-${idx}`}
                      className="flex-shrink-0 w-[240px] sm:w-[255px]"
                      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }} transition={{ delay: (idx % 6) * 0.07, duration: 0.4 }}
                    >
                      <div className="pd2-homeish-card">
                        <ProductCard product={p} index={idx % 6} compact={false} ctaStyle="home" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ════════════════════════════════════════════════
              RECENTLY VIEWED
          ════════════════════════════════════════════════ */}
          {recentFiltered.length > 0 && (
            <section className="mb-8 pd2-homeish-block md:hidden -mx-2 sm:-mx-3">
              <RecentlyViewedRail
                items={recentFiltered}
                id="pd2-recent"
                title="Recently viewed"
                subtitle="You might also like"
                href="/search"
                className="!px-0"
              />
            </section>
          )}
          {recentFiltered.length > 0 && (
            <section className="mb-14 hidden md:block">
              <PremiumAutoProductCarousel
                products={recentFiltered.slice(0, 8)}
                title="Recently viewed"
                subtitle="You might also like"
                viewAllHref="/search"
              />
            </section>
          )}
        </div>

      </div>

      {/* Mobile share sheet */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pd2-share-sheet md:hidden"
            onClick={() => setShareOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              className="pd2-share-sheet__panel"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="pd2-share-sheet__title">Share product</p>
              {[['whatsapp','WhatsApp'],['facebook','Facebook'],['twitter','Twitter'],['copy','Copy link']].map(([k,l]) => (
                <button
                  key={k}
                  type="button"
                  className="pd2-share-sheet__btn"
                  onClick={() => handleShare(k === 'copy' ? 'copy' : k)}
                >
                  {k === 'copy' && shared ? 'Copied!' : l}
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile sticky CTAs — above bottom nav, thumb-sized */}
      <div className="md:hidden fixed left-0 right-0 z-[95] bottom-[calc(60px+env(safe-area-inset-bottom,0px))] pointer-events-none">
        <div className="pd2-sticky-cta-inner pd2-sticky-cta-inner--cart pointer-events-auto">
          <div className="pd2-sticky-cta-grid">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className="pd2-sticky-wish touch-manipulation"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={20} fill={wishlisted ? '#ef4444' : 'none'} stroke={wishlisted ? '#ef4444' : 'currentColor'} />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!detailsReady || stock === 0 || addState === 'adding'}
              className="pd2-sticky-cart touch-manipulation"
            >
              {addState === 'adding' && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <ShoppingBag size={17} />
              {addState === 'added' ? 'Added' : 'Add to cart'}
            </button>
            <button
              type="button"
              onClick={() => {
                addItem(
                  {
                    ...product,
                    price: activePricing.unitUsd,
                    sku: selectedVariant?.sku || p?.sku || product?.sku,
                    variantSku: selectedVariant?.sku,
                    selectedColor: selectedColorKey || selectedColor,
                    selectedSize,
                  },
                  quantity,
                );
                navigate('/checkout');
              }}
              disabled={!detailsReady || stock === 0}
              className="pd2-sticky-buy touch-manipulation disabled:opacity-45"
            >
              <Zap size={16} /> Buy now
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════════════ */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-12"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
            onClick={() => setLightbox(false)}
          >
            {galleryItems[activeImage]?.type !== 'video' && (
              <motion.img
                initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.88, opacity: 0 }} transition={{ duration: 0.3, ease }}
                src={galleryItems[activeImage]?.src || resolveImage(null)}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-2xl"
                style={{ boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <button type="button" onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
              <X size={18} />
            </button>
            {galleryItems.length > 1 && (
              <>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i - 1 + galleryItems.length) % galleryItems.length); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ChevronLeft size={22} />
                </button>
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveImage((i) => (i + 1) % galleryItems.length); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-colors"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </BuyerLayout>
  );
}
