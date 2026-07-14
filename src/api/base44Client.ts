// Beautiful mock data for local demo mode
const MOCK_EVENTS = [
  {
    id: "event-1",
    title: "Neon Nights at Velvet Lounge",
    venue_name: "The Velvet Lounge",
    venue_type: "lounge",
    address: "742 Evergreen Terrace",
    state: "NY",
    cover_image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=60",
    current_vibe_score: 9.2,
    current_crowd_level: "busy",
    current_wait_time: "15_min",
    status_count: 42,
    vibe_tags: ["Electric", "Dance", "Cocktails"],
    is_active: true,
    created_date: new Date().toISOString(),
    start_time: new Date(Date.now() + 3600000).toISOString(),
    description: "Experience the ultimate night out with neon lights, signature cocktails, and live DJ sets curated by the city's finest DJs."
  },
  {
    id: "event-2",
    title: "Sunset Beats & Rooftop Views",
    venue_name: "Altitude Skyline Bar",
    venue_type: "rooftop",
    address: "100 Pine Street",
    state: "CA",
    cover_image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&auto=format&fit=crop&q=60",
    current_vibe_score: 8.7,
    current_crowd_level: "packed",
    current_wait_time: "30_min",
    status_count: 89,
    vibe_tags: ["Chill", "Sunset", "House"],
    is_active: true,
    created_date: new Date(Date.now() - 86400000).toISOString(),
    start_time: new Date(Date.now() + 7200000).toISOString(),
    description: "Enjoy panoramic views of the city skyline as local DJs spin deep house tunes. Perfect for sunset lovers and electronic music fans."
  },
  {
    id: "event-3",
    title: "Underground Bass Drop",
    venue_name: "The Subterranean Club",
    venue_type: "club",
    address: "456 Dark Alley",
    state: "IL",
    cover_image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=60",
    current_vibe_score: 6.8,
    current_crowd_level: "active",
    current_wait_time: "no_wait",
    status_count: 15,
    vibe_tags: ["Techno", "Bass", "Intense"],
    is_active: true,
    created_date: new Date(Date.now() - 172800000).toISOString(),
    start_time: new Date(Date.now() + 1800000).toISOString(),
    description: "Enter the depths of underground sound. A night of intense bass, dark techno vibes, and high energy dancing."
  },
  {
    id: "event-4",
    title: "Acoustic Lounge Sessions",
    venue_name: "The Mahogany Parlor",
    venue_type: "lounge",
    address: "99 Broadway",
    state: "NY",
    cover_image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=60",
    current_vibe_score: 7.9,
    current_crowd_level: "active",
    current_wait_time: "5_min",
    status_count: 28,
    vibe_tags: ["Acoustic", "Jazz", "Intimate"],
    is_active: true,
    created_date: new Date(Date.now() - 259200000).toISOString(),
    start_time: new Date(Date.now() + 86400000).toISOString(),
    description: "Unwind with intimate acoustic performances by local singer-songwriters while enjoying our curated wine list."
  }
];

const MOCK_TICKETS: any[] = [
  {
    id: "ticket-1",
    event_id: "event-1",
    ticket_type_id: "tt-1",
    buyer_id: "mock-user-id",
    status: "valid",
    purchase_date: new Date().toISOString(),
    qr_code_data: "base44-ticket-verification-qr-code-12345"
  }
];

const MOCK_TICKET_TYPES = [
  { id: "tt-1", event_id: "event-1", name: "General Admission", price: 25, quantity_available: 100 },
  { id: "tt-2", event_id: "event-1", name: "VIP Pass", price: 75, quantity_available: 20 },
  { id: "tt-3", event_id: "event-2", name: "Early Bird Entry", price: 15, quantity_available: 50 },
  { id: "tt-4", event_id: "event-2", name: "Standard Entry", price: 30, quantity_available: 150 }
];

const MOCK_ORDERS: any[] = [
  {
    id: "order-1",
    event_id: "event-1",
    buyer_id: "mock-user-id",
    total_amount: 50,
    status: "paid",
    created_date: new Date().toISOString(),
    ticket_qty: 2
  }
];

const MOCK_REVIEWS: any[] = [
  {
    id: "review-1",
    event_id: "event-1",
    user_name: "Jane Doe",
    rating: 5,
    comment: "The vibe was absolutely electric! Highly recommend.",
    created_date: new Date().toISOString()
  }
];

const MOCK_STATUS_UPDATES: any[] = [
  {
    id: "status-1",
    event_id: "event-1",
    user_name: "Alex Smith",
    crowd_level: "busy",
    wait_time: "15_min",
    vibe_score: 9,
    comment: "Lines moving fast, music is great!",
    created_date: new Date().toISOString()
  }
];

const MOCK_USER = {
  id: 'mock-user-id',
  name: 'Mock User',
  email: 'mock@example.com',
  bio: 'Techno enthusiast and city explorer. Always looking for the next lit spot.',
  social_links: { instagram: 'mock_explorer', spotify: 'vibe_playlist_1' },
  vibe_preferences: ['club', 'rooftop', 'cocktails'],
  privacy_settings: { is_private: false, show_on_leaderboard: true },
  subscription_tier: 'premium',
  notification_settings: {
    push_enabled: true,
    event_start_alerts: true,
    status_updates: true,
    crowd_level_changes: true,
    wait_time_alerts: true,
    chat_mentions: true,
    weekly_digest: true,
  }
};

const entityStore: Record<string, any[]> = {
  Event: MOCK_EVENTS,
  Ticket: MOCK_TICKETS,
  TicketType: MOCK_TICKET_TYPES,
  Order: MOCK_ORDERS,
  Review: MOCK_REVIEWS,
  StatusUpdate: MOCK_STATUS_UPDATES,
  User: [MOCK_USER],
  SavedEvent: [],
  UserActivity: []
};

const entityMockHandler = {
  get(target: any, prop: string) {
    const list = entityStore[prop] || [];
    
    return {
      list: async (...args: any[]) => {
        console.log(`Mock list for entity ${prop}`, args);
        return [...list];
      },
      filter: async (filters: any) => {
        console.log(`Mock filter for entity ${prop}`, filters);
        return list.filter(item => {
          return Object.entries(filters).every(([key, value]) => {
            if (value === undefined) return true;
            return item[key] === value;
          });
        });
      },
      get: async (id: string) => {
        console.log(`Mock get for entity ${prop} with id ${id}`);
        const item = list.find(item => item.id === id);
        if (!item) throw new Error(`${prop} not found`);
        return { ...item };
      },
      create: async (data: any) => {
        console.log(`Mock create for entity ${prop}`, data);
        const newItem = { id: `mock-${prop.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`, ...data };
        list.push(newItem);
        return newItem;
      },
      update: async (id: string, data: any) => {
        console.log(`Mock update for entity ${prop} with id ${id}`, data);
        const index = list.findIndex(item => item.id === id);
        if (index === -1) throw new Error(`${prop} not found`);
        list[index] = { ...list[index], ...data };
        return { ...list[index] };
      },
      delete: async (id: string) => {
        console.log(`Mock delete for entity ${prop} with id ${id}`);
        const index = list.findIndex(item => item.id === id);
        if (index !== -1) {
          list.splice(index, 1);
        }
        return { success: true };
      },
      subscribe: (callbackOrFilter: any, callback: any) => {
        console.log(`Mock subscribe for entity ${prop}`);
        return () => {
          console.log(`Mock unsubscribe for entity ${prop}`);
        };
      }
    };
  }
};

export const base44Mock = {
  auth: {
    me: async () => ({ ...MOCK_USER }),
    updateMe: async (data: any) => {
      Object.assign(MOCK_USER, data);
      return { ...MOCK_USER };
    },
    redirectToLogin: (redirectUrl?: string) => console.log('Redirecting to login (mocked) to', redirectUrl),
    logout: () => console.log('Logging out (mocked)'),
    setToken: () => {},
    isAuthenticated: async () => true,
    loginViaEmailPassword: async () => ({ access_token: "mock-token", user: MOCK_USER }),
    changePassword: async (password: string) => {
      console.log("Mock changePassword called");
      return { message: "Password updated successfully" };
    }
  },
  entities: new Proxy({}, entityMockHandler) as any,
  appLogs: {
    logUserInApp: async () => {}
  },
  admin: {
    getStats: async () => ({
      totalUsers: MOCK_EVENTS.length + 3,
      totalEvents: MOCK_EVENTS.length,
      activeEvents: MOCK_EVENTS.filter(e => e.is_active).length,
      confirmedOrders: MOCK_ORDERS.length,
      totalRevenue: MOCK_ORDERS.reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
      totalReviews: MOCK_REVIEWS.length,
      totalStatusUpdates: MOCK_STATUS_UPDATES.length,
      newUsersThisWeek: 2,
      newOrdersThisWeek: 1,
    }),
    getUsers: async () => entityStore["User"] || [],
    updateUserRole: async (userId: string, role: string) => {
      const u = entityStore["User"].find((x: any) => x.id === userId);
      if (u) u.role = role;
      return u;
    },
    deleteUser: async (userId: string) => {
      const idx = entityStore["User"].findIndex((x: any) => x.id === userId);
      if (idx !== -1) entityStore["User"].splice(idx, 1);
      return { success: true };
    },
    getEvents: async () => entityStore["Event"] || [],
    updateEvent: async (eventId: string, data: any) => {
      const e = entityStore["Event"].find((x: any) => x.id === eventId);
      if (e) Object.assign(e, data);
      return e;
    },
    deleteEvent: async (eventId: string) => {
      const idx = entityStore["Event"].findIndex((x: any) => x.id === eventId);
      if (idx !== -1) entityStore["Event"].splice(idx, 1);
      return { success: true };
    },
    getOrders: async () => entityStore["Order"] || [],
    getReviews: async () => entityStore["Review"] || [],
    deleteReview: async (reviewId: string) => {
      const idx = entityStore["Review"].findIndex((x: any) => x.id === reviewId);
      if (idx !== -1) entityStore["Review"].splice(idx, 1);
      return { success: true };
    },
    getStatusUpdates: async () => entityStore["StatusUpdate"] || [],
    deleteStatusUpdate: async (statusId: string) => {
      const idx = entityStore["StatusUpdate"].findIndex((x: any) => x.id === statusId);
      if (idx !== -1) entityStore["StatusUpdate"].splice(idx, 1);
      return { success: true };
    },
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }: { file: File }) => {
        console.log('Mock UploadFile for:', file.name);
        return { file_url: URL.createObjectURL(file) };
      },
      InvokeLLM: async ({ prompt }: { prompt: string; response_json_schema?: any }) => {
        console.log('Mock InvokeLLM called with prompt:', prompt);
        const eventIdRegex = /id:\s*(event-\d+|mock-[a-z0-9-]+)/g;
        const ids: string[] = [];
        let match;
        while ((match = eventIdRegex.exec(prompt)) !== null) {
          ids.push(match[1]);
        }
        const uniqueIds = Array.from(new Set(ids));
        return { event_ids: uniqueIds.slice(0, 4) };
      }
    }
  },
  orders: {
    cancel: async (id: string) => {
      console.log("Mock cancel order for:", id);
      const order = entityStore["Order"].find((o: any) => o.id === id);
      if (order) order.status = "cancelled";
      return { success: true };
    }
  },
  reviews: {
    update: async (id: string, data: any) => {
      console.log("Mock update review for:", id, data);
      const review = entityStore["Review"].find((r: any) => r.id === id);
      if (review) Object.assign(review, data);
      return review || { id, ...data };
    }
  }
};

import { base44Live } from "./apiClient";
const API_MODE = import.meta.env.VITE_API_MODE || "mock";

const isDemoSession = () => {
  try {
    return localStorage.getItem("vibe_demo_mode") === "true";
  } catch (e) {
    return false;
  }
};

export const base44 = new Proxy({}, {
  get(target: any, prop: string) {
    const activeClient = (API_MODE === "live" && !isDemoSession()) ? base44Live : base44Mock;
    return activeClient[prop as keyof typeof base44Live];
  }
}) as typeof base44Live;
