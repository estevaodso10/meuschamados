import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Users, Ticket, Settings, LogOut, 
  Mail, MessageSquare, Send, AlertCircle, CheckCheck, 
  Search, Filter, Plus, Trash2, User as UserIcon, Edit, X, Lock, Loader2, BarChart3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer 
} from 'recharts';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL: string = 'https://agfbsmpbygiqqgtxacrx.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZmJzbXBieWdpcXFndHhhY3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTgzMDksImV4cCI6MjA4MjI5NDMwOX0.6iTzPLzix2ojU1CVWadTRKf58Qk18jy6kBqiYESAqVo';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- TYPES ---
type Role = 'ADMIN' | 'AGENT';
type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
type TicketStatus = 'OPEN' | 'PENDING_AGENT' | 'IN_PROGRESS' | 'WAITING_CUSTOMER' | 'RESOLVED';
type Priority = 'NORMAL' | 'HIGH';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  avatarUrl?: string;
  groups: string[];
}

interface Message {
  id: string;
  content: string;
  type: 'EMAIL_INCOMING' | 'EMAIL_OUTGOING' | 'INTERNAL_NOTE';
  createdAt: Date;
  authorId?: string;
}

interface TicketData {
  id: string;
  subject: string;
  requesterEmail: string;
  status: TicketStatus;
  priority: Priority;
  createdAt: Date;
  updatedAt: Date;
  agentId?: string;
  messages: Message[];
  category: string;
}

// --- UI COMPONENTS ---
const Button = ({ children, variant = 'primary', size = 'md', className = '', loading = false, ...props }: any) => {
  const base = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  const variants: any = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "hover:bg-slate-100 text-slate-700",
  };
  const sizes: any = { sm: "h-8 px-3 text-xs", md: "h-10 py-2 px-4 text-sm", lg: "h-12 px-6 text-base" };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
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
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>{children}</span>;
};

// --- CONTEXT ---
interface AppState {
  currentUser: User | null;
  users: User[];
  tickets: TicketData[];
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  createTicket: (data: Partial<TicketData>) => Promise<void>;
  addUser: (data: Partial<User>, pass: string) => Promise<void>;
}

const AppContext = createContext<AppState>({} as AppState);

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.from('profiles').select('*');
      if (userData) {
        setUsers(userData.map((u: any) => ({
          id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, groups: []
        })));
      }
      const { data: ticketData } = await supabase.from('tickets').select('*, messages(*)').order('created_at', { ascending: false });
      if (ticketData) {
        setTickets(ticketData.map((t: any) => ({
          id: t.id,
          subject: t.subject,
          requesterEmail: t.requester_email,
          status: t.status,
          priority: t.priority,
          category: t.category,
          createdAt: new Date(t.created_at),
          updatedAt: new Date(t.updated_at),
          agentId: t.agent_id,
          messages: (t.messages || []).map((m: any) => ({
             id: m.id, content: m.content, type: m.type, createdAt: new Date(m.created_at), authorId: m.author_id
          }))
        })));
      }
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('*').eq('id', session.user.id).single()
          .then(({ data }) => {
             if (data) {
               setCurrentUser({ id: data.id, name: data.name, email: data.email, role: data.role, status: data.status, groups: [] });
               fetchAllData();
             }
          });
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        if (!session) setCurrentUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    window.location.reload();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const createTicket = async (data: Partial<TicketData>) => {
    const { error } = await supabase.from('tickets').insert({
       subject: data.subject, requester_email: data.requesterEmail, status: 'OPEN', priority: 'NORMAL'
    });
    if (!error) fetchAllData();
  };

  const addUser = async (userData: Partial<User>, pass: string) => {
    // Note: In a real app, use Admin API. For demo, we rely on public signup + trigger or function.
    // Since we removed public signup UI, we assume this is an admin action.
    alert("Para criar usuários, use o Painel SQL do Supabase ou habilite a API de Admin.");
  };

  return (
    <AppContext.Provider value={{ currentUser, users, tickets, isLoading, login, logout, createTicket, addUser }}>
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
      setError('Credenciais inválidas.');
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
          <p className="text-slate-500">Acesso Administrativo</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex"><AlertCircle size={16} className="mr-2"/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded focus:ring-blue-500" required />
              <Lock className="absolute right-3 top-2.5 text-slate-400" size={16} />
            </div>
          </div>
          <Button type="submit" className="w-full" loading={loading}>Entrar</Button>
        </form>
      </Card>
    </div>
  );
};

const DashboardView = () => {
  const { tickets } = useContext(AppContext);
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const progressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  const data = [
    { name: 'Aberto', value: openCount },
    { name: 'Andamento', value: progressCount },
    { name: 'Resolvido', value: resolvedCount },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-900">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Em Aberto</h3>
            <AlertCircle className="text-yellow-500 h-5 w-5" />
          </div>
          <div className="text-2xl font-bold">{openCount}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Em Andamento</h3>
            <Loader2 className="text-blue-500 h-5 w-5" />
          </div>
          <div className="text-2xl font-bold">{progressCount}</div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Resolvidos</h3>
            <CheckCheck className="text-green-500 h-5 w-5" />
          </div>
          <div className="text-2xl font-bold">{resolvedCount}</div>
        </Card>
      </div>
      <Card className="p-6">
        <h3 className="text-lg font-medium mb-4">Visão Geral</h3>
        <div className="h-64">
           <ResponsiveContainer width="100%" height="100%">
             <BarChart data={data}>
               <CartesianGrid strokeDasharray="3 3" />
               <XAxis dataKey="name" />
               <YAxis />
               <RechartsTooltip />
               <Bar dataKey="value" fill="#3b82f6" />
             </BarChart>
           </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

const TicketListView = () => {
  const { tickets } = useContext(AppContext);
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-900">Chamados</h2>
         <Button>Novo Chamado</Button>
       </div>
       <Card>
         <div className="overflow-x-auto">
           <table className="min-w-full divide-y divide-slate-200">
             <thead className="bg-slate-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Assunto</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Solicitante</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-slate-200">
               {tickets.map(t => (
                 <tr key={t.id} className="hover:bg-slate-50">
                   <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{t.subject}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-slate-500">{t.requesterEmail}</td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <Badge variant={t.status === 'OPEN' ? 'error' : t.status === 'RESOLVED' ? 'success' : 'blue'}>{t.status}</Badge>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap text-slate-500">{t.createdAt.toLocaleDateString()}</td>
                 </tr>
               ))}
               {tickets.length === 0 && (
                 <tr>
                   <td colSpan={4} className="px-6 py-10 text-center text-slate-500">Nenhum chamado encontrado.</td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
       </Card>
    </div>
  );
};

const UsersView = () => {
  const { users } = useContext(AppContext);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-slate-900">Usuários</h2>
         <Button>Adicionar Usuário</Button>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
             <thead className="bg-slate-50">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
               </tr>
             </thead>
             <tbody className="bg-white divide-y divide-slate-200">
               {users.map(u => (
                 <tr key={u.id}>
                   <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{u.name}</td>
                   <td className="px-6 py-4 whitespace-nowrap text-slate-500">{u.email}</td>
                   <td className="px-6 py-4 whitespace-nowrap"><Badge variant="blue">{u.role}</Badge></td>
                   <td className="px-6 py-4 whitespace-nowrap"><Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>{u.status}</Badge></td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const MainLayout = () => {
  const { currentUser, logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardView />;
      case 'tickets': return <TicketListView />;
      case 'users': return <UsersView />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center">
           <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center mr-3 font-bold">HD</div>
           <span className="font-bold text-lg">HelpDesk</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} className="mr-3" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('tickets')} className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${activeTab === 'tickets' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
            <Ticket size={20} className="mr-3" /> Chamados
          </button>
          {currentUser?.role === 'ADMIN' && (
             <button onClick={() => setActiveTab('users')} className={`w-full flex items-center px-3 py-2 rounded-md transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
               <Users size={20} className="mr-3" /> Usuários
             </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
           <div className="flex items-center mb-4">
             <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs overflow-hidden">
                {currentUser?.avatarUrl ? <img src={currentUser.avatarUrl} alt="" className="h-full w-full object-cover"/> : currentUser?.name?.charAt(0)}
             </div>
             <div className="ml-3">
               <div className="text-sm font-medium">{currentUser?.name}</div>
               <div className="text-xs text-slate-400 capitalize">{currentUser?.role?.toLowerCase()}</div>
             </div>
           </div>
           <button onClick={logout} className="flex items-center text-slate-400 hover:text-white text-sm">
             <LogOut size={16} className="mr-2" /> Sair
           </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8">
           <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h1>
           <div className="flex items-center space-x-4">
             <button className="p-2 text-slate-400 hover:text-slate-600 relative">
               <Mail size={20} />
               <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full"></span>
             </button>
           </div>
        </header>
        <main className="p-8">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  const { currentUser, isLoading } = useContext(AppContext);
  
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
      </div>
    );
  }

  return currentUser ? <MainLayout /> : <LoginView />;
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <AppProvider>
    <App />
  </AppProvider>
);
