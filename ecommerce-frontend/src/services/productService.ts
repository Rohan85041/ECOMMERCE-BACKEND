import api from './api';

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string;
  featured: boolean;
  ratings: {
    average: number;
    count: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productService = {
  getProducts: async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
    const response = await api.get('/products', { params: filters });
    return response.data;
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData: Partial<Product>): Promise<{ product: Product; message: string }> => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id: string, productData: Partial<Product>): Promise<{ product: Product; message: string }> => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  }
};
