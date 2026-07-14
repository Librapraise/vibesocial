import axios from "axios";
// VITE_API_MODE can be "mock" (default) or "live"
const API_MODE = import.meta.env.VITE_API_MODE || "mock";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Configure token injection if available in localStorage
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("vibe_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ENDPOINT_MAP: Record<string, string> = {
  TicketType: "/ticket-types",
  StatusUpdate: "/status-updates",
  SavedEvent: "/saved-events",
  UserActivity: "/user-activities",
};

const entityLiveHandler = {
  get(target: any, prop: string) {
    const endpoint = ENDPOINT_MAP[prop] || `/${prop.toLowerCase()}s`;
    return {
      list: async (...args: any[]) => {
        const response = await axiosInstance.get(endpoint);
        return response.data;
      },
      filter: async (filters: any) => {
        const response = await axiosInstance.get(endpoint, { params: filters });
        return response.data;
      },
      get: async (id: string) => {
        const response = await axiosInstance.get(`${endpoint}/${id}`);
        return response.data;
      },
      create: async (data: any) => {
        const response = await axiosInstance.post(endpoint, data);
        return response.data;
      },
      update: async (id: string, data: any) => {
        const response = await axiosInstance.put(`${endpoint}/${id}`, data);
        return response.data;
      },
      delete: async (id: string) => {
        const response = await axiosInstance.delete(`${endpoint}/${id}`);
        return response.data;
      },
      subscribe: (callbackOrFilter: any, callback: any) => {
        console.log(`Live websocket subscription requested for ${prop}`);
        return () => {};
      }
    };
  }
};

export const base44Live = {
  auth: {
    me: async () => {
      try {
        const response = await axiosInstance.get("/auth/me");
        return response.data;
      } catch (err) {
        // Fallback or bubble auth errors
        throw err;
      }
    },
    updateMe: async (data: any) => {
      const response = await axiosInstance.put("/auth/me", data);
      return response.data;
    },
    redirectToLogin: (redirectUrl?: string) => {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl || "")}`;
    },
    logout: () => {
      localStorage.removeItem("vibe_token");
      window.location.reload();
    },
    setToken: (token: string) => {
      localStorage.setItem("vibe_token", token);
    },
    isAuthenticated: async () => {
      return !!localStorage.getItem("vibe_token");
    },
    loginViaEmailPassword: async (data: any) => {
      const response = await axiosInstance.post("/auth/login", data);
      if (response.data.access_token) {
        localStorage.setItem("vibe_token", response.data.access_token);
      }
      return response.data;
    }
  },
  entities: new Proxy({}, entityLiveHandler) as any,
  appLogs: {
    logUserInApp: async () => {}
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }: { file: File }) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await axiosInstance.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        return response.data;
      },
      InvokeLLM: async ({ prompt }: { prompt: string }) => {
        const response = await axiosInstance.post("/ai/invoke", { prompt });
        return response.data;
      }
    }
  },
  admin: {
    getStats: async () => {
      const response = await axiosInstance.get("/admin/stats");
      return response.data;
    },
    // Users
    getUsers: async (params?: { search?: string; role?: string; limit?: number; offset?: number }) => {
      const response = await axiosInstance.get("/admin/users", { params });
      return response.data;
    },
    updateUserRole: async (userId: string, role: string) => {
      const response = await axiosInstance.patch(`/admin/users/${userId}/role`, { role });
      return response.data;
    },
    deleteUser: async (userId: string) => {
      const response = await axiosInstance.delete(`/admin/users/${userId}`);
      return response.data;
    },
    // Events
    getEvents: async (params?: { search?: string; is_active?: boolean; limit?: number; offset?: number }) => {
      const response = await axiosInstance.get("/admin/events", { params });
      return response.data;
    },
    updateEvent: async (eventId: string, data: any) => {
      const response = await axiosInstance.patch(`/admin/events/${eventId}`, data);
      return response.data;
    },
    deleteEvent: async (eventId: string) => {
      const response = await axiosInstance.delete(`/admin/events/${eventId}`);
      return response.data;
    },
    // Orders
    getOrders: async (params?: { status?: string; limit?: number; offset?: number }) => {
      const response = await axiosInstance.get("/admin/orders", { params });
      return response.data;
    },
    // Reviews
    getReviews: async (params?: { limit?: number; offset?: number }) => {
      const response = await axiosInstance.get("/admin/reviews", { params });
      return response.data;
    },
    deleteReview: async (reviewId: string) => {
      const response = await axiosInstance.delete(`/admin/reviews/${reviewId}`);
      return response.data;
    },
    // Status Updates
    getStatusUpdates: async (params?: { limit?: number; offset?: number }) => {
      const response = await axiosInstance.get("/admin/status-updates", { params });
      return response.data;
    },
    deleteStatusUpdate: async (statusId: string) => {
      const response = await axiosInstance.delete(`/admin/status-updates/${statusId}`);
      return response.data;
    },
  },
};
