/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
  ShoppingBag, 
  Menu,
  ChevronRight, 
  ArrowLeft, 
  Heart, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  Package,
  ExternalLink,
  User,
  LogOut,
  Edit2,
  Save,
  X,
  Plus,
  Minus,
  Zap,
  MousePointer2,
  MessageCircle,
  Truck,
  Trash2,
  Loader2
} from 'lucide-react';

// --- Type Definitions ---
export interface Product {
  id: string;
  name: string;
  category: 'health' | 'daily' | 'limited' | 'pet' | 'welfare' ;
  price: number;
  originalPrice?: number;
  images: string[];
  description: string;
  features: string[];
  status: 'available' | 'limited' | 'sold_out' | 'hidden';
  variants: string[];
  variantGroups?: { name: string; options: string[]; isRequired?: boolean }[];
  maxLimit?: number;
  countdownTarget?: string;
  isAnnouncement?: boolean;
  isCarousel?: boolean;     // 🌟 新增：是否輪播
  lineKeyword?: string;     // 🌟 新增：LINE 客製化字語
  isComboMode?: boolean;    // 🌟 新增：是否啟用組合包分配模式
  isPinned?: boolean;       // 🌟 新增：是否釘選在首頁最前面
}

// --- Mock Initial Data ---
const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: '日本原裝進口 膠原蛋白粉',
    category: 'health',
    price: 899,
    originalPrice: 1200,
    images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800'],
    description: '嚴選日本專利膠原蛋白，分子小好吸收。每天一匙，養顏美容，青春美麗！',
    features: ['日本專利技術', '無腥味好入口', '添加維生素C促進吸收'],
    status: 'available',
    variants: ['30天份袋裝', '60天份罐裝'],
    maxLimit: 5,
  },
  {
    id: '2',
    name: '北歐風純棉水洗涼被',
    category: 'daily',
    price: 1280,
    originalPrice: 1680,
    images: ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=800'],
    description: '100%純棉材質，水洗工藝處理，柔軟親膚，透氣不悶熱，給您一夜好眠。',
    features: ['100%純棉', '可機洗好清理', '多種莫蘭迪色系可選'],
    status: 'available',
    variants: ['奶茶色', '霧霾藍', '灰綠色'],
  },
  {
    id: '3',
    name: '【限量】韓國頂級人蔘精華飲',
    category: 'limited',
    price: 2980,
    originalPrice: 3980,
    images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=800'],
    description: '韓國原裝進口，高濃度人蔘精華，補充元氣的最佳選擇。限量開團，售完不補！',
    features: ['6年根高麗蔘', '隨身包設計', '無添加防腐劑'],
    status: 'limited',
    variants: ['一盒(30入)', '三盒優惠組'],
    // Set target 48 hours from now for demonstration
    countdownTarget: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), 
  },
  {
    id: '4',
    name: '🎉 粉絲回饋抽獎活動',
    category: 'welfare',
    price: 0,
    images: ['https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&q=80&w=800'],
    description: '感謝大家一直以來的支持！只要在本文下方留言並分享，就有機會獲得神秘好禮一份喔！',
    features: ['活動時間：即日起至月底', '獎品：神秘驚喜盲盒', '名額：抽出5位幸運兒'],
    status: 'available',
    variants: [],
    isAnnouncement: true,
  }
];
// 🌟 規格價格解析器：會自動從「規格名:價格」格式中抓出數字
// 例如輸入「大包裝:500」，它就會回傳 500；若沒寫價格，則回傳商品原價
// 🌟 升級版規格價格解析器：支援多選項加總與小括號格式
// 🌟 升級版規格價格解析器：支援多選項加總，並自動忽略組合包明細與平均單價
const getVariantPrice = (basePrice: number, variantStr: string) => {
  if (!variantStr) return basePrice;
  
  // 🌟 新增規則 1：先把後面的組合包明細 [ ... ] 喀嚓切掉，避免誤抓裡面的「數量:8」
  const cleanStr = variantStr.split('[')[0];

  // 將字串用斜線拆開來算 (保留給一般多重規格使用)
  const parts = cleanStr.split(' / ');
  let totalVariantPrice = 0;
  let hasSpecificPrice = false;

  parts.forEach(part => {
    // 🌟 新增規則 2：只抓取「第一個」符合的數字，所以會抓到 (8700) 並自動忽略後面的 (2175)
    const match = part.match(/[:：]\s*(\d+)/) || part.match(/\((\d+)\)/);
    if (match) {
      totalVariantPrice += parseInt(match[1], 10);
      hasSpecificPrice = true;
    }
  });

  // 如果選項裡面有寫價錢，就回傳加總後的價錢；如果都沒寫，就維持商品原價
  return hasSpecificPrice ? totalVariantPrice : basePrice;
};

// 🌟 VIP 2 號：過期小幫手搬到最上面
  const isExpired = (targetDate?: string) => {
    if (!targetDate) return false;
    let timeValue = new Date(targetDate).getTime();
    if (isNaN(timeValue)) {
      timeValue = new Date(targetDate.replace(/-/g, '/').replace('T', ' ')).getTime();
    }
    return new Date().getTime() > timeValue;
  };

export default function App() {
  // 🌟 VIP 1 號：管理員記憶體搬到最上面
  const [isAdmin, setIsAdmin] = useState(false); 
  const [products, setProducts] = useState<Product[]>([]);
  // 🌟 篩選出需要輪播的商品 (加入過期隱身魔法)
  


  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwIG-ICNYJMdtvbMtUtCIk1ClVF37vkKO0nbeRKJULGn037lDqbnP2AnrzzWhvCgjZq/exec';
        const response = await fetch(scriptUrl);
        const data = await response.json();
        
        // 🌟 隱身術讀取：把雲端裡的隱藏標記轉回對應的開關
        const processedData = data.map((p: any) => ({
          ...p,
          isComboMode: p.features?.includes('__COMBO__'),
          isPinned: p.features?.includes('__PINNED__'),
          // 過濾掉所有隱藏標記，讓前台畫面只顯示真正的特色
          features: p.features?.filter((f: string) => f !== '__COMBO__' && f !== '__PINNED__') || []
        })); 
        
        setProducts(processedData);

        // 🌟 新增：偷看網址列有沒有指定的商品 ID
        const urlParams = new URLSearchParams(window.location.search);
        const productIdFromUrl = urlParams.get('id');
        if (productIdFromUrl) {
          const targetProduct = processedData.find((p: Product) => String(p.id) === productIdFromUrl);
          if (targetProduct) {
            setSelectedProduct(targetProduct);
            setSelectedVariant(targetProduct.variants[0] || ''); // 幫客人自動選好第一個規格
          }
        }
        
      } catch (error) {
        console.error("讀取商品資料失敗:", error);
        setProducts(INITIAL_PRODUCTS); 
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<'all' | 'health' | 'daily' | 'limited' | 'welfare' | 'pet'>('all');
  // 🌟 新增：用來記住搜尋關鍵字的記憶體
  const [sortBy, setSortBy] = useState('default'); // 🌟 新增：商品排序記憶體
  const [searchQuery, setSearchQuery] = useState('');
  
  // Countdown State
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showToast, setShowToast] = useState(false);

  

  const activeCountdownProduct = useMemo(() => {
    const limitedProducts = products
      .filter(p => p.category === 'limited' && p.countdownTarget)
      .sort((a, b) => new Date(a.countdownTarget!).getTime() - new Date(b.countdownTarget!).getTime());
    
    const now = new Date().getTime();
    return limitedProducts.find(p => new Date(p.countdownTarget!).getTime() > now);
  }, [products]);

  // 🌟 修改後的計時器邏輯：只針對目前選中的商品倒數
  useEffect(() => {
    // 把原本的 activeCountdownProduct 替換成 selectedProduct
    if (!selectedProduct?.countdownTarget) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(selectedProduct.countdownTarget!).getTime() - now;
      
      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)), // 🌟 告訴程式怎麼算天數
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedProduct]); // 🌟 這裡也改成 selectedProduct

  const scrollToLimited = () => {
    setActiveCategory('limited');
    const element = document.getElementById('product-grid');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Product | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Cart & Favorites State
  const [cart, setCart] = useState<{ product: Product; quantity: number; variant: string }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Selection State for Detail View
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  // 🌟 新增：用來記錄組合包裡每一行的獨立選擇 (例如：[{id: 1, 選項: {顏色: 紫色, 尺寸: L}, 數量: 1}, ...])
  const [comboSelections, setComboSelections] = useState<Array<{ id: number, variants: Record<string, string>, quantity: number }>>([
    { id: Date.now(), variants: {}, quantity: 1 } // 預設先給一個空白的第一行
  ]);


  useEffect(() => {
    const savedAdmin = localStorage.getItem('isAdmin');
    if (savedAdmin === 'true') setIsAdmin(true);
    
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const toggleFavorite = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newFavorites = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
  };

  const addToCart = (product: Product, variant: string, quantity: number) => {
    if (!variant && product.variants.length > 0) {
      alert('請選擇規格');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id && item.variant === variant);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        if (product.maxLimit && newQuantity > product.maxLimit) {
          alert(`抱歉，此商品每人限購 ${product.maxLimit} 件`);
          return prev;
        }
        return prev.map(item => 
          (item.product.id === product.id && item.variant === variant)
            ? { ...item, quantity: newQuantity } 
            : item
        );
      }
      return [...prev, { product, quantity, variant }];
    });
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 1500);
  };

  const removeFromCart = (productId: string, variant: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.variant === variant)));
  };

  // 這是你熱騰騰拿到的 Google 表格專屬鑰匙
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwIG-ICNYJMdtvbMtUtCIk1ClVF37vkKO0nbeRKJULGn037lDqbnP2AnrzzWhvCgjZq/exec";

  const handleCheckout = () => {
    if (cart.length === 0) return;

    // 🌟 新增功能：悄悄去 Google 表格幫購物車裡的每個商品增加銷量
    cart.forEach(item => {
      fetch(GAS_URL, {
        method: 'POST',
        // 為了避免瀏覽器擋信，我們用純文字格式包裝 JSON
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
        body: JSON.stringify({
          action: 'buy',
          id: item.product.id,
          quantity: item.quantity
        })
      }).catch(err => console.error("銷量更新失敗:", err)); // 就算失敗也不會影響顧客跳轉 LINE
    });
    
    const lineId = "@linlinmom2828";
    let message = "🌟 林林媽開團小宇宙 - 訂單預約 🌟\n\n";
    message += "您好！我想訂購以下商品：\n";
    message += "--------------------------\n";
    
    cart.forEach((item, index) => {
      message += `${index + 1}. ${item.product.name}\n`;
      
      // 🌟 自動判斷：如果是組合包格式，就拆分成「方案」與「明細」
      if (item.variant) {
        if (item.variant.includes(' [')) {
          const parts = item.variant.split(' [ ');
          message += `   方案：${parts[0]}\n`;
          message += `   明細：[ ${parts[1]}\n`;
        } else {
          message += `   規格：${item.variant}\n`;
        }
      }
      
      message += `   數量：${item.quantity}\n`;
      // 🌟 修正：確保小計使用 getVariantPrice 算出來的正確方案價格
      message += `   小計：$${getVariantPrice(item.product.price, item.variant) * item.quantity}\n\n`;
    });
    
    // 🌟 修正：確保總計金額也使用正確方案價格加總
    const total = cart.reduce((sum, item) => sum + getVariantPrice(item.product.price, item.variant) * item.quantity, 0);
    message += "--------------------------\n";
    message += `💰 總計金額：$${total}\n\n`;
    message += "請幫我確認訂單，謝謝！";

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://line.me/R/oaMessage/${lineId}/?${encodedMessage}`, '_blank');

    // 🌟 新增：跳轉 LINE 之後，清空購物車並關閉購物籃畫面
    setCart([]);
    setIsCartOpen(false);
  };

  // 🌟 處理多維度規格的魔法小幫手：負責檢查有沒有漏選，並把選項組合起來
  const getFinalVariant = (product: Product) => {
    // 🌟 核心 1：專門處理「組合包模式」的檢查邏輯
    if (product.isComboMode) {
      if (!selectedVariant) {
        alert('請先選擇上方購買方案');
        return null;
      }
      // 檢查組合包的每一行，看看有沒有漏選
      for (let i = 0; i < comboSelections.length; i++) {
        const row = comboSelections[i];
        const missing = product.variantGroups?.filter(g => g.isRequired !== false && !row.variants[g.name]) || [];
        if (missing.length > 0) {
          alert(`組合包第 ${i + 1} 組請選擇：${missing.map(g => g.name).join('、')}`);
          return null; // 擋下來
        }
      }
      // 如果都沒問題，就把方案和細節串成漂亮的字串，例如："4件(566) [ 膚色/L x2, 紫色/XL x2 ]"
      const details = comboSelections.map(row => {
        const vStr = product.variantGroups?.map(g => row.variants[g.name]).filter(Boolean).join('/');
        return `${vStr} 數量:${row.quantity}`;
      }).join(' , ');
      
      return `${selectedVariant} [ ${details} ]`;
    }

    // 🌟 核心 2：原本處理「一般商品」的檢查邏輯
    if (product.variantGroups && product.variantGroups.length > 0) {
      const missing = product.variantGroups.filter(g => g.isRequired !== false && !selectedVariants[g.name]);
      if (missing.length > 0) {
        alert(`請選擇：${missing.map(g => g.name).join('、')}`);
        return null; 
      }
      return product.variantGroups.map(g => selectedVariants[g.name]).filter(Boolean).join(' / ');
    }
    
    if (!selectedVariant && product.variants.length > 0) {
      alert('請選擇規格');
      return null;
    }
    return selectedVariant || '';
  };
  // 🌟 升級版：加入購物車
  const handleAddToCart = (product: Product) => {
    const finalVariant = getFinalVariant(product);
    if (finalVariant === null) return; // 沒選完就擋下來
    addToCart(product, finalVariant, selectedQuantity);
  };

  // 🌟 升級版：立即下單
  const handleOrderNow = (product: Product) => {
    const finalVariant = getFinalVariant(product);
    if (finalVariant === null) return;

    // 單件商品結帳連動
    fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'buy',
        id: product.id,
        quantity: selectedQuantity
      })
    }).catch(err => console.error("銷量更新失敗:", err));
    
    let message = `🌟 林林媽開團小宇宙 - 立即詢問 🌟\n\n`;
    message += `我想詢問商品：${product.name}\n`;
    
    // 🌟 自動判斷：拆分方案與明細
    if (finalVariant) {
      if (finalVariant.includes(' [')) {
        const parts = finalVariant.split(' [ ');
        message += `方案：${parts[0]}\n`;
        message += `明細：[ ${parts[1]}\n`;
      } else {
        message += `規格：${finalVariant}\n`;
      }
    }
    
    message += `數量：${selectedQuantity}\n`;
    message += `\n請幫我確認是否有現貨，謝謝！`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://line.me/R/oaMessage/@linlinmom2828/?${encodedMessage}`, '_blank');
  };
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === '0984481130' && loginForm.password === 'dadalala888') {
      setIsAdmin(true);
      setIsLoginModalOpen(false);
      localStorage.setItem('isAdmin', 'true');
      setLoginForm({ username: '', password: '' });
    } else {
      alert('登入失敗：帳號或密碼錯誤');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('isAdmin');
    setIsEditing(false);
    setIsConfirmingDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!editForm) return;
    
    const scriptUrl = 'https://script.google.com/macros/s/AKfycbwIG-ICNYJMdtvbMtUtCIk1ClVF37vkKO0nbeRKJULGn037lDqbnP2AnrzzWhvCgjZq/exec';
    const isNew = !editForm.id;
    const targetProduct = isNew ? { ...editForm, id: Date.now().toString() } : editForm;

    // 🌟 隱身術儲存：處理所有的隱藏標記
    // 先把特徵清單洗乾淨（把舊的標記都濾掉）
    let finalFeatures = (targetProduct.features || []).filter(f => f !== '__COMBO__' && f !== '__PINNED__');
    
    // 如果有打勾，就把隱藏標記塞進去
    if (targetProduct.isComboMode) finalFeatures.push('__COMBO__');
    if (targetProduct.isPinned) finalFeatures.push('__PINNED__');

    const productToSave = {
      ...targetProduct,
      features: finalFeatures
    };

    try {
      // 畫面顯示用乾淨的 targetProduct (不含隱藏標記，才不會顯示在畫面上)
      if (isNew) {
        setProducts(prev => [targetProduct, ...prev]);
      } else {
        setProducts(prev => prev.map(p => p.id === targetProduct.id ? targetProduct : p));
      }
      setSelectedProduct(targetProduct);
      setIsEditing(false);
      setIsConfirmingDelete(false);

      // 傳給 Google 表格用帶有隱藏標記的 productToSave
      await fetch(scriptUrl, {
        method: 'POST',
        body: JSON.stringify(productToSave),
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        }
      });
      
      alert('儲存成功並已同步至雲端倉庫！');
    } catch (error) {
      console.error("儲存到雲端失敗", error);
      alert('同步至雲端失敗，請檢查網路連線。');
    }
  };

  const carouselItems = useMemo(() => {
    return products.filter(p => p.isCarousel && (isAdmin || !isExpired(p.countdownTarget)));
  }, [products, isAdmin]); // 🌟 記得這裡也要加上 isAdmin，大腦才會在登入登出時切換

  // 👇 🌟 剛剛剪下的計時器請貼在這裡 👇
  // 🌟 控制輪播目前的索引 (第幾張圖)
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false); // false 代表正常播放

  // 🌟 設定每 4 秒自動換下一張
  useEffect(() => {
    if (carouselItems.length <= 1 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    }, 3000); 
    return () => clearInterval(timer);
  }, [carouselItems.length, isPaused]);
  // 👆 貼上到這裡結束 👆

  const filteredProducts = useMemo(() => {
    // 1. 先抓出要顯示的商品分類
    let result = [];
    if (activeCategory === 'all') {
      result = products.filter(p => !p.isAnnouncement);
    } else {
      result = products.filter(p => p.category === activeCategory);
    }

    // 🌟 新增：文字搜尋過濾 (如果搜尋框有打字，就篩選名稱、描述或特色裡有包含該文字的商品)
    if (searchQuery.trim() !== '') {
      const keyword = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(keyword) || 
        p.description.toLowerCase().includes(keyword) ||
        p.features.some(f => f.toLowerCase().includes(keyword))
      );
    }

    // 🌟 過期與下架隱身魔法：管理員全保留，客人只保留「未過期」且「非下架 (hidden)」的商品
result = result.filter(p => isAdmin || (!isExpired(p.countdownTarget) && p.status !== 'hidden'));
    
    // 2. 🌟 釘選與自訂排序魔法
    let sortedResult = result.sort((a, b) => {
      // 永遠讓釘選的商品排最前面
      if (a.isPinned && !b.isPinned) return -1; 
      if (!a.isPinned && b.isPinned) return 1;  
      return 0; 
    });

    // 依照粉絲選擇的排序方式洗牌
    if (sortBy === 'price_asc') {
      sortedResult.sort((a, b) => (a.isPinned === b.isPinned) ? a.price - b.price : 0);
    } else if (sortBy === 'price_desc') {
      sortedResult.sort((a, b) => (a.isPinned === b.isPinned) ? b.price - a.price : 0);
    } else if (sortBy === 'newest') {
      // 因為我們的新商品 ID 都是用時間戳記 Date.now() 產生的，數字越大代表越新
      sortedResult.sort((a, b) => (a.isPinned === b.isPinned) ? Number(b.id) - Number(a.id) : 0);
    }

    return sortedResult;
  }, [activeCategory, products, searchQuery, isAdmin, sortBy]); // 🌟 記得最後面加上 sortBy！

  const categories = [
    { id: 'all', name: '全部商品', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'health', name: '保健食品', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'daily', name: '生活百貨', icon: <Package className="w-4 h-4" /> },
    { id: 'limited', name: '限時優惠', icon: <Clock className="w-4 h-4" /> },
    { id: 'pet', name: '寵物專區', icon: <Heart className="w-4 h-4" /> },
    { id: 'welfare', name: '林林媽粉絲福利區', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-orange-50/30 font-sans selection:bg-rose-500/30 text-stone-800">
      {/* Header */}
     {/* 🌟 繽紛手繪風：頂部招牌 */}
      <header className="sticky top-0 z-40 bg-[#FFFBEB] border-b-4 border-stone-900">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          
          {/* Logo 區塊：傾斜的圖示 + 粗體字 */}
          <button 
            onClick={() => {
              setSelectedProduct(null); 
              setSearchQuery('');       
              setActiveCategory('all'); 
              window.history.pushState(null, '', window.location.pathname); 
              window.scrollTo({ top: 0, behavior: 'smooth' }); 
            }}
            className="flex items-center gap-3 hover:-translate-y-1 transition-transform text-left group"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#FF90E8] border-2 border-stone-900 shadow-[3px_3px_0px_0px_#1c1917] flex items-center justify-center text-stone-900 transform -rotate-6 group-hover:rotate-0 transition-transform">
              <Sparkles className="w-7 h-7 fill-current" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">
              林林媽開團小宇宙
            </h1>
          </button>

          {/* 右側按鈕群組 */}
          <div className="flex items-center gap-4">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-stone-900 bg-[#FFD700] border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1c1917] px-2 py-1 rounded-md">管理員</span>
                <button onClick={handleLogout} className="p-2 rounded-full border-2 border-transparent hover:border-stone-900 hover:bg-[#FFD700] transition-colors text-stone-900">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setIsLoginModalOpen(true)} className="p-2 rounded-full border-2 border-transparent hover:border-stone-900 hover:bg-[#FFD700] transition-colors text-stone-900">
                <User className="w-6 h-6" />
              </button>
            )}
            
            {/* 🌟 手繪風：立體購物車按鈕 */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-12 h-12 rounded-full bg-[#FFD700] border-2 border-stone-900 shadow-[3px_3px_0px_0px_#1c1917] flex items-center justify-center hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#1c1917] transition-all relative"
            >
              <ShoppingBag className="w-6 h-6 text-stone-900" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-[#FF5757] text-white text-xs font-black rounded-full border-2 border-stone-900 flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
      {/* 🌟 新增：搜尋框區塊 (只有在首頁列表時才顯示) */}
        {!selectedProduct && !isLoading && (
          <div className="mb-8 relative">
            <input
              type="text"
              placeholder="🔍 搜尋你想找的好物名稱或關鍵字..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-4 pl-6 rounded-2xl border-2 border-rose-100 focus:outline-none focus:border-rose-400 bg-white shadow-sm text-stone-700 font-medium transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-rose-500 font-bold p-2"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* 🌟 新增功能：載入中動畫 */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
            <p className="text-stone-700 font-bold text-lg animate-pulse">林林媽好物載入中...</p>
          </div>
        ) : (
          <AnimatePresence>
            {!selectedProduct ? (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
              
      
{/* 🌟 精緻小巧輪播區塊 */}
<AnimatePresence>
  {/* 🌟 升級：只有當「有輪播商品」而且「沒有在搜尋」的時候，才顯示輪播圖 */}
  {carouselItems.length > 0 && !searchQuery && (
    <div className="mb-8 w-full aspect-video bg-stone-900 rounded-3xl overflow-hidden relative shadow-xl shadow-rose-200/50">
      <AnimatePresence>
        <motion.div
          key={currentSlide}
          // 🪄 新增滑動魔法
  drag="x" // 1. 開啟左右拖拽
  dragConstraints={{ left: 0, right: 0 }} // 2. 拖完自動彈回中心
  onDragStart={() => setIsPaused(true)} // 3. 開始滑動時暫停計時
  
  onDragEnd={(event, info) => {
    setIsPaused(false); // 停止滑動後恢復計時
    
    // 4. 判斷滑動距離：往左滑（負數）看下一張；往右滑（正數）看上一張
    if (info.offset.x < -50) {
      // 下一張：目前的索引 + 1，如果到底了就回到 0
      setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
    } else if (info.offset.x > 50) {
      // 上一張：目前的索引 - 1，如果是 0 就跳到最後一張
      setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
    }
  }}
          onPointerDown={() => setIsPaused(true)}  // 手指按下去時：暫停開關打開
  onPointerUp={() => setIsPaused(false)}    // 手指拿開時：暫停開關關閉
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 cursor-pointer"
          onClick={() => {
            // 🌟 點擊後跳轉到 LINE 並帶入客製化關鍵字
            const item = carouselItems[currentSlide];
            const message = item.lineKeyword || `我想詢問商品：${item.name}`;
            window.open(`https://line.me/R/oaMessage/@linlinmom2828/?${encodeURIComponent(message)}`, '_blank');
          }}
        >
          <img
            src={carouselItems[currentSlide].images[0]}
            className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
            alt="Carousel Item"
          />
          {/* 漸層裝飾文字 */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-stone-900/80 to-transparent">
            <h3 className="text-white text-lg md:text-xl font-bold">
              {carouselItems[currentSlide].name}
            </h3>
            <p className="text-white/60 text-sm">點擊立即私訊詢問 ✨</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 輪播指示點 (Dots) */}
      <div className="absolute bottom-4 right-6 flex gap-2">
        {carouselItems.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              idx === currentSlide ? 'bg-rose-500 w-6' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  )}
</AnimatePresence>
                
                {/* Hero Section (搜尋時自動隱藏) */}
                {!searchQuery && (
                  <section className="mb-12 text-center mt-6">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 text-stone-800">
                      美好生活，從這裡開始
                    </h2>
                    <p className="text-stone-700/70 max-w-lg mx-auto">
                      林林媽為您嚴選高品質的日常所需，從健康到居家，每一件都是我們的真心推薦。
                    </p>
                  </section>
                )}

                {/* Category Tabs */}
                {/* 🌟 修改版：可愛質感「膠囊」下拉式分類選單 */}
                {/* 🌟 繽紛手繪風：吸頂橫向滑動分類標籤 */}
        {!selectedProduct && !isLoading && (
          <div className="sticky top-20 z-30 bg-[#FFFBEB] pt-4 pb-4 border-b-2 border-stone-900/10 mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`snap-start flex-shrink-0 px-5 py-2.5 rounded-xl border-2 border-stone-900 font-bold text-sm sm:text-base flex items-center gap-2 transition-all duration-200 ${
                    activeCategory === cat.id
                      ? 'bg-[#FF90E8] text-stone-900 shadow-[3px_3px_0px_0px_#1c1917] -translate-y-1' // 🌟 選中時：亮粉色 + 浮起立體陰影
                      : 'bg-white text-stone-900 hover:bg-[#FFD700] hover:shadow-[3px_3px_0px_0px_#1c1917] hover:-translate-y-1' // 🌟 沒選中時：白底，滑過變黃色
                  }`}
                >
                  <span className={activeCategory === cat.id ? 'text-stone-900' : 'text-stone-500'}>
                    {cat.icon}
                  </span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

{/* 🌟 繽紛手繪風：商品排序下拉選單 */}
                {!selectedProduct && !isLoading && (
                  <div className="flex justify-end mb-6 px-4 sm:px-0">
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-[#E0E7FF] border-2 border-stone-900 text-stone-900 font-bold py-2.5 pl-4 pr-10 rounded-xl shadow-[3px_3px_0px_0px_#1c1917] focus:outline-none focus:translate-y-[1px] focus:shadow-[2px_2px_0px_0px_#1c1917] cursor-pointer transition-all text-sm sm:text-base"
                      >
                        <option value="default">✨ 預設排序</option>
                        <option value="newest">🆕 最新上架</option>
                        <option value="price_asc">💰 價格：低到高</option>
                        <option value="price_desc">💎 價格：高到低</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-stone-900">
                        {/* 手繪感小箭頭 */}
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* Product Grid */}
                {/* 🌟 繽紛手繪風：立體積木商品卡片 Grid */}
                <div id="product-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-24 px-4 sm:px-0">
                  {filteredProducts.map((product) => (
                    <motion.div
                      layoutId={`product-${product.id}`}
                      key={product.id}
                      onClick={() => {
                        setSelectedProduct(product);
                        setActiveImageIdx(0);
                        setSelectedVariant(product.variants[0] || '');
                        setSelectedQuantity(1);
                        // 更新網址列的小尾巴
                        const previewImage = Array.isArray(product.images) ? product.images[0] : product.images;
                        const newUrl = `?id=${product.id}&img=${encodeURIComponent(previewImage || '')}`;
                        window.history.pushState(null, '', newUrl);
                      }}
                      className={`group cursor-pointer bg-white rounded-2xl overflow-hidden border-[3px] border-stone-900 shadow-[5px_5px_0px_0px_#1c1917] hover:-translate-y-1 hover:shadow-[7px_7px_0px_0px_#1c1917] transition-all duration-200 flex flex-col ${
                        product.category === 'welfare' ? 'col-span-2 lg:col-span-4' : ''
                      } ${isExpired(product.countdownTarget) ? 'opacity-50 grayscale-[80%]' : ''}`}
                    >
                      {/* 圖片區塊：底邊加粗黑線分隔 */}
                      <div className={`relative w-full overflow-hidden bg-white border-b-[3px] border-stone-900 ${product.category === 'welfare' ? 'aspect-video' : 'aspect-square'}`}>
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                        />
                        {/* 標籤貼紙：鮮豔跳色 + 粗黑邊框 */}
                        {product.status === 'limited' && (
                          <div className="absolute top-3 left-3 bg-[#FF5757] text-white text-[10px] sm:text-xs font-black px-2.5 py-1.5 rounded-lg border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1c1917] tracking-widest flex items-center gap-1">
                            <Clock className="w-3 h-3" /> 限時優惠
                          </div>
                        )}
                        {/* 老闆娘專屬隱藏標籤 */}
                        {product.status === 'hidden' && (
                          <div className="absolute top-3 right-3 bg-stone-800 text-[#FFD700] text-[10px] sm:text-xs font-black px-2.5 py-1.5 rounded-lg border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1c1917] tracking-widest flex items-center gap-1 z-10">
                            👻 暫時下架
                          </div>
                        )}
                        {product.category === 'welfare' && (
                          <div className="absolute top-3 left-3 bg-[#FF90E8] text-stone-900 text-[10px] sm:text-xs font-black px-2.5 py-1.5 rounded-lg border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1c1917] tracking-widest flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> 粉絲福利
                          </div>
                        )}
                      </div>

                      {/* 資訊區塊 */}
                      <div className="p-4 sm:p-5 flex flex-col flex-1 bg-[#FFFBEB]">
                        <div className="flex justify-between items-start mb-2">
                          {/* 分類小標 */}
                          <span className="text-[10px] sm:text-xs font-black text-[#FF5757] uppercase tracking-widest bg-white px-2 py-1 rounded-md border-2 border-stone-900 shadow-[2px_2px_0px_0px_#1c1917]">
                            {product.category === 'health' ? '保健食品' : product.category === 'daily' ? '生活百貨' : product.category === 'limited' ? '限時優惠' : product.category === 'pet' ? '寵物專區' : '福利區'}
                          </span>
                          {/* 收藏愛心：改成立體小方塊 */}
                          <button 
                            onClick={(e) => toggleFavorite(product.id, e)}
                            className={`p-1.5 rounded-lg border-2 border-stone-900 transition-colors shadow-[2px_2px_0px_0px_#1c1917] active:translate-y-[2px] active:shadow-none ${favorites.includes(product.id) ? 'bg-[#FF90E8]' : 'bg-white hover:bg-[#FFD700]'}`}
                          >
                            <Heart className={`w-4 h-4 ${favorites.includes(product.id) ? 'text-stone-900 fill-stone-900' : 'text-stone-900'}`} />
                          </button>
                        </div>
                        
                        <h3 className="text-base sm:text-lg font-black text-stone-900 mb-2 line-clamp-2 leading-tight">
                          {product.name}
                        </h3>
                        
                        {/* 價格與偽按鈕引導區塊 */}
                        <div className="mt-auto pt-3">
                          {product.category !== 'welfare' && (
                            <div className="flex items-end gap-2 mb-3">
                              <span className="text-xl sm:text-2xl font-black text-stone-900">
                                ${product.price}
                              </span>
                              {product.originalPrice && (
                                <span className="text-xs sm:text-sm text-stone-500 font-bold line-through mb-1">
                                  ${product.originalPrice}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* 🌟 偽裝成按鈕的視覺引導：萊姆綠 -> 亮黃色 */}
                          <div className="w-full bg-[#A3E635] border-2 border-stone-900 text-stone-900 text-sm sm:text-base font-black py-2.5 rounded-xl text-center shadow-[3px_3px_0px_0px_#1c1917] group-hover:bg-[#FFD700] transition-colors mt-2">
                            查看詳情 🚀
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                
                {/* Simple Three Steps Section */}
                <section className="py-24 border-t border-rose-200">
                  <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-stone-900 mb-4">簡單三步驟，美好送到家</h2>
                    <div className="w-24 h-1 bg-rose-200 mx-auto rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { 
                        step: "1. 線上選購", 
                        desc: "瀏覽目錄，選擇您心儀的商品。", 
                        icon: MousePointer2,
                        color: "bg-rose-100 text-rose-500"
                      },
                      { 
                        step: "2. 私訊下單", 
                        desc: "點擊按鈕，直接透過 Line 告知我們。", 
                        icon: MessageCircle,
                        color: "bg-rose-100 text-rose-500"
                      },
                      { 
                        step: "3. 快速出貨", 
                        desc: "確認訂單後，我們將火速為您寄送。", 
                        icon: Truck,
                        color: "bg-rose-100 text-rose-500"
                      }
                    ].map((item, idx) => (
                      <motion.div 
                        key={idx}
                        whileHover={{ y: -10 }}
                        className="bg-white p-10 rounded-[40px] shadow-sm hover:shadow-xl transition-all text-center border border-rose-200/20"
                      >
                        <div className={`w-20 h-20 rounded-full ${item.color} flex items-center justify-center mx-auto mb-8`}>
                          <item.icon className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-900 mb-4">{item.step}</h3>
                        <p className="text-stone-700/60 leading-relaxed">{item.desc}</p>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </motion.div>
            ) : (
              <motion.div
                key="detail"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-rose-200/30"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Product Image */}
                  <div className="md:w-1/2 relative flex flex-col">
                    {isEditing ? (
                      <div className="w-full h-full bg-rose-100 flex flex-col p-8 overflow-y-auto max-h-[600px]">
                        <div className="flex justify-between items-center mb-4">
  <p className="text-stone-700 font-bold">編輯圖片網址</p>
  <span className="text-xs text-stone-700/60">已新增 {editForm?.images.length || 0} 張</span>
</div>
                        <div className="space-y-3">
                          {editForm?.images.map((img, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input 
                                type="text"
                                value={img}
                                onChange={(e) => {
                                  const newImages = [...(editForm?.images || [])];
                                  newImages[idx] = e.target.value;
                                  setEditForm(prev => prev ? { ...prev, images: newImages } : null);
                                }}
                                className="flex-1 p-2 rounded-lg border border-rose-200 text-sm"
                                placeholder="https://..."
                              />
                              <button 
                                onClick={() => {
                                  const newImages = editForm?.images.filter((_, i) => i !== idx);
                                  setEditForm(prev => prev ? { ...prev, images: newImages } : null);
                                }}
                                className="p-2 text-rose-500 hover:bg-rose-200 rounded-lg"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {/* 🌟 拿掉限制，讓新增按鈕永遠顯示 */}
<button 
  onClick={() => setEditForm(prev => prev ? { ...prev, images: [...prev.images, ''] } : null)}
  className="w-full py-2 border-2 border-dashed border-rose-200 rounded-xl text-stone-700 hover:bg-rose-200/30 flex items-center justify-center gap-2 text-sm font-bold"
>
  <Plus className="w-4 h-4" /> 新增圖片
</button>
                        </div>
                        <div className="mt-6 grid grid-cols-5 gap-2">
                          {editForm?.images.filter(url => url).map((url, idx) => (
                            <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-rose-200">
                              <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col h-full">
                       <div className="relative w-full overflow-hidden touch-pan-y bg-white">
    <AnimatePresence>
      <motion.img
        key={selectedProduct.images[activeImageIdx]}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        src={selectedProduct.images[activeImageIdx]}
        alt={selectedProduct.name}
        className="w-full h-auto block"
        referrerPolicy="no-referrer"
                              drag="x"
                              dragConstraints={{ left: 0, right: 0 }}
                              onDragEnd={(_, info) => {
                                if (info.offset.x > 100) {
                                  setActiveImageIdx(prev => (prev > 0 ? prev - 1 : selectedProduct.images.length - 1));
                                } else if (info.offset.x < -100) {
                                  setActiveImageIdx(prev => (prev < selectedProduct.images.length - 1 ? prev + 1 : 0));
                                }
                              }}
                            />
                          </AnimatePresence>
                          
                          {selectedProduct.images.length > 1 && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {selectedProduct.images.map((_, idx) => (
                                <div 
                                  key={idx}
                                  className={`w-1.5 h-1.5 rounded-full transition-all shadow-sm ${
                                    activeImageIdx === idx ? 'bg-rose-500 w-4' : 'bg-stone-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {selectedProduct.images.length > 1 && (
                          <div className="p-4 bg-rose-50 flex gap-2 overflow-x-auto scrollbar-hide">
                            {selectedProduct.images.map((img, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setActiveImageIdx(idx)}
                                className={`w-16 h-16 flex-shrink-0 bg-white rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                  activeImageIdx === idx ? 'border-rose-500 shadow-lg' : 'border-rose-200/30 hover:border-rose-500/50'
                                }`}
                              >
                                <img src={img} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setIsEditing(false);
                        setIsConfirmingDelete(false);
                        // 🌟 變換網址魔法：把網址後面的尾巴擦掉，變回乾淨的首頁
                        window.history.pushState(null, '', window.location.pathname);
                      }}
                      className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-stone-900 hover:bg-rose-500 hover:text-white transition-all duration-300"
                    >
                      <ArrowLeft className="w-6 h-6" />
                    </button>
                    
                    {isAdmin && !isEditing && (
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setEditForm(selectedProduct);
                        }}
                        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-stone-700 text-white shadow-lg flex items-center justify-center hover:bg-stone-900 transition-all duration-300"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="md:w-1/2 p-8 md:p-12 flex flex-col">
                    {isEditing ? (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-2xl font-bold text-stone-900">編輯商品資訊</h3>
                          <button onClick={() => { setIsEditing(false); setIsConfirmingDelete(false); }} className="p-2 text-stone-700 hover:text-rose-500">
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">商品分類</label>
                          <select 
                            value={editForm?.category || 'health'}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, category: e.target.value as any } : null)}
                            className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500 bg-white"
                          >
                            <option value="health">保健食品</option>
                            <option value="daily">生活百貨</option>
                            <option value="limited">限時優惠</option>
                            <option value="pet">寵物專區</option>
                            <option value="welfare">林林媽粉絲福利區</option>
                          </select>

                          {/* 🌟 新增：商品狀態選單 */}
                          <div className="mt-4">
                            <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">商品狀態</label>
                            <select 
                              value={editForm?.status || 'available'}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                              className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500 bg-white font-bold text-stone-700"
                            >
                              <option value="available">🟢 正常上架</option>
                              <option value="limited">🟡 限量搶購 (顯示限時標籤)</option>
                              <option value="sold_out">🔴 已售完 (按鈕會變灰)</option>
                              <option value="hidden">👻 暫時下架 (前台完全隱藏)</option>
                            </select>
                          </div>
                          {/* 🌟 新增：組合包模式開關 */}
                          <label className="flex items-center gap-3 p-4 mt-4 bg-orange-50 rounded-2xl border border-orange-200 font-bold cursor-pointer text-stone-900 shadow-sm">
                            <input 
                              type="checkbox" 
                              checked={editForm?.isComboMode || false} 
                              onChange={(e) => setEditForm(p => p ? {...p, isComboMode: e.target.checked} : null)} 
                              className="w-5 h-5 accent-rose-500"
                            />
                            📦 啟用「組合包分配」模式 (適合內褲、襪子等多件任選)
                          </label>
                          {/* 🌟 新增：首頁釘選開關 */}
                          <label className="flex items-center gap-3 p-4 mt-4 bg-rose-50 rounded-2xl border border-rose-200 font-bold cursor-pointer text-stone-900 shadow-sm">
                            <input 
                              type="checkbox" 
                              checked={editForm?.isPinned || false} 
                              onChange={(e) => setEditForm(p => p ? {...p, isPinned: e.target.checked} : null)} 
                              className="w-5 h-5 accent-rose-500"
                            />
                            📌 釘選此商品 (排在首頁最前面)
                          </label>
                          {/* 只有當分類是「林林媽粉絲福利區 (welfare)」時，才顯示下方選項 */}
                        {editForm?.category === 'welfare' && (
                          <div className="flex flex-col gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-200 mt-4">
                            <label className="flex items-center gap-3 font-bold cursor-pointer text-stone-900">
                              <input 
                                type="checkbox" 
                                checked={editForm?.isAnnouncement || false} 
                                onChange={(e) => setEditForm(p => p ? {...p, isAnnouncement: e.target.checked} : null)} 
                                className="w-5 h-5 accent-rose-500"
                              />
                              設定為純公告 (不顯示價格與規格)
                            </label>
                            <label className="flex items-center gap-3 font-bold cursor-pointer text-rose-600">
                              <input 
                                type="checkbox" 
                                checked={editForm?.isCarousel || false} 
                                onChange={(e) => setEditForm(p => p ? {...p, isCarousel: e.target.checked} : null)} 
                                className="w-5 h-5 accent-rose-500"
                              />
                              <Sparkles className="w-4 h-4 inline" /> 設為首頁動態輪播
                            </label>
                          </div>
                        )}
                        </div>
                        
                        <div>
                          <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">商品名稱</label>
                          <input 
                            type="text"
                            value={editForm?.name || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                          />
                        </div>

                        {(!editForm?.isAnnouncement || editForm?.category !== 'welfare') && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">林林媽粉絲最低優惠價</label>
                              <input 
                                type="number"
                                value={editForm?.price || 0}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, price: parseInt(e.target.value) } : null)}
                                className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">原價 (可選)</label>
                              <input 
                                type="number"
                                value={editForm?.originalPrice || ''}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, originalPrice: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                                className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">商品描述</label>
                          <textarea 
                            value={editForm?.description || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, description: e.target.value } : null)}
                            className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500 h-32"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">商品特色</label>
                          <div className="space-y-2">
                            {editForm?.features.map((feature, i) => (
                              <div key={i} className="flex gap-2">
                                <input 
                                  type="text"
                                  value={feature}
                                  onChange={(e) => {
                                    const newFeatures = [...(editForm?.features || [])];
                                    newFeatures[i] = e.target.value;
                                    setEditForm(prev => prev ? { ...prev, features: newFeatures } : null);
                                  }}
                                  className="flex-1 p-2 rounded-lg border border-rose-200"
                                />
                                <button 
                                  onClick={() => {
                                    const newFeatures = editForm?.features.filter((_, idx) => idx !== i);
                                    setEditForm(prev => prev ? { ...prev, features: newFeatures || [] } : null);
                                  }}
                                  className="p-2 text-rose-500 hover:bg-rose-200 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                            <button 
                              onClick={() => setEditForm(prev => prev ? { ...prev, features: [...prev.features, ''] } : null)}
                              className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-rose-500"
                            >
                              <Plus className="w-4 h-4" /> 新增特色
                            </button>
                          </div>
                        </div>

                        {(!editForm?.isAnnouncement || editForm?.category !== 'welfare') && (
                          <>
                            {/* 🌟 升級版：多維度商品規格設定 */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest">多維度商品規格</label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditForm(prev => {
                                      if (!prev) return null;
                                      const newGroups = prev.variantGroups ? [...prev.variantGroups] : [];
                                      newGroups.push({ name: '', options: [], isRequired: true });
                                      return { ...prev, variantGroups: newGroups };
                                    });
                                  }}
                                  className="text-xs bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-200 font-bold"
                                >
                                  + 新增規格群組
                                </button>
                              </div>

                              {/* 顯示多維度規格輸入區 */}
                           {editForm?.variantGroups?.map((group, index) => (
                             <div key={index} className="flex flex-col gap-2 p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                               <div className="flex items-center gap-2">
                                 <input
                                   type="text"
                                   placeholder="名稱 (例: 顏色)"
                                   value={group.name}
                                   onChange={(e) => {
                                     setEditForm(prev => {
                                       if (!prev) return null;
                                       const newGroups = [...(prev.variantGroups || [])];
                                       newGroups[index].name = e.target.value;
                                       return { ...prev, variantGroups: newGroups };
                                     });
                                   }}
                                   className="w-1/3 p-2 rounded-lg border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                                 />
                                 <input
                                   type="text"
                                   placeholder="選項 (逗號分隔，例: 紅, 藍)"
                                   value={group.options.join(', ')}
                                   onChange={(e) => {
                                     setEditForm(prev => {
                                       if (!prev) return null;
                                       const newGroups = [...(prev.variantGroups || [])];
                                       newGroups[index].options = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                                       return { ...prev, variantGroups: newGroups };
                                     });
                                   }}
                                   className="flex-1 p-2 rounded-lg border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                                 />
                                 <button
                                   type="button"
                                   onClick={() => {
                                     setEditForm(prev => {
                                       if (!prev) return null;
                                       const newGroups = prev.variantGroups?.filter((_, i) => i !== index);
                                       return { ...prev, variantGroups: newGroups };
                                     });
                                   }}
                                   className="text-stone-400 hover:text-red-500 px-2 font-bold"
                                 >
                                   ✕
                                 </button>
                               </div>
                               {/* 🌟 新增的必選開關 */}
                               <label className="flex items-center gap-2 text-xs font-bold text-stone-600 cursor-pointer ml-1 w-fit">
                                 <input
                                   type="checkbox"
                                   checked={group.isRequired !== false} // 為了相容舊資料，沒設定過也算必選
                                   onChange={(e) => {
                                     setEditForm(prev => {
                                       if (!prev) return null;
                                       const newGroups = [...(prev.variantGroups || [])];
                                       newGroups[index].isRequired = e.target.checked;
                                       return { ...prev, variantGroups: newGroups };
                                     });
                                   }}
                                   className="w-4 h-4 accent-rose-500"
                                 />
                                 此為必選規格
                               </label>
                             </div>
                           ))}

                              {/* 🌟 升級版：組合包的方案輸入框 / 一般單一規格 */}
                                      {(!editForm?.variantGroups || editForm.variantGroups.length === 0 || editForm?.isComboMode) && (
                                        <div>
                                          <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 mt-4">
                                            {editForm?.isComboMode ? '🛒 組合包方案設定 (逗號分隔)' : '或使用單一規格 (逗號分隔)'}
                                          </label>
                                          <input 
                                            type="text"
                                            value={editForm?.variants?.join(', ') || ''}
                                            onChange={(e) => setEditForm(prev => prev ? { ...prev, variants: e.target.value.split(',').map(v => v.trim()).filter(v => v) } : null)}
                                            className="w-full p-3 rounded-xl border-2 border-stone-200 focus:outline-none focus:border-rose-500"
                                            placeholder={editForm?.isComboMode ? "例如：1件(209), 2件(328), 4件(566)" : "例如：原味, 辣味, 芥末"}
                                          />
                                        </div>
                                      )}
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">限購數量 (0 或留空表示不限)</label>
                              <input 
                                type="number"
                                value={editForm?.maxLimit || ''}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, maxLimit: e.target.value ? parseInt(e.target.value) : undefined } : null)}
                                className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                              />
                            </div>

                        
                         </>
                          )}

                          {/* 🌟 搬家到這裡：在透明斗篷的外面，這樣不管什麼分類都絕對看得到！ */}
                          <div className="pt-4 border-t border-rose-100">
                            <label className="block text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">
                              ⏳ 自動下架 / 截團時間 (留空表示永久顯示)
                            </label>
                            <input 
                              type="datetime-local"
                              value={editForm?.countdownTarget ? new Date(new Date(editForm.countdownTarget).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, countdownTarget: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null)}
                              className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500 bg-rose-50/50"
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                          {editForm?.id && (
                            isConfirmingDelete ? (
                              <div className="flex flex-1 gap-2">
                                <button 
                                  onClick={() => {
                                    setProducts(prev => prev.filter(p => p.id !== editForm.id));
                                    setIsEditing(false);
                                    setSelectedProduct(null);
                                    setIsConfirmingDelete(false);
                                  }}
                                  className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
                                >
                                  確定刪除
                                </button>
                                <button 
                                  onClick={() => setIsConfirmingDelete(false)}
                                  className="flex-1 bg-rose-100 text-rose-600 py-4 rounded-2xl font-bold flex items-center justify-center hover:bg-rose-200 transition-colors"
                                >
                                  取消
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setIsConfirmingDelete(true)}
                                className="px-6 bg-rose-100 text-rose-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-200 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" /> 刪除
                              </button>
                            )
                          )}
                          <button 
                            onClick={handleSaveEdit}
                            className="flex-1 bg-stone-700 text-orange-50 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-stone-900 transition-colors"
                          >
                            <Save className="w-5 h-5" /> 儲存變更
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-8">
                          <div className="flex items-center gap-2 mb-6">
                            {/* 🌟 質感膠囊分類標籤 */}
                            <span className="px-4 py-1.5 rounded-full bg-rose-100 text-rose-600 text-xs font-bold tracking-widest uppercase shadow-sm">
                              {selectedProduct.category === 'health' ? '保健食品' : selectedProduct.category === 'daily' ? '生活百貨' : selectedProduct.category === 'limited' ? '限時優惠' : selectedProduct.category === 'pet' ? '寵物專區' : '林林媽粉絲福利區'}
                            </span>
                            {selectedProduct.status === 'limited' && (
                              <span className="px-4 py-1.5 rounded-full bg-rose-500 text-white text-xs font-bold tracking-widest uppercase flex items-center gap-1 shadow-md shadow-rose-500/30">
                                <Clock className="w-3 h-3" /> 限時優惠
                              </span>
                            )}
                          </div>
                          
                          <h2 className="text-3xl md:text-4xl font-extrabold text-stone-800 mb-4 leading-tight">
                            {selectedProduct.name}
                          </h2>

                          {/* 🌟 專屬詳細頁的限時倒數計時器 (圓潤版) */}
                          {selectedProduct.category === 'limited' && selectedProduct.countdownTarget && (
                            <div className="mb-8 bg-rose-50/80 border-2 border-rose-200 rounded-2xl px-5 py-4 inline-flex items-center gap-4 shadow-sm">
                              <span className="text-rose-600 text-sm font-bold flex items-center gap-1.5">
                                <Clock className="w-5 h-5" /> 截團倒數
                              </span>
                              <div className="flex items-center gap-1.5 font-mono text-xl font-bold text-rose-500">
                                <span className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-rose-100">{String(timeLeft.days).padStart(2, '0')}</span>
                                <span className="text-sm font-sans mr-2 pt-1 text-rose-600 font-bold">天</span>
                                <span className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-rose-100">{String(timeLeft.hours).padStart(2, '0')}</span>
                                <span className="animate-pulse text-rose-400">:</span>
                                <span className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-rose-100">{String(timeLeft.minutes).padStart(2, '0')}</span>
                                <span className="animate-pulse text-rose-400">:</span>
                                <span className="bg-white px-3 py-1.5 rounded-xl shadow-sm border border-rose-100">{String(timeLeft.seconds).padStart(2, '0')}</span>
                              </div>
                            </div>
                          )}

                          {!selectedProduct.isAnnouncement && (
                            <div className="flex flex-col gap-1 mb-8 p-6 bg-stone-50 rounded-3xl border border-stone-100">
                              {selectedProduct.originalPrice && (
                                <div className="text-lg text-stone-400 font-medium tracking-wider mb-1">
                                  原價：<span className="line-through">${selectedProduct.originalPrice}</span>
                                </div>
                              )}
                              <div className="text-4xl font-extrabold text-rose-500 flex items-baseline gap-2">
                                <span className="text-xl text-stone-700 font-bold tracking-wider">粉絲專屬優惠：</span>
                                ${selectedProduct.price}
                              </div>
                            </div>
                          )}

                          <p className="text-stone-600 leading-relaxed mb-10 text-lg whitespace-pre-wrap">
                            {selectedProduct.description}
                          </p>

                          {/* 商品特色區塊 */}
                          <div className="space-y-4 mb-10">
                            <h4 className="text-sm font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                              <Sparkles className="w-4 h-4" /> 商品特色
                            </h4>
                            <ul className="grid grid-cols-1 gap-4">
                              {selectedProduct.features.map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-stone-700 font-medium">
                                  <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                  </div>
                                  <span className="leading-relaxed">{feature}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* 🌟 膠囊化規格與精緻數量選擇區 */}
                          {!selectedProduct.isAnnouncement && (
                            <div className="space-y-8 mb-10 p-8 bg-white rounded-[32px] border-2 border-rose-100 shadow-sm">
                              {selectedProduct.isComboMode ? (
                                <div className="space-y-6">
                                  {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                                    <div>
                                      <label className="block text-base font-bold text-stone-800 mb-3">🛒 選擇購買方案</label>
                                      <select
                                        value={selectedVariant}
                                        onChange={(e) => setSelectedVariant(e.target.value)}
                                        className="w-full p-4 rounded-full border-2 border-rose-200 focus:outline-none focus:border-rose-400 bg-rose-50/30 cursor-pointer font-bold text-stone-700 transition-colors"
                                      >
                                        <option value="">-- 請先選擇購買方案 --</option>
                                        {selectedProduct.variants.map(v => (
                                          <option key={v} value={v}>{v}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {selectedVariant && (
                                    <div className="space-y-4 pt-6 border-t-2 border-dashed border-rose-100">
                                      <label className="block text-base font-bold text-stone-800 mb-2">📦 組合包明細分配</label>
                                      {comboSelections.map((selection, index) => (
                                        <div key={selection.id} className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-3xl border-2 border-stone-100 shadow-sm">
                                          <span className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 text-stone-500 font-bold text-sm">#{index + 1}</span>
                                          {selectedProduct.variantGroups?.map(group => (
                                            <select
                                              key={group.name}
                                              value={selection.variants[group.name] || ''}
                                              onChange={(e) => {
                                                const newSelections = [...comboSelections];
                                                newSelections[index].variants[group.name] = e.target.value;
                                                setComboSelections(newSelections);
                                              }}
                                              className="flex-1 min-w-[110px] p-3 text-sm font-bold border-2 border-rose-100 rounded-full focus:outline-none focus:border-rose-400 bg-white cursor-pointer"
                                            >
                                              <option value="">選擇{group.name}</option>
                                              {group.options.map(opt => (
                                                <option key={opt} value={opt}>{opt}</option>
                                              ))}
                                            </select>
                                          ))}
                                          <div className="flex items-center gap-2 ml-auto bg-stone-50 rounded-full p-1 border border-stone-200">
                                            <span className="text-xs text-stone-500 font-bold ml-2">數量</span>
                                            <input
                                              type="number"
                                              min="1"
                                              value={selection.quantity}
                                              onChange={(e) => {
                                                const newSelections = [...comboSelections];
                                                newSelections[index].quantity = Math.max(1, parseInt(e.target.value) || 1);
                                                setComboSelections(newSelections);
                                              }}
                                              className="w-12 p-1.5 text-center font-bold text-sm bg-transparent focus:outline-none"
                                            />
                                          </div>
                                          {comboSelections.length > 1 && (
                                            <button onClick={() => setComboSelections(comboSelections.filter((_, i) => i !== index))} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button onClick={() => setComboSelections([...comboSelections, { id: Date.now(), variants: {}, quantity: 1 }])} className="w-full py-4 border-2 border-dashed border-rose-300 text-rose-500 font-bold rounded-full hover:bg-rose-50 transition-colors flex items-center justify-center gap-2 mt-4">
                                        <Plus className="w-5 h-5" /> 新增一組明細
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (selectedProduct.variantGroups && selectedProduct.variantGroups.length > 0) ? (
                                <div className="space-y-6">
                                  {selectedProduct.variantGroups.map((group, gIdx) => (
                                    <div key={gIdx}>
                                      <label className="block text-base font-bold text-stone-800 mb-3">{group.name}</label>
                                      <div className="flex flex-wrap gap-3">
                                        {group.options.map((opt) => (
                                          <button
                                            key={opt}
                                            onClick={() => setSelectedVariants(prev => ({ ...prev, [group.name]: prev[group.name] === opt ? '' : opt }))}
                                            className={`px-6 py-3 rounded-full text-base font-bold transition-all duration-300 border-2 ${
                                              selectedVariants[group.name] === opt
                                                ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30'
                                                : 'bg-white border-rose-200 text-stone-600 hover:border-rose-400 hover:bg-rose-50'
                                            }`}
                                          >
                                            {opt}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : selectedProduct.variants.length > 0 ? (
                                <div>
                                  <label className="block text-base font-bold text-stone-800 mb-3">🛒 選擇購買方案</label>
                                  <select
                                    value={selectedVariant}
                                    onChange={(e) => setSelectedVariant(e.target.value)}
                                    className="w-full p-4 rounded-full border-2 border-rose-200 focus:outline-none focus:border-rose-400 bg-rose-50/30 cursor-pointer font-bold text-stone-700"
                                  >
                                    <option value="">-- 請選擇購買方案 --</option>
                                    {selectedProduct.variants.map(variant => (
                                      <option key={variant} value={variant}>{variant}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t-2 border-stone-100">
                                <div>
                                  <label className="block text-base font-bold text-stone-800 mb-1">購買數量</label>
                                  {selectedProduct.maxLimit && (
                                    <span className="text-xs text-rose-500 font-bold uppercase tracking-wider bg-rose-100 px-2 py-1 rounded-md">
                                      每人限購 {selectedProduct.maxLimit} 件
                                    </span>
                                  )}
                                </div>
                                {/* 🌟 可愛質感：實心玫瑰粉膠囊數量選擇器 (一個 + 一個 -) */}
          <div className="flex items-center gap-4 bg-stone-50 rounded-full border-2 border-stone-100 p-1.5 w-fit shadow-inner">
            {/* 減號按鈕 (左)：實心玫瑰粉圓 */}
            <button 
              onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
              className="w-10 h-10 rounded-full bg-rose-500 shadow-sm flex items-center justify-center text-white hover:bg-rose-600 transition-colors border border-rose-600"
            >
              <Minus className="w-5 h-5" />
            </button>

            {/* 中間數字 */}
            <span className="w-10 text-center font-extrabold text-stone-800 text-lg">{selectedQuantity}</span>

            {/* 加號按鈕 (右)：實心玫瑰粉圓 */}
            <button 
              onClick={() => {
                if (selectedProduct.maxLimit && selectedQuantity >= selectedProduct.maxLimit) {
                  alert(`已達限購數量 ${selectedProduct.maxLimit} 件`);
                  return;
                }
                setSelectedQuantity(selectedQuantity + 1);
              }}
              className="w-10 h-10 rounded-full bg-rose-500 shadow-sm flex items-center justify-center text-white hover:bg-rose-600 transition-colors border border-rose-600"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 🌟 大氣化結帳按鈕群組 */}
                        <div className="mt-auto space-y-4">
                          <div className="flex flex-col gap-4">
                            <button 
                              onClick={() => handleOrderNow(selectedProduct)}
                              className="w-full bg-stone-800 text-white py-5 rounded-full font-bold text-xl hover:bg-stone-900 transition-all duration-300 shadow-xl shadow-stone-800/20 flex items-center justify-center gap-3"
                            >
                              立即詢問 <ExternalLink className="w-6 h-6" />
                            </button>
                            {!selectedProduct.isAnnouncement && (
                              <button 
                                onClick={() => handleAddToCart(selectedProduct)}
                                className="w-full bg-rose-200 text-stone-800 py-5 rounded-full font-bold text-xl hover:bg-rose-300 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-rose-200/40"
                              >
                                加入購物籃 <ShoppingBag className="w-6 h-6" />
                              </button>
                            )}
                          </div>
                          
                          {/* 收藏按鈕 */}
                          <button 
                            onClick={() => toggleFavorite(selectedProduct.id)}
                            className={`w-full py-4 rounded-full border-2 font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                              favorites.includes(selectedProduct.id) 
                                ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30' 
                                : 'border-stone-200 text-stone-500 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${favorites.includes(selectedProduct.id) ? 'fill-current' : ''}`} />
                            {favorites.includes(selectedProduct.id) ? '已收藏此商品' : '加入收藏清單'}
                          </button>
                        </div>
                        
                        <p className="mt-8 text-center text-sm font-bold text-stone-400">
                          * 點擊「立即詢問」將由系統為您發送訊息至 林林媽官方 LINE
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>

      {/* 🌟 修改版：右側浮動快捷鍵 (IG、LINE 圖示改為圓形滿版) */}
      <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-3">
        {/* IG 按鈕 - 改為滿版圓形 */}
        <a 
          href="https://www.instagram.com/lin_lin_mom66/" 
          target="_blank" 
          rel="noreferrer" 
          className="w-12 h-12 rounded-full overflow-hidden shadow-lg border border-stone-100 hover:scale-110 transition-transform"
          /* 💡 移除：flex, bg-white, padding. 增加：overflow-hidden. */
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Instagram_logo_2016.svg/2048px-Instagram_logo_2016.svg.png" 
            alt="IG" 
            className="w-full h-full object-cover" 
            /* 💡 設為滿版 (w-full, h-full) 並 object-cover 裁切完美圓形 */
          />
        </a>
        
        {/* LINE 按鈕 - 改為滿版圓形 (已修正連結) */}
        <a 
          href="https://line.me/R/ti/p/@linlinmom2828" // 👈 這是修正過的林林媽專屬連結
          target="_blank" 
          rel="noreferrer" 
          className="w-12 h-12 rounded-full overflow-hidden shadow-lg border border-stone-100 hover:scale-110 transition-transform"
          /* 💡 移除：flex, bg-white, padding. 增加：overflow-hidden. */
        >
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/LINE_logo.svg/2048px-LINE_logo.svg.png" 
            alt="LINE" 
            className="w-full h-full object-cover" 
            /* 💡 設為滿版並 object-cover，之前的 contain 會露出白色 */
          />
        </a>

        {/* 購物車按鈕 (維持原樣) */}
        <button 
          onClick={() => setIsCartOpen(true)}
          className="w-12 h-12 rounded-full bg-stone-900 shadow-lg flex items-center justify-center hover:scale-110 transition-transform relative"
        >
          <ShoppingBag className="w-5 h-5 text-white" />
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>

        {/* 回到最上方按鈕 (維持原樣) */}
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-stone-100 hover:scale-110 transition-transform mt-2 text-stone-600"
        >
          ▲
        </button>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-stone-700/80 backdrop-blur-md text-orange-50 px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap"
          >
            <span>已加入購物車❤️請點擊右上圖示查看全部</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl border border-rose-200"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-stone-900">管理員登入</h3>
                <button onClick={() => setIsLoginModalOpen(false)} className="text-stone-700 hover:text-rose-500">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">帳號</label>
                  <input 
                    type="text"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                    placeholder="請輸入帳號"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">密碼</label>
                  <input 
                    type="password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full p-3 rounded-xl border-2 border-rose-200 focus:outline-none focus:border-rose-500"
                    placeholder="請輸入密碼"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-stone-700 text-orange-50 py-4 rounded-xl font-bold hover:bg-stone-900 transition-all duration-300 mt-2"
                >
                  登入
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

{/* 🌟 新增：左側滑出分類側邊欄 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* 黑色半透明背景遮罩 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            {/* 側邊欄白底面板 (加上右側可愛圓角) */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 h-full w-[75%] max-w-sm bg-orange-50 shadow-2xl flex flex-col rounded-r-[30px] overflow-hidden"
            >
              {/* 側邊欄頭部 */}
              <div className="p-6 border-b border-rose-200 flex justify-between items-center bg-orange-50/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center text-rose-500">
                    <Sparkles className="w-4 h-4 fill-current" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">商品分類</h3>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-stone-700 hover:text-rose-500 bg-white rounded-full shadow-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 分類按鈕清單 */}
              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id as any); // 切換分類
                      setSelectedProduct(null); // 如果在商品詳細頁，自動退回列表
                      setIsSidebarOpen(false); // 點擊後自動收起側邊欄
                      window.scrollTo({ top: 0, behavior: 'smooth' }); // 自動滾回最上方
                    }}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all duration-300 ${
                      activeCategory === cat.id
                        ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                        : 'bg-white text-stone-700 hover:bg-rose-100 border border-transparent shadow-sm'
                    }`}
                  >
                    <span className={`${activeCategory === cat.id ? 'text-white' : 'text-rose-400'}`}>
                      {cat.icon}
                    </span>
                    {cat.name}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 h-full w-full max-w-md bg-orange-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-rose-200 flex justify-between items-center bg-orange-50/80 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-stone-700" />
                  <h3 className="text-xl font-bold text-stone-900">我的購物籃</h3>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 text-stone-700 hover:text-rose-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-stone-700/40">
                    <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-lg font-medium">購物籃還是空的喔</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-rose-500 font-bold hover:underline"
                    >
                      去逛逛好物吧
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={`${item.product.id}-${item.variant}`} className="flex gap-4 bg-white p-4 rounded-2xl border border-rose-200/50 shadow-sm">
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                        <img src={item.product.images[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-stone-900 line-clamp-1">{item.product.name}</h4>
                        <p className="text-stone-700/60 text-xs mb-1">規格：{item.variant || '預設'}</p>
                        <p className="text-stone-700/60 text-sm mb-2">數量：{item.quantity}</p>
                        <div className="flex justify-between items-center">
                          {/* 🌟 修改這裡：讓購物車也能抓到規格價格 */}
<span className="font-bold text-rose-500">
  ${getVariantPrice(item.product.price, item.variant) * item.quantity}
</span>
                          <button 
                            onClick={() => removeFromCart(item.product.id, item.variant)}
                            className="text-xs text-rose-500 font-bold hover:underline bg-rose-50 px-2 py-1 rounded"
                          >
                            移除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-white border-t border-rose-200">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-stone-700/60">總計金額</span>
                    <span className="text-2xl font-bold text-stone-700">
                      ${cart.reduce((sum, item) => sum + getVariantPrice(item.product.price, item.variant) * item.quantity, 0)}
                    </span>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-stone-700 text-orange-50 py-4 rounded-xl font-bold hover:bg-stone-900 transition-all duration-300 shadow-xl shadow-stone-700/20"
                  >
                    前往結帳
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-20 py-12 bg-rose-200/30 border-t border-rose-200">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-rose-200 flex items-center justify-center text-rose-500">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
            <span className="font-bold text-stone-900">林林媽開團小宇宙</span>
          </div>
          <p className="text-sm text-stone-700/60 mb-8 max-w-md mx-auto">
            我們致力於尋找生活中最美好的事物，讓您的每一天都充滿驚喜與健康。
          </p>
          <div className="flex justify-center gap-6 mb-8">
            <a href="https://lin.ee/3FkHbsvk" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-stone-700/60 hover:text-rose-500 transition-colors">
              <span className="font-bold">LINE: @linlinmom2828</span>
            </a>
            <a href="https://www.facebook.com/kellyluo66" target="_blank" rel="noreferrer" className="text-stone-700/40 hover:text-rose-500 transition-colors">Facebook</a>
            <a href="https://www.instagram.com/lin_lin_mom66/" target="_blank" rel="noreferrer" className="text-stone-700/40 hover:text-rose-500 transition-colors">Instagram</a>
          </div>
          <p className="text-[10px] text-stone-700/30 uppercase tracking-[0.2em]">
            © 2024 AOI GROUP BUY. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
