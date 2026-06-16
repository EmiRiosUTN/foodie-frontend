"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type {
  AuthResponse,
  Bootstrap,
  CreateReservationForm,
  Customer,
  CustomerDetail,
  PlatformRestaurantDetail,
  PlatformRestaurantSummary,
  Reservation,
  RoomDetail,
  ServiceState,
  WorkspaceUser
} from "../lib/types";
import { initialReservationForm } from "../lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/v1";
const CHAT_API_URL = "https://chat.pupuia.com/api";

type ChatSession = {
  token: string;
  user: {
    id?: string;
    _id?: string;
    name: string;
    email: string;
    role: string;
    clientId?: string;
  } | null;
};

type WorkspaceContextValue = {
  token: string;
  currentUser: WorkspaceUser | null;
  userName: string;
  loginError: string;
  loading: boolean;
  bootstrap: Bootstrap | null;
  platformRestaurants: PlatformRestaurantSummary[];
  selectedBranchId: string;
  selectedRoomId: string;
  selectedDate: string;
  selectedTurn: "mediodia" | "noche";
  roomDetail: RoomDetail | null;
  reservations: Reservation[];
  customers: Customer[];
  tableStates: ServiceState[];
  reservationForm: CreateReservationForm;
  roomForm: { name: string; description: string; isOutdoor: boolean };
  chatSession: ChatSession;
  feedback: string;
  setSelectedBranchId: (value: string) => void;
  setSelectedRoomId: (value: string) => void;
  setSelectedDate: (value: string) => void;
  setSelectedTurn: (value: "mediodia" | "noche") => void;
  setReservationForm: React.Dispatch<React.SetStateAction<CreateReservationForm>>;
  setRoomForm: React.Dispatch<React.SetStateAction<{ name: string; description: string; isOutdoor: boolean }>>;
  handleLogin: (formData: FormData) => Promise<void>;
  logout: () => void;
  createRoom: () => Promise<void>;
  updateRoom: (roomId: string, input: { name: string; description: string; isOutdoor: boolean }) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  saveRoomLayout: (roomId: string, payload: unknown) => Promise<void>;
  createReservation: () => Promise<void>;
  moveReservation: (reservationId: string, action: "check-in" | "release") => Promise<void>;
  setTableState: (tableId: string, status: ServiceState["status"]) => Promise<void>;
  createCustomer: (input: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    birthday?: string | null;
    notes?: string | null;
    tags?: string[];
  }) => Promise<void>;
  updateCustomer: (
    customerId: string,
    input: {
      fullName?: string;
      phone?: string | null;
      email?: string | null;
      birthday?: string | null;
      notes?: string | null;
      tags?: string[];
    }
  ) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  loadCustomerDetail: (customerId: string) => Promise<CustomerDetail>;
  loadReservationHistory: (filters: {
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    turn?: "mediodia" | "noche" | "all";
    status?: string;
    search?: string;
  }) => Promise<Reservation[]>;
  loadPlatformRestaurantDetail: (restaurantId: string) => Promise<PlatformRestaurantDetail>;
  createPlatformRestaurant: (input: {
    restaurantName: string;
    slug: string;
    branchName: string;
    timezone: string;
    ownerFullName: string;
    ownerEmail: string;
    ownerPassword: string;
  }) => Promise<void>;
  createPlatformRestaurantUser: (
    restaurantId: string,
    input: { fullName: string; email: string; password: string; role: "restaurant_owner" | "restaurant_manager" | "host" | "waiter" }
  ) => Promise<void>;
  updatePlatformRestaurantUser: (
    restaurantId: string,
    userId: string,
    input: {
      fullName?: string;
      email?: string;
      password?: string;
      role?: "restaurant_owner" | "restaurant_manager" | "host" | "waiter";
      isActive?: boolean;
    }
  ) => Promise<void>;
  deletePlatformRestaurantUser: (restaurantId: string, userId: string) => Promise<void>;
  refreshAll: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [token, setToken] = useState("");
  const [currentUser, setCurrentUser] = useState<WorkspaceUser | null>(null);
  const [userName, setUserName] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [platformRestaurants, setPlatformRestaurants] = useState<PlatformRestaurantSummary[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTurn, setSelectedTurn] = useState<"mediodia" | "noche">("noche");
  const [roomDetail, setRoomDetail] = useState<RoomDetail | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tableStates, setTableStates] = useState<ServiceState[]>([]);
  const [reservationForm, setReservationForm] = useState<CreateReservationForm>(initialReservationForm);
  const [roomForm, setRoomForm] = useState({ name: "", description: "", isOutdoor: false });
  const [chatSession, setChatSession] = useState<ChatSession>({
    token: "",
    user: null
  });
  const [feedback, setFeedback] = useState("");

  async function api<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {})
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Request failed");
    }

    return response.json();
  }

  function clearChatSession() {
    window.localStorage.removeItem("auth_token");
    window.localStorage.removeItem("user_data");
    setChatSession({
      token: "",
      user: null
    });
  }

  async function validateStoredChatSession(chatToken: string) {
    const response = await fetch(`${CHAT_API_URL}/auth`, {
      headers: {
        "x-auth-token": chatToken
      }
    });

    if (!response.ok) {
      throw new Error("Sesion de chat invalida");
    }

    const user = await response.json();
    setChatSession({
      token: chatToken,
      user
    });
  }

  async function loginToChat(email: string, password: string) {
    const response = await fetch(`${CHAT_API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error("No se pudo iniciar sesion en el modulo chat");
    }

    const data = await response.json();
    window.localStorage.setItem("auth_token", data.token);
    window.localStorage.setItem("user_data", JSON.stringify(data.user));
    setChatSession({
      token: data.token,
      user: data.user
    });
  }

  async function loadBootstrap(authToken = token) {
    const response = await fetch(`${API_URL}/restaurant/bootstrap`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (!response.ok) {
      throw new Error("No se pudo cargar el restaurante");
    }

    const data: Bootstrap = await response.json();
    setBootstrap(data);

    const branchId = selectedBranchId || data.branches[0]?.id || "";
    setSelectedBranchId(branchId);
    const roomId = selectedRoomId || data.branches.find((branch) => branch.id === branchId)?.rooms[0]?.id || "";
    setSelectedRoomId(roomId);
  }

  async function loadPlatformRestaurants() {
    const data = await api<PlatformRestaurantSummary[]>("/platform/restaurants");
    setPlatformRestaurants(data);
    return data;
  }

  async function loadOperationalData() {
    if (!selectedBranchId) return;
    const [reservationsData, customersData, statesData] = await Promise.all([
      api<Reservation[]>(`/restaurant/reservations?branchId=${selectedBranchId}&serviceDate=${selectedDate}&turn=${selectedTurn}`),
      api<Customer[]>(`/restaurant/customers?branchId=${selectedBranchId}`),
      api<ServiceState[]>(`/restaurant/tables/states?branchId=${selectedBranchId}&serviceDate=${selectedDate}&turn=${selectedTurn}`)
    ]);
    setReservations(reservationsData);
    setCustomers(customersData);
    setTableStates(statesData);
  }

  async function loadRoomDetail() {
    if (!selectedRoomId) {
      setRoomDetail(null);
      return;
    }
    const detail = await api<RoomDetail>(`/restaurant/rooms/${selectedRoomId}/layout`);
    setRoomDetail(detail);
  }

  async function refreshAll() {
    if (currentUser?.scope === "platform") {
      await loadPlatformRestaurants();
      return;
    }

    await Promise.all([loadBootstrap(), loadOperationalData(), loadRoomDetail()]);
  }

  useEffect(() => {
    const savedToken = window.localStorage.getItem("foodie_token");
    const savedUserName = window.localStorage.getItem("foodie_user_name");
    const savedUser = window.localStorage.getItem("foodie_user");
    const savedChatToken = window.localStorage.getItem("auth_token");
    const savedChatUser = window.localStorage.getItem("user_data");
    if (savedToken) {
      setToken(savedToken);
      setUserName(savedUserName || "");
      setCurrentUser(savedUser ? JSON.parse(savedUser) : null);
      if (savedChatToken && savedChatUser) {
        setChatSession({
          token: savedChatToken,
          user: JSON.parse(savedChatUser)
        });
        validateStoredChatSession(savedChatToken).catch(() => clearChatSession());
      }
    } else if (pathname !== "/") {
      router.replace("/");
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!token || !currentUser) return;

    const load = async () => {
      try {
        if (currentUser.scope === "platform") {
          await loadPlatformRestaurants();
          if (pathname === "/") router.replace("/admin");
          return;
        }

        await loadBootstrap(token);
        if (pathname === "/") router.replace("/panel");
      } catch (error) {
        setLoginError(error instanceof Error ? error.message : "No se pudo cargar la sesion");
        logout();
      }
    };

    void load();
  }, [token, currentUser, pathname, router]);

  useEffect(() => {
    if (!token || currentUser?.scope !== "restaurant" || !selectedBranchId) return;
    loadOperationalData().catch((error) => setFeedback(error.message));
  }, [token, currentUser, selectedBranchId, selectedDate, selectedTurn]);

  useEffect(() => {
    if (!token || currentUser?.scope !== "restaurant" || !selectedRoomId) return;
    loadRoomDetail().catch((error) => setFeedback(error.message));
  }, [token, currentUser, selectedRoomId]);

  async function handleLogin(formData: FormData) {
    setLoading(true);
    setLoginError("");
    try {
      const email = String(formData.get("email") || "");
      const password = String(formData.get("password") || "");
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password
        })
      });
      if (!response.ok) throw new Error("Credenciales invalidas");
      const data: AuthResponse = await response.json();
      window.localStorage.setItem("foodie_token", data.accessToken);
      window.localStorage.setItem("foodie_user_name", data.user.fullName);
      window.localStorage.setItem("foodie_user", JSON.stringify(data.user));
      setToken(data.accessToken);
      setUserName(data.user.fullName);
      setCurrentUser(data.user);
      if (data.user.scope === "restaurant") {
        try {
          await loginToChat(email, password);
        } catch (error) {
          clearChatSession();
          setFeedback(error instanceof Error ? error.message : "No se pudo iniciar sesion en chat");
        }
      } else {
        clearChatSession();
      }
      router.replace(data.user.scope === "platform" ? "/admin" : "/panel");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login fallido");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem("foodie_token");
    window.localStorage.removeItem("foodie_user_name");
    window.localStorage.removeItem("foodie_user");
    clearChatSession();
    setToken("");
    setCurrentUser(null);
    setUserName("");
    setBootstrap(null);
    setPlatformRestaurants([]);
    setSelectedBranchId("");
    setSelectedRoomId("");
    setReservations([]);
    setCustomers([]);
    setTableStates([]);
    setRoomDetail(null);
    router.replace("/");
  }

  async function createRoom() {
    if (!selectedBranchId || !roomForm.name.trim()) return;
    try {
      await api("/restaurant/rooms", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          name: roomForm.name,
          description: roomForm.description,
          isOutdoor: roomForm.isOutdoor
        })
      });
      setRoomForm({ name: "", description: "", isOutdoor: false });
      await loadBootstrap();
      setFeedback("Salon creado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo crear el salon");
    }
  }

  async function updateRoom(roomId: string, input: { name: string; description: string; isOutdoor: boolean }) {
    try {
      await api(`/restaurant/rooms/${roomId}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      await loadBootstrap();
      if (selectedRoomId === roomId) {
        await loadRoomDetail();
      }
      setFeedback("Salon actualizado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar el salon");
    }
  }

  async function deleteRoom(roomId: string) {
    try {
      await api(`/restaurant/rooms/${roomId}`, {
        method: "DELETE"
      });

      const nextRoomId =
        bootstrap?.branches
          .find((branch) => branch.id === selectedBranchId)
          ?.rooms.find((room) => room.id !== roomId)?.id || "";

      if (selectedRoomId === roomId) {
        setSelectedRoomId(nextRoomId);
      }

      await loadBootstrap();
      setFeedback("Salon eliminado");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo eliminar el salon");
    }
  }

  async function saveRoomLayout(roomId: string, payload: unknown) {
    try {
      await api(`/restaurant/rooms/${roomId}/layout`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
      await Promise.all([loadBootstrap(), loadRoomDetail()]);
      setFeedback("Layout guardado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el layout";
      setFeedback(message);
      throw error;
    }
  }

  async function createReservation() {
    if (!selectedBranchId || !selectedRoomId) {
      const message = "Selecciona una sucursal y un salon antes de crear la reserva";
      setFeedback(message);
      throw new Error(message);
    }
    try {
      await api("/restaurant/reservations", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId,
          roomId: selectedRoomId,
          fullName: reservationForm.fullName,
          phone: reservationForm.phone,
          email: reservationForm.email,
          partySize: Number(reservationForm.partySize),
          serviceDate: selectedDate,
          serviceTime: reservationForm.serviceTime,
          preferredZone: reservationForm.preferredZone || undefined,
          preferredTags: reservationForm.preferredTags.split(",").map((item) => item.trim()).filter(Boolean),
          birthday: reservationForm.birthday || undefined,
          notes: reservationForm.notes || undefined
        })
      });
      setReservationForm(initialReservationForm);
      await loadOperationalData();
      setFeedback("Reserva creada");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la reserva";
      setFeedback(message);
      throw new Error(message);
    }
  }

  async function moveReservation(reservationId: string, action: "check-in" | "release") {
    try {
      await api(`/restaurant/reservations/${reservationId}/${action}`, { method: "POST" });
      await loadOperationalData();
      setFeedback(action === "check-in" ? "Mesa ocupada" : "Mesa liberada");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar la reserva");
    }
  }

  async function setTableState(tableId: string, status: ServiceState["status"]) {
    if (!selectedRoomId || !selectedBranchId) return;
    try {
      await api("/restaurant/tables/states", {
        method: "POST",
        body: JSON.stringify({
          tableId,
          roomId: selectedRoomId,
          branchId: selectedBranchId,
          serviceDate: selectedDate,
          turn: selectedTurn,
          status
        })
      });
      await loadOperationalData();
      setFeedback(`Mesa actualizada a ${status}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudo actualizar la mesa");
    }
  }

  async function createCustomer(input: {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    birthday?: string | null;
    notes?: string | null;
    tags?: string[];
  }) {
    try {
      await api("/restaurant/customers", {
        method: "POST",
        body: JSON.stringify({
          branchId: selectedBranchId || undefined,
          ...input
        })
      });
      await loadOperationalData();
      setFeedback("Cliente creado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el cliente";
      setFeedback(message);
      throw error;
    }
  }

  async function updateCustomer(
    customerId: string,
    input: {
      fullName?: string;
      phone?: string | null;
      email?: string | null;
      birthday?: string | null;
      notes?: string | null;
      tags?: string[];
    }
  ) {
    try {
      await api(`/restaurant/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      await loadOperationalData();
      setFeedback("Cliente actualizado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el cliente";
      setFeedback(message);
      throw error;
    }
  }

  async function deleteCustomer(customerId: string) {
    try {
      await api(`/restaurant/customers/${customerId}`, {
        method: "DELETE"
      });
      await loadOperationalData();
      setFeedback("Cliente eliminado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el cliente";
      setFeedback(message);
      throw error;
    }
  }

  async function loadCustomerDetail(customerId: string) {
    return api<CustomerDetail>(`/restaurant/customers/${customerId}`);
  }

  async function loadReservationHistory(filters: {
    branchId?: string;
    dateFrom?: string;
    dateTo?: string;
    turn?: "mediodia" | "noche" | "all";
    status?: string;
    search?: string;
  }) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return api<Reservation[]>(`/restaurant/reservations/history?${params.toString()}`);
  }

  async function loadPlatformRestaurantDetail(restaurantId: string) {
    return api<PlatformRestaurantDetail>(`/platform/restaurants/${restaurantId}`);
  }

  async function createPlatformRestaurant(input: {
    restaurantName: string;
    slug: string;
    branchName: string;
    timezone: string;
    ownerFullName: string;
    ownerEmail: string;
    ownerPassword: string;
  }) {
    try {
      await api("/platform/restaurants/onboarding", {
        method: "POST",
        body: JSON.stringify(input)
      });
      await loadPlatformRestaurants();
      setFeedback("Restaurante creado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el restaurante";
      setFeedback(message);
      throw error;
    }
  }

  async function createPlatformRestaurantUser(
    restaurantId: string,
    input: { fullName: string; email: string; password: string; role: "restaurant_owner" | "restaurant_manager" | "host" | "waiter" }
  ) {
    try {
      await api(`/platform/restaurants/${restaurantId}/users`, {
        method: "POST",
        body: JSON.stringify(input)
      });
      await loadPlatformRestaurants();
      setFeedback("Usuario creado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el usuario";
      setFeedback(message);
      throw error;
    }
  }

  async function updatePlatformRestaurantUser(
    restaurantId: string,
    userId: string,
    input: {
      fullName?: string;
      email?: string;
      password?: string;
      role?: "restaurant_owner" | "restaurant_manager" | "host" | "waiter";
      isActive?: boolean;
    }
  ) {
    try {
      await api(`/platform/restaurants/${restaurantId}/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(input)
      });
      await loadPlatformRestaurants();
      setFeedback("Usuario actualizado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario";
      setFeedback(message);
      throw error;
    }
  }

  async function deletePlatformRestaurantUser(restaurantId: string, userId: string) {
    try {
      await api(`/platform/restaurants/${restaurantId}/users/${userId}`, {
        method: "DELETE"
      });
      await loadPlatformRestaurants();
      setFeedback("Usuario eliminado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el usuario";
      setFeedback(message);
      throw error;
    }
  }

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      token,
      currentUser,
      userName,
      loginError,
      loading,
      bootstrap,
      platformRestaurants,
      selectedBranchId,
      selectedRoomId,
      selectedDate,
      selectedTurn,
      roomDetail,
      reservations,
      customers,
      tableStates,
      reservationForm,
      roomForm,
      chatSession,
      feedback,
      setSelectedBranchId,
      setSelectedRoomId,
      setSelectedDate,
      setSelectedTurn,
      setReservationForm,
      setRoomForm,
      handleLogin,
      logout,
      createRoom,
      updateRoom,
      deleteRoom,
      saveRoomLayout,
      createReservation,
      moveReservation,
      setTableState,
      createCustomer,
      updateCustomer,
      deleteCustomer,
      loadCustomerDetail,
      loadReservationHistory,
      loadPlatformRestaurantDetail,
      createPlatformRestaurant,
      createPlatformRestaurantUser,
      updatePlatformRestaurantUser,
      deletePlatformRestaurantUser,
      refreshAll
    }),
    [
      token,
      currentUser,
      userName,
      loginError,
      loading,
      bootstrap,
      platformRestaurants,
      selectedBranchId,
      selectedRoomId,
      selectedDate,
      selectedTurn,
      roomDetail,
      reservations,
      customers,
      tableStates,
      reservationForm,
      roomForm,
      chatSession,
      feedback
    ]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return context;
}
