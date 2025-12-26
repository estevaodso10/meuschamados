import React, { useState, useContext, createContext } from 'react';
import { Mail, AlertCircle, Lock } from 'lucide-react';

// Define Context
const AppContext = createContext({ login: async (email: string, pass: string) => {} });

// UI Components
const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white shadow rounded-lg ${className || ''}`}>{children}</div>
);

const Button = ({ children, className, loading, ...props }: any) => (
  <button 
    className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center ${className || ''}`}
    disabled={loading}
    {...props}
  >
    {loading && <span className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
    {children}
  </button>
);

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
  return <div>Settings</div>;
};

export default LoginView;
