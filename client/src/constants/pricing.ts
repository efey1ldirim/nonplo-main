export interface PricingPlan {
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  features: string[];
  popular: boolean;
  cta: string;
  plan: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: "Temel Plan",
    description: "Küçük işletmeler için başlangıç seviyesi Yapay Zeka Destekli Dijital Çalışan çözümü",
    price: 3000,
    originalPrice: 3000,
    features: [
      "5000 mesaj hakkı", 
      "Tek çalışan", 
      "Entegrasyon erişimi 2 kanal ile sınırlı", 
      "Temel araçlara erişim", 
      "Dashboard erişimi", 
      "Temel analiz verileri", 
      "Temel şablonlar", 
      "Mail destek"
    ],
    popular: false,
    cta: "Temel Planı Seç",
    plan: "basic"
  },
  {
    name: "Plus Plan",
    description: "Büyüyen işletmeler için en çok tercih edilen çözüm",
    price: 3500,
    originalPrice: 3500,
    features: [
      "Mail Öncelikli Destek", 
      "10000 mesaj hakkı", 
      "5 çalışan", 
      "Gelişmiş araçlara erişim", 
      "Entegrasyonlara gelişmiş erişim", 
      "Gelişmiş analiz ve raporlama", 
      "Gelişmiş şablonlar"
    ],
    popular: true,
    cta: "Plus Planı Seç",
    plan: "plus"
  },
  {
    name: "Premium Plan",
    description: "Kurumsal işletmeler için tam donanımlı premium çözüm",
    price: 5500,
    originalPrice: 5500,
    features: [
      "10 çalışan", 
      "15000 mesaj hakkı", 
      "Gelişmiş araçlara erişim", 
      "Entegrasyonlara tam erişim", 
      "Gelişmiş analiz ve raporlama", 
      "Özel şablonlara erişim", 
      "İşletmeye özel çalışan telefon numarası", 
      "1000 dk konuşma kredisi"
    ],
    popular: false,
    cta: "Premium Planı Seç",
    plan: "premium"
  }
];