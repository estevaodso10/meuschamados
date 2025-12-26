import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Users, Ticket, Settings, LogOut, 
  Mail, MessageSquare, Send, Paperclip, AlertCircle, CheckCheck, 
  ArrowRight, CheckCircle, Shield, Search, Filter, Plus, Trash2, Tag, User as UserIcon, Edit, X, Briefcase, Archive, RotateCcw, Calendar, Camera, RefreshCw, Lock, Loader2, BarChart3
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL: string = 'https://agfbsmpbygiqqgtxacrx.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZmJzbXBieWdpcXFndHhhY3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTgzMDksImV4cCI6MjA4MjI5NDMwOX0.6iTzPLzix2ojU1CVWadTRKf58Qk18jy6kBqiYESAqVo';

// Verification to prevent crash if keys are missing
const isConfigured = SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';

const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// --- TYPES ---

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

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cbd5e1' width='100%25' height='100%25'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E";

interface Category {
  id: string;
  name: string;
  description?: string;
}

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
  groups: string[];
  avatarUrl?: string;
  lastAssignedAt?: Date;
}

interface Message {
  id: string;
  content: string;
  type: 'EMAIL_INCOMING' | 'EMAIL_OUTGOING' | 'INTERNAL_NOTE';
  createdAt: Date;
  authorId?: string;
  hasAttachments?: boolean;
}

interface TicketData {
  id: string;
  numericId: number;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  previousStatus?: TicketStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  assignedAt?: Date;
  agentId?: string;
  groupId?: string;
  helpNeeded: boolean;
  messages: Message[];
  category: string;
  transferRequest?: {
    targetAgentId: string;
    requestedAt: Date;
  };
  source?: 'EMAIL' | 'MANUAL';
}

// --- UI COMPONENTS ---

const Button = ({ children, variant = 'primary', size = 'md', className = '', loading = false, ...props }: any) => {
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

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
      {children}
    </button>
  );
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  addUser: (user: Partial<User>, password?: string) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addGroup: (group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  syncGmail: () => Promise<void>; 
  isSyncing: boolean;
  isLoading: boolean;
}

const AppContext = createContext<AppState>({} as AppState);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
    if (!isConfigured || !supabase) return;
    setIsLoading(true);
    try {
        const { data: catData } = await supabase.from('categories').select('*');
        if (catData) setCategories(catData);

        const { data: grpData } = await supabase.from('groups').select('*');
        if (grpData) setGroups(grpData);

        const { data: userData } = await supabase.from('profiles').select(`*, profile_groups ( group_id )`);
        
        if (userData) {
            const mappedUsers: User[] = userData.map((u: any) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
                status: u.status,
                avatarUrl: u.avatar_url,
                lastAssignedAt: u.last_assigned_at ? new Date(u.last_assigned_at) : undefined,
                groups: u.profile_groups ? u.profile_groups.map((pg: any) => pg.group_id) : []
            }));
            setUsers(mappedUsers);
        }

        const { data: ticketData } = await supabase.from('tickets').select(`
            *, messages (*), transfer_requests ( target_agent_id, requested_at )
        `).order('created_at', { ascending: false });

        if (ticketData) {
            const mappedTickets: TicketData[] = ticketData.map((t: any) => ({
                id: t.id,
                numericId: t.numeric_id,
                subject: t.subject,
                requesterEmail: t.requester_email,
                status: t.status,
                priority: t.priority,
                category: t.category || 'Selecionar',
                createdAt: new Date(t.created_at),
                updatedAt: new Date(t.updated_at),
                assignedAt: t.assigned_at ? new Date(t.assigned_at) : undefined,
                agentId: t.agent_id,
                groupId: t.group_id,
                helpNeeded: t.help_needed,
                previousStatus: t.previous_status,
                source: t.source,
                transferRequest: t.transfer_requests && t.transfer_requests.length > 0 ? {
                    targetAgentId: t.transfer_requests[0].target_agent_id,
                    requestedAt: new Date(t.transfer_requests[0].requested_at)
                } : undefined,
                messages: (t.messages || []).map((m: any) => ({
                    id: m.id,
                    content: m.content,
                    type: m.type,
                    authorId: m.author_id,
                    createdAt: new Date(m.created_at),
                    hasAttachments: m.has_attachments
                })).sort((a: any, b: any) => a.createdAt.getTime() - b.createdAt.getTime())
            }));
            setTickets(mappedTickets);
        }

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isConfigured || !supabase) {
        setIsLoading(false);
        return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            supabase.from('profiles').select(`*, profile_groups ( group_id )`).eq('id', session.user.id).single()
            .then(({ data: u }) => {
                if(u) {
                    setCurrentUser({
                        id: u.id,
                        name: u.name,
                        email: u.email,
                        role: u.role,
                        status: u.status,
                        avatarUrl: u.avatar_url,
                        lastAssignedAt: u.last_assigned_at ? new Date(u.last_assigned_at) : undefined,
                        groups: u.profile_groups ? u.profile_groups.map((pg: any) => pg.group_id) : []
                    });
                    fetchAllData();
                } else {
                  setIsLoading(false);
                }
            }).catch(e => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }).catch(e => setIsLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
            setCurrentUser(null);
            setTickets([]);
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Auth check loop will handle data fetch
    // Manually fetch data to speed up UI response
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
         if (session) fetchAllData();
      });
    }, 500);
  };

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const addMessage = async (ticketId: string, content: string, type: Message['type'], helpNeeded: boolean, hasAttachments: boolean = false) => {
    if (!currentUser || !supabase) return;
    await supabase.from('messages').insert({
        ticket_id: ticketId, content, type, author_id: currentUser.id, has_attachments: hasAttachments
    });
    let updates: any = { updated_at: new Date().toISOString(), help_needed: helpNeeded };
    if (type === 'EMAIL_OUTGOING') updates.status = 'IN_PROGRESS';
    await supabase.from('tickets').update(updates).eq('id', ticketId);
    fetchAllData(); 
  };

  const createTicket = async (data: Partial<TicketData>, initialMessage: string) => {
    if (!supabase) return;
    const { data: ticket, error } = await supabase.from('tickets').insert({
        subject: data.subject || 'Sem Assunto',
        requester_email: data.requesterEmail,
        status: 'OPEN',
        priority: data.priority || 'NORMAL',
        category: data.category || 'Selecionar',
        source: data.source || 'MANUAL'
    }).select().single();

    if (error || !ticket) return;

    await supabase.from('messages').insert({
        ticket_id: ticket.id, content: initialMessage, type: 'EMAIL_INCOMING'
    });
    fetchAllData();
  };

  const editTicket = async (id: string, data: Partial<TicketData>) => {
    if (!supabase) return;
    const dbData: any = {};
    if(data.subject) dbData.subject = data.subject;
    if(data.requesterEmail) dbData.requester_email = data.requesterEmail;
    if(data.category) dbData.category = data.category;
    if(data.priority) dbData.priority = data.priority;
    await supabase.from('tickets').update(dbData).eq('id', id);
    fetchAllData();
  };

  const deleteTicket = async (id: string) => {
    if (!supabase) return;
    await supabase.from('tickets').delete().eq('id', id);
    setTickets(prev => prev.filter(t => t.id !== id));
  };

  const syncGmail = async () => {
    if (!supabase) return;
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const mockEmail = {
        subject: "Matrícula Trancada - Reativação (Via Gmail)",
        from: "aluno.pedro@iesp.edu.br",
        body: "Gostaria de saber o procedimento para reativar minha matrícula."
    };
    await createTicket({
        subject: mockEmail.subject, requesterEmail: mockEmail.from, category: 'Selecionar', priority: 'NORMAL', source: 'EMAIL'
    }, mockEmail.body);
    alert(`Sincronização simulada concluída.`);
    setIsSyncing(false);
  };

  const assignTicketRoundRobin = async (ticketId: string) => {
    if (!supabase) return;
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
    const now = new Date().toISOString();

    await supabase.from('tickets').update({
        agent_id: selectedAgent.id, status: 'IN_PROGRESS', assigned_at: now, updated_at: now
    }).eq('id', ticketId);

    await supabase.from('profiles').update({ last_assigned_at: now }).eq('id', selectedAgent.id);
    fetchAllData();
    alert(`Ticket atribuído para ${selectedAgent.name}`);
  };

  const assignTicketManual = async (ticketId: string, targetType: 'USER' | 'GROUP', targetId: string) => {
     if (!supabase) return;
     const now = new Date().toISOString();
     if (targetType === 'USER') {
         await supabase.from('tickets').update({
             agent_id: targetId, status: 'IN_PROGRESS', assigned_at: now, updated_at: now
         }).eq('id', ticketId);
         await supabase.from('profiles').update({ last_assigned_at: now }).eq('id', targetId);
     } else {
         const groupAgents = users.filter(u => u.role === 'AGENT' && u.status === 'ACTIVE' && u.groups.includes(targetId));
         let selectedAgentId = null;
         if (groupAgents.length > 0) {
             groupAgents.sort((a, b) => {
                 if (!a.lastAssignedAt) return -1;
                 if (!b.lastAssignedAt) return 1;
                 return a.lastAssignedAt.getTime() - b.lastAssignedAt.getTime();
             });
             selectedAgentId = groupAgents[0].id;
         }
         const updates: any = { group_id: targetId, updated_at: now };
         if (selectedAgentId) {
             updates.agent_id = selectedAgentId; updates.status = 'IN_PROGRESS'; updates.assigned_at = now;
             await supabase.from('profiles').update({ last_assigned_at: now }).eq('id', selectedAgentId);
         } else {
             updates.agent_id = null; updates.status = 'OPEN';
         }
         await supabase.from('tickets').update(updates).eq('id', ticketId);
     }
     fetchAllData();
  };

  const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
    if (!supabase) return;
    const ticket = tickets.find(t => t.id === ticketId);
    let previousStatus = ticket?.previousStatus;
    if (status === 'RESOLVED' && ticket?.status !== 'RESOLVED') {
        previousStatus = ticket?.status;
    }
    await supabase.from('tickets').update({
        status, previous_status: previousStatus, updated_at: new Date().toISOString()
    }).eq('id', ticketId);
    fetchAllData();
  };

  const reopenTicket = async (ticketId: string) => {
    if (!supabase) return;
    const ticket = tickets.find(t => t.id === ticketId);
    const prev = ticket?.previousStatus || 'IN_PROGRESS';
    await supabase.from('tickets').update({
        status: prev, previous_status: null, updated_at: new Date().toISOString()
    }).eq('id', ticketId);
    fetchAllData();
  };

  const updateTicketPriority = async (ticketId: string, priority: Priority) => {
    if (!supabase) return;
    await supabase.from('tickets').update({ priority }).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, priority } : t));
  };

  const updateTicketCategory = async (ticketId: string, category: string) => {
    if (!supabase) return;
    await supabase.from('tickets').update({ category }).eq('id', ticketId);
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, category } : t));
  };

  const requestTicketTransfer = async (ticketId: string, targetAgentId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('transfer_requests').upsert({
        ticket_id: ticketId, target_agent_id: targetAgentId, requested_at: new Date().toISOString()
    }, { onConflict: 'ticket_id' });
    if(!error) fetchAllData();
  };

  const approveTicketTransfer = async (ticketId: string) => {
    if (!supabase) return;
    const ticket = tickets.find(t => t.id === ticketId);
    if(!ticket || !ticket.transferRequest) return;
    const targetId = ticket.transferRequest.targetAgentId;
    const now = new Date().toISOString();
    await supabase.from('tickets').update({ agent_id: targetId, status: 'IN_PROGRESS', assigned_at: now }).eq('id', ticketId);
    await supabase.from('transfer_requests').delete().eq('ticket_id', ticketId);
    fetchAllData();
  };

  const addCategory = async (category: Partial<Category>) => {
    if(!category.name || !supabase) return;
    await supabase.from('categories').insert({ name: category.name, description: category.description });
    fetchAllData();
  };

  const removeCategory = async (id: string) => {
    if (!supabase) return;
    await supabase.from('categories').delete().eq('id', id);
    fetchAllData();
  };

  const addUser = async (userData: Partial<User>, password?: string) => {
    if (!password || !supabase) {
        alert("Erro: Senha ou configuração ausente.");
        return;
    }
    const { data, error } = await supabase.auth.signUp({
        email: userData.email!, password: password, options: { data: { name: userData.name } }
    });
    if (error) {
        alert("Erro ao criar usuário: " + error.message);
        return;
    }
    if (data.user) {
        setTimeout(async () => {
            if (userData.groups && userData.groups.length > 0) {
               const inserts = userData.groups.map(gid => ({ profile_id: data.user!.id, group_id: gid }));
               await supabase.from('profile_groups').insert(inserts);
            }
            await supabase.from('profiles').update({ role: userData.role, status: userData.status }).eq('id', data.user!.id);
            fetchAllData();
            alert("Usuário criado!");
        }, 1000);
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    if (!supabase) return;
    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.role) updates.role = data.role;
    if (data.status) updates.status = data.status;
    if (data.avatarUrl) updates.avatar_url = data.avatarUrl;

    await supabase.from('profiles').update(updates).eq('id', id);

    if (data.groups) {
        await supabase.from('profile_groups').delete().eq('profile_id', id);
        if (data.groups.length > 0) {
            const inserts = data.groups.map(gid => ({ profile_id: id, group_id: gid }));
            await supabase.from('profile_groups').insert(inserts);
        }
    }
    if (data.status === 'INACTIVE') {
         await supabase.from('tickets').update({ agent_id: null, status: 'OPEN', assigned_at: null }).eq('agent_id', id).neq('status', 'RESOLVED');
    }
    fetchAllData();
  };

  const deleteUser = async (id: string) => {
    if (!supabase) return;
    await supabase.from('profiles').delete().eq('id', id);
    fetchAllData();
  };

  const addGroup = async (group: Partial<Group>) => {
     if (!supabase) return;
     await supabase.from('groups').insert({ name: group.name, description: group.description });
     fetchAllData();
  };

  const deleteGroup = async (id: string) => {
     if (!supabase) return;
     await supabase.from('groups').delete().eq('id', id);
     fetchAllData();
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, users, tickets, categories, groups,
      login, logout, addMessage, assignTicketRoundRobin, assignTicketManual,
      updateTicketStatus, reopenTicket, updateTicketPriority, updateTicketCategory,
      requestTicketTransfer, approveTicketTransfer,
      addCategory, removeCategory, addUser, updateUser, deleteUser,
      addGroup, deleteGroup, createTicket, editTicket, deleteTicket,
      syncGmail, isSyncing, isLoading
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
      setError('');
      setLoading(true);
      try {
          await login(email, password);
      } catch (err: any) {
          setError(err.message || 'Erro ao fazer login.');
          setLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <Mail className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">HelpDesk Pro</h1>
          <p className="text-slate-500">Acesse para gerenciar chamados</p>
        </div>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4 flex items-center">
                <AlertCircle size={16} className="mr-2" /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
                <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
                placeholder="••••••••"
                />
                <Lock className="absolute right-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading}>Entrar</Button>
        </form>
      </Card>
    </div>
  );
};

const SettingsView = () => {
  const { categories, groups, addCategory, removeCategory, addGroup, deleteGroup, syncGmail, isSyncing } = useContext(AppContext);
  const [newCat, setNewCat] = useState('');
  const [newGroup, setNewGroup] = useState('');

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center">
          <Settings className="mr-2" size={20} /> Geral
        </h2>
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
           <div>
              <h3 className="font-medium text-slate-900">Sincronização de Email</h3>
              <p className="text-sm text-slate-500">Importar novos emails do Gmail como chamados.</p>
           </div>
           <Button onClick={syncGmail} disabled={isSyncing} loading={isSyncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} /> Sincronizar Agora
           </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
           <h2 className="text-lg font-semibold mb-4 text-slate-800">Categorias de Chamados</h2>
           <div className="flex gap-2 mb-4">
              <input 
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder="Nova Categoria..."
              />
              <Button onClick={() => { addCategory({ name: newCat }); setNewCat(''); }} disabled={!newCat}>Adicionar</Button>
           </div>
           <ul className="space-y-2">
             {categories.map(c => (
               <li key={c.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded group">
                  <span className="text-slate-700">{c.name}</span>
                  <button onClick={() => removeCategory(c.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
               </li>
             ))}
           </ul>
        </Card>

        <Card className="p-6">
           <h2 className="text-lg font-semibold mb-4 text-slate-800">Grupos de Atendimento</h2>
           <div className="flex gap-2 mb-4">
              <input 
                value={newGroup}
                onChange={e => setNewGroup(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                placeholder="Novo Grupo..."
              />
              <Button onClick={() => { addGroup({ name: newGroup }); setNewGroup(''); }} disabled={!newGroup}>Adicionar</Button>
           </div>
           <ul className="space-y-2">
             {groups.map(g => (
               <li key={g.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded group">
                  <span className="text-slate-700">{g.name}</span>
                  <button onClick={() => deleteGroup(g.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={16} />
                  </button>
               </li>
             ))}
           </ul>
        </Card>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
    const { tickets } = useContext(AppContext);
    
    // Stats
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const avgTime = "4h 12m"; // Mocked for simplicity in this fix

    // Chart Data
    const ticketsByStatus = [
        { name: 'Aberto', value: openTickets },
        { name: 'Em Andamento', value: tickets.filter(t => t.status === 'IN_PROGRESS').length },
        { name: 'Resolvido', value: resolvedTickets },
        { name: 'Pendente', value: tickets.filter(t => t.status === 'PENDING_AGENT').length }
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 flex items-center space-x-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Ticket size={24} /></div>
                    <div><p className="text-slate-500 text-sm">Total Chamados</p><p className="text-2xl font-bold text-slate-800">{totalTickets}</p></div>
                </Card>
                <Card className="p-4 flex items-center space-x-4">
                    <div className="p-3 bg-yellow-100 text-yellow-600 rounded-full"><AlertCircle size={24} /></div>
                    <div><p className="text-slate-500 text-sm">Em Aberto</p><p className="text-2xl font-bold text-slate-800">{openTickets}</p></div>
                </Card>
                <Card className="p-4 flex items-center space-x-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full"><CheckCircle size={24} /></div>
                    <div><p className="text-slate-500 text-sm">Resolvidos</p><p className="text-2xl font-bold text-slate-800">{resolvedTickets}</p></div>
                </Card>
                <Card className="p-4 flex items-center space-x-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-full"><BarChart3 size={24} /></div>
                    <div><p className="text-slate-500 text-sm">Tempo Médio</p><p className="text-2xl font-bold text-slate-800">{avgTime}</p></div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Status dos Chamados</h3>
                    <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ticketsByStatus}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#3b82f6" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
                 <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Chamados Recentes</h3>
                    <div className="space-y-3">
                        {tickets.slice(0, 5).map(t => (
                            <div key={t.id} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                                <div>
                                    <p className="font-medium text-slate-800 text-sm">{t.subject}</p>
                                    <p className="text-xs text-slate-500">{t.requesterEmail}</p>
                                </div>
                                <Badge variant={t.status === 'OPEN' ? 'warning' : 'success'}>{STATUS_MAP[t.status]}</Badge>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

const AdminTickets = () => {
    const { tickets, users, assignTicketRoundRobin } = useContext(AppContext);
    
    return (
        <Card className="overflow-hidden">
             <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                 <h2 className="font-semibold text-slate-800">Todos os Chamados</h2>
                 <div className="flex gap-2">
                     <Button variant="outline" size="sm"><Filter size={16} className="mr-2"/> Filtrar</Button>
                 </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Assunto</th>
                            <th className="px-4 py-3">Solicitante</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Atribuído a</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tickets.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium">#{t.numericId}</td>
                                <td className="px-4 py-3">{t.subject}</td>
                                <td className="px-4 py-3 text-slate-500">{t.requesterEmail}</td>
                                <td className="px-4 py-3"><Badge>{STATUS_MAP[t.status]}</Badge></td>
                                <td className="px-4 py-3">
                                    {t.agentId ? users.find(u => u.id === t.agentId)?.name || 'Desconhecido' : <span className="text-slate-400 italic">Não atribuído</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {!t.agentId && (
                                        <Button size="sm" variant="ghost" onClick={() => assignTicketRoundRobin(t.id)}>Auto Atribuir</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {tickets.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-8 text-slate-400">Nenhum chamado encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>
        </Card>
    );
};

const AgentWorkspace = () => {
    const { tickets, currentUser, addMessage, updateTicketStatus, categories } = useContext(AppContext);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    
    // Filter tickets assigned to current agent
    const myTickets = tickets.filter(t => t.agentId === currentUser?.id && t.status !== 'RESOLVED');
    const selectedTicket = myTickets.find(t => t.id === selectedTicketId) || myTickets[0];

    useEffect(() => {
        if (!selectedTicketId && myTickets.length > 0) {
            setSelectedTicketId(myTickets[0].id);
        }
    }, [myTickets, selectedTicketId]);

    const handleSend = () => {
        if (!selectedTicket || !replyContent) return;
        addMessage(selectedTicket.id, replyContent, 'EMAIL_OUTGOING', false);
        setReplyContent('');
    };

    if (myTickets.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <div className="bg-slate-100 p-6 rounded-full mb-4">
                    <CheckCheck size={48} className="text-slate-400" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700">Tudo limpo!</h2>
                <p>Você não tem chamados pendentes no momento.</p>
            </div>
        );
    }

    if (!selectedTicket) return null;

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6">
            <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2">
                {myTickets.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedTicket.id === t.id ? 'bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-slate-800 text-sm">#{t.numericId}</span>
                            <Badge variant={t.priority === 'HIGH' ? 'error' : 'default'}>{t.priority === 'HIGH' ? 'Alta' : 'Normal'}</Badge>
                        </div>
                        <h4 className="font-medium text-slate-900 mb-1 line-clamp-1">{t.subject}</h4>
                        <p className="text-xs text-slate-500 mb-3">{t.requesterEmail}</p>
                        <div className="flex justify-between items-center text-xs text-slate-400">
                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                            {t.helpNeeded && <span className="text-amber-600 font-bold flex items-center"><AlertCircle size={12} className="mr-1"/> Ajuda Solicitada</span>}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="w-2/3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="font-semibold text-slate-800">{selectedTicket.subject}</h2>
                        <p className="text-xs text-slate-500">Solicitado por <span className="text-slate-700 font-medium">{selectedTicket.requesterEmail}</span></p>
                    </div>
                    <div className="flex gap-2">
                         <Button size="sm" variant="success" onClick={() => updateTicketStatus(selectedTicket.id, 'RESOLVED')}>Resolver</Button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {selectedTicket.messages.map(m => (
                        <div key={m.id} className={`flex ${m.type === 'EMAIL_OUTGOING' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-lg p-3 ${m.type === 'EMAIL_OUTGOING' ? 'bg-blue-600 text-white' : m.type === 'INTERNAL_NOTE' ? 'bg-yellow-50 border border-yellow-200 text-slate-800' : 'bg-white border border-slate-200 text-slate-800'}`}>
                                <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                    <span>{m.type === 'INTERNAL_NOTE' ? 'Nota Interna' : m.type === 'EMAIL_OUTGOING' ? 'Você' : selectedTicket.requesterEmail}</span>
                                    <span>{new Date(m.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t border-slate-200">
                    <textarea 
                        className="w-full border border-slate-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                        rows={3}
                        placeholder="Escreva sua resposta..."
                        value={replyContent}
                        onChange={e => setReplyContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center mt-3">
                        <div className="flex gap-2">
                             <button className="text-slate-400 hover:text-slate-600"><Paperclip size={18} /></button>
                        </div>
                        <Button onClick={handleSend} disabled={!replyContent.trim()}>
                            <Send size={16} className="mr-2" /> Enviar Resposta
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AgentResolvedTickets = () => {
    const { tickets, currentUser, reopenTicket } = useContext(AppContext);
    
    const resolvedTickets = tickets.filter(t => t.agentId === currentUser?.id && t.status === 'RESOLVED');

    return (
        <Card>
            <div className="p-4 border-b border-slate-200"><h2 className="font-semibold text-slate-800">Meus Chamados Resolvidos</h2></div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">Assunto</th>
                            <th className="px-4 py-3">Solicitante</th>
                            <th className="px-4 py-3">Data Resolução</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {resolvedTickets.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3">#{t.numericId}</td>
                                <td className="px-4 py-3">{t.subject}</td>
                                <td className="px-4 py-3">{t.requesterEmail}</td>
                                <td className="px-4 py-3">{t.updatedAt.toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right">
                                    <Button size="sm" variant="outline" onClick={() => reopenTicket(t.id)}>Reabrir</Button>
                                </td>
                            </tr>
                        ))}
                         {resolvedTickets.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-slate-400">Nenhum chamado resolvido.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const UsersView = () => {
    const { users, addUser, updateUser, deleteUser, currentUser, groups } = useContext(AppContext);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('AGENT');
    const [status, setStatus] = useState<UserStatus>('ACTIVE');
    const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState<string>(DEFAULT_AVATAR);
  
    const handleEdit = (user: User) => {
      setEditingUser(user);
      setName(user.name);
      setEmail(user.email);
      setPassword('');
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
      setPassword('');
      setRole('AGENT');
      setStatus('ACTIVE');
      setSelectedGroups([]);
      setAvatarUrl(DEFAULT_AVATAR);
      setIsFormOpen(true);
    };
  
    const toggleGroupSelection = (groupId: string) => {
        setSelectedGroups(prev => 
          prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
        );
    };
  
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatarUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
  
    const handleSave = async () => {
      if (!name || !email) {
        alert('Nome e Email são obrigatórios');
        return;
      }
      if (!editingUser && !password) {
          alert('Senha é obrigatória para novos usuários.');
          return;
      }
      const userData: Partial<User> = {
        name, email, role, status, groups: role === 'AGENT' ? selectedGroups : [], avatarUrl: avatarUrl === DEFAULT_AVATAR ? undefined : avatarUrl
      };
      if (editingUser) {
        updateUser(editingUser.id, userData);
      } else {
        await addUser(userData, password);
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
                            <button onClick={() => handleEdit(user)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                            <button onClick={() => handleDelete(user.id)} className="p-1 text-slate-400 hover:text-red-600 transition-colors" disabled={user.id === currentUser?.id}><Trash2 size={16} /></button>
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
                 <div className="flex justify-center">
                     <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                         <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 shadow-sm">
                             <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                         </div>
                         <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <Camera className="text-white" size={24} />
                         </div>
                         <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarUpload} />
                     </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Nome Completo</label>
                       <input type="text" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maria Silva" />
                    </div>
                    <div className="col-span-2">
                       <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                       <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={email} onChange={e => setEmail(e.target.value)} placeholder="Ex: maria@empresa.com" />
                    </div>
                    {!editingUser && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Senha Inicial</label>
                            <input type="password" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={password} onChange={e => setPassword(e.target.value)} placeholder="******" />
                        </div>
                    )}
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Função</label>
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={role} onChange={e => setRole(e.target.value as Role)}>
                          <option value="AGENT">Atendente</option>
                          <option value="ADMIN">Administrador</option>
                       </select>
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                       <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={status} onChange={e => setStatus(e.target.value as UserStatus)}>
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
                                    <input type="checkbox" checked={selectedGroups.includes(g.id)} onChange={() => toggleGroupSelection(g.id)} className="rounded text-blue-600 focus:ring-blue-500" disabled={role === 'ADMIN'} />
                                    <span className="text-sm text-slate-700">{g.name}</span>
                                </label>
                            ))}
                            {groups.length === 0 && <span className="text-xs text-slate-400">Nenhum grupo disponível.</span>}
                        </div>
                        {role === 'ADMIN' && <p className="text-xs text-slate-400 mt-1">Administradores têm acesso total.</p>}
                    </div>
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

const AppLayout = () => {
  const { currentUser, logout, isLoading } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!isConfigured) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <Card className="max-w-md w-full p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuração Necessária</h1>
                <p className="text-slate-600 mb-6">
                    Para utilizar o sistema integrado com o banco de dados, você precisa configurar as chaves do Supabase no arquivo <code>index.tsx</code>.
                </p>
                <div className="bg-slate-100 p-4 rounded text-left text-xs font-mono text-slate-700 mb-6 overflow-x-auto">
                    <p>const SUPABASE_URL = 'YOUR_URL';</p>
                    <p>const SUPABASE_ANON_KEY = 'YOUR_KEY';</p>
                </div>
                <p className="text-sm text-slate-500">
                    Edite o código e insira suas credenciais reais para continuar.
                </p>
            </Card>
        </div>
    );
  }

  if (isLoading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="flex flex-col items-center">
                  <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                  <p className="text-slate-500">Carregando HelpDesk...</p>
              </div>
          </div>
      )
  }

  if (!currentUser) return <LoginView />;

  const isAgent = currentUser.role === 'AGENT';
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