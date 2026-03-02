import type { Collection, CollectionCondition, Product } from '@/types';

const API_BASE = 'http://localhost:5000/api';

/**
 * Collection Service - Handles all collection-related operations
 * Now uses MongoDB Atlas via REST API instead of Supabase
 */

// =====================================================
// COLLECTION CRUD OPERATIONS
// =====================================================

export async function getCollections(options?: {
  sellerId?: string;
  featured?: boolean;
  active?: boolean;
  includeProducts?: boolean;
}) {
  try {
    // For public/buyer-facing collections, return empty for now
    // This is used in Home.tsx - if you need public collections, create a public API endpoint
    if (!options?.sellerId) {
      // Return empty array to avoid errors - you can implement a public collections endpoint later
      return { data: [], error: null };
    }

    // For seller collections, use the seller API
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams();
    if (options.featured !== undefined) {
      params.append('featured', options.featured.toString());
    }
    if (options.active !== undefined) {
      params.append('active', options.active.toString());
    }

    const response = await fetch(`${API_BASE}/seller/collections?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch collections');
    }

    const result = await response.json();
    const collections = (result.collections || []).map((c: any) => ({
      id: c._id,
      seller_id: c.sellerId,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image_url: c.imageUrl,
      cover_image_url: c.coverImageUrl,
      type: c.type,
      sort_order: c.sortOrder,
      visibility: {
        storefront: c.visibility?.storefront ?? true,
        mobile_app: c.visibility?.mobile_app ?? true,
      },
      is_active: c.isActive,
      is_featured: c.isFeatured,
      is_draft: c.isDraft ?? false,
      conditions: c.conditions || [],
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      product_count: c.productCount ?? 0,
    })) as Collection[];

    // Get product counts if needed
    if (collections && options?.includeProducts) {
      const collectionsWithCounts = await Promise.all(
        collections.map(async (collection: Collection) => {
          const count = await getCollectionProductCount(collection.id);
          return { ...collection, product_count: count };
        })
      );
      return { data: collectionsWithCounts, error: null };
    }

    return { data: collections, error: null };
  } catch (error: any) {
    console.error('Error fetching collections:', error);
    return { data: null, error };
  }
}

export async function getCollection(id: string, includeProducts = false) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch collection');
    }

    const result = await response.json();
    const collection = result.collection;
    
    if (!collection) {
      return { data: null, error: new Error('Collection not found') };
    }

    const mappedCollection: Collection = {
      id: collection._id,
      seller_id: collection.sellerId,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      image_url: collection.imageUrl,
      cover_image_url: collection.coverImageUrl,
      type: collection.type,
      sort_order: collection.sortOrder,
      visibility: {
        storefront: collection.visibility?.storefront ?? true,
        mobile_app: collection.visibility?.mobile_app ?? true,
      },
      is_active: collection.isActive,
      is_featured: collection.isFeatured,
      is_draft: collection.isDraft ?? false,
      conditions: collection.conditions || [],
      created_at: collection.createdAt,
      updated_at: collection.updatedAt,
      product_count: collection.productCount ?? 0,
    };

    if (includeProducts && mappedCollection) {
      const products = await getCollectionProducts(id, mappedCollection.sort_order);
      return { data: { ...mappedCollection, products }, error: null };
    }

    return { data: mappedCollection, error: null };
  } catch (error: any) {
    console.error('Error fetching collection:', error);
    return { data: null, error };
  }
}

export async function getCollectionBySlug(slug: string, sellerId: string, includeProducts = false) {
  // Use getCollections and filter by slug
  const { data, error } = await getCollections({ sellerId, active: true });
  
  if (error || !data) {
    return { data: null, error: error || new Error('Failed to fetch collections') };
  }

  const collection = data.find((c: Collection) => c.slug === slug);
  
  if (!collection) {
    return { data: null, error: new Error('Collection not found') };
  }

  if (includeProducts && collection) {
    const products = await getCollectionProducts(collection.id, collection.sort_order);
    return { data: { ...collection, products }, error: null };
  }

  return { data: collection, error: null };
}

export async function createCollection(collection: Omit<Collection, 'id' | 'created_at' | 'updated_at'>) {
  try {
    // Generate slug if not provided
    let slug = collection.slug;
    if (!slug && collection.name) {
      slug = generateSlug(collection.name);
    }

    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        name: collection.name,
        slug,
        description: collection.description,
        imageUrl: collection.image_url,
        coverImageUrl: collection.cover_image_url,
        type: collection.type,
        sortOrder: collection.sort_order,
        visibility: collection.visibility,
        isActive: collection.is_active,
        isFeatured: collection.is_featured,
        isDraft: collection.is_draft,
        conditions: collection.conditions,
        publishedAt: collection.published_at || new Date().toISOString(),
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to create collection');
    }

    const result = await response.json();
    const created = result.collection;
    
    const mappedCollection: Collection = {
      id: created._id,
      seller_id: created.sellerId,
      name: created.name,
      slug: created.slug,
      description: created.description,
      image_url: created.imageUrl,
      cover_image_url: created.coverImageUrl,
      type: created.type,
      sort_order: created.sortOrder,
      visibility: {
        storefront: created.visibility?.storefront ?? true,
        mobile_app: created.visibility?.mobile_app ?? true,
      },
      is_active: created.isActive,
      is_featured: created.isFeatured,
      is_draft: created.isDraft ?? false,
      conditions: created.conditions || [],
      created_at: created.createdAt,
      updated_at: created.updatedAt,
      product_count: created.productCount ?? 0,
    };

    // If smart collection, sync products (handled by backend)
    return { data: mappedCollection, error: null };
  } catch (error: any) {
    console.error('Error creating collection:', error);
    return { data: null, error };
  }
}

export async function updateCollection(
  id: string,
  updates: Partial<Omit<Collection, 'id' | 'created_at' | 'seller_id'>>
) {
  try {
    const token = localStorage.getItem('auth_token');
    const updatePayload: any = {};
    
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.slug !== undefined) updatePayload.slug = updates.slug;
    if (updates.description !== undefined) updatePayload.description = updates.description;
    if (updates.image_url !== undefined) updatePayload.imageUrl = updates.image_url;
    if (updates.cover_image_url !== undefined) updatePayload.coverImageUrl = updates.cover_image_url;
    if (updates.type !== undefined) updatePayload.type = updates.type;
    if (updates.sort_order !== undefined) updatePayload.sortOrder = updates.sort_order;
    if (updates.visibility !== undefined) updatePayload.visibility = updates.visibility;
    if (updates.is_active !== undefined) updatePayload.isActive = updates.is_active;
    if (updates.is_featured !== undefined) updatePayload.isFeatured = updates.is_featured;
    if (updates.is_draft !== undefined) updatePayload.isDraft = updates.is_draft;
    if (updates.conditions !== undefined) updatePayload.conditions = updates.conditions;
    if (updates.published_at !== undefined) updatePayload.publishedAt = updates.published_at;

    const response = await fetch(`${API_BASE}/seller/collections/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updatePayload),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to update collection');
    }

    const result = await response.json();
    const updated = result.collection;
    
    const mappedCollection: Collection = {
      id: updated._id,
      seller_id: updated.sellerId,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      image_url: updated.imageUrl,
      cover_image_url: updated.coverImageUrl,
      type: updated.type,
      sort_order: updated.sortOrder,
      visibility: {
        storefront: updated.visibility?.storefront ?? true,
        mobile_app: updated.visibility?.mobile_app ?? true,
      },
      is_active: updated.isActive,
      is_featured: updated.isFeatured,
      is_draft: updated.isDraft ?? false,
      conditions: updated.conditions || [],
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
      product_count: updated.productCount ?? 0,
    };

    // If smart collection conditions changed, re-sync products (handled by backend)
    return { data: mappedCollection, error: null };
  } catch (error: any) {
    console.error('Error updating collection:', error);
    return { data: null, error };
  }
}

export async function deleteCollection(id: string) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to delete collection');
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error deleting collection:', error);
    return { error };
  }
}

// =====================================================
// PRODUCT-COLLECTION RELATIONSHIPS
// =====================================================

export async function getCollectionProducts(collectionId: string, sortOrder?: string) {
  try {
    const token = localStorage.getItem('auth_token');
    const params = new URLSearchParams();
    if (sortOrder) {
      params.append('sortOrder', sortOrder);
    }

    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/products?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch collection products');
    }

    const result = await response.json();
    return result.products || [];
  } catch (error: any) {
    console.error('Error fetching collection products:', error);
    return [];
  }
}

export async function getCollectionProductCount(collectionId: string): Promise<number> {
  try {
    const products = await getCollectionProducts(collectionId);
    return products.length;
  } catch (error: any) {
    console.error('Error counting collection products:', error);
    return 0;
  }
}

export async function addProductToCollection(productId: string, collectionId: string, position?: number) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ productId, position: position || 0 }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to add product to collection');
    }

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error adding product to collection:', error);
    return { data: null, error };
  }
}

export async function removeProductFromCollection(productId: string, collectionId: string) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/products/${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to remove product from collection');
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error removing product from collection:', error);
    return { error };
  }
}

export async function updateProductPosition(
  productId: string,
  collectionId: string,
  position: number
) {
  // This functionality might need to be implemented in the backend
  // For now, return success
  console.warn('updateProductPosition is not yet fully implemented with MongoDB API');
  return { data: null, error: null };
}

export async function bulkAddProductsToCollection(
  productIds: string[],
  collectionId: string
) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/products/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ productIds }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to bulk add products to collection');
    }

    return { data: null, error: null };
  } catch (error: any) {
    console.error('Error bulk adding products to collection:', error);
    return { data: null, error };
  }
}

export async function bulkRemoveProductsFromCollection(
  productIds: string[],
  collectionId: string
) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/products/bulk`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ productIds }),
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to bulk remove products from collection');
    }

    return { error: null };
  } catch (error: any) {
    console.error('Error bulk removing products from collection:', error);
    return { error };
  }
}

// =====================================================
// SMART COLLECTIONS
// =====================================================

export async function syncSmartCollection(collectionId: string) {
  try {
    // Smart collection syncing is handled by the backend when conditions are updated
    // This function can trigger a manual sync if needed
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/${collectionId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      // If sync endpoint doesn't exist, that's okay - backend handles it automatically
      console.warn('Smart collection sync endpoint not available, backend handles syncing automatically');
    }

    return { error: null };
  } catch (error: any) {
    // Backend handles smart collection syncing automatically, so this is not critical
    console.warn('Smart collection sync:', error.message);
    return { error: null };
  }
}

export async function previewSmartCollection(conditions: CollectionCondition[], sellerId: string) {
  try {
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_BASE}/seller/collections/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ conditions, sellerId }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to preview smart collection');
    }

    const result = await response.json();
    return { data: result.products || [], error: null };
  } catch (error: any) {
    console.error('Error previewing smart collection:', error);
    return { data: null, error };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function getProductCollections(productId: string) {
  // This function is not commonly used - return empty array for now
  // If needed, implement via MongoDB API
  console.warn('getProductCollections is not yet implemented with MongoDB API');
  return [];
}

