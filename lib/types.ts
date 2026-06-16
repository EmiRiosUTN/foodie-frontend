export type AuthResponse = {
  accessToken: string;
  user: {
    sub: string;
    scope: "platform" | "restaurant";
    role: string;
    email: string;
    fullName: string;
    restaurantId?: string;
  };
};

export type WorkspaceUser = AuthResponse["user"];

export type Room = {
  id: string;
  branchId: string;
  name: string;
  description?: string | null;
  isOutdoor: boolean;
  zones: Array<{ id: string; name: string; slug: string }>;
  tables: Array<{
    id: string;
    label: string;
    seats: number;
    shape: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    isReservable: boolean;
    metadata?: {
      manualFeatures?: {
        hasTvView?: boolean;
      };
      derivedFeatures?: {
        nearWindow?: boolean;
        nearColumn?: boolean;
        nearWall?: boolean;
        nearCorridor?: boolean;
      };
    } | null;
    zoneId?: string | null;
  }>;
};

export type Branch = {
  id: string;
  name: string;
  timezone: string;
  rooms: Room[];
};

export type Bootstrap = {
  id: string;
  name: string;
  slug: string;
  branches: Branch[];
};

export type PlatformRestaurantSummary = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  chatModuleEnabled: boolean;
  createdAt: string;
  branches: Array<{ id: string; name: string; timezone: string }>;
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
  integrationTokens: Array<{
    id: string;
    label: string;
    isActive: boolean;
    createdAt: string;
  }>;
  _count: {
    rooms: number;
    customers: number;
    reservations: number;
  };
};

export type PlatformRestaurantDetail = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  chatModuleEnabled: boolean;
  chatClientId?: string | null;
  chatWabaId?: string | null;
  chatWorkflowId?: string | null;
  chatPhoneNumberId?: string | null;
  createdAt: string;
  branches: Array<{ id: string; name: string; timezone: string; createdAt: string }>;
  users: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  integrationTokens: Array<{
    id: string;
    label: string;
    isActive: boolean;
    lastUsedAt?: string | null;
    createdAt: string;
  }>;
  _count: {
    rooms: number;
    customers: number;
    reservations: number;
  };
};

export type Reservation = {
  id: string;
  code: string;
  fullName: string;
  phone: string;
  email: string;
  partySize: number;
  status: string;
  turn: "mediodia" | "noche";
  serviceDate: string;
  serviceTime: string;
  branch?: { id: string; name: string };
  room: { id: string; name: string };
  customer?: { id: string; fullName: string; tags: Array<{ id: string; label: string }> } | null;
  tables: Array<{ table: { id: string; label: string; seats: number } }>;
};

export type Customer = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  notes?: string | null;
  reservationCount: number;
  tags: Array<{ id: string; label: string }>;
  reservations: Array<{
    id: string;
    code: string;
    serviceDate: string;
    status: string;
    room?: { id: string; name: string } | null;
    tables?: Array<{ table: { id: string; label: string; seats: number } }>;
  }>;
};

export type CustomerDetail = Customer & {
  reservations: Customer["reservations"];
};

export type ServiceState = {
  id: string;
  tableId: string;
  reservationId?: string | null;
  status: "free" | "reserved" | "occupied" | "blocked";
};

export type RoomDetail = Room & {
  floorPlanItems: Array<{
    id: string;
    kind: string;
    label?: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    metadata?: Record<string, unknown> | null;
  }>;
  combinations: Array<{
    id: string;
    parentTableId: string;
    childTableId: string;
    combinedSeats: number;
  }>;
};

export type CreateReservationForm = {
  fullName: string;
  phone: string;
  email: string;
  partySize: string;
  serviceTime: string;
  preferredZone: string;
  preferredTags: string;
  birthday: string;
  notes: string;
};

export const initialReservationForm: CreateReservationForm = {
  fullName: "",
  phone: "",
  email: "",
  partySize: "2",
  serviceTime: "20:00",
  preferredZone: "",
  preferredTags: "",
  birthday: "",
  notes: ""
};
