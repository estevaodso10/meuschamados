import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Users, Ticket, BarChart3, Settings, LogOut, 
  Mail, MessageSquare, Send, Paperclip, AlertCircle, CheckCheck, 
  ArrowRight, CheckCircle, Shield, Search, Filter, Bell, Plus, Trash2, Tag, User as UserIcon, Edit, X, Layers, Briefcase, UserPlus, Ban, PauseCircle, PlayCircle, Archive, RotateCcw, Calendar, MoreVertical, Camera, Upload, Lock
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';

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
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1' width='100%25' height='100%25'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

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
  users: User[];
  tickets: TicketData[];
  categories: Category[];
  groups: Group[];
  login: (email: string) => void;
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

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [tickets, setTickets] = useState<TicketData[]>(INITIAL_TICKETS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);

  const login = (email: string) => {
    const user = users.find(u => u.email === email && u.status !== 'INACTIVE');
    if (user) setCurrentUser(user);
    else alert('Usuário não encontrado, inativo ou desativado. Tente "admin@helpdesk.com"');
  };

  const logout = () => setCurrentUser(null);

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

    // Find agents who are in the ticket's group (if ticket has a group)
    // AND who are ACTIVE
    const groupAgents = users.filter(u => {
        if (u.role !== 'AGENT' || u.status !== 'ACTIVE') return false;
        if (ticket.groupId) return u.groups.includes(ticket.groupId);
        return true; // If ticket has no group, any agent can take it
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

    // Added assignedAt: new Date()
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
          // GROUP LOGIC: Find best agent (Round Robin / Least Recently Assigned)
          // 1. Filter agents in the group AND ACTIVE
          const groupAgents = users.filter(u => 
              u.role === 'AGENT' && 
              u.status === 'ACTIVE' && 
              u.groups.includes(targetId)
          );

          if (groupAgents.length > 0) {
              // 2. Sort by lastAssignedAt ASC (undefined first, then oldest dates)
              groupAgents.sort((a, b) => {
                  if (!a.lastAssignedAt) return -1;
                  if (!b.lastAssignedAt) return 1;
                  return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
              });
              
              // 3. Select first
              selectedAgentId = groupAgents[0].id;
          }
      }

      // Update Ticket
      setTickets(prev => prev.map(t => {
          if (t.id !== ticketId) return t;

          if (targetType === 'USER') {
               // Direct user assignment. Set assignedAt if not set (or overwrite for re-assignment)
              return { 
                  ...t, 
                  agentId: selectedAgentId, 
                  status: 'IN_PROGRESS', 
                  updatedAt: new Date(),
                  assignedAt: t.assignedAt || new Date()
              };
          } else {
              // Group Assignment
              if (selectedAgentId) {
                  // Found an agent to auto-assign
                  return { 
                      ...t, 
                      groupId: targetId, 
                      agentId: selectedAgentId, 
                      status: 'IN_PROGRESS', 
                      updatedAt: new Date(),
                      assignedAt: t.assignedAt || new Date()
                  };
              } else {
                  // No agent in group, just leave in backlog (OPEN) with group assigned
                  return { ...t, groupId: targetId, agentId: undefined, status: 'OPEN', updatedAt: new Date() };
              }
          }
      }));

      // Update User Timestamp if an agent was selected
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
      
      // Store current status as previousStatus ONLY if we are resolving and haven't already stored it
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
              status: t.previousStatus || 'IN_PROGRESS', // Restore previous or default to IN_PROGRESS
              previousStatus: undefined, // Clear previous status
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
              transferRequest: undefined, // Clear request
              assignedAt: new Date() // Reset assignment time to now for the new agent? Or keep original? Let's reset for individual tracking.
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
    // Logic for Deactivation
    if (data.status === 'INACTIVE') {
        setTickets(prev => prev.map(t => {
            if (t.agentId === id && t.status !== 'RESOLVED') {
                return { 
                    ...t, 
                    agentId: undefined, 
                    status: 'OPEN', 
                    updatedAt: new Date(),
                    assignedAt: undefined // Reset assignment
                };
            }
            return t;
        }));
    }

    setUsers(users.map(u => u.id === id ? { ...u, ...data } : u));
    
    // If updating current user, update session as well
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
      // Remove this group from all users
      setUsers(users.map(u => ({
          ...u,
          groups: u.groups.filter(gid => gid !== id)
      })));
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, users, tickets, categories, groups,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        alert("Por favor, preencha todos os campos.");
        return;
    }
    login(email);
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

          <Button type="submit" className="w-full py-2.5 shadow-md">
            Entrar no Sistema
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
             <p className="text-xs text-slate-400">
                 Não possui acesso? Entre em contato com o <br/>
                 <span className="font-medium text-slate-600">Departamento de TI</span>.
             </p>
        </div>
      </Card>
      
      <div className="mt-8 text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} HelpDesk Pro. Todos os direitos reservados.
      </div>
    </div>
  );
};

const SettingsView = () => {
  const { categories, addCategory, removeCategory, groups, addGroup, deleteGroup, currentUser, updateUser } = useContext(AppContext);
  // Default to Profile for Agents since they don't see anything else
  const [activeTab, setActiveTab] = useState<'categories' | 'groups' | 'profile'>(currentUser?.role === 'AGENT' ? 'profile' : 'categories');
  
  // Profile State
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileAvatar, setProfileAvatar] = useState(currentUser?.avatarUrl || DEFAULT_AVATAR);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Categories
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // State for Groups
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory({ name: newCategoryName.trim(), description: newCategoryDesc.trim() });
      setNewCategoryName('');
      setNewCategoryDesc('');
    }
  };

  const handleAddGroup = () => {
      if (newGroupName.trim()) {
          addGroup({ name: newGroupName.trim(), description: newGroupDesc.trim() });
          setNewGroupName('');
          setNewGroupDesc('');
      }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
      if (!currentUser) return;
      
      const updates: Partial<User> = { avatarUrl: profileAvatar === DEFAULT_AVATAR ? undefined : profileAvatar };
      
      // Admin can update name/email, Agent cannot
      if (isAdmin) {
          updates.name = profileName;
          updates.email = profileEmail;
      }

      updateUser(currentUser.id, updates);
      setIsSuccessModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Success Confirmation Modal */}
      {isSuccessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-sm w-full text-center animate-in fade-in zoom-in duration-200">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCheck size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Upload Concluído!</h3>
                <p className="text-slate-600 mb-6">Sua foto de perfil e informações foram atualizadas com sucesso.</p>
                <Button onClick={() => setIsSuccessModalOpen(false)} className="w-full">
                    Continuar
                </Button>
            </div>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-lg px-4 pt-2">
        {isAdmin && (
            <>
                <button 
                onClick={() => setActiveTab('categories')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'categories' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                >
                <Tag size={16} className="mr-2" /> Categorias
                </button>
                <button 
                onClick={() => setActiveTab('groups')}
                className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'groups' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
                >
                <Briefcase size={16} className="mr-2" /> Grupos de Usuários
                </button>
            </>
        )}
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'profile' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <UserIcon size={16} className="mr-2" /> Meu Perfil
        </button>
      </div>

      {activeTab === 'categories' && isAdmin && (
        <Card className="p-6 rounded-t-none mt-0 border-t-0">
            <div className="flex items-center justify-between mb-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-900">Categorias de Chamados</h3>
                <p className="text-sm text-slate-500">Gerencie as categorias disponíveis para classificação dos tickets.</p>
            </div>
            </div>

            <div className="flex gap-2 mb-6 items-start">
            <div className="flex-1 space-y-2">
                <input 
                    type="text" 
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria..." 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
                 <input 
                    type="text" 
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    placeholder="Descrição (opcional)" 
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                <Plus size={16} className="mr-2" /> Adicionar
            </Button>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
            <ul className="divide-y divide-slate-200">
                {categories.map((category) => (
                <li key={category.id} className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                    <div>
                        <span className="block text-sm font-medium text-slate-700">{category.name}</span>
                        {category.description && <span className="block text-xs text-slate-500">{category.description}</span>}
                    </div>
                    <button 
                    onClick={() => removeCategory(category.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    title="Remover categoria"
                    >
                    <Trash2 size={16} />
                    </button>
                </li>
                ))}
                {categories.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-slate-500 italic">
                    Nenhuma categoria cadastrada.
                </li>
                )}
            </ul>
            </div>
        </Card>
      )}

      {activeTab === 'groups' && isAdmin && (
        <Card className="p-6 rounded-t-none mt-0 border-t-0">
             <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Grupos de Usuários</h3>
                    <p className="text-sm text-slate-500">Crie grupos para segmentar o atendimento (ex: N1, Financeiro).</p>
                </div>
            </div>

            <div className="flex gap-2 mb-6 items-start">
                <div className="flex-1 space-y-2">
                    <input 
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nome do grupo (ex: Nível 1)" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                     <input 
                        type="text" 
                        value={newGroupDesc}
                        onChange={(e) => setNewGroupDesc(e.target.value)}
                        placeholder="Descrição (opcional)" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <Button onClick={handleAddGroup} disabled={!newGroupName.trim()}>
                    <Plus size={16} className="mr-2" /> Adicionar
                </Button>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <ul className="divide-y divide-slate-200">
                    {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((group) => (
                    <li key={group.id} className="px-4 py-3 flex items-center justify-between hover:bg-white transition-colors">
                        <div>
                            <span className="block text-sm font-medium text-slate-700">{group.name}</span>
                            {group.description && <span className="block text-xs text-slate-500">{group.description}</span>}
                        </div>
                        <button 
                        onClick={() => deleteGroup(group.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        title="Remover grupo"
                        >
                        <Trash2 size={16} />
                        </button>
                    </li>
                    ))}
                    {groups.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-slate-500 italic">
                        Nenhum grupo cadastrado.
                    </li>
                    )}
                </ul>
            </div>
        </Card>
      )}

      {activeTab === 'profile' && (
          <Card className="p-6 rounded-t-none mt-0 border-t-0">
              <div className="flex items-center justify-between mb-6">
                  <div>
                      <h3 className="text-lg font-semibold text-slate-900">Meu Perfil</h3>
                      <p className="text-sm text-slate-500">Gerencie sua foto e informações pessoais.</p>
                  </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex flex-col items-center gap-4">
                      <div className="relative group">
                          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm">
                              <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                          </div>
                          <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                              title="Alterar foto"
                          >
                              <Camera size={18} />
                          </button>
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/png, image/jpeg" 
                              onChange={handleAvatarChange}
                          />
                      </div>
                      <span className="text-xs text-slate-400">JPG ou PNG</span>
                  </div>

                  <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                              <input 
                                  type="text" 
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  disabled={!isAdmin}
                                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${!isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-300'}`}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                              <input 
                                  type="email" 
                                  value={profileEmail}
                                  onChange={(e) => setProfileEmail(e.target.value)}
                                  disabled={!isAdmin}
                                  className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${!isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'border-slate-300'}`}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                              <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-md text-slate-600 text-sm">
                                  {currentUser?.role === 'ADMIN' ? 'Administrador' : 'Atendente'}
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                              <div className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-md text-slate-600 text-sm">
                                  {USER_STATUS_MAP[currentUser?.status || 'ACTIVE']}
                              </div>
                          </div>
                      </div>
                      
                      <div className="flex justify-end pt-4">
                          <Button onClick={handleSaveProfile}>
                              Salvar Alterações
                          </Button>
                      </div>
                  </div>
              </div>
          </Card>
      )}
    </div>
  );
};

const UsersView = () => {
  const { users, addUser, updateUser, deleteUser, currentUser, groups } = useContext(AppContext);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('AGENT');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setSelectedGroups(user.groups || []);
    setAvatarUrl(user.avatarUrl || DEFAULT_AVATAR);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('AGENT');
    setStatus('ACTIVE');
    setSelectedGroups([]);
    setAvatarUrl(DEFAULT_AVATAR);
    setIsFormOpen(true);
  };

  const toggleGroupSelection = (groupId: string) => {
      setSelectedGroups(prev => 
        prev.includes(groupId) 
            ? prev.filter(id => id !== groupId)
            : [...prev, groupId]
      );
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setAvatarUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSave = () => {
    if (!name || !email) {
      alert('Nome e Email são obrigatórios');
      return;
    }

    const userData: Partial<User> = {
      name,
      email,
      role,
      status,
      groups: role === 'AGENT' ? selectedGroups : [], // Only Agents need groups for now
      avatarUrl: avatarUrl === DEFAULT_AVATAR ? undefined : avatarUrl
    };

    if (editingUser) {
      updateUser(editingUser.id, userData);
    } else {
      addUser(userData);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUser(id);
    }
  };

  return (
    <div className="space-y-6">
      {!isFormOpen ? (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <h2 className="font-semibold text-slate-800">Usuários do Sistema</h2>
            <Button onClick={handleCreate} size="sm">
              <Plus size={16} className="mr-2" /> Novo Usuário
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Grupos</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                         <div className="relative">
                             <img src={user.avatarUrl || DEFAULT_AVATAR} alt="" className={`w-8 h-8 rounded-full bg-slate-200 object-cover ${user.status !== 'ACTIVE' ? 'grayscale opacity-70' : ''}`} />
                             <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${user.status === 'ACTIVE' ? 'bg-green-500' : user.status === 'SUSPENDED' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                         </div>
                         <span className={`font-medium ${user.status === 'INACTIVE' ? 'text-slate-400' : 'text-slate-900'}`}>{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                        <Badge variant={user.status === 'ACTIVE' ? 'success' : user.status === 'SUSPENDED' ? 'warning' : 'gray'}>
                            {USER_STATUS_MAP[user.status]}
                        </Badge>
                    </td>
                    <td className="px-4 py-3">
                       <Badge variant={user.role === 'ADMIN' ? 'blue' : 'default'}>
                         {user.role === 'ADMIN' ? 'Administrador' : 'Atendente'}
                       </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                        <div className="flex flex-wrap gap-1">
                            {user.groups.length > 0 ? (
                                user.groups.map(gid => {
                                    const grp = groups.find(g => g.id === gid);
                                    return grp ? <Badge key={gid} variant="purple">{grp.name}</Badge> : null;
                                })
                            ) : (
                                <span className="text-slate-400 italic text-xs">Nenhum</span>
                            )}
                        </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(user)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Excluir"
                          disabled={user.id === currentUser?.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="max-w-2xl mx-auto">
           <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
            <h2 className="font-semibold text-slate-800">
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6 space-y-6">
             {/* Avatar Upload Section */}
             <div className="flex justify-center">
                 <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                     <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm">
                         <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                     </div>
                     <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="text-white" size={24} />
                     </div>
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/png, image/jpeg" 
                        onChange={handleAvatarUpload}
                     />
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Maria Silva"
                   />
                </div>
                <div className="col-span-2">
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                   <input 
                      type="email" 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Ex: maria@empresa.com"
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                   <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={role}
                      onChange={e => setRole(e.target.value as Role)}
                   >
                      <option value="AGENT">Atendente</option>
                      <option value="ADMIN">Administrador</option>
                   </select>
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                   <select 
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      value={status}
                      onChange={e => setStatus(e.target.value as UserStatus)}
                   >
                      <option value="ACTIVE">Ativo</option>
                      <option value="SUSPENDED">Suspenso (Temp.)</option>
                      <option value="INACTIVE">Desativado</option>
                   </select>
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Grupos de Acesso</label>
                    <div className={`border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto ${role === 'ADMIN' ? 'bg-slate-50 opacity-50 pointer-events-none' : ''}`}>
                        {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map(g => (
                            <label key={g.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                <input 
                                    type="checkbox" 
                                    checked={selectedGroups.includes(g.id)}
                                    onChange={() => toggleGroupSelection(g.id)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                    disabled={role === 'ADMIN'}
                                />
                                <span className="text-sm text-slate-700">{g.name}</span>
                            </label>
                        ))}
                        {groups.length === 0 && <span className="text-xs text-slate-400">Nenhum grupo disponível.</span>}
                    </div>
                    {role === 'ADMIN' && <p className="text-xs text-slate-400 mt-1">Administradores têm acesso total.</p>}
                </div>
                {status === 'INACTIVE' && editingUser && (
                    <div className="col-span-2 bg-red-50 p-3 rounded-md border border-red-100 flex items-start gap-2">
                        <AlertCircle className="text-red-500 mt-0.5" size={16} />
                        <p className="text-xs text-red-700">
                            <strong>Atenção:</strong> Ao desativar este usuário, todos os chamados abertos atribuídos a ele serão desvinculados automaticamente e voltarão para o status "Em Aberto" para redistribuição.
                        </p>
                    </div>
                )}
             </div>
             <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave}>Salvar Usuário</Button>
             </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { tickets, users } = useContext(AppContext);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [chartMetric, setChartMetric] = useState<'CREATED' | 'RESOLVED'>('CREATED');
  const [chartPriority, setChartPriority] = useState<string>('ALL'); // New Filter
  
  // Filter Tickets based on Date Range (For top cards)
  const filteredTickets = tickets.filter(t => {
      const ticketDate = new Date(t.createdAt);
      
      if (dateStart) {
          const [y, m, d] = dateStart.split('-').map(Number);
          const start = new Date(y, m - 1, d, 0, 0, 0, 0); 
          if (ticketDate < start) return false;
      }

      if (dateEnd) {
          const [y, m, d] = dateEnd.split('-').map(Number);
          const end = new Date(y, m - 1, d, 23, 59, 59, 999); 
          if (ticketDate > end) return false;
      }

      return true;
  });


  // Métricas (Calculated from Filtered List - Created Date Baseline)
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = filteredTickets.filter(t => t.status === 'IN_PROGRESS').length;
  const waitingTickets = filteredTickets.filter(t => t.status === 'WAITING_CUSTOMER').length;
  const highPriority = filteredTickets.filter(t => t.priority === 'HIGH').length;

  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Dynamic Chart Data Calculation respecting Metric + Priority + Date Range
  const getChartData = () => {
      const counts = new Array(7).fill(0);
      
      tickets.forEach(t => {
          let relevantDate: Date | undefined;
          let shouldCount = false;

          // 1. Metric Filter (Created vs Resolved)
          if (chartMetric === 'CREATED') {
              relevantDate = new Date(t.createdAt);
              shouldCount = true; 
          } else { // RESOLVED
              if (t.status === 'RESOLVED') {
                  relevantDate = new Date(t.updatedAt);
                  shouldCount = true;
              }
          }

          if (!shouldCount || !relevantDate) return;

          // 2. Priority Filter
          if (chartPriority !== 'ALL' && t.priority !== chartPriority) return;

          // 3. Global Date Filter applied to the RELEVANT date (created or resolved)
          let inRange = true;
          if (dateStart) {
              const [y, m, d] = dateStart.split('-').map(Number);
              const start = new Date(y, m - 1, d, 0, 0, 0, 0);
              if (relevantDate < start) inRange = false;
          }
          if (dateEnd && inRange) {
              const [y, m, d] = dateEnd.split('-').map(Number);
              const end = new Date(y, m - 1, d, 23, 59, 59, 999);
              if (relevantDate > end) inRange = false;
          }

          if (inRange) {
              counts[relevantDate.getDay()]++;
          }
      });
      return days.map((d, i) => ({ name: d, tickets: counts[i] }));
  };

  const chartData = getChartData();


  const calculateAgentStats = (agentId: string) => {
      // Agent stats based on RESOLVED tickets within current filter
      const agentTickets = tickets.filter(t => {
          if (t.agentId !== agentId || t.status !== 'RESOLVED') return false;
          
          // Apply Date Filter to resolution time (updatedAt) for accurate stats
          const ticketDate = new Date(t.updatedAt);
          if (dateStart) {
              const [y, m, d] = dateStart.split('-').map(Number);
              const start = new Date(y, m - 1, d, 0, 0, 0, 0);
              if (ticketDate < start) return false;
          }
          if (dateEnd) {
              const [y, m, d] = dateEnd.split('-').map(Number);
              const end = new Date(y, m - 1, d, 23, 59, 59, 999);
              if (ticketDate > end) return false;
          }
          return true;
      });

      const resolvedCount = agentTickets.length;

      if (resolvedCount === 0) return { count: 0, avgTime: 'N/A' };

      const totalTimeMs = agentTickets.reduce((acc, t) => {
          const startTime = t.assignedAt ? t.assignedAt.getTime() : t.createdAt.getTime();
          const endTime = t.updatedAt.getTime();
          const duration = Math.max(0, endTime - startTime);
          return acc + duration;
      }, 0);

      const avgMs = totalTimeMs / resolvedCount;
      const hours = Math.floor(avgMs / (1000 * 60 * 60));
      const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));

      let timeString = '';
      if (hours > 0) timeString += `${hours}h `;
      timeString += `${minutes}m`;

      return {
          count: resolvedCount,
          avgTime: timeString
      };
  };

  const activeAgents = users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      
      {/* Date Filter Header */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
              <Calendar size={20} className="text-blue-600" />
              <span className="font-semibold text-sm">Filtrar por Período:</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">De:</span>
                    <input 
                        type="date" 
                        value={dateStart}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="text-sm border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 whitespace-nowrap">Até:</span>
                    <input 
                        type="date" 
                        value={dateEnd}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="text-sm border border-slate-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-blue-500 w-full sm:w-auto"
                    />
                </div>
                {(dateStart || dateEnd) && (
                     <button 
                        onClick={() => { setDateStart(''); setDateEnd(''); }}
                        className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                     >
                        Limpar
                     </button>
                )}
              </div>
          </div>
      </div>

      {/* Cards de Métricas - Grid Responsivo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <Card className="p-6 border-t-4 border-t-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalTickets}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Ticket className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-t-4 border-t-red-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Em Aberto</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{openTickets}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-t-4 border-t-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Em Atendimento</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{inProgressTickets}</h3>
            </div>
            <div className="p-3 bg-indigo-50 rounded-full">
              <PlayCircle className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-t-4 border-t-orange-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Aguardando Ajuda</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{waitingTickets}</h3>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <PauseCircle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-t-4 border-t-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Alta Prioridade</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{highPriority}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-full">
              <Shield className="h-6 w-6 text-rose-600" />
            </div>
          </div>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
            <h3 className="text-lg font-semibold text-slate-800">Volume Semanal</h3>
            <div className="flex gap-2 w-full sm:w-auto">
                <select 
                    value={chartMetric} 
                    onChange={(e) => setChartMetric(e.target.value as 'CREATED' | 'RESOLVED')}
                    className="flex-1 sm:flex-none text-sm border-slate-300 rounded-md border px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
                >
                    <option value="CREATED">Chamados Abertos (Novos)</option>
                    <option value="RESOLVED">Chamados Resolvidos</option>
                </select>
                <select 
                    value={chartPriority} 
                    onChange={(e) => setChartPriority(e.target.value)}
                    className="flex-1 sm:flex-none text-sm border-slate-300 rounded-md border px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
                >
                    <option value="ALL">Prioridade: Todas</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                </select>
            </div>
          </div>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis hide allowDecimals={false} />
                  <RechartsTooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar 
                    dataKey="tickets" 
                    fill={chartMetric === 'CREATED' ? "#3b82f6" : "#10b981"} 
                    radius={[4, 4, 0, 0]} 
                    barSize={40} 
                  />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </Card>
         <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">Performance da Equipe</h3>
          <div className="space-y-4 h-64 overflow-y-auto pr-2">
            {activeAgents.map((agent) => {
               const stats = calculateAgentStats(agent.id);
               return (
               <div key={agent.id} className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-50 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                        <img src={agent.avatarUrl || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-slate-800">{agent.name}</p>
                        <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                             <p className="text-xs text-slate-500 font-medium">Tempo médio: {stats.avgTime}</p>
                        </div>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className="text-lg font-bold block text-slate-900">{stats.count}</span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Resolvidos</span>
                 </div>
               </div>
               );
            })}
             {activeAgents.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-4 italic">Nenhum atendente ativo no momento.</p>
             )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const AdminTickets = () => {
  const { 
    tickets, assignTicketRoundRobin, assignTicketManual, users, groups, addMessage, 
    updateTicketPriority, updateTicketStatus, categories, updateTicketCategory, approveTicketTransfer,
    createTicket, editTicket, deleteTicket 
  } = useContext(AppContext);
  
  // STATUS FILTER: Default to OPEN, PENDING, IN_PROGRESS, WAITING (exclude RESOLVED)
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>(['OPEN', 'PENDING_AGENT', 'IN_PROGRESS', 'WAITING_CUSTOMER']);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Manual Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignType, setAssignType] = useState<'USER' | 'GROUP'>('USER');
  const [selectedAssignId, setSelectedAssignId] = useState('');

  // Ticket Form Modal State (Create/Edit)
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>('NORMAL');
  const [formDescription, setFormDescription] = useState(''); // Initial message

  const filteredTickets = tickets.filter(t => statusFilter.includes(t.status));
  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const toggleStatusFilter = (status: TicketStatus) => {
      setStatusFilter(prev => 
          prev.includes(status) 
              ? prev.filter(s => s !== status)
              : [...prev, status]
      );
  };

  const handleSend = () => {
    if (!activeTicket || !replyText.trim()) return;
    const type = isInternalNote ? 'INTERNAL_NOTE' : 'EMAIL_OUTGOING';
    setIsUploading(true);
    setTimeout(() => {
        addMessage(activeTicket.id, replyText, type, false, false);
        setReplyText('');
        setIsInternalNote(false);
        setIsUploading(false);
    }, 800);
  };

  const handleOpenAssignModal = () => {
      setIsAssignModalOpen(true);
      setAssignType('USER');
      // Set default
      const firstUser = users.find(u => u.role === 'AGENT' && u.status === 'ACTIVE');
      if (firstUser) setSelectedAssignId(firstUser.id);
  };

  const handleConfirmAssignment = () => {
      if (!activeTicket || !selectedAssignId) return;
      assignTicketManual(activeTicket.id, assignType, selectedAssignId);
      setIsAssignModalOpen(false);
  };

  const handleOpenTicketForm = (ticket?: TicketData) => {
      if (ticket) {
          setEditingTicket(ticket);
          setFormSubject(ticket.subject);
          setFormEmail(ticket.requesterEmail);
          setFormCategory(ticket.category);
          setFormPriority(ticket.priority);
          setFormDescription(''); // No need to edit initial message usually
      } else {
          setEditingTicket(null);
          setFormSubject('');
          setFormEmail('');
          setFormCategory('Selecionar');
          setFormPriority('NORMAL');
          setFormDescription('');
      }
      setIsTicketFormOpen(true);
  };

  const handleSaveTicket = () => {
      if (!formSubject || !formEmail) {
          alert("Assunto e Email são obrigatórios.");
          return;
      }

      const ticketData: Partial<TicketData> = {
          subject: formSubject,
          requesterEmail: formEmail,
          category: formCategory,
          priority: formPriority
      };

      if (editingTicket) {
          editTicket(editingTicket.id, ticketData);
      } else {
          if (!formDescription) {
              alert("Descrição inicial é obrigatória para novos chamados.");
              return;
          }
          createTicket(ticketData, formDescription);
      }
      setIsTicketFormOpen(false);
  };

  const handleDeleteTicket = (id: string) => {
      if (confirm("Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.")) {
          deleteTicket(id);
          if (selectedTicketId === id) setSelectedTicketId(null);
      }
  };

  // Update selectedId when type changes to prevent mismatch
  useEffect(() => {
      if (!isAssignModalOpen) return;
      if (assignType === 'USER') {
          const firstUser = users.find(u => u.role === 'AGENT' && u.status === 'ACTIVE');
          if (firstUser) setSelectedAssignId(firstUser.id);
          else setSelectedAssignId('');
      } else {
          if (groups.length > 0) setSelectedAssignId(groups[0].id);
          else setSelectedAssignId('');
      }
  }, [assignType, isAssignModalOpen, users, groups]);


  if (selectedTicketId && activeTicket) {
      return (
        <Card className="h-[calc(100vh-140px)] flex flex-col overflow-hidden relative">
            {/* Modal de Distribuição */}
            {isAssignModalOpen && (
                <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Distribuir Chamado</h3>
                        
                        <div className="flex gap-2 mb-4">
                            <button 
                                onClick={() => setAssignType('USER')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${assignType === 'USER' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <UserIcon size={16} /> Atendente
                                </div>
                            </button>
                            <button 
                                onClick={() => setAssignType('GROUP')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${assignType === 'GROUP' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Users size={16} /> Grupo
                                </div>
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Selecione o {assignType === 'USER' ? 'atendente' : 'grupo'}:
                            </label>
                            <select 
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                value={selectedAssignId}
                                onChange={(e) => setSelectedAssignId(e.target.value)}
                            >
                                {assignType === 'USER' ? (
                                    users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))
                                ) : (
                                    groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))
                                )}
                            </select>
                             {assignType === 'USER' && users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE').length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Nenhum atendente ativo disponível.</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleConfirmAssignment}>Confirmar</Button>
                        </div>
                    </div>
                </div>
            )}
             
            {/* Modal de Edição (Injected via conditional rendering at root level of component ideally, but here for simplicity context access) */}
             {isTicketFormOpen && (
                <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg">
                    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg m-4">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">{editingTicket ? 'Editar Chamado' : 'Novo Chamado'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Assunto</label>
                                <input type="text" className="w-full border rounded-md p-2" value={formSubject} onChange={e => setFormSubject(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email do Solicitante</label>
                                <input type="email" className="w-full border rounded-md p-2" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                    <select className="w-full border rounded-md p-2" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                                        <option value="Selecionar">Selecionar</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                                    <select className="w-full border rounded-md p-2" value={formPriority} onChange={e => setFormPriority(e.target.value as Priority)}>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">Alta</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button variant="ghost" onClick={() => setIsTicketFormOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveTicket}>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedTicketId(null)}
                        className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors shadow-sm"
                    >
                        <ArrowRight className="rotate-180 mr-2" size={16}/> Voltar
                    </Button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            {activeTicket.subject}
                            <button onClick={() => handleOpenTicketForm(activeTicket)} className="text-slate-400 hover:text-blue-600 p-1" title="Editar detalhes">
                                <Edit size={14} />
                            </button>
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail size={14} /> 
                            <span>{activeTicket.requesterEmail}</span>
                            <span className="mx-1">•</span>
                            <div className="relative">
                                <select 
                                    className={`text-xs border-none rounded py-0.5 pl-2 pr-6 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none ${activeTicket.category === 'Selecionar' ? 'bg-slate-200 text-slate-500 italic' : 'bg-slate-100 text-slate-700'}`}
                                    value={activeTicket.category}
                                    onChange={(e) => updateTicketCategory(activeTicket.id, e.target.value)}
                                >
                                    <option value="Selecionar" disabled>Selecionar</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {activeTicket.transferRequest && (
                        <Button size="sm" variant="success" onClick={() => approveTicketTransfer(activeTicket.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" /> Aprovar Transferência
                        </Button>
                    )}
                    <button onClick={() => handleDeleteTicket(activeTicket.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir Chamado">
                        <Trash2 size={18} />
                    </button>
                    {!activeTicket.agentId && (
                        <Button size="sm" variant="outline" onClick={handleOpenAssignModal} title="Distribuir Manualmente">
                            <Users className="w-4 h-4 mr-2" /> Distribuir
                        </Button>
                    )}
                    <select 
                        className={`text-xs border-slate-300 rounded-md border p-1 font-medium ${activeTicket.priority === 'HIGH' ? 'text-amber-700 bg-amber-50' : 'text-slate-700 bg-white'}`}
                        value={activeTicket.priority}
                        onChange={(e) => updateTicketPriority(activeTicket.id, e.target.value as Priority)}
                    >
                        <option value="NORMAL">Prioridade: Normal</option>
                        <option value="HIGH">Prioridade: Alta</option>
                    </select>
                     <Badge variant={activeTicket.status === 'OPEN' ? 'error' : activeTicket.status === 'RESOLVED' ? 'success' : activeTicket.status === 'WAITING_CUSTOMER' ? 'yellow' : 'blue'}>
                        {STATUS_MAP[activeTicket.status]}
                    </Badge>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                {activeTicket.messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.type === 'EMAIL_INCOMING' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[80%] rounded-lg p-4 shadow-sm border ${
                            msg.type === 'INTERNAL_NOTE' ? 'bg-amber-50 border-amber-200 ml-auto mr-auto w-full' :
                            msg.type === 'EMAIL_INCOMING' ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-100'
                        }`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-bold uppercase ${
                                    msg.type === 'INTERNAL_NOTE' ? 'text-amber-700' : 'text-slate-500'
                                }`}>
                                    {msg.type === 'EMAIL_INCOMING' ? 'Cliente' : msg.type === 'INTERNAL_NOTE' ? 'Nota Interna' : (users.find(u=>u.id===msg.authorId)?.name || 'Atendente')}
                                </span>
                                <span className="text-xs text-slate-400">{msg.createdAt.toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                            {msg.hasAttachments && (
                                <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-2 max-w-fit">
                                    <div className="bg-amber-100 p-1.5 rounded-full">
                                        <Paperclip size={14} className="text-amber-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-amber-700">Anexo disponível no email</span>
                                        <span className="text-[10px] text-amber-600">O arquivo não foi armazenado no sistema.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 bg-white border-t">
                <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <input type="checkbox" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className={isInternalNote ? "font-bold text-amber-600" : "text-slate-600"}>Nota Interna (Não enviar email)</span>
                    </label>
                </div>
                <textarea 
                    className={`w-full border rounded-md p-3 text-sm focus:ring-2 focus:outline-none resize-none ${
                        isInternalNote ? 'border-amber-300 focus:ring-amber-200 bg-amber-50' : 'border-slate-300 focus:ring-blue-200'
                    }`}
                    rows={4}
                    placeholder={isInternalNote ? "Escreva uma observação interna..." : "Escreva sua resposta ao cliente..."}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                />
                <div className="flex justify-between items-center mt-3">
                    <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="text-slate-500">
                            <Paperclip size={18} />
                            </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="success" onClick={() => updateTicketStatus(activeTicket.id, 'RESOLVED')}>
                             <CheckCheck size={16} className="mr-2" /> Resolvido
                        </Button>
                        <Button onClick={handleSend} disabled={!replyText.trim() || isUploading} className={isInternalNote ? "bg-amber-600 hover:bg-amber-700" : ""}>
                            {isUploading ? 'Enviando...' : (
                                <>
                                    <Send size={16} className="mr-2" /> {isInternalNote ? 'Salvar Nota' : 'Enviar Resposta'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Card>
      );
  }

  return (
    <Card className="overflow-hidden relative">
      {/* Modal de Novo/Edit Chamado na Lista Principal */}
      {isTicketFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-slate-800">{editingTicket ? 'Editar Chamado' : 'Novo Chamado'}</h3>
                     <button onClick={() => setIsTicketFormOpen(false)}><X size={20} className="text-slate-400" /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assunto</label>
                        <input type="text" className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Resumo do problema" value={formSubject} onChange={e => setFormSubject(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email do Solicitante</label>
                        <input type="email" className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="email@cliente.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                            <select className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                                <option value="Selecionar">Selecionar</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                            <select className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" value={formPriority} onChange={e => setFormPriority(e.target.value as Priority)}>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Alta</option>
                            </select>
                        </div>
                    </div>
                    {!editingTicket && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição do Problema</label>
                            <textarea className="w-full border rounded-md p-2 h-24 resize-none focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Descreva o problema relatado..." value={formDescription} onChange={e => setFormDescription(e.target.value)}></textarea>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                    <Button variant="ghost" onClick={() => setIsTicketFormOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveTicket}>{editingTicket ? 'Salvar Alterações' : 'Criar Chamado'}</Button>
                </div>
            </div>
        </div>
      )}

      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
        <h2 className="font-semibold text-slate-800">Gerenciamento de Chamados</h2>
        <div className="flex gap-2">
            <Button size="sm" onClick={() => handleOpenTicketForm()}>
                <Plus size={16} className="mr-2" /> Novo Chamado
            </Button>
            <div className="relative">
                <button 
                    onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                    className="flex items-center gap-2 text-sm border border-slate-300 rounded-md px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                    <Filter size={16} /> 
                    Status
                    {statusFilter.length < Object.keys(STATUS_MAP).length && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                            {statusFilter.length}
                        </span>
                    )}
                </button>
                
                {isStatusFilterOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsStatusFilterOpen(false)}></div>
                        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 p-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase px-2 py-2 border-b border-slate-100 mb-1">Filtrar por Status</div>
                            {Object.entries(STATUS_MAP).map(([key, label]) => (
                                <label key={key} className="flex items-center gap-2 px-2 py-2 hover:bg-slate-50 rounded cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={statusFilter.includes(key as TicketStatus)}
                                        onChange={() => toggleStatusFilter(key as TicketStatus)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                                    />
                                    <span className="text-sm text-slate-700">{label}</span>
                                </label>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Abertura</th>
              <th className="px-4 py-3">Assunto / Solicitante</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Prioridade</th>
              <th className="px-4 py-3">Atribuído a</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTickets.map(ticket => {
                const agent = users.find(u => u.id === ticket.agentId);
                const targetAgent = ticket.transferRequest ? users.find(u => u.id === ticket.transferRequest?.targetAgentId) : null;
                
                return (
                    <tr key={ticket.id} onClick={() => setSelectedTicketId(ticket.id)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="px-4 py-3 font-medium">#{ticket.numericId}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                            {ticket.createdAt.toLocaleString('pt-BR', { 
                                day: '2-digit', month: '2-digit', year: '2-digit', 
                                hour: '2-digit', minute: '2-digit' 
                            })}
                        </td>
                        <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{ticket.subject}</div>
                            <div className="text-slate-500 text-xs">{ticket.requesterEmail}</div>
                            {ticket.helpNeeded && (
                                <span className="flex items-center gap-1 text-red-600 text-xs font-bold mt-1">
                                    <AlertCircle size={12} /> Ajuda Solicitada
                                </span>
                            )}
                            {ticket.transferRequest && (
                                <span className="flex items-center gap-1 text-amber-600 text-xs font-bold mt-1">
                                    <ArrowRight size={12} /> Transferência pendente para {targetAgent?.name || 'Agente'}
                                </span>
                            )}
                        </td>
                        <td className="px-4 py-3">
                            <Badge variant={ticket.status === 'OPEN' ? 'error' : ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'WAITING_CUSTOMER' ? 'yellow' : 'blue'}>
                              {STATUS_MAP[ticket.status]}
                            </Badge>
                        </td>
                        <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ticket.category === 'Selecionar' ? 'bg-slate-200 text-slate-500 italic' : 'bg-slate-100 text-slate-800'}`}>
                                {ticket.category}
                            </span>
                        </td>
                        <td className="px-4 py-3">
                            {ticket.priority === 'HIGH' ? <Badge variant="warning">Alta</Badge> : <span className="text-slate-500">Normal</span>}
                        </td>
                        <td className="px-4 py-3">
                            {agent ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
                                        <img src={agent.avatarUrl || DEFAULT_AVATAR} alt="" className={`w-full h-full object-cover ${agent.status !== 'ACTIVE' ? 'grayscale opacity-60' : ''}`} />
                                    </div>
                                    <span className={`text-slate-700 ${agent.status !== 'ACTIVE' ? 'italic' : ''}`}>
                                        {agent.name} {agent.status === 'SUSPENDED' && '(Suspenso)'} {agent.status === 'INACTIVE' && '(Inativo)'}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-slate-400 italic">Não atribuído</span>
                            )}
                        </td>
                    </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const AgentWorkspace = () => {
  const { tickets, currentUser, addMessage, updateTicketStatus, categories, updateTicketCategory, users, requestTicketTransfer } = useContext(AppContext);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [requestHelp, setRequestHelp] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');


  // Filter Logic
  const myTickets = tickets.filter(t => {
    // 1. Base logic: Assigned to me OR (Unassigned AND in my groups) AND NOT RESOLVED
    const isRelevant = t.status !== 'RESOLVED' && 
      ((t.agentId === currentUser?.id) || (!t.agentId && currentUser?.groups.includes(t.groupId || '')));
    
    if (!isRelevant) return false;

    // 2. Text Filter (ID, Subject, Email)
    if (filterText) {
        const search = filterText.toLowerCase();
        const matches = 
            t.subject.toLowerCase().includes(search) || 
            t.requesterEmail.toLowerCase().includes(search) || 
            t.numericId.toString().includes(search);
        if (!matches) return false;
    }

    // 3. Date Range Filter
    if (filterDateStart) {
        // Create date at 00:00:00 local time
        const startDate = new Date(filterDateStart);
        // Compare ensuring we ignore time for the start day check strictly
        if (t.createdAt < startDate) return false;
    }

    if (filterDateEnd) {
        // Create date at 23:59:59 local time to include the whole end day
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59, 999);
        if (t.createdAt > endDate) return false;
    }
    
    // 4. Status Filter
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;

    // 5. Priority Filter
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;

    // 6. Category Filter
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;

    return true;
  });
  
  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const clearFilters = () => {
      setFilterText('');
      setFilterDateStart('');
      setFilterDateEnd('');
      setFilterStatus('ALL');
      setFilterPriority('ALL');
      setFilterCategory('ALL');
  };

  const hasActiveFilters = filterText || filterDateStart || filterDateEnd || filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterCategory !== 'ALL';

  const handleSend = () => {
    if (!activeTicket || !replyText.trim()) return;
    const type = isInternalNote ? 'INTERNAL_NOTE' : 'EMAIL_OUTGOING';
    setIsUploading(true);
    setTimeout(() => {
        addMessage(activeTicket.id, replyText, type, requestHelp, false);
        setReplyText('');
        setIsInternalNote(false);
        setIsUploading(false);
        if (Math.random() > 0.8) alert('Anexo enviado via Gmail e removido do servidor com sucesso.');
    }, 800);
  };

  const handleCloseTicket = () => {
      if(activeTicket) {
          updateTicketStatus(activeTicket.id, 'RESOLVED');
          setSelectedTicketId(null);
      }
  };
  
  const handleOpenTransferModal = () => {
      setIsTransferModalOpen(true);
      // Pre-select if there is already a request or first available agent
      const firstAvailable = users.find(u => u.role === 'AGENT' && u.id !== currentUser?.id && u.status === 'ACTIVE');
      setSelectedAgentId(activeTicket?.transferRequest?.targetAgentId || firstAvailable?.id || '');
  };

  const handleSubmitTransfer = () => {
      if (activeTicket && selectedAgentId) {
          requestTicketTransfer(activeTicket.id, selectedAgentId);
          setIsTransferModalOpen(false);
      }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      {/* Transfer Modal Overlay */}
      {isTransferModalOpen && (
          <div className="absolute inset-0 bg-slate-900/50 z-50 flex items-center justify-center backdrop-blur-sm rounded-lg">
              <div className="bg-white p-6 rounded-lg shadow-xl w-96 max-w-full">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Encaminhar Chamado</h3>
                  <p className="text-sm text-slate-500 mb-4">Selecione o atendente para quem deseja transferir este ticket. A transferência precisará ser aprovada.</p>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                      {users.filter(u => u.role === 'AGENT' && u.id !== currentUser?.id && u.status === 'ACTIVE').map(agent => (
                          <label key={agent.id} className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${selectedAgentId === agent.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                              <input 
                                  type="radio" 
                                  name="transferAgent" 
                                  className="text-blue-600 focus:ring-blue-500"
                                  checked={selectedAgentId === agent.id}
                                  onChange={() => setSelectedAgentId(agent.id)}
                              />
                              <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                      <img src={agent.avatarUrl || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <span className="text-sm font-medium text-slate-700">{agent.name}</span>
                              </div>
                          </label>
                      ))}
                      {users.filter(u => u.role === 'AGENT' && u.id !== currentUser?.id && u.status === 'ACTIVE').length === 0 && (
                          <p className="text-sm text-slate-400 italic text-center py-2">Nenhum outro atendente ativo disponível.</p>
                      )}
                  </div>

                  <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsTransferModalOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSubmitTransfer} disabled={!selectedAgentId}>Confirmar Transferência</Button>
                  </div>
              </div>
          </div>
      )}

      <div className="w-1/3 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <div className="font-semibold text-slate-700">Meus Chamados</div>
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-2 rounded-md transition-colors ${isFilterOpen || hasActiveFilters ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Filtrar chamados"
                >
                    <Filter size={18} />
                </button>
            </div>
            
            {/* Filter Panel */}
            {isFilterOpen && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Buscar por assunto, ID ou email..." 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">De:</label>
                            <input 
                                type="date" 
                                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Até:</label>
                            <input 
                                type="date" 
                                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <select 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="ALL">Status: Todos</option>
                            <option value="OPEN">Em Aberto</option>
                            <option value="IN_PROGRESS">Em Andamento</option>
                            <option value="WAITING_CUSTOMER">Aguardando Ajuda</option>
                        </select>
                         <select 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                        >
                            <option value="ALL">Prioridade: Todas</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Alta</option>
                        </select>
                         <select 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="ALL">Categoria: Todas</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={clearFilters}
                            className="w-full text-xs text-slate-500 hover:text-red-600 flex items-center justify-center gap-1 py-1"
                        >
                            <X size={12} /> Limpar Filtros
                        </button>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {myTickets.length === 0 && (
                    <div className="p-8 text-center flex flex-col items-center">
                        <Search className="text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 text-sm">
                            {hasActiveFilters ? 'Nenhum chamado encontrado com estes filtros.' : 'Nenhum chamado pendente.'}
                        </p>
                    </div>
                )}
                {myTickets.map(ticket => (
                    <div 
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTicketId === ticket.id ? 'bg-blue-50 border-blue-300 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-200'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <span className="font-bold text-sm text-slate-900 mr-2">#{ticket.numericId}</span>
                                <span className="text-xs text-slate-500">
                                    {ticket.createdAt.toLocaleString('pt-BR', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                        <h4 className="font-medium text-sm text-slate-800 line-clamp-1 mb-1">{ticket.subject}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{ticket.messages[ticket.messages.length - 1]?.content}</p>
                        <div className="flex gap-2 mt-2">
                             <Badge variant={ticket.priority === 'HIGH' ? 'warning' : 'default'}>{ticket.priority === 'HIGH' ? 'Alta' : 'Normal'}</Badge>
                             <Badge variant={ticket.status === 'OPEN' ? 'error' : ticket.status === 'RESOLVED' ? 'success' : ticket.status === 'WAITING_CUSTOMER' ? 'yellow' : 'blue'}>
                                {STATUS_MAP[ticket.status]}
                             </Badge>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
      </div>
      <div className="flex-1">
        {activeTicket ? (
            <Card className="h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{activeTicket.subject}</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail size={14} /> 
                            <span>{activeTicket.requesterEmail}</span>
                            <span className="mx-1">•</span>
                            <div className="relative">
                                <select 
                                    className={`text-xs border-none rounded py-0.5 pl-2 pr-6 font-medium focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none ${activeTicket.category === 'Selecionar' ? 'bg-slate-200 text-slate-500 italic' : 'bg-slate-100 text-slate-700'}`}
                                    value={activeTicket.category}
                                    onChange={(e) => updateTicketCategory(activeTicket.id, e.target.value)}
                                >
                                    <option value="Selecionar" disabled>Selecionar</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant={activeTicket.transferRequest ? "warning" : "outline"}
                            size="sm" 
                            onClick={handleOpenTransferModal}
                        >
                             {activeTicket.transferRequest ? (
                                 <span className="flex items-center"><ArrowRight size={16} className="mr-2"/> Encaminhamento em análise</span>
                             ) : (
                                 <span className="flex items-center"><ArrowRight size={16} className="mr-2"/> Encaminhar</span>
                             )}
                        </Button>
                        <Button variant="secondary" size="sm" onClick={handleCloseTicket}>
                            <CheckCheck size={16} className="mr-2"/> Resolver
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                    {activeTicket.messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.type === 'EMAIL_INCOMING' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-lg p-4 shadow-sm border ${msg.type === 'INTERNAL_NOTE' ? 'bg-amber-50 border-amber-200 ml-auto mr-auto w-full' : msg.type === 'EMAIL_INCOMING' ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xs font-bold uppercase ${msg.type === 'INTERNAL_NOTE' ? 'text-amber-700' : 'text-slate-500'}`}>
                                        {msg.type === 'EMAIL_INCOMING' ? 'Cliente' : msg.type === 'INTERNAL_NOTE' ? 'Nota Interna' : 'Você'}
                                    </span>
                                    <span className="text-xs text-slate-400">{msg.createdAt.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                                {msg.hasAttachments && (
                                    <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-2 max-w-fit">
                                        <div className="bg-amber-100 p-1.5 rounded-full">
                                            <Paperclip size={14} className="text-amber-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-amber-700">Anexo disponível no email</span>
                                            <span className="text-[10px] text-amber-600">O arquivo não foi armazenado no sistema.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 bg-white border-t">
                    <div className="flex items-center gap-4 mb-3">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
                            <span className={isInternalNote ? "font-bold text-amber-600" : "text-slate-600"}>Nota Interna (Não enviar email)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none ml-auto">
                            <input type="checkbox" checked={requestHelp} onChange={e => setRequestHelp(e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                            <span className={requestHelp ? "font-bold text-red-600 flex items-center gap-1" : "text-slate-600 flex items-center gap-1"}>
                                <AlertCircle size={14} /> Pedir Ajuda ao Admin
                            </span>
                        </label>
                    </div>
                    <textarea 
                        className={`w-full border rounded-md p-3 text-sm focus:ring-2 focus:outline-none resize-none ${isInternalNote ? 'border-amber-300 focus:ring-amber-200 bg-amber-50' : 'border-slate-300 focus:ring-blue-200'}`}
                        rows={4}
                        placeholder={isInternalNote ? "Escreva uma observação interna..." : "Escreva sua resposta ao cliente..."}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center gap-2">
                             <Button variant="ghost" size="sm" className="text-slate-500"><Paperclip size={18} /></Button>
                        </div>
                        <Button onClick={handleSend} disabled={!replyText.trim() || isUploading} className={isInternalNote ? "bg-amber-600 hover:bg-amber-700" : ""}>
                            {isUploading ? 'Enviando...' : (<><Send size={16} className="mr-2" /> {isInternalNote ? 'Salvar Nota' : 'Enviar Resposta'}</>)}
                        </Button>
                    </div>
                </div>
            </Card>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <MessageSquare size={48} className="mb-4 opacity-20" />
                <p>Selecione um chamado para visualizar</p>
            </div>
        )}
      </div>
    </div>
  );
};

const AgentResolvedTickets = () => {
  const { tickets, currentUser, categories, updateTicketCategory, users, reopenTicket } = useContext(AppContext);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');


  // Filter ONLY resolved tickets for the current agent or their groups
  const resolvedTickets = tickets.filter(t => {
    // 1. Base Logic: Must be RESOLVED and assigned to user or their group
    const isRelevant = t.status === 'RESOLVED' && 
      ((t.agentId === currentUser?.id) || (!t.agentId && currentUser?.groups.includes(t.groupId || '')));
    
    if (!isRelevant) return false;

    // 2. Text Filter (ID, Subject, Email)
    if (filterText) {
        const search = filterText.toLowerCase();
        const matches = 
            t.subject.toLowerCase().includes(search) || 
            t.requesterEmail.toLowerCase().includes(search) || 
            t.numericId.toString().includes(search);
        if (!matches) return false;
    }

    // 3. Date Range Filter
    if (filterDateStart) {
        // Create date at 00:00:00 local time
        const startDate = new Date(filterDateStart);
        if (t.createdAt < startDate) return false;
    }

    if (filterDateEnd) {
        // Create date at 23:59:59 local time
        const endDate = new Date(filterDateEnd);
        endDate.setHours(23, 59, 59, 999);
        if (t.createdAt > endDate) return false;
    }

    // 4. Priority Filter
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;

    // 5. Category Filter
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;

    return true;
  }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const clearFilters = () => {
      setFilterText('');
      setFilterDateStart('');
      setFilterDateEnd('');
      setFilterPriority('ALL');
      setFilterCategory('ALL');
  };

  const hasActiveFilters = filterText || filterDateStart || filterDateEnd || filterPriority !== 'ALL' || filterCategory !== 'ALL';

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 relative">
      <div className="w-1/3 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                <div className="font-semibold text-slate-700 flex items-center gap-2">
                    <CheckCheck size={18} className="text-green-600" />
                    Chamados Finalizados
                </div>
                <button 
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`p-2 rounded-md transition-colors ${isFilterOpen || hasActiveFilters ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="Filtrar histórico"
                >
                    <Filter size={18} />
                </button>
            </div>

            {/* Filter Panel */}
            {isFilterOpen && (
                <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
                    <div>
                        <input 
                            type="text" 
                            placeholder="Buscar por assunto, ID ou email..." 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">De:</label>
                            <input 
                                type="date" 
                                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                                value={filterDateStart}
                                onChange={(e) => setFilterDateStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Até:</label>
                            <input 
                                type="date" 
                                className="w-full text-sm px-2 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                                value={filterDateEnd}
                                onChange={(e) => setFilterDateEnd(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                         <select 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                        >
                            <option value="ALL">Prioridade: Todas</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">Alta</option>
                        </select>
                         <select 
                            className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500"
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="ALL">Categoria: Todas</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <button 
                            onClick={clearFilters}
                            className="w-full text-xs text-slate-500 hover:text-red-600 flex items-center justify-center gap-1 py-1"
                        >
                            <X size={12} /> Limpar Filtros
                        </button>
                    )}
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {resolvedTickets.length === 0 && (
                    <div className="p-8 text-center flex flex-col items-center">
                        <Search className="text-slate-300 mb-2" size={32} />
                        <p className="text-slate-500 text-sm">
                            {hasActiveFilters ? 'Nenhum chamado encontrado com estes filtros.' : 'Nenhum chamado finalizado encontrado.'}
                        </p>
                    </div>
                )}
                {resolvedTickets.map(ticket => (
                    <div 
                        key={ticket.id}
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedTicketId === ticket.id ? 'bg-green-50 border-green-300 shadow-sm' : 'bg-white border-slate-200 hover:border-green-200'}`}
                    >
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <span className="font-bold text-sm text-slate-900 mr-2">#{ticket.numericId}</span>
                                <span className="text-xs text-slate-500">
                                    {ticket.createdAt.toLocaleString('pt-BR', { 
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                        </div>
                        <h4 className="font-medium text-sm text-slate-800 line-clamp-1 mb-1">{ticket.subject}</h4>
                        <div className="flex gap-2 mt-2">
                             <Badge variant="success">Resolvido</Badge>
                             <span className="text-xs text-slate-400 flex items-center">
                                {ticket.updatedAt.toLocaleDateString()}
                             </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
      </div>
      <div className="flex-1">
        {activeTicket ? (
            <Card className="h-full flex flex-col overflow-hidden border-green-100">
                <div className="p-4 border-b bg-green-50/50 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">{activeTicket.subject}</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Mail size={14} /> 
                            <span>{activeTicket.requesterEmail}</span>
                            <span className="mx-1">•</span>
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">
                                {activeTicket.category}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                                reopenTicket(activeTicket.id);
                                setSelectedTicketId(null);
                            }}
                        >
                             <RotateCcw size={16} className="mr-2"/> Reabrir
                        </Button>
                        <Badge variant="success">Finalizado</Badge>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-6">
                    {activeTicket.messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.type === 'EMAIL_INCOMING' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-lg p-4 shadow-sm border ${msg.type === 'INTERNAL_NOTE' ? 'bg-amber-50 border-amber-200 ml-auto mr-auto w-full' : msg.type === 'EMAIL_INCOMING' ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-100'}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className={`text-xs font-bold uppercase ${msg.type === 'INTERNAL_NOTE' ? 'text-amber-700' : 'text-slate-500'}`}>
                                        {msg.type === 'EMAIL_INCOMING' ? 'Cliente' : msg.type === 'INTERNAL_NOTE' ? 'Nota Interna' : 'Você'}
                                    </span>
                                    <span className="text-xs text-slate-400">{msg.createdAt.toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-slate-800 whitespace-pre-wrap">{msg.content}</p>
                                {msg.hasAttachments && (
                                    <div className="mt-2 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded p-2 max-w-fit">
                                        <div className="bg-amber-100 p-1.5 rounded-full">
                                            <Paperclip size={14} className="text-amber-600" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-amber-700">Anexo disponível no email</span>
                                            <span className="text-[10px] text-amber-600">O arquivo não foi armazenado no sistema.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    <div className="flex justify-center my-4">
                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                            Ticket encerrado em {activeTicket.updatedAt.toLocaleString()}
                        </span>
                    </div>
                </div>
            </Card>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <CheckCheck size={48} className="mb-4 opacity-20" />
                <p>Selecione um chamado finalizado para visualizar o histórico</p>
            </div>
        )}
      </div>
    </div>
  );
};

const AppLayout = () => {
  const { currentUser, logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!currentUser) return <LoginView />;

  const isAgent = currentUser.role === 'AGENT';
  // Determine current view based on user role and active tab
  const currentView = isAgent 
    ? (activeTab === 'resolved' ? 'resolved' : activeTab === 'settings' ? 'settings' : 'workspace') 
    : activeTab;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center mr-3">
             <span className="font-bold text-white">H</span>
          </div>
          <span className="font-bold text-white text-lg">HelpDesk</span>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {!isAgent && (
            <>
              <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <LayoutDashboard size={20} className="mr-3" /> Dashboard
              </button>
              <button onClick={() => setActiveTab('tickets')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'tickets' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <Ticket size={20} className="mr-3" /> Chamados
              </button>
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <Users size={20} className="mr-3" /> Usuários
              </button>
              <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                <Settings size={20} className="mr-3" /> Configurações
              </button>
            </>
          )}
          {isAgent && (
             <>
               <button onClick={() => setActiveTab('workspace')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'workspace' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                  <MessageSquare size={20} className="mr-3" /> Workspace
               </button>
               <button onClick={() => setActiveTab('resolved')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'resolved' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                  <Archive size={20} className="mr-3" /> Finalizados
               </button>
               <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-4 py-3 rounded-md transition-colors ${currentView === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
                  <Settings size={20} className="mr-3" /> Configurações
               </button>
             </>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4 px-2">
                <img src={currentUser.avatarUrl || DEFAULT_AVATAR} className="w-8 h-8 rounded-full bg-slate-200 object-cover" alt="Avatar"/>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.role === 'ADMIN' ? 'Administrador' : 'Atendente'}</p>
                </div>
            </div>
            <button onClick={logout} className="w-full flex items-center px-4 py-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">
                <LogOut size={16} className="mr-3" /> Sair
            </button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
            <h1 className="text-xl font-semibold text-slate-800 capitalize">
                {currentView === 'dashboard' ? 'Visão Geral' : 
                 currentView === 'tickets' ? 'Gestão de Chamados' : 
                 currentView === 'workspace' ? 'Área de Atendimento' : 
                 currentView === 'resolved' ? 'Histórico de Finalizados' :
                 currentView === 'settings' ? 'Configurações do Sistema' : 'Usuários'}
            </h1>
            <div className="flex items-center gap-4">
            </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
            {currentView === 'dashboard' && <AdminDashboard />}
            {currentView === 'tickets' && <AdminTickets />}
            {currentView === 'workspace' && <AgentWorkspace />}
            {currentView === 'resolved' && <AgentResolvedTickets />}
            {currentView === 'settings' && <SettingsView />}
            {currentView === 'users' && <UsersView />}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);