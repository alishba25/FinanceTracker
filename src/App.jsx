import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Plus, 
  Wallet, 
  Calendar,
  Search,
  X,
  Menu,
  Activity,
  Sun,
  Moon,
  Banknote,
  ShoppingBag,
  LogOut,
  Trash2,
  Loader2,
  User
} from 'lucide-react';

// --- FIREBASE IMPORTS & INIT ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc } from 'firebase/firestore';

// Environment variables fallback for local dev
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyAe5SszPqWm4eJ2tW5ZlxC7KJAur_-2OhY",
  authDomain: "financetracker-ef6ff.firebaseapp.com",
  projectId: "financetracker-ef6ff",
  storageBucket: "financetracker-ef6ff.firebasestorage.app",
  messagingSenderId: "283119994651",
  appId: "1:283119994651:web:45fbe356c0869d98ed75be",
  measurementId: "G-C7G9RE4C5L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'fintrack-local';

// --- COLOR PALETTE ---
const COLORS = {
  DEEP_BLUE: "#003049",
  RED: "#D62828",
  ORANGE: "#F77F00",
  GOLD: "#FCBF49",
  VANILLA: "#EAE2B7",
  WHITE: "#FDFBF7",
  DARK_BG: "#001D2C"
};

const CHART_COLORS = [COLORS.RED, COLORS.ORANGE, COLORS.GOLD, "#457B9D", "#8E9A9B"];

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // --- AUTH LISTENERS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthenticating(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGuestLogin = async () => {
    setIsAuthenticating(true);
    try {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    } catch (e) { setIsAuthenticating(false); }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setAuthError('');
    try {
      if (isSignUp) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError(error.message.replace('Firebase: ', ''));
      setIsAuthenticating(false);
    }
  };

  // --- DATA SYNC ---
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransactions(data.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user, appId]);

  const handleAddTransaction = async (txn) => {
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    await addDoc(colRef, { ...txn, timestamp: Date.now() });
    setIsModalOpen(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
  };

  // --- ANALYTICS ---
  
  // 1. LIFETIME STATS (For overall bank balance)
  const lifetimeStats = useMemo(() => {
    let income = 0, expense = 0, investment = 0;
    transactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
      else if (t.type === 'investment') investment += t.amount;
    });
    return { income, expense, investment, balance: income - expense - investment };
  }, [transactions]);

  // 2. MONTHLY STATS (For specific month breakdown)
  const filtered = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  }), [transactions, selectedMonth, selectedYear]);

  const monthlyStats = useMemo(() => {
    let income = 0, expense = 0, investment = 0;
    const breakdown = {};
    filtered.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') {
        expense += t.amount;
        breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
      }
      else if (t.type === 'investment') investment += t.amount;
    });
    const sortedCats = Object.entries(breakdown).map(([name, amount], i) => ({
      name, amount, color: CHART_COLORS[i % CHART_COLORS.length]
    })).sort((a, b) => b.amount - a.amount);
    return { income, expense, investment, balance: income - expense - investment, sortedCats };
  }, [filtered]);

  const formatCurrency = (amt) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);

  // --- LOGIN VIEW ---
  if (!user) {
    return (
      <div className={`fixed inset-0 w-full h-full flex items-center justify-center p-4 transition-colors ${isDarkMode ? 'bg-[#001D2C]' : 'bg-[#EAE2B7]'}`}>
        <div className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl ${isDarkMode ? 'bg-[#003049] text-[#EAE2B7]' : 'bg-[#FDFBF7] text-[#003049]'}`}>
          <div className="flex justify-center mb-6"><div className="bg-[#FCBF49] p-4 rounded-2xl text-[#003049] shadow-lg"><Wallet size={40} /></div></div>
          <h1 className="text-3xl font-black text-center mb-8 tracking-tighter">FinTrack Login</h1>
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#FCBF49]" required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#FCBF49]" required />
            {authError && <p className="text-red-500 text-xs font-bold text-center">{authError}</p>}
            <button type="submit" disabled={isAuthenticating} className="w-full bg-[#003049] dark:bg-[#FCBF49] text-white dark:text-[#003049] py-4 rounded-xl font-black text-lg shadow-lg active:scale-95 transition-all">
              {isAuthenticating ? <Loader2 className="animate-spin mx-auto" /> : (isSignUp ? "Create Account" : "Sign In")}
            </button>
          </form>
          <div className="mt-6 flex flex-col items-center gap-4 text-sm font-bold opacity-70">
            <button onClick={() => setIsSignUp(!isSignUp)} className="hover:underline">{isSignUp ? "Already have an account? Login" : "No account? Sign up"}</button>
            <button onClick={handleGuestLogin} className="uppercase tracking-widest text-[10px] opacity-50 hover:opacity-100">Continue as Guest</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 w-full h-full ${isDarkMode ? 'dark' : ''}`}>
      <div className="flex w-full h-full bg-[#EAE2B7] dark:bg-[#001D2C] text-[#003049] dark:text-[#EAE2B7] overflow-hidden transition-colors duration-500">
        
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col w-72 bg-[#FDFBF7] dark:bg-[#003049] border-r border-black/5 dark:border-white/5 p-6 transition-colors shrink-0">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-[#003049] dark:bg-[#FCBF49] p-2 rounded-lg text-white dark:text-[#003049] shadow-sm shrink-0"><Wallet size={24}/></div>
            <h1 className="text-2xl font-black tracking-tight truncate uppercase">FinTrack</h1>
          </div>
          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
            <SidebarLink icon={<LayoutDashboard size={20}/>} label="Dashboard" active={currentView==='dashboard'} onClick={() => setCurrentView('dashboard')} isDarkMode={isDarkMode} />
            <SidebarLink icon={<Banknote size={20}/>} label="Income History" active={currentView==='income'} onClick={() => setCurrentView('income')} isDarkMode={isDarkMode} />
            <SidebarLink icon={<ShoppingBag size={20}/>} label="Expense History" active={currentView==='expenses'} onClick={() => setCurrentView('expenses')} isDarkMode={isDarkMode} />
            <SidebarLink icon={<TrendingUp size={20}/>} label="Investments" active={currentView==='investments'} onClick={() => setCurrentView('investments')} isDarkMode={isDarkMode} />
            <SidebarLink icon={<User size={20}/>} label="My Profile" active={currentView==='profile'} onClick={() => setCurrentView('profile')} isDarkMode={isDarkMode} />
          </nav>
          <div className="pt-6 border-t border-black/5 dark:border-white/5">
            <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20}/> Logout</button>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="p-6 flex justify-between items-center bg-[#FDFBF7]/50 dark:bg-[#003049]/50 backdrop-blur-md z-10 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 bg-black/5 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}><Menu size={24}/></button>
              <h2 className="text-xl font-black uppercase tracking-widest opacity-70 truncate">{currentView}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 transition-all shrink-0">
                {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl shrink-0">
                <select className="bg-transparent text-sm font-bold p-1.5 outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i} className="bg-white dark:bg-[#003049]">{m}</option>)}
                </select>
                <select className="bg-transparent text-sm font-bold p-1.5 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-white dark:bg-[#003049]">{y}</option>)}
                </select>
              </div>
              <button onClick={() => setIsModalOpen(true)} className="bg-[#003049] dark:bg-[#FCBF49] text-white dark:text-[#003049] px-4 py-2.5 rounded-xl font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all text-sm shrink-0">
                <Plus size={18}/> <span className="hidden sm:inline">Add Record</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth">
            <div className="max-w-6xl mx-auto pb-10">
              {currentView === 'dashboard' && <DashboardView monthlyStats={monthlyStats} lifetimeStats={lifetimeStats} formatCurrency={formatCurrency} isDarkMode={isDarkMode} />}
              {currentView === 'income' && <ListView data={filtered.filter(t => t.type === 'income')} formatCurrency={formatCurrency} onDelete={handleDelete} title="Income Logs" color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} isDarkMode={isDarkMode} />}
              {currentView === 'expenses' && <ListView data={filtered.filter(t => t.type === 'expense')} formatCurrency={formatCurrency} onDelete={handleDelete} title="Expense Logs" color={COLORS.RED} isDarkMode={isDarkMode} />}
              {currentView === 'investments' && <InvestmentsView transactions={transactions} formatCurrency={formatCurrency} total={lifetimeStats.investment} onDelete={handleDelete} isDarkMode={isDarkMode} />}
              {currentView === 'profile' && <ProfileView user={user} lifetimeStats={lifetimeStats} transactionsCount={transactions.length} formatCurrency={formatCurrency} isDarkMode={isDarkMode} />}
            </div>
          </div>
        </main>

        {isModalOpen && <TransactionModal onClose={() => setIsModalOpen(false)} onSave={handleAddTransaction} isDarkMode={isDarkMode} />}
      </div>
    </div>
  );
}

// --- UI SUB-COMPONENTS ---

function SidebarLink({ icon, label, active, onClick, isDarkMode }) {
  const activeStyle = isDarkMode 
    ? "bg-[#FCBF49] text-[#003049] shadow-lg shadow-[#FCBF49]/10" 
    : "bg-[#003049] text-[#EAE2B7] shadow-lg shadow-[#003049]/10";
  
  const inactiveStyle = "text-[#003049]/60 dark:text-[#EAE2B7]/60 hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#003049] dark:hover:text-[#EAE2B7]";

  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-black text-sm group ${active ? activeStyle : inactiveStyle}`}>
      <span className="shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function DashboardView({ monthlyStats, lifetimeStats, formatCurrency, isDarkMode }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="bg-[#003049] p-8 rounded-[2.5rem] text-[#EAE2B7] shadow-xl relative overflow-hidden group border border-white/5 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 text-[#FCBF49]">Total Available Balance</p>
            <h2 className="text-4xl font-black truncate tracking-tighter">{formatCurrency(lifetimeStats.balance)}</h2>
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t border-white/10 shrink-0">
             <div className="flex-1 overflow-hidden">
               <p className="text-[9px] font-black text-emerald-400 uppercase">All-Time In</p>
               <p className="font-bold text-sm truncate">{formatCurrency(lifetimeStats.income)}</p>
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-[9px] font-black text-rose-400 uppercase">All-Time Out</p>
               <p className="font-bold text-sm truncate">{formatCurrency(lifetimeStats.expense)}</p>
             </div>
          </div>
        </div>
        <Card title="Month Total Income" value={formatCurrency(monthlyStats.income)} color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} isDarkMode={isDarkMode} />
        <Card title="Month Total Expenses" value={formatCurrency(monthlyStats.expense)} color={COLORS.RED} isDarkMode={isDarkMode} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <Activity size={18} className="text-[#F77F00]"/> Monthly Cash Flow
          </h3>
          <div className="space-y-10 py-4 flex-1 flex flex-col justify-center">
            <ProgressBar label="Total Income" value={monthlyStats.income} max={Math.max(monthlyStats.income, monthlyStats.expense)} color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} formatCurrency={formatCurrency} />
            <ProgressBar label="Total Expenses" value={monthlyStats.expense} max={Math.max(monthlyStats.income, monthlyStats.expense)} color={COLORS.RED} formatCurrency={formatCurrency} />
          </div>
        </div>
        
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 flex flex-col min-h-[350px]">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8">Category Breakdown</h3>
          {monthlyStats.sortedCats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center opacity-40 font-bold italic">No spending logged for this month</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-8 flex-1">
              <DonutChart categories={monthlyStats.sortedCats} total={monthlyStats.expense} isDarkMode={isDarkMode} />
              <div className="flex-1 w-full space-y-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                {monthlyStats.sortedCats.map(c => (
                  <div key={c.name} className="flex justify-between items-center text-xs font-black">
                    <span className="flex items-center gap-2 opacity-70">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{background:c.color}}></div>
                      <span className="truncate max-w-[100px] uppercase tracking-tighter">{c.name}</span>
                    </span>
                    <span className="shrink-0">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, color, isDarkMode }) {
  const labelColor = isDarkMode ? COLORS.VANILLA : COLORS.DEEP_BLUE;
  return (
    <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 transition-all flex flex-col justify-center">
      <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2" style={{color: labelColor}}>{title}</p>
      <h2 className="text-3xl font-black tracking-tighter truncate" style={{color}}>{value}</h2>
    </div>
  );
}

function ProgressBar({ label, value, max, color, formatCurrency }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-black uppercase opacity-60 tracking-tight">
        <span>{label}</span>
        <span style={{color}}>{formatCurrency(value)}</span>
      </div>
      <div className="h-4 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
        <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${pct}%`, background: color }}></div>
      </div>
    </div>
  );
}

function DonutChart({ categories, total, isDarkMode }) {
  let acc = 0;
  const slices = categories.map(c => {
    const p = (c.amount / total) * 100;
    const start = acc; acc += p;
    return `${c.color}
