import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  BookOpen, 
  Clock, 
  LayoutGrid, 
  Settings, 
  Send, 
  Moon, 
  Sun, 
  Compass, 
  CheckCircle2, 
  ChevronRight, 
  Search, 
  Bookmark, 
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  Menu,
  X,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { bn } from 'date-fns/locale';
import { generateIslamicResponse } from './services/geminiService';
import { cn } from './utils';

// --- Types ---
type Tab = 'chat' | 'quran' | 'prayer' | 'tools' | 'quiz' | 'settings';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Surah {
  id: number;
  name: string;
  englishName: string;
  ayahs: number;
  type: 'Meccan' | 'Medinan';
}

// --- Mock Data ---
const MOCK_SURAHS: Surah[] = [
  { id: 1, name: 'আল-ফাতিহা', englishName: 'Al-Fatiha', ayahs: 7, type: 'Meccan' },
  { id: 2, name: 'আল-বাকারা', englishName: 'Al-Baqarah', ayahs: 286, type: 'Medinan' },
  { id: 3, name: 'আল-ইমরান', englishName: 'Ali \'Imran', ayahs: 200, type: 'Medinan' },
  { id: 4, name: 'আন-নিসা', englishName: 'An-Nisa', ayahs: 176, type: 'Medinan' },
  { id: 36, name: 'ইয়াসিন', englishName: 'Ya-Sin', ayahs: 83, type: 'Meccan' },
  { id: 55, name: 'আর-রাহমান', englishName: 'Ar-Rahman', ayahs: 78, type: 'Medinan' },
  { id: 56, name: 'আল-ওয়াকিয়াহ', englishName: 'Al-Waqi\'ah', ayahs: 96, type: 'Meccan' },
  { id: 67, name: 'আল-মুলক', englishName: 'Al-Mulk', ayahs: 30, type: 'Meccan' },
  { id: 112, name: 'আল-ইখলাস', englishName: 'Al-Ikhlas', ayahs: 4, type: 'Meccan' },
  { id: 113, name: 'আল-ফালাক', englishName: 'Al-Falaq', ayahs: 5, type: 'Meccan' },
  { id: 114, name: 'আন-নাস', englishName: 'An-Nas', ayahs: 6, type: 'Meccan' },
];

const SUGGESTED_QUESTIONS = [
  "নামাজের গুরুত্ব কী?",
  "রমজানের ফজিলত কী?",
  "তাহাজ্জুদ নামাজের নিয়ম কী?",
  "ইসলামে দান-সদকার গুরুত্ব।"
];

const QUIZ_QUESTIONS = [
  {
    question: "ইসলামের প্রথম খলিফা কে ছিলেন?",
    options: ["হযরত ওমর (রা.)", "হযরত আবু বকর (রা.)", "হযরত ওসমান (রা.)", "হযরত আলী (রা.)"],
    correct: 1
  },
  {
    question: "পবিত্র কুরআনের সবচেয়ে বড় সূরা কোনটি?",
    options: ["সূরা ফাতিহা", "সূরা বাকারা", "সূরা ইয়াসিন", "সূরা ইখলাস"],
    correct: 1
  }
];

// --- Components ---

const Navbar = ({ activeTab, setActiveTab }: { activeTab: Tab, setActiveTab: (t: Tab) => void }) => {
  const tabs = [
    { id: 'chat', icon: MessageSquare, label: 'চ্যাট' },
    { id: 'quran', icon: BookOpen, label: 'কুরআন' },
    { id: 'prayer', icon: Clock, label: 'নামাজ' },
    { id: 'tools', icon: LayoutGrid, label: 'টুলস' },
    { id: 'settings', icon: Settings, label: 'সেটিংস' },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md glass rounded-3xl p-2 flex justify-around items-center z-50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as Tab)}
          className={cn(
            "relative flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300",
            activeTab === tab.id ? "text-gold scale-110" : "text-slate-400 hover:text-slate-200"
          )}
        >
          {activeTab === tab.id && (
            <motion.div
              layoutId="nav-glow"
              className="absolute inset-0 bg-gold/10 rounded-2xl blur-md"
            />
          )}
          <tab.icon size={22} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
          <span className="text-[10px] font-medium">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

const ChatSection = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'আসসালামু আলাইকুম! আমি নূরদীন এআই। আমি আপনাকে কীভাবে সাহায্য করতে পারি?', sender: 'ai', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<'simple' | 'detailed' | 'scholar'>('detailed');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const response = await generateIslamicResponse(input, mode);
    
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: response,
      sender: 'ai',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full pb-24">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            key={msg.id}
            className={cn(
              "flex flex-col max-w-[85%]",
              msg.sender === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed",
              msg.sender === 'user' 
                ? "gold-gradient text-emerald-950 font-medium shadow-lg" 
                : "glass border-gold/20 shadow-emerald-950/50"
            )}>
              <div className="markdown-body">
                <Markdown>{msg.text}</Markdown>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">
              {format(msg.timestamp, 'p')}
            </span>
          </motion.div>
        ))}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass border-gold/20 p-4 rounded-2xl mr-auto flex gap-1"
          >
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-gold rounded-full" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-gold rounded-full" />
            <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-gold rounded-full" />
          </motion.div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="whitespace-nowrap px-4 py-2 rounded-full glass text-xs text-slate-300 hover:text-gold hover:border-gold/30 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 glass p-2 rounded-2xl border-white/10">
          <select 
            value={mode} 
            onChange={(e) => setMode(e.target.value as any)}
            className="bg-transparent text-[10px] text-gold font-bold outline-none px-2 border-r border-white/10"
          >
            <option value="simple">সহজ</option>
            <option value="detailed">বিস্তারিত</option>
            <option value="scholar">স্কলার</option>
          </select>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="আপনার প্রশ্ন লিখুন..."
            className="flex-1 bg-transparent border-none outline-none text-sm px-2 placeholder:text-slate-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="p-2 gold-gradient rounded-xl text-emerald-950 shadow-lg disabled:opacity-50 transition-all active:scale-90"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PrayerSection = () => {
  const prayers = [
    { name: 'ফজর', bagerhat: '০৫:০৮', dhaka: '০৫:১০', next: false },
    { name: 'যোহর', bagerhat: '১২:১৩', dhaka: '১২:১৫', next: true },
    { name: 'আসর', bagerhat: '০৪:২৮', dhaka: '০৪:৩০', next: false },
    { name: 'মাগরিব', bagerhat: '০৬:০৩', dhaka: '০৬:০৫', next: false },
    { name: 'এশা', bagerhat: '০৭:২৮', dhaka: '০৭:৩০', next: false },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="glass-gold p-6 rounded-3xl text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Clock size={100} />
        </div>
        <h3 className="text-gold text-sm font-bold tracking-widest uppercase mb-2">পরবর্তী নামাজ</h3>
        <h2 className="text-4xl font-bold mb-1">যোহর</h2>
        <p className="text-slate-400 text-sm mb-4">বাকি আছে: ০২ ঘণ্টা ১৫ মিনিট</p>
        <div className="flex justify-center gap-4">
          <div className="glass px-4 py-2 rounded-xl text-[10px] flex items-center gap-2">
            <Compass size={12} className="text-gold" />
            <span>বাগেরহাট ও ঢাকা</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between px-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <span>নামাজ</span>
          <div className="flex items-center gap-6 mr-8">
            <span className="w-12 text-right">বাগেরহাট</span>
            <span className="w-12 text-right">ঢাকা</span>
          </div>
        </div>
        {prayers.map((p) => (
          <div 
            key={p.name}
            className={cn(
              "flex items-center justify-between p-4 rounded-2xl transition-all",
              p.next ? "glass-gold border-gold/40 scale-[1.02]" : "glass"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-2 h-2 rounded-full",
                p.next ? "bg-gold animate-pulse" : "bg-slate-600"
              )} />
              <span className={cn("font-medium", p.next ? "text-gold" : "text-slate-200")}>
                {p.name}
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className={cn("w-12 text-right text-xs font-mono", p.next ? "text-gold" : "text-slate-300")}>
                {p.bagerhat}
              </span>
              <span className="w-12 text-right text-xs font-mono text-slate-500">
                {p.dhaka}
              </span>
              <button className="w-6 h-6 rounded-md border border-white/10 flex items-center justify-center hover:border-gold/50 transition-colors">
                <CheckCircle2 size={14} className="text-slate-600 hover:text-gold" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Volume2 className="text-gold" size={20} />
          <div>
            <p className="text-sm font-medium">আযান নোটিফিকেশন</p>
            <p className="text-[10px] text-slate-500">সব নামাজের জন্য সচল</p>
          </div>
        </div>
        <div className="w-10 h-5 bg-gold/20 rounded-full relative">
          <div className="absolute right-1 top-1 w-3 h-3 bg-gold rounded-full shadow-lg shadow-gold/50" />
        </div>
      </div>
    </div>
  );
};

const QuranSection = () => {
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (id: number) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      setLoadingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Clear previous source
      }
      
      setLoadingId(id);
      setPlayingId(null);

      const surahIdPadded = id.toString().padStart(3, '0');
      // Alternative stable mirror: server8.mp3quran.net
      const audioUrl = `https://server8.mp3quran.net/afs/${surahIdPadded}.mp3`;
      
      const newAudio = new Audio(audioUrl);
      audioRef.current = newAudio;
      
      newAudio.play().then(() => {
        setPlayingId(id);
        setLoadingId(null);
      }).catch((err) => {
        console.error("Audio Play Error:", err);
        setLoadingId(null);
        // Fallback to another mirror if first fails
        const fallbackUrl = `https://download.quranicaudio.com/quran/mishari_al_afasy/${surahIdPadded}.mp3`;
        newAudio.src = fallbackUrl;
        newAudio.play().then(() => {
          setPlayingId(id);
        }).catch(() => {
          alert("অডিও লোড করা যাচ্ছে না। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন।");
        });
      });
      
      newAudio.onended = () => {
        setPlayingId(null);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);
  
  return (
    <div className="p-6 space-y-6 relative h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3 glass p-3 rounded-2xl border-white/10">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="সূরা খুঁজুন..." 
            className="bg-transparent border-none outline-none text-sm flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "p-3 rounded-2xl border border-white/10 transition-all",
            isMenuOpen ? "gold-gradient text-emerald-950" : "glass text-gold"
          )}
        >
          <Menu size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-6 right-6 z-30 glass rounded-3xl p-4 max-h-[60%] overflow-y-auto shadow-2xl border-gold/20"
          >
            <div className="flex justify-between items-center mb-4 px-2">
              <h4 className="text-gold font-bold text-sm">সূরা তালিকা</h4>
              <button onClick={() => setIsMenuOpen(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {MOCK_SURAHS.map((surah) => (
                <button
                  key={surah.id}
                  onClick={() => {
                    togglePlay(surah.id);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl transition-all text-left",
                    (playingId === surah.id || loadingId === surah.id) ? "bg-gold/20 text-gold" : "hover:bg-white/5 text-slate-300"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono opacity-50">{surah.id.toString().padStart(3, '0')}</span>
                    <span className="text-sm font-medium">{surah.name}</span>
                  </div>
                  <span className="text-[10px] opacity-50">
                    {loadingId === surah.id ? "লোডিং..." : surah.englishName}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
        {MOCK_SURAHS.filter(s => s.name.includes(search) || s.englishName.toLowerCase().includes(search.toLowerCase())).map((surah) => (
          <motion.div 
            whileHover={{ scale: 1.01 }}
            key={surah.id} 
            className="glass p-4 rounded-2xl flex items-center justify-between cursor-pointer group"
            onClick={() => togglePlay(surah.id)}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm transition-all",
                (playingId === surah.id || loadingId === surah.id) ? "gold-gradient text-emerald-950" : "glass-gold text-gold"
              )}>
                {loadingId === surah.id ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RotateCcw size={18} />
                  </motion.div>
                ) : playingId === surah.id ? (
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
                    <Volume2 size={18} />
                  </motion.div>
                ) : surah.id}
              </div>
              <div>
                <h4 className="font-bold text-slate-200">{surah.name}</h4>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{surah.englishName} • {surah.ayahs} আয়াত</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">
                {surah.type === 'Meccan' ? 'মাক্কী' : 'মাদানী'}
              </span>
              <div className="flex items-center gap-2">
                {loadingId === surah.id ? (
                  <span className="text-[10px] text-gold animate-pulse font-bold">লোডিং...</span>
                ) : playingId === surah.id ? (
                  <span className="text-[10px] text-gold animate-pulse font-bold">চলছে...</span>
                ) : (
                  <Volume2 size={14} className="text-slate-600" />
                )}
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ToolsSection = () => {
  const [tasbih, setTasbih] = useState(0);
  
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-6 rounded-3xl text-center space-y-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest">তসবিহ</p>
          <div className="text-4xl font-bold text-gold">{tasbih}</div>
          <button 
            onClick={() => setTasbih(prev => prev + 1)}
            className="w-full py-3 gold-gradient rounded-2xl text-emerald-950 font-bold shadow-lg active:scale-95 transition-all"
          >
            সুবহানাল্লাহ
          </button>
          <button 
            onClick={() => setTasbih(0)}
            className="text-[10px] text-slate-500 flex items-center justify-center gap-1 mx-auto hover:text-slate-300"
          >
            <RotateCcw size={10} /> রিসেট
          </button>
        </div>

        <div className="glass p-6 rounded-3xl flex flex-col items-center justify-center space-y-2">
          <Compass size={40} className="text-gold animate-pulse" />
          <p className="text-xs font-medium">কিবলা কম্পাস</p>
          <p className="text-[10px] text-slate-500">২৯৫° উত্তর-পশ্চিম</p>
        </div>
      </div>

      <div className="glass p-6 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Sparkles size={80} />
        </div>
        <h4 className="text-gold text-xs font-bold uppercase mb-4 flex items-center gap-2">
          <Sparkles size={14} /> আজকের দুয়া
        </h4>
        <p className="text-sm leading-relaxed text-slate-200 italic">
          "হে আমাদের পালনকর্তা, আমাদের দুনিয়াতে কল্যাণ দান কর এবং আখেরাতেও কল্যাণ দান কর এবং আমাদের জাহান্নামের আগুন থেকে রক্ষা কর।"
        </p>
        <p className="text-[10px] text-slate-500 mt-4">— সূরা আল-বাকারা, ২০১</p>
      </div>

      <div className="glass p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Moon className="text-gold" size={20} />
          <div>
            <p className="text-sm font-medium">হিজরি ক্যালেন্ডার</p>
            <p className="text-[10px] text-slate-500">২৭ শাবান, ১৪৪৬ হিজরি</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-600" />
      </div>
    </div>
  );
};

const QuizSection = () => {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (idx: number) => {
    setSelected(idx);
    if (idx === QUIZ_QUESTIONS[current].correct) {
      setScore(prev => prev + 1);
    }
    
    setTimeout(() => {
      if (current < QUIZ_QUESTIONS.length - 1) {
        setCurrent(prev => prev + 1);
        setSelected(null);
      } else {
        setShowResult(true);
      }
    }, 1000);
  };

  if (showResult) {
    return (
      <div className="p-10 text-center space-y-6">
        <Trophy size={80} className="text-gold mx-auto" />
        <h2 className="text-3xl font-bold">অভিনন্দন!</h2>
        <p className="text-slate-400">আপনার স্কোর: {score} / {QUIZ_QUESTIONS.length}</p>
        <button 
          onClick={() => {
            setCurrent(0);
            setScore(0);
            setSelected(null);
            setShowResult(false);
          }}
          className="px-8 py-3 gold-gradient rounded-2xl text-emerald-950 font-bold shadow-lg"
        >
          আবার খেলুন
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">প্রশ্ন {current + 1} / {QUIZ_QUESTIONS.length}</span>
        <span className="text-xs text-gold font-bold">স্কোর: {score}</span>
      </div>

      <div className="glass p-8 rounded-3xl">
        <h3 className="text-lg font-bold text-center leading-relaxed">
          {QUIZ_QUESTIONS[current].question}
        </h3>
      </div>

      <div className="grid gap-3">
        {QUIZ_QUESTIONS[current].options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => selected === null && handleAnswer(idx)}
            className={cn(
              "p-4 rounded-2xl text-left text-sm transition-all border",
              selected === null ? "glass border-white/5 hover:border-gold/30" :
              idx === QUIZ_QUESTIONS[current].correct ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" :
              selected === idx ? "bg-red-500/20 border-red-500 text-red-400" : "glass opacity-50"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const SettingsSection = ({ isRamadan, setIsRamadan }: { isRamadan: boolean, setIsRamadan: (v: boolean) => void }) => {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gold uppercase tracking-widest px-2">অ্যাপ সেটিংস</h4>
        <div className="glass rounded-3xl divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-slate-400" />
              <span className="text-sm">ডার্ক মোড</span>
            </div>
            <div className="w-10 h-5 bg-gold rounded-full relative">
              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
            </div>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages size={18} className="text-slate-400" />
              <span className="text-sm">ভাষা</span>
            </div>
            <span className="text-xs text-gold font-bold">বাংলা</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles size={18} className={cn(isRamadan ? "text-gold" : "text-slate-400")} />
              <span className="text-sm">রমজান মোড</span>
            </div>
            <button 
              onClick={() => setIsRamadan(!isRamadan)}
              className={cn(
                "w-10 h-5 rounded-full relative transition-colors",
                isRamadan ? "bg-gold" : "bg-white/10"
              )}
            >
              <motion.div 
                animate={{ x: isRamadan ? 20 : 0 }}
                className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" 
              />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs font-bold text-gold uppercase tracking-widest px-2">এআই সেটিংস</h4>
        <div className="glass rounded-3xl p-4 space-y-4">
          <div>
            <p className="text-xs text-slate-400 mb-2">ফন্ট সাইজ</p>
            <div className="flex gap-2">
              {['ছোট', 'মাঝারি', 'বড়'].map(s => (
                <button key={s} className={cn(
                  "flex-1 py-2 rounded-xl text-[10px] font-bold transition-all",
                  s === 'মাঝারি' ? "gold-gradient text-emerald-950" : "bg-white/5 text-slate-400"
                )}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center pt-4 space-y-1">
        <p className="text-[10px] text-slate-600">NoorDeen AI v1.0.0</p>
        <p className="text-[10px] text-slate-600">Crafted with ❤️ for the Ummah</p>
        <p className="text-[10px] text-slate-500">
          Developed by <a href="https://uchihaemdadul.bio.link/" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">Uchiha Emdadul</a>
        </p>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [isRamadan, setIsRamadan] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'chat': return <ChatSection />;
      case 'prayer': return <PrayerSection />;
      case 'quran': return <QuranSection />;
      case 'tools': return <ToolsSection />;
      case 'quiz': return <QuizSection />;
      case 'settings': return <SettingsSection isRamadan={isRamadan} setIsRamadan={setIsRamadan} />;
      default: return <ChatSection />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'chat': return 'নূরদীন এআই';
      case 'prayer': return 'নামাজের সময়';
      case 'quran': return 'আল-কুরআন';
      case 'tools': return 'ইসলামিক টুলস';
      case 'quiz': return 'ইসলামিক কুইজ';
      case 'settings': return 'সেটিংস';
    }
  };

  return (
    <div className={cn(
      "min-h-screen max-w-md mx-auto relative flex flex-col islamic-pattern bg-fixed",
      isRamadan && "ramadan-theme"
    )}>
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gold-gradient rounded-2xl flex items-center justify-center shadow-lg shadow-gold/20">
            <Moon className="text-emerald-950 fill-emerald-950" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold gold-text leading-tight">{getTitle()}</h1>
            <p className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Premium Islamic AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab('quiz')}
            className="p-2 glass rounded-xl text-gold hover:bg-gold/10 transition-all"
          >
            <Trophy size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Background Glows */}
      <div className="fixed top-1/4 -left-20 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="fixed bottom-1/4 -right-20 w-64 h-64 bg-gold/5 blur-[100px] pointer-events-none" />
    </div>
  );
}
