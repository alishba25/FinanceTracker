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
  Pencil,
  Loader2,
  User,
  Scale,
  RotateCcw
} from 'lucide-react';

// --- FIREBASE IMPORTS & INIT ---
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithCustomToken, signInAnonymously, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';

// Environment variables fallback for local dev
const firebaseConfig = typeof _firebase_config !== 'undefined' ? JSON.parse(_firebase_config) : {
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
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Layout States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Filter States - Default to "All Time"
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');

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

  const handleSaveTransaction = async (txn) => {
    if (editingTransaction) {
      const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', editingTransaction.id);
      await updateDoc(docRef, txn);
    } else {
      const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
      await addDoc(colRef, { ...txn, timestamp: Date.now() });
    }
    setIsModalOpen(false);
    setEditingTransaction(null);
  };

  const handleAdjustBalance = async (newActualBalance) => {
    const diff = newActualBalance - lifetimeBalance;
    if (diff === 0) {
      setIsAdjustModalOpen(false);
      return;
    }
    
    const type = diff > 0 ? 'income' : 'expense';
    const txn = {
      type,
      amount: Math.abs(diff),
      category: 'Adjustment',
      date: new Date().toISOString().split('T')[0],
      source: 'Manual Balance Tally'
    };
    
    const colRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    await addDoc(colRef, { ...txn, timestamp: Date.now() });
    setIsAdjustModalOpen(false);
  };

  const handleResetData = async () => {
    setIsDeletingAll(true);
    const deletePromises = transactions.map(t => 
      deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', t.id))
    );
    await Promise.all(deletePromises);
    setIsDeletingAll(false);
    setIsResetModalOpen(false);
  };

  const handleEdit = (txn) => {
    setEditingTransaction(txn);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', id));
  };

  // --- ANALYTICS ---
  
  // 1. Calculate LIFETIME stats (All Months - For the main Bank Balance)
  const lifetimeBalance = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    transactions.forEach(t => {
      if (t.type === 'income') totalIncome += t.amount;
      if (t.type === 'expense') totalExpense += t.amount;
    });
    return totalIncome - totalExpense;
  }, [transactions]);

  // 2. Calculate PERIOD stats (For the filtered views and charts)
  const filtered = useMemo(() => transactions.filter(t => {
    const d = new Date(t.date);
    const matchMonth = selectedMonth === 'All' || d.getMonth() === selectedMonth;
    const matchYear = selectedYear === 'All' || d.getFullYear() === selectedYear;
    return matchMonth && matchYear;
  }), [transactions, selectedMonth, selectedYear]);

  const stats = useMemo(() => {
    let prevBalance = 0;
    let income = 0;
    let expense = 0;
    let investment = 0;
    const breakdown = {};

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const tMonth = tDate.getMonth();
      const tYear = tDate.getFullYear();

      // Calculate Previous Balance (strictly before selected period)
      let isBefore = false;
      if (selectedYear !== 'All') {
        if (selectedMonth !== 'All') {
          isBefore = tYear < selectedYear || (tYear === selectedYear && tMonth < selectedMonth);
        } else {
          isBefore = tYear < selectedYear;
        }
      }

      if (isBefore) {
        if (t.type === 'income') prevBalance += t.amount;
        if (t.type === 'expense') prevBalance -= t.amount;
      }

      // Calculate Selected Period Stats
      const matchMonth = selectedMonth === 'All' || tMonth === selectedMonth;
      const matchYear = selectedYear === 'All' || tYear === selectedYear;

      if (matchMonth && matchYear) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') {
          expense += t.amount;
          breakdown[t.category] = (breakdown[t.category] || 0) + t.amount;
        }
        else if (t.type === 'investment') investment += t.amount;
      }
    });

    const sortedCats = Object.entries(breakdown).map(([name, amount], i) => ({
      name, amount, color: CHART_COLORS[i % CHART_COLORS.length]
    })).sort((a, b) => b.amount - a.amount);

    const totalAvailable = prevBalance + income;
    const endOfPeriodBalance = totalAvailable - expense;

    return { 
      prevBalance,
      income, 
      expense, 
      investment, 
      totalAvailable,
      endOfPeriodBalance,
      balance: income - expense - investment, 
      sortedCats 
    };
  }, [transactions, selectedMonth, selectedYear]);

  const totalPortfolio = useMemo(() => transactions.filter(t => t.type === 'investment').reduce((a, c) => a + c.amount, 0), [transactions]);

  const availableYears = useMemo(() => {
    const years = new Set(transactions.map(t => new Date(t.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

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
        
        {/* MOBILE OVERLAY */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        {/* SIDEBAR (FIXED COLLAPSE LOGIC) */}
        <aside className={`fixed md:relative z-40 h-full bg-[#FDFBF7] dark:bg-[#003049] border-r border-black/5 dark:border-white/5 transition-all duration-300 shrink-0 overflow-hidden
          ${isMobileMenuOpen ? 'translate-x-0 w-72 shadow-2xl md:shadow-none' : '-translate-x-full w-72 md:translate-x-0'} 
          ${isSidebarOpen ? 'md:w-72' : 'md:w-0 md:border-none'}`}>
          
          <div className="w-72 p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-[#003049] dark:bg-[#FCBF49] p-2 rounded-lg text-white dark:text-[#003049] shadow-sm shrink-0"><Wallet size={24}/></div>
              <h1 className="text-2xl font-black tracking-tight truncate uppercase">FinTrack</h1>
            </div>
            <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
              <SidebarLink icon={<LayoutDashboard size={20}/>} label="Dashboard" active={currentView==='dashboard'} onClick={() => {setCurrentView('dashboard'); setIsMobileMenuOpen(false);}} isDarkMode={isDarkMode} />
              <SidebarLink icon={<Banknote size={20}/>} label="Income Logs" active={currentView==='income'} onClick={() => {setCurrentView('income'); setIsMobileMenuOpen(false);}} isDarkMode={isDarkMode} />
              <SidebarLink icon={<ShoppingBag size={20}/>} label="Expense Logs" active={currentView==='expenses'} onClick={() => {setCurrentView('expenses'); setIsMobileMenuOpen(false);}} isDarkMode={isDarkMode} />
              <SidebarLink icon={<TrendingUp size={20}/>} label="Investments" active={currentView==='investments'} onClick={() => {setCurrentView('investments'); setIsMobileMenuOpen(false);}} isDarkMode={isDarkMode} />
              <SidebarLink icon={<User size={20}/>} label="My Profile" active={currentView==='profile'} onClick={() => {setCurrentView('profile'); setIsMobileMenuOpen(false);}} isDarkMode={isDarkMode} />
            </nav>
            <div className="pt-6 border-t border-black/5 dark:border-white/5 mt-4">
              <button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"><LogOut size={20}/> Logout</button>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="p-4 sm:p-6 flex justify-between items-center bg-[#FDFBF7]/50 dark:bg-[#003049]/50 backdrop-blur-md z-10 border-b border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="md:hidden p-2 bg-black/5 dark:bg-white/5 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={24}/>
              </button>
              <button className="hidden md:block p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-all text-[#003049] dark:text-[#EAE2B7]" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                <Menu size={20}/>
              </button>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest opacity-70 truncate ml-2">{currentView}</h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black/10 transition-all shrink-0">
                {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
              <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl shrink-0">
                <select className="bg-transparent text-sm font-bold p-1.5 outline-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                  <option value="All" className="bg-white dark:bg-[#003049]">All Months</option>
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, i) => <option key={i} value={i} className="bg-white dark:bg-[#003049]">{m}</option>)}
                </select>
                <select className="bg-transparent text-sm font-bold p-1.5 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(e.target.value === 'All' ? 'All' : Number(e.target.value))}>
                  <option value="All" className="bg-white dark:bg-[#003049]">All Years</option>
                  {availableYears.map(y => <option key={y} value={y} className="bg-white dark:bg-[#003049]">{y}</option>)}
                </select>
              </div>
              <button onClick={() => {setEditingTransaction(null); setIsModalOpen(true);}} className="bg-[#003049] dark:bg-[#FCBF49] text-white dark:text-[#003049] px-4 py-2.5 rounded-xl font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all text-sm shrink-0">
                <Plus size={18}/> <span className="hidden sm:inline">Add Record</span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 scroll-smooth">
            <div className="max-w-6xl mx-auto pb-10">
              {currentView === 'dashboard' && <DashboardView stats={stats} lifetimeBalance={lifetimeBalance} selectedMonth={selectedMonth} selectedYear={selectedYear} formatCurrency={formatCurrency} isDarkMode={isDarkMode} onAdjustClick={() => setIsAdjustModalOpen(true)} />}
              {currentView === 'income' && <ListView data={filtered.filter(t => t.type === 'income')} formatCurrency={formatCurrency} onEdit={handleEdit} onDelete={handleDelete} title="Income Logs" color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} isDarkMode={isDarkMode} />}
              {currentView === 'expenses' && <ListView data={filtered.filter(t => t.type === 'expense')} formatCurrency={formatCurrency} onEdit={handleEdit} onDelete={handleDelete} title="Expense Logs" color={COLORS.RED} isDarkMode={isDarkMode} />}
              {currentView === 'investments' && <InvestmentsView transactions={filtered} formatCurrency={formatCurrency} total={totalPortfolio} onEdit={handleEdit} onDelete={handleDelete} isDarkMode={isDarkMode} />}
              {currentView === 'profile' && <ProfileView user={user} transactions={transactions} formatCurrency={formatCurrency} isDarkMode={isDarkMode} onResetClick={() => setIsResetModalOpen(true)} />}
            </div>
          </div>
        </main>

        {/* MODALS */}
        {isModalOpen && <TransactionModal onClose={() => {setIsModalOpen(false); setEditingTransaction(null);}} onSave={handleSaveTransaction} isDarkMode={isDarkMode} initialData={editingTransaction} />}
        {isAdjustModalOpen && <AdjustBalanceModal onClose={() => setIsAdjustModalOpen(false)} onSave={handleAdjustBalance} currentBalance={lifetimeBalance} isDarkMode={isDarkMode} />}
        {isResetModalOpen && <ConfirmResetModal onClose={() => setIsResetModalOpen(false)} onConfirm={handleResetData} isDarkMode={isDarkMode} isDeleting={isDeletingAll} />}
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

function DashboardView({ stats, lifetimeBalance, selectedMonth, selectedYear, formatCurrency, isDarkMode, onAdjustClick }) {
  const isAllTime = selectedMonth === 'All' && selectedYear === 'All';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* LIFETIME BALANCE CARD */}
        <div className="bg-[#003049] p-8 rounded-[2.5rem] text-[#EAE2B7] shadow-xl relative overflow-hidden group border border-white/5 flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          <div>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Available Balance</p>
              <button onClick={onAdjustClick} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-colors z-10 relative">
                <Scale size={12}/> Tally
              </button>
            </div>
            <h2 className="text-4xl font-black truncate tracking-tighter mt-1">{formatCurrency(lifetimeBalance)}</h2>
          </div>
          <div className="flex gap-4 mt-8 pt-6 border-t border-white/10 shrink-0">
             <div className="flex-1 overflow-hidden">
                <p className="text-[9px] font-black text-emerald-400 uppercase">{isAllTime ? 'All Time In' : 'Period In'}</p>
                <p className="font-bold text-sm truncate">+{formatCurrency(stats.income)}</p>
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-[9px] font-black text-rose-400 uppercase">{isAllTime ? 'All Time Out' : 'Period Out'}</p>
                <p className="font-bold text-sm truncate">-{formatCurrency(stats.expense)}</p>
             </div>
          </div>
        </div>

        {/* ACCOUNT SUMMARY TABLE */}
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-6 sm:p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 lg:col-span-2 flex flex-col justify-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-4" style={{color: isDarkMode ? COLORS.VANILLA : COLORS.DEEP_BLUE}}>
            {isAllTime ? 'All-Time Account Summary' : 'Period Account Summary'}
          </h3>
          
          <div className="space-y-3 font-bold text-sm sm:text-base">
             <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/10">
                <span className="opacity-70">{isAllTime ? 'Starting Ledger Balance' : 'Money left before period'}</span>
                <span>{formatCurrency(stats.prevBalance)}</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/10">
                <span className="opacity-70">Money in</span>
                <span className="text-[#003049] dark:text-[#FCBF49]">+{formatCurrency(stats.income)}</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/10 bg-red-50 dark:bg-red-500/10 p-2 sm:p-3 rounded-xl -mx-2 sm:-mx-3">
                <span className="text-red-500 dark:text-red-400">Expenses out</span>
                <span className="text-red-500 dark:text-red-400">-{formatCurrency(stats.expense)}</span>
             </div>
             <div className="flex justify-between items-center pb-2 border-b border-black/5 dark:border-white/10 pt-2">
                <span className="opacity-70">Calculated Available</span>
                <span className="text-lg sm:text-xl font-black">{formatCurrency(stats.totalAvailable)}</span>
             </div>
             <div className="flex justify-between items-center pt-2 bg-[#FCBF49]/20 dark:bg-[#FCBF49]/10 p-3 sm:p-4 rounded-xl -mx-2 sm:-mx-3">
                <span className="opacity-90">Money left at end of period</span>
                <span className="text-xl sm:text-2xl font-black">{formatCurrency(stats.endOfPeriodBalance)}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
            <Activity size={18} className="text-[#F77F00]"/> {isAllTime ? 'All-Time Cash Flow' : 'Period Cash Flow'}
          </h3>
          <div className="space-y-10 py-4 flex-1 flex flex-col justify-center">
            <ProgressBar label="Total Income" value={stats.income} max={Math.max(stats.income, stats.expense)} color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} formatCurrency={formatCurrency} />
            <ProgressBar label="Total Expenses" value={stats.expense} max={Math.max(stats.income, stats.expense)} color={COLORS.RED} formatCurrency={formatCurrency} />
          </div>
        </div>
        
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 flex flex-col min-h-[350px]">
          <h3 className="text-sm font-black uppercase tracking-widest mb-8">Category Breakdown</h3>
          {stats.sortedCats.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center opacity-40 font-bold italic">No spending logged for this selection</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-8 flex-1">
              <DonutChart categories={stats.sortedCats} total={stats.expense} isDarkMode={isDarkMode} />
              <div className="flex-1 w-full space-y-3 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                {stats.sortedCats.map(c => (
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
    return `${c.color} ${start}% ${acc}%`;
  }).join(', ');
  return (
    <div className="w-44 h-44 rounded-full relative flex items-center justify-center shrink-0 shadow-xl transition-transform hover:scale-105 duration-500" style={{ background: `conic-gradient(${slices})` }}>
      <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-[#003049]' : 'bg-[#FDFBF7]'}`}>
        <div className="text-center px-4 overflow-hidden">
          <span className="block text-[9px] font-black opacity-30 uppercase tracking-tighter">Total Spent</span>
          <span className="block text-sm font-black opacity-60 truncate">{Math.round(total / 1000)}k</span>
        </div>
      </div>
    </div>
  );
}

function ListView({ data, formatCurrency, onEdit, onDelete, title, color, isDarkMode }) {
  return (
    <div className="bg-[#FDFBF7] dark:bg-[#003049] rounded-[2.5rem] shadow-xl overflow-hidden border border-black/5 dark:border-white/5 animate-in slide-in-from-bottom-5 duration-500">
      <div className="p-8 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-black/[0.01] dark:bg-white/[0.01]">
        <h3 className="font-black text-xl tracking-tight" style={{color}}>{title}</h3>
        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-full">{data.length} entries</span>
      </div>
      <div className="divide-y divide-black/5 dark:divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar">
        {data.map(item => (
          <div key={item.id} className="p-6 flex justify-between items-center group hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
            <div className="flex items-center gap-5 overflow-hidden">
              <div className="text-left truncate">
                <p className="font-black text-sm truncate">{item.source}</p>
                <p className="text-[10px] font-bold opacity-40 uppercase mt-1 tracking-tight">
                  {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} • {item.category}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-6 shrink-0">
              <p className="font-black text-sm sm:text-base tracking-tighter mr-2 sm:mr-0" style={{color: item.type==='income' ? (isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE) : COLORS.RED}}>
                {item.type==='income' ? '+':'-'}{formatCurrency(item.amount)}
              </p>
              <div className="flex items-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => onEdit(item)} className="text-blue-500 hover:scale-110 p-2 sm:bg-blue-50 sm:dark:bg-blue-500/10 rounded-full transition-transform"><Pencil size={16}/></button>
                <button onClick={() => onDelete(item.id)} className="text-red-400 hover:scale-110 p-2 sm:bg-red-50 sm:dark:bg-red-500/10 rounded-full transition-transform"><Trash2 size={16}/></button>
              </div>
            </div>
          </div>
        ))}
        {data.length === 0 && <div className="p-24 text-center opacity-30 font-black italic uppercase tracking-widest text-xs">No records available</div>}
      </div>
    </div>
  );
}

function InvestmentsView({ transactions, formatCurrency, total, onEdit, onDelete, isDarkMode }) {
  const items = transactions.filter(t => t.type === 'investment');
  const grouped = items.reduce((a, c) => { a[c.category] = (a[c.category] || 0) + c.amount; return a; }, {});
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#F77F00] p-10 sm:p-14 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden border border-white/10">
        <div className="relative z-10">
          <p className="font-black uppercase tracking-widest opacity-60 text-xs mb-2">Net Portfolio Value</p>
          <h2 className="text-5xl sm:text-6xl font-black tracking-tighter">{formatCurrency(total)}</h2>
        </div>
        <TrendingUp size={240} className="absolute -right-20 -bottom-20 opacity-10 rotate-12" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#FDFBF7] dark:bg-[#003049] p-8 rounded-[2.5rem] border border-black/5 dark:border-white/5 flex flex-col h-full">
          <h3 className="font-black mb-8 uppercase tracking-widest text-xs opacity-50">Allocation Distribution</h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([cat, amt]) => (
              <div key={cat} className="p-5 rounded-2xl bg-black/5 dark:bg-white/5 flex justify-between items-center hover:scale-[1.02] transition-transform">
                <span className="font-black text-sm uppercase tracking-tighter">{cat}</span>
                <span className="font-black text-lg text-[#F77F00]">{formatCurrency(amt)}</span>
              </div>
            ))}
            {Object.keys(grouped).length === 0 && <p className="m-auto opacity-30 font-black italic uppercase text-xs">No active investments</p>}
          </div>
        </div>
        <ListView data={items} formatCurrency={formatCurrency} onEdit={onEdit} onDelete={onDelete} title="Additions in Period" color={COLORS.ORANGE} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

function ProfileView({ user, transactions, formatCurrency, isDarkMode, onResetClick }) {
  const stats = useMemo(() => {
    let inc = 0, exp = 0, inv = 0;
    transactions.forEach(t => {
      if(t.type==='income') inc+=t.amount;
      else if(t.type==='expense') exp+=t.amount;
      else if(t.type==='investment') inv+=t.amount;
    });
    return { net: inc-exp, inv, count: transactions.length };
  }, [transactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#003049] p-10 sm:p-14 rounded-[3.5rem] text-[#EAE2B7] flex flex-col md:flex-row items-center justify-between gap-10 shadow-xl border border-white/5">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-40 h-40 rounded-full bg-white/10 flex items-center justify-center border-4 border-white/10 shadow-inner shrink-0 overflow-hidden">
            <User size={80} className="opacity-40"/>
          </div>
          <div className="text-center md:text-left flex-1 overflow-hidden">
            <h2 className="text-4xl sm:text-5xl font-black mb-4 truncate tracking-tighter">
              {user?.isAnonymous ? "Guest Account" : (user?.email?.split('@')[0] || "Financial Pro")}
            </h2>
            <p className="font-bold opacity-60 tracking-wider mb-6 truncate">{user?.email || "Anonymous Local Data"}</p>
            <span className="px-5 py-2 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10 shadow-sm inline-block">UID: {user?.uid.slice(0,16)}...</span>
          </div>
        </div>
        
        {/* FACTORY RESET BUTTON */}
        <button onClick={onResetClick} className="flex items-center gap-2 px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors shrink-0 shadow-lg">
          <RotateCcw size={16} /> Reset All Data
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card title="Lifetime Surplus" value={formatCurrency(stats.net)} color={isDarkMode ? COLORS.GOLD : COLORS.DEEP_BLUE} isDarkMode={isDarkMode} />
        <Card title="Total Assets" value={formatCurrency(stats.inv)} color={COLORS.ORANGE} isDarkMode={isDarkMode} />
        <Card title="Synced Logs" value={stats.count} color={isDarkMode ? COLORS.WHITE : COLORS.RED} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

// --- MODALS ---

function TransactionModal({ onClose, onSave, isDarkMode, initialData }) {
  const [type, setType] = useState(initialData?.type || 'expense');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [source, setSource] = useState(initialData?.source || '');
  const [loading, setLoading] = useState(false);

  const categories = {
    expense: ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Groceries', 'Health', 'Adjustment', 'Other'],
    income: ['Salary', 'Freelance', 'Dividends', 'Refunds', 'Gift', 'Adjustment', 'Other'],
    investment: ['Mutual Funds', 'Stocks', 'Fixed Deposit', 'Crypto', 'Real Estate', 'Other']
  };

  const submit = async (e) => {
    e.preventDefault();
    if(!amount || !category || !source) return;
    setLoading(true);
    await onSave({ type, amount: parseFloat(amount), category, date, source });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#FDFBF7] dark:bg-[#003049] rounded-[2.5rem] sm:rounded-[3.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
        
        <div className="p-6 sm:p-8 border-b border-black/5 dark:border-white/5 flex justify-between items-center shrink-0">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tighter">{initialData ? "Edit Record" : "New Record"}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
             <X size={24} className="opacity-40"/>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
          <div className="flex bg-black/5 dark:bg-black/20 p-2 rounded-[2rem] shrink-0">
            {['expense', 'income', 'investment'].map(t => (
              <button key={t} type="button" onClick={() => {setType(t); setCategory('');}} className={`flex-1 py-3 sm:py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl capitalize transition-all ${type === t ? (isDarkMode ? 'bg-[#FCBF49] text-[#003049]' : 'bg-[#003049] text-white') + ' shadow-lg' : 'opacity-40 hover:opacity-100'}`}>{t}</button>
            ))}
          </div>

          <div className="space-y-6">
            <div className="relative border-b-4 border-black/10 dark:border-white/10 focus-within:border-[#FCBF49] transition-all pb-2">
              <span className="absolute left-0 top-2 sm:top-4 text-3xl sm:text-4xl font-black opacity-20">₹</span>
              <input type="number" required placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full pl-8 sm:pl-10 py-2 sm:py-4 text-5xl sm:text-6xl font-black bg-transparent outline-none placeholder:opacity-10 tracking-tighter text-[#003049] dark:text-[#EAE2B7]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[#003049] dark:text-[#EAE2B7]">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Entry Date</label>
                 <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 rounded-2xl bg-black/5 dark:bg-black/20 font-bold outline-none border-2 border-transparent focus:border-[#FCBF49] transition-all" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Category</label>
                 <select required value={category} onChange={e => setCategory(e.target.value)} className="w-full p-4 rounded-2xl bg-black/5 dark:bg-black/20 font-bold outline-none border-2 border-transparent focus:border-[#FCBF49] transition-all cursor-pointer">
                    <option value="">Select...</option>
                    {categories[type].map(c => <option key={c} value={c} className="bg-white dark:bg-[#003049]">{c}</option>)}
                 </select>
              </div>
            </div>

            <div className="space-y-2 text-[#003049] dark:text-[#EAE2B7]">
              <label className="text-[10px] font-black uppercase opacity-40 ml-4 tracking-widest">Source / Note</label>
              <input type="text" required placeholder="e.g. Salary, Amazon, Starbucks" value={source} onChange={e => setSource(e.target.value)} className="w-full p-4 sm:p-5 rounded-2xl bg-black/5 dark:bg-black/20 font-bold outline-none border-2 border-transparent focus:border-[#FCBF49] transition-all" />
            </div>
          </div>
          
          <button type="submit" disabled={loading} className="w-full bg-[#003049] dark:bg-[#FCBF49] text-white dark:text-[#003049] py-5 sm:py-6 rounded-[2.5rem] font-black text-xl sm:text-2xl shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 shrink-0 mt-4">
            {loading ? <Loader2 className="animate-spin mx-auto" size={32}/> : (initialData ? "UPDATE ENTRY" : "SAVE ENTRY")}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdjustBalanceModal({ onClose, onSave, currentBalance, isDarkMode }) {
  const [actualBalance, setActualBalance] = useState('');
  
  const submit = (e) => {
    e.preventDefault();
    if (!actualBalance) return;
    onSave(parseFloat(actualBalance));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#FDFBF7] dark:bg-[#003049] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/10">
        <div className="p-8 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
          <h2 className="text-2xl font-black tracking-tighter">Tally Balance</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full"><X size={20} className="opacity-40"/></button>
        </div>
        <form onSubmit={submit} className="p-8 space-y-6 text-[#003049] dark:text-[#EAE2B7]">
          <p className="text-sm font-bold opacity-70">App calculated balance is <span className="text-[#F77F00]">{currentBalance}</span>. Enter your actual bank balance below to auto-adjust your ledger.</p>
          <div className="relative border-b-4 border-black/10 dark:border-white/10 focus-within:border-[#FCBF49] transition-all pb-2">
              <span className="absolute left-0 top-1 text-2xl font-black opacity-20">₹</span>
              <input type="number" required placeholder="0.00" value={actualBalance} onChange={e => setActualBalance(e.target.value)} className="w-full pl-8 py-1 text-4xl font-black bg-transparent outline-none placeholder:opacity-10 tracking-tighter text-[#003049] dark:text-[#EAE2B7]" />
          </div>
          <button type="submit" className="w-full bg-[#003049] dark:bg-[#FCBF49] text-white dark:text-[#003049] py-4 rounded-2xl font-black text-lg shadow-xl active:scale-[0.98] transition-all mt-4">Adjust Now</button>
        </form>
      </div>
    </div>
  );
}

function ConfirmResetModal({ onClose, onConfirm, isDarkMode, isDeleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300 text-[#003049] dark:text-[#EAE2B7]">
      <div className="bg-[#FDFBF7] dark:bg-[#001D2C] rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden border border-red-500/30 p-8 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={40} className="text-red-500"/>
        </div>
        <h2 className="text-3xl font-black tracking-tighter mb-2">Factory Reset</h2>
        <p className="text-sm font-bold opacity-70 mb-8">This will permanently delete all your transactions. This action cannot be undone.</p>
        <div className="flex gap-4">
          <button onClick={onClose} disabled={isDeleting} className="flex-1 py-4 rounded-2xl font-black bg-black/5 dark:bg-white/5 hover:bg-black/10 transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="flex-1 py-4 rounded-2xl font-black bg-red-500 text-white shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
            {isDeleting ? <Loader2 className="animate-spin mx-auto" /> : "Delete All"}
          </button>
        </div>
      </div>
    </div>
  );
}
