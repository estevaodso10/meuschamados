import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Users, Ticket, BarChart3, Settings, LogOut, 
  Mail, MessageSquare, Send, Paperclip, AlertCircle, CheckCheck, 
  ArrowRight, CheckCircle, Shield, Search, Filter, Bell, Plus, Trash2, Tag, User as UserIcon, Edit, X, Layers, Briefcase, UserPlus, Ban, PauseCircle, PlayCircle, Archive, RotateCcw, Calendar, MoreVertical, Camera, Upload, Lock, Loader2, UserPlus as UserPlusIcon
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://agfbsmpbygiqqgtxacrx.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZmJzbXBieWdpcXFndHhhY3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTgzMDksImV4cCI6MjA4MjI5NDMwOX0.6iTzPLzix2ojU1CVWadTRKf58Qk18jy6kBqiYESAqVo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- TYPES & MOCK DATA ---

type Role = 'ADMIN' | 'AGENT';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type TicketStatus = 'OPEN' | 'PENDING_AGENT' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED';
type Priority = 'NORMAL' | 'HIGH';

const STATUS_MAP: Record<TicketStatus, string> = {
  OPEN: 'Em Aberto',
  PENDING_AGENT: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  WAITING_CUSTOMER: 'Aguardando Ajuda',
  RESOLVED: 'Resolvido'
};

const USER_STATUS_MAP: Record<UserStatus, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
  INACTIVE: 'Desativado'
};

// Default generic avatar (Base64 SVG)
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1' width='100%25' height='100%25'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

interface Category {
  id: string;
  name: string;
  description?: string;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Acesso', description: 'Problemas de login e senhas' },
  { id: 'c2', name: 'Financeiro', description: 'Dúvidas sobre pagamentos e notas' },
  { id: 'c3', name: 'Outros', description: 'Assuntos diversos' },
  { id: 'c4', name: 'Suporte Técnico', description: 'Erros de sistema e hardware' },
  { id: 'c5', name: 'Vendas', description: 'Novas contratações e upgrades' }
];

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  groups: string[]; // Array of Group IDs
  avatarUrl?: string;
  lastAssignedAt?: Date;
}

interface Message {
  id: string;
  content: string;
  type: 'EMAIL_INCOMING' | 'EMAIL_OUTGOING' | 'INTERNAL_NOTE';
  createdAt: Date;
  authorId?: string;
  hasAttachments?: boolean; // Flag to indicate attachments exist in email source
}

interface TicketData {
  id: string;
  numericId: number;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  previousStatus?: TicketStatus; // Stores status before resolution
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date; // Timestamp when agent took ownership
  agentId?: string;
  groupId?: string; // Target Group ID
  helpNeeded: boolean;
  messages: Message[];
  category: string;
  transferRequest?: {
    targetAgentId: string;
    requestedAt: Date;
  };
}

const MOCK_GROUPS: Group[] = [
  { id: 'g1', name: 'Nível 1', description: 'Atendimento inicial e triagem' },
  { id: 'g2', name: 'Financeiro', description: 'Questões de faturamento e pagamentos' },
  { id: 'g3', name: 'Suporte Técnico', description: 'Bugs e problemas avançados' }
];

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Carlos Admin', email: 'admin@helpdesk.com', role: 'ADMIN', status: 'ACTIVE', avatarUrl: undefined, groups: [] },
  { id: 'u2', name: 'Ana Suporte', email: 'ana@helpdesk.com', role: 'AGENT', status: 'ACTIVE', avatarUrl: undefined, groups: ['g1'], lastAssignedAt: new Date(Date.now() - 100000) },
  { id: 'u3', name: 'João Financeiro', email: 'joao@helpdesk.com', role: 'AGENT', status: 'ACTIVE', avatarUrl: undefined, groups: ['g2', 'g1'], lastAssignedAt: new Date(Date.now() - 200000) },
  { id: 'u4', name: 'Pedro Técnico', email: 'pedro@helpdesk.com', role: 'AGENT', status: 'ACTIVE', avatarUrl: undefined, groups: ['g3'], lastAssignedAt: new Date(Date.now() - 500000) },
];

const INITIAL_TICKETS: TicketData[] = [
  {
    id: 't1', numericId: 1001, subject: 'Erro no pagamento via PIX', requesterEmail: 'cliente@gmail.com',
    status: 'IN_PROGRESS', priority: 'NORMAL', createdAt: new Date(Date.now() - 86400000), updatedAt: new Date(),
    agentId: 'u2', groupId: 'g2', helpNeeded: false, category: 'Financeiro',
    assignedAt: new Date(Date.now() - 86000000), // Assigned shortly after creation
    messages: [
      { id: 'm1', type: 'EMAIL_INCOMING', content: 'Olá, tentei pagar ontem e deu erro de timeout. Segue o print em anexo.', createdAt: new Date(Date.now() - 86400000), hasAttachments: true },
      { id: 'm2', type: 'EMAIL_OUTGOING', content: 'Olá! Recebi o print. Vou verificar com o banco.', createdAt: new Date(Date.now() - 40000000), authorId: 'u2' }
    ]
  },
  {
    id: 't2', numericId: 1002, subject: 'Acesso bloqueado', requesterEmail: 'novato@empresa.com',
    status: 'OPEN', priority: 'NORMAL', createdAt: new Date(Date.now() - 3600000), updatedAt: new Date(),
    groupId: 'g1', helpNeeded: false, category: 'Selecionar',
    messages: [
      { id: 'm3', type: 'EMAIL_INCOMING', content: 'Minha senha expirou e não consigo resetar.', createdAt: new Date(Date.now() - 3600000) }
    ]
  },
  {
    id: 't3', numericId: 1003, subject: 'Dúvida sobre fatura', requesterEmail: 'diretor@cliente.com',
    status: 'WAITING_CUSTOMER', priority: 'NORMAL', createdAt: new Date(Date.now() - 12000000), updatedAt: new Date(),
    agentId: 'u3', groupId: 'g2', helpNeeded: true, category: 'Financeiro',
    assignedAt: new Date(Date.now() - 11000000),
    messages: [
      { id: 'm4', type: 'EMAIL_INCOMING', content: 'A fatura de Março veio com valor errado.', createdAt: new Date(Date.now() - 12000000) },
      { id: 'm5', type: 'INTERNAL_NOTE', content: 'Preciso de ajuda para validar se houve reajuste contratual.', createdAt: new Date(Date.now() - 10000000), authorId: 'u3' }
    ]
  },
  {
    id: 't4', numericId: 1004, subject: 'Instabilidade no sistema', requesterEmail: 'ti@parceiro.com',
    status: 'RESOLVED', priority: 'HIGH', createdAt: new Date(Date.now() - 172800000), updatedAt: new Date(Date.now() - 86400000), // Resolved yesterday
    agentId: 'u2', groupId: 'g3', helpNeeded: false, category: 'Suporte Técnico',
    assignedAt: new Date(Date.now() - 170000000), // Took roughly 23 hours to resolve (simulating long ticket)
    messages: [
       { id: 'm6', type: 'EMAIL_INCOMING', content: 'O sistema está fora do ar. Log de erro anexo.', createdAt: new Date(Date.now() - 172800000), hasAttachments: true },
       { id: 'm7', type: 'EMAIL_OUTGOING', content: 'Resolvido após reinício do servidor.', createdAt: new Date(Date.now() - 86400000), authorId: 'u2' }
    ]
  },
  {
    id: 't5', numericId: 1005, subject: 'Nota Fiscal pendente', requesterEmail: 'financeiro@cliente.com',
    status: 'RESOLVED', priority: 'NORMAL', createdAt: new Date(Date.now() - 5000000), updatedAt: new Date(Date.now() - 1000000), 
    agentId: 'u3', groupId: 'g2', helpNeeded: false, category: 'Financeiro',
    assignedAt: new Date(Date.now() - 4500000), // Took roughly 1 hour (3.5m ms)
    messages: [
       { id: 'm8', type: 'EMAIL_INCOMING', content: 'Cadê a nota?', createdAt: new Date(Date.now() - 5000000) },
       { id: 'm9', type: 'EMAIL_OUTGOING', content: 'Segue em anexo.', createdAt: new Date(Date.now() - 1000000), authorId: 'u3', hasAttachments: true }
    ]
  }
];

// --- UI COMPONENTS ---

const Button = ({ children, variant = 'primary', size = 'md', className = '', ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    outline: "border border-slate-200 hover:bg-slate-100 bg-white",
    ghost: "hover:bg-slate-100 text-slate-700",
    danger: "bg-red-500 text-white hover:bg-red-600",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    warning: "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200",
  };
  
  const sizes: any = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 py-2 px-4 text-sm",
    lg: "h-12 px-6 text-base"
  };

  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>{children}</button>;
};

const Card = ({ children, className = '' }: any) => <div className={`bg-white rounded-lg border border-slate-200 shadow-sm ${className}`}>{children}</div>;

const Badge = ({ children, variant = 'default' }: any) => {
  const styles: any = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    error: "bg-red-100 text-red-800",
    blue: "bg-blue-100 text-blue-800",
    yellow: "bg-yellow-100 text-yellow-800",
    purple: "bg-purple-100 text-purple-800",
    gray: "bg-slate-200 text-slate-600",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[variant]}`}>{children}</span>;
};

// --- CONTEXT ---

interface AppState {
  currentUser: User | null;
  isLoadingSession: boolean;
  users: User[];
  tickets: TicketData[];
  categories: Category[];
  groups: Group[];
  login: (email: string, password: string) => Promise<{error?: any}>;
  logout: () => void;
  addMessage: (ticketId: string, content: string, type: Message['type'], helpNeeded: boolean, hasAttachments?: boolean) => void;
  createTicket: (data: Partial<TicketData>, initialMessage: string) => void;
  editTicket: (id: string, data: Partial<TicketData>) => void;
  deleteTicket: (id: string) => void;
  assignTicketRoundRobin: (ticketId: string) => void;
  assignTicketManual: (ticketId: string, targetType: 'USER' | 'GROUP', targetId: string) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  reopenTicket: (ticketId: string) => void;
  updateTicketPriority: (ticketId: string, priority: Priority) => void;
  updateTicketCategory: (ticketId: string, category: string) => void;
  requestTicketTransfer: (ticketId: string, targetAgentId: string) => void;
  approveTicketTransfer: (ticketId: string) => void;
  addCategory: (category: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  addUser: (user: Partial<User>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addGroup: (group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
}

const AppContext = createContext<AppState>({} as AppState);

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [tickets, setTickets] = useState<TicketData[]>(INITIAL_TICKETS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);

  // --- SUPABASE AUTH LOGIC ---

  const fetchProfile = async (email: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                profile_groups (
                    group_id
                )
            `)
            .eq('email', email)
            .single();

        if (error) {
            console.error("Erro ao buscar perfil:", error);
            if (email === 'admin@helpdesk.com') {
                const adminUser = users.find(u => u.email === 'admin@helpdesk.com');
                if (adminUser) setCurrentUser(adminUser);
            }
            return;
        }

        if (data) {
            const groups = data.profile_groups ? data.profile_groups.map((pg: any) => pg.group_id) : [];
            const mappedUser: User = {
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role as Role,
                status: data.status as UserStatus,
                avatarUrl: data.avatar_url,
                groups: groups,
                lastAssignedAt: data.last_assigned_at ? new Date(data.last_assigned_at) : undefined
            };
            setCurrentUser(mappedUser);
        }
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && session.user.email) {
            fetchProfile(session.user.email);
        }
        setIsLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && session.user.email) {
          fetchProfile(session.user.email);
      } else {
          setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    
    if (error) {
        return { error };
    }
    return {};
  };

  const logout = async () => {
      await supabase.auth.signOut();
      setCurrentUser(null);
  };

  // --- EXISTING APP LOGIC ---

  const addMessage = (ticketId: string, content: string, type: Message['type'], helpNeeded: boolean, hasAttachments: boolean = false) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const newMsg: Message = {
        id: Math.random().toString(36).substr(2, 9),
        content,
        type,
        createdAt: new Date(),
        authorId: currentUser?.id,
        hasAttachments: hasAttachments
      };
      
      let newStatus = t.status;
      if (type === 'EMAIL_OUTGOING') newStatus = 'IN_PROGRESS';
      
      return {
        ...t,
        messages: [...t.messages, newMsg],
        helpNeeded: helpNeeded,
        updatedAt: new Date(),
        status: newStatus
      };
    }));
  };

  const createTicket = (data: Partial<TicketData>, initialMessage: string) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newTicket: TicketData = {
        id: newId,
        numericId: Math.floor(1000 + Math.random() * 9000),
        subject: data.subject || 'Sem Assunto',
        requesterEmail: data.requesterEmail || 'sem-email@sistema.com',
        status: 'OPEN',
        priority: data.priority || 'NORMAL',
        category: data.category || 'Selecionar',
        createdAt: new Date(),
        updatedAt: new Date(),
        helpNeeded: false,
        messages: [{
            id: Math.random().toString(36).substr(2, 9),
            content: initialMessage,
            type: 'EMAIL_INCOMING',
            createdAt: new Date(),
        }]
    };
    setTickets(prev => [newTicket, ...prev]);
  };

  const editTicket = (id: string, data: Partial<TicketData>) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date() } : t));
  };

  const deleteTicket = (id: string) => {
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  const assignTicketRoundRobin = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return; 

    const groupAgents = users.filter(u => {
        if (u.role !== 'AGENT' || u.status !== 'ACTIVE') return false;
        if (ticket.groupId) return u.groups.includes(ticket.groupId);
        return true; 
    });

    if (groupAgents.length === 0) {
      alert('Nenhum atendente ATIVO disponível neste grupo.');
      return;
    }

    groupAgents.sort((a, b) => {
      if (!a.lastAssignedAt) return -1;
      if (!b.lastAssignedAt) return 1;
      return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
    });

    const selectedAgent = groupAgents[0];

    setTickets(prev => prev.map(t => t.id === ticketId ? { 
        ...t, 
        agentId: selectedAgent.id, 
        status: 'IN_PROGRESS',
        assignedAt: new Date(),
        updatedAt: new Date()
    } : t));
    setUsers(prev => prev.map(u => u.id === selectedAgent.id ? { ...u, lastAssignedAt: new Date() } : u));
    
    alert(`Ticket atribuído para ${selectedAgent.name}`);
  };

  const assignTicketManual = (ticketId: string, targetType: 'USER' | 'GROUP', targetId: string) => {
      let selectedAgentId: string | undefined = undefined;
      
      if (targetType === 'USER') {
          const targetUser = users.find(u => u.id === targetId);
          if (targetUser && targetUser.status === 'ACTIVE') {
            selectedAgentId = targetId;
          } else {
             alert('Este usuário não está ativo e não pode receber novos tickets.');
             return;
          }
      } else {
          const groupAgents = users.filter(u => 
              u.role === 'AGENT' && 
              u.status === 'ACTIVE' && 
              u.groups.includes(targetId)
          );

          if (groupAgents.length > 0) {
              groupAgents.sort((a, b) => {
                  if (!a.lastAssignedAt) return -1;
                  if (!b.lastAssignedAt) return 1;
                  return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
              });
              selectedAgentId = groupAgents[0].id;
          }
      }

      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;

          if (targetType === 'USER') {
              return { 
                  ...t, 
                  agentId: selectedAgentId, 
                  status: 'IN_PROGRESS', 
                  updatedAt: new Date(),
                  assignedAt: t.assignedAt || new Date()
              };
          } else {
              if (selectedAgentId) {
                  return { 
                      ...t, 
                      groupId: targetId, 
                      agentId: selectedAgentId, 
                      status: 'IN_PROGRESS', 
                      updatedAt: new Date(),
                      assignedAt: t.assignedAt || new Date()
                  };
              } else {
                  return { ...t, groupId: targetId, agentId: undefined, status: 'OPEN', updatedAt: new Date() };
              }
          }
      }));

      if (selectedAgentId) {
          setUsers(prev => prev.map(u => 
              u.id === selectedAgentId ? { ...u, lastAssignedAt: new Date() } : u
          ));
          
          if (targetType === 'GROUP') {
              const agentName = users.find(u => u.id === selectedAgentId)?.name;
              alert(`Grupo selecionado. Ticket distribuído automaticamente para: ${agentName}`);
          }
      } else if (targetType === 'GROUP') {
          alert('Ticket atribuído ao grupo. Nenhum atendente ATIVO disponível para atribuição automática.');
      }
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      let previousStatus = t.previousStatus;
      if (status === 'RESOLVED' && t.status !== 'RESOLVED') {
          previousStatus = t.status;
      }
      return { ...t, status, previousStatus, updatedAt: new Date() };
    }));
  };

  const reopenTicket = (ticketId: string) => {
      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;
          return {
              ...t,
              status: t.previousStatus || 'IN_PROGRESS',
              previousStatus: undefined,
              updatedAt: new Date()
          };
      }));
  };

  const updateTicketPriority = (ticketId: string, priority: Priority) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority } : t));
  };

  const updateTicketCategory = (ticketId: string, category: string) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, category } : t));
  };

  const requestTicketTransfer = (ticketId: string, targetAgentId: string) => {
      setTickets(prev => prev.map(t => t.id === ticketId ? {
          ...t,
          transferRequest: {
              targetAgentId,
              requestedAt: new Date()
          }
      } : t));
  };

  const approveTicketTransfer = (ticketId: string) => {
      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId || !t.transferRequest) return t;
          return {
              ...t,
              agentId: t.transferRequest.targetAgentId,
              status: 'IN_PROGRESS',
              transferRequest: undefined, 
              assignedAt: new Date()
          };
      }));
  };

  const addCategory = (categoryData: Partial<Category>) => {
    if (!categoryData.name) return;
    const newCat: Category = {
        id: Math.random().toString(36).substr(2, 9),
        name: categoryData.name,
        description: categoryData.description
    };
    setCategories(prev => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const addUser = (userData: Partial<User>) => {
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name: userData.name || '',
      email: userData.email || '',
      role: userData.role || 'AGENT',
      status: userData.status || 'ACTIVE',
      groups: userData.groups || [],
      avatarUrl: userData.avatarUrl || undefined,
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (id: string, data: Partial<User>) => {
    if (data.status === 'INACTIVE') {
        setTickets(prev => prev.map(t => {
            if (t.agentId === id && t.status !== 'RESOLVED') {
                return { 
                    ...t, 
                    agentId: undefined, 
                    status: 'OPEN', 
                    updatedAt: new Date(),
                    assignedAt: undefined 
                };
            }
            return t;
        }));
    }
    setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
    if (currentUser && currentUser.id === id) {
        setCurrentUser(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const addGroup = (groupData: Partial<Group>) => {
      const newGroup: Group = {
          id: Math.random().toString(36).substr(2, 9),
          name: groupData.name || 'Novo Grupo',
          description: groupData.description || ''
      };
      setGroups([...groups, newGroup]);
  };

  const deleteGroup = (id: string) => {
      setGroups(groups.filter(g => g.id !== id));
      setUsers(users.map(u => ({
          ...u,
          groups: u.groups.filter(gid => gid !== id)
      })));
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, isLoadingSession, users, tickets, categories, groups,
      login, logout, addMessage, assignTicketRoundRobin, assignTicketManual,
      updateTicketStatus, reopenTicket, updateTicketPriority, updateTicketCategory,
      requestTicketTransfer, approveTicketTransfer,
      addCategory, removeCategory, addUser, updateUser, deleteUser,
      addGroup, deleteGroup, createTicket, editTicket, deleteTicket
    }}>
      {children}
    </AppContext.Provider>
  );
};

// --- VIEWS ---

const LoginView = () => {
  const { login } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError("Por favor, preencha todos os campos.");
        return;
    }
    setError('');
    setLoading(true);
    
    const res = await login(email, password);
    if (res.error) {
        if (res.error.message === 'Invalid login credentials') {
            setError("Email ou senha incorretos.");
        } else {
            setError("Falha no login: " + res.error.message);
        }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="mb-8 text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-600 text-white mb-4 shadow-lg">
             <Mail size={32} />
         </div>
         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">HelpDesk Pro</h1>
         <p className="text-slate-500 mt-2">Sistema de Gestão de Atendimento</p>
      </div>

      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-t-blue-600">
        <div className="mb-6 text-center">
             <h2 className="text-xl font-semibold text-slate-800">Acesso Restrito</h2>
             <p className="text-sm text-slate-400">Entre com suas credenciais corporativas</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="seu.nome@empresa.com"
                  required
                />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
            </div>
          </div>

          <Button type="submit" className="w-full py-2.5 shadow-md" disabled={loading}>
            {loading ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Entrando...
                </span>
            ) : "Entrar no Sistema"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400">
                 Não possui acesso? Entre em contato com o <br/>
                 <span className="font-medium text-slate-600">Departamento de TI</span>.
             </p>
        </div>
      </Card>
      
      <div className="mt-8 text-slate-400 text-xs text-center">
          &copy; {new Date().getFullYear()} HelpDesk Pro. Todos os direitos reservados.<br/>
          <span className="opacity-50">v1.2.0 • Integração Supabase Auth Ativa</span>
      </div>
    </div>
  );
};

// --- SETTINGS VIEW ---
const SettingsView = () => {
    const { categories, addCategory, removeCategory, groups, addGroup, deleteGroup } = useContext(AppContext);
    const [newCat, setNewCat] = useState('');
    const [newGroup, setNewGroup] = useState('');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Tag size={20} /> Categorias
                        </h3>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 border rounded-md px-3 py-2 text-sm" 
                            placeholder="Nova Categoria..."
                            value={newCat}
                            onChange={e => setNewCat(e.target.value)}
                        />
                        <Button onClick={() => { addCategory({ name: newCat }); setNewCat(''); }} disabled={!newCat} size="sm">
                            <Plus size={16} />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {categories.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                                <span>{c.name}</span>
                                <button onClick={() => removeCategory(c.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Layers size={20} /> Grupos de Atendimento
                        </h3>
                    </div>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            className="flex-1 border rounded-md px-3 py-2 text-sm" 
                            placeholder="Novo Grupo..."
                            value={newGroup}
                            onChange={e => setNewGroup(e.target.value)}
                        />
                        <Button onClick={() => { addGroup({ name: newGroup }); setNewGroup(''); }} disabled={!newGroup} size="sm">
                            <Plus size={16} />
                        </Button>
                    </div>
                    <div className="space-y-2">
                        {groups.map(g => (
                            <div key={g.id} className="flex justify-between items-center p-2 bg-slate-50 rounded text-sm">
                                <span>{g.name}</span>
                                <button onClick={() => deleteGroup(g.id)} className="text-red-500 hover:text-red-700">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- USERS VIEW ---
const UsersView = () => {
    const { users, groups, addUser, updateUser, deleteUser } = useContext(AppContext);
    const [showModal, setShowModal] = useState(false);
    
    // Simple state for new user form
    const [formData, setFormData] = useState<Partial<User>>({
        name: '', email: '', role: 'AGENT', groups: []
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addUser(formData);
        setShowModal(false);
        setFormData({ name: '', email: '', role: 'AGENT', groups: [] });
    };

    const toggleGroup = (groupId: string) => {
        const currentGroups = formData.groups || [];
        if (currentGroups.includes(groupId)) {
            setFormData({ ...formData, groups: currentGroups.filter(g => g !== groupId) });
        } else {
            setFormData({ ...formData, groups: [...currentGroups, groupId] });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Gerenciar Usuários</h2>
                <Button onClick={() => setShowModal(true)}>
                    <UserPlus size={18} className="mr-2" /> Novo Usuário
                </Button>
            </div>

            <Card className="overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Grupos</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-slate-900">{user.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{user.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Badge variant={user.role === 'ADMIN' ? 'purple' : 'blue'}>{user.role}</Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select 
                                        value={user.status}
                                        onChange={(e) => updateUser(user.id, { status: e.target.value as UserStatus })}
                                        className="text-xs border-none bg-transparent focus:ring-0 cursor-pointer"
                                    >
                                        <option value="ACTIVE">Ativo</option>
                                        <option value="INACTIVE">Inativo</option>
                                    </select>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    <div className="flex flex-wrap gap-1">
                                        {user.groups.map(gid => {
                                            const g = groups.find(gr => gr.id === gid);
                                            return g ? <Badge key={gid} variant="gray">{g.name}</Badge> : null;
                                        })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:text-red-900"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg p-6">
                        <h3 className="text-lg font-bold mb-4">Adicionar Usuário</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome</label>
                                <input required className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input required type="email" className="w-full border rounded p-2" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Função</label>
                                <select className="w-full border rounded p-2" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                                    <option value="AGENT">Agente</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Grupos</label>
                                <div className="space-y-2 max-h-32 overflow-y-auto border p-2 rounded">
                                    {groups.map(g => (
                                        <label key={g.id} className="flex items-center gap-2">
                                            <input type="checkbox" checked={formData.groups?.includes(g.id)} onChange={() => toggleGroup(g.id)} />
                                            <span className="text-sm">{g.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button type="submit">Salvar</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

// --- ADMIN DASHBOARD ---
const AdminDashboard = () => {
    const { tickets } = useContext(AppContext);

    const stats = [
        { label: 'Total de Tickets', value: tickets.length, icon: Ticket, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Em Aberto', value: tickets.filter(t => t.status === 'OPEN').length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100' },
        { label: 'Resolvidos', value: tickets.filter(t => t.status === 'RESOLVED').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Prioridade Alta', value: tickets.filter(t => t.priority === 'HIGH' && t.status !== 'RESOLVED').length, icon: Shield, color: 'text-red-600', bg: 'bg-red-100' },
    ];

    // Simple mock data for chart
    const data = [
        { name: 'Seg', tickets: 4 },
        { name: 'Ter', tickets: 3 },
        { name: 'Qua', tickets: 7 },
        { name: 'Qui', tickets: 5 },
        { name: 'Sex', tickets: 8 },
        { name: 'Sab', tickets: 2 },
        { name: 'Dom', tickets: 1 },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="p-4 flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                        </div>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 h-80">
                    <h3 className="text-lg font-semibold mb-4">Volume de Tickets (Semana)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <RechartsTooltip />
                            <Bar dataKey="tickets" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
                
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
                    <div className="space-y-4">
                        {tickets.slice(0, 5).map(t => (
                            <div key={t.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                                <div className={`mt-1 h-2 w-2 rounded-full ${t.status === 'OPEN' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{t.subject}</p>
                                    <p className="text-xs text-slate-500">
                                        {new Date(t.updatedAt).toLocaleTimeString()} • {STATUS_MAP[t.status]}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

// --- TICKET LIST VIEW (Admin/Agent) ---
const AdminTickets = () => {
    const { tickets, users, groups, assignTicketManual, deleteTicket } = useContext(AppContext);
    
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">Todos os Tickets</h2>
            <Card className="overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Assunto</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Atribuído a</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {tickets.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 text-sm text-slate-500">#{t.numericId}</td>
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{t.subject}</td>
                                <td className="px-6 py-4 text-sm">
                                    <Badge variant={t.status === 'OPEN' ? 'warning' : t.status === 'RESOLVED' ? 'success' : 'blue'}>
                                        {STATUS_MAP[t.status]}
                                    </Badge>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">
                                    {t.agentId ? users.find(u => u.id === t.agentId)?.name : 'Não atribuído'}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button onClick={() => deleteTicket(t.id)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

// --- AGENT WORKSPACE ---
const AgentWorkspace = () => {
    const { currentUser, tickets, addMessage, updateTicketStatus, createTicket } = useContext(AppContext);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [reply, setReply] = useState('');
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    
    // New Ticket State
    const [newTicketData, setNewTicketData] = useState({ subject: '', email: '', message: '' });

    const myTickets = tickets.filter(t => t.agentId === currentUser?.id && t.status !== 'RESOLVED');
    const selectedTicket = tickets.find(t => t.id === selectedTicketId);

    const handleSend = () => {
        if (!selectedTicketId || !reply) return;
        addMessage(selectedTicketId, reply, 'EMAIL_OUTGOING', false);
        setReply('');
    };

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        createTicket(
            { subject: newTicketData.subject, requesterEmail: newTicketData.email },
            newTicketData.message
        );
        setShowNewTicketModal(false);
        setNewTicketData({ subject: '', email: '', message: '' });
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6">
            {/* Ticket List */}
            <div className="w-1/3 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Meus Tickets</h2>
                    <Button size="sm" onClick={() => setShowNewTicketModal(true)}><Plus size={16} /></Button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {myTickets.length === 0 && <p className="text-slate-500 text-sm text-center mt-10">Você não tem tickets pendentes.</p>}
                    {myTickets.map(t => (
                        <Card 
                            key={t.id} 
                            onClick={() => setSelectedTicketId(t.id)}
                            className={`p-4 cursor-pointer transition-colors ${selectedTicketId === t.id ? 'border-blue-500 bg-blue-50' : 'hover:border-blue-300'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-slate-900 text-sm truncate">{t.subject}</span>
                                <span className="text-xs text-slate-400">#{t.numericId}</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-500 truncate">{t.requesterEmail}</span>
                                <Badge variant="warning" className="scale-90 origin-right">{STATUS_MAP[t.status]}</Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Ticket Detail / Chat */}
            <div className="flex-1">
                {selectedTicket ? (
                    <Card className="h-full flex flex-col overflow-hidden">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{selectedTicket.subject}</h3>
                                <p className="text-sm text-slate-500">{selectedTicket.requesterEmail}</p>
                            </div>
                            <Button size="sm" variant="success" onClick={() => {
                                updateTicketStatus(selectedTicket.id, 'RESOLVED');
                                setSelectedTicketId(null);
                            }}>
                                <CheckCheck size={16} className="mr-2" /> Resolver
                            </Button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                            {selectedTicket.messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.type === 'EMAIL_OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg p-3 ${
                                        msg.type === 'EMAIL_OUTGOING' ? 'bg-blue-600 text-white rounded-br-none' : 
                                        msg.type === 'INTERNAL_NOTE' ? 'bg-yellow-100 text-yellow-900 border border-yellow-200' :
                                        'bg-white border border-slate-200 rounded-bl-none'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                        <div className={`text-[10px] mt-1 opacity-70 text-right`}>
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t bg-white">
                            <div className="relative">
                                <textarea
                                    className="w-full border rounded-lg p-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    rows={3}
                                    placeholder="Escreva uma resposta..."
                                    value={reply}
                                    onChange={e => setReply(e.target.value)}
                                />
                                <button 
                                    onClick={handleSend}
                                    className="absolute bottom-3 right-3 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 flex-col">
                        <MessageSquare size={48} className="mb-4 opacity-20" />
                        <p>Selecione um ticket para visualizar</p>
                    </div>
                )}
            </div>

            {/* New Ticket Modal */}
            {showNewTicketModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-lg p-6">
                        <h3 className="text-lg font-bold mb-4">Novo Ticket</h3>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <input 
                                placeholder="Assunto" 
                                className="w-full border rounded p-2" 
                                required 
                                value={newTicketData.subject}
                                onChange={e => setNewTicketData({...newTicketData, subject: e.target.value})}
                            />
                            <input 
                                type="email" 
                                placeholder="Email do Solicitante" 
                                className="w-full border rounded p-2" 
                                required 
                                value={newTicketData.email}
                                onChange={e => setNewTicketData({...newTicketData, email: e.target.value})}
                            />
                            <textarea 
                                placeholder="Mensagem inicial" 
                                className="w-full border rounded p-2" 
                                rows={4} 
                                required
                                value={newTicketData.message}
                                onChange={e => setNewTicketData({...newTicketData, message: e.target.value})}
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setShowNewTicketModal(false)}>Cancelar</Button>
                                <Button type="submit">Criar Ticket</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

// --- APP LAYOUT ---
const AppLayout = () => {
    const { currentUser, logout } = useContext(AppContext);
    const [page, setPage] = useState<'dashboard' | 'tickets' | 'workspace' | 'users' | 'settings'>('dashboard');

    // Simple router inside layout
    const renderContent = () => {
        switch(page) {
            case 'dashboard': return <AdminDashboard />;
            case 'tickets': return <AdminTickets />;
            case 'workspace': return <AgentWorkspace />;
            case 'users': return <UsersView />;
            case 'settings': return <SettingsView />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
                <div className="p-6 flex items-center gap-3 text-white">
                    <div className="bg-blue-600 p-2 rounded-lg"><Mail size={20} /></div>
                    <span className="font-bold text-lg">HelpDesk Pro</span>
                </div>
                
                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {currentUser?.role === 'ADMIN' && (
                        <>
                            <button onClick={() => setPage('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${page === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                                <LayoutDashboard size={20} /> Dashboard
                            </button>
                            <button onClick={() => setPage('tickets')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${page === 'tickets' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                                <Layers size={20} /> Todos Tickets
                            </button>
                            <button onClick={() => setPage('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${page === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                                <Users size={20} /> Usuários
                            </button>
                            <button onClick={() => setPage('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${page === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                                <Settings size={20} /> Configurações
                            </button>
                        </>
                    )}
                    
                    <div className="pt-4 mt-4 border-t border-slate-700">
                        <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Área do Agente</p>
                        <button onClick={() => setPage('workspace')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${page === 'workspace' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                            <Briefcase size={20} /> Meus Tickets
                        </button>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                            <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto h-screen">
                {renderContent()}
            </main>
        </div>
    );
};

const App = () => {
    const { currentUser, isLoadingSession } = useContext(AppContext);

    if (isLoadingSession) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
                <Loader2 className="animate-spin text-blue-600" size={48} />
            </div>
        );
    }

    return currentUser ? <AppLayout /> : <LoginView />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <AppProvider>
      <App />
    </AppProvider>
  );
}