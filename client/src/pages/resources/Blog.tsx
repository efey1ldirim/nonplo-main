import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Calendar, User, ArrowRight, PenTool, Loader2 } from "lucide-react";

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const blogPosts = [
    {
      id: 1,
      title: "Yapay Zeka Destekli Dijital Çalışanlar ile İş Otomasyonunun Geleceği",
      excerpt: "Yapay Zeka Destekli Dijital Çalışanlarının iş operasyonlarını nasıl dönüştürdüğünü ve bunun şirketinizin geleceği için ne anlama geldiğini keşfedin.",
      author: "Sarah Chen",
      publishDate: "2024-01-15",
      category: "Sektör İçgörüleri",
      thumbnail: "/api/placeholder/400/240",
      readTime: "5 dk okuma"
    },
    {
      id: 2,
      title: "Nonplo 2.0: Gelişmiş Dijital Çalışan Oluşturucu ve Yeni Entegrasyonlar",
      excerpt: "Yeniden tasarlanan dijital çalışan oluşturucu ve 20+ yeni entegrasyon dahil olmak üzere platformumuzdaki önemli güncellemeleri duyurmaktan heyecan duyuyoruz.",
      author: "Mike Rodriguez",
      publishDate: "2024-01-12",
      category: "Ürün Güncellemeleri",
      thumbnail: "/api/placeholder/400/240",
      readTime: "3 dk okuma"
    },
    {
      id: 3,
      title: "Yapay Zeka Destekli Dijital Çalışanlar ile Müşteri Hizmetlerinizi Optimize Etmenin 5 Yolu",
      excerpt: "Akıllı otomasyon kullanarak müşteri memnuniyetini artırmak ve yanıt sürelerini azaltmak için pratik stratejiler öğrenin.",
      author: "Emma Thompson",
      publishDate: "2024-01-10",
      category: "İpuçları ve Rehberler",
      thumbnail: "/api/placeholder/400/240",
      readTime: "7 dk okuma"
    },
    {
      id: 4,
      title: "Vaka Çalışması: TechCorp Destek Biletlerini %60 Nasıl Azalttı",
      excerpt: "Müşterilerimizden birinin Nonplo'nun Yapay Zeka Destekli Dijital Çalışanlarını kullanarak müşteri desteğini nasıl dönüştürdüğüne detaylı bir bakış.",
      author: "David Park",
      publishDate: "2024-01-08",
      category: "İpuçları ve Rehberler",
      thumbnail: "/api/placeholder/400/240",
      readTime: "6 dk okuma"
    },
    {
      id: 5,
      title: "Yapay Zeka Destekli Dijital Çalışan Uygulamaları için Güvenlik En İyi Uygulamaları",
      excerpt: "İş akışlarınızda Yapay Zeka Destekli Dijital Çalışanlar uygularken temel güvenlik hususları.",
      author: "Lisa Wang",
      publishDate: "2024-01-05",
      category: "Sektör İçgörüleri",
      thumbnail: "/api/placeholder/400/240",
      readTime: "8 dk okuma"
    },
    {
      id: 6,
      title: "Yeni Özellik: Gelişmiş Analitik Panosu",
      excerpt: "Yeni analitik panomuz ve raporlama araçlarımızla dijital çalışan performansınız hakkında daha derin içgörüler elde edin.",
      author: "Alex Johnson",
      publishDate: "2024-01-03",
      category: "Ürün Güncellemeleri",
      thumbnail: "/api/placeholder/400/240",
      readTime: "4 dk okuma"
    }
  ];

  const categories = [
    { value: "all", label: "Tüm Yazılar" },
    { value: "Ürün Güncellemeleri", label: "Ürün Güncellemeleri" },
    { value: "İpuçları ve Rehberler", label: "İpuçları ve Rehberler" },
    { value: "Sektör İçgörüleri", label: "Sektör İçgörüleri" }
  ];

  const filteredPosts = selectedCategory === "all" 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Ürün Güncellemeleri":
        return "bg-primary/10 text-primary";
      case "İpuçları ve Rehberler":
        return "bg-green-500/10 text-green-700";
      case "Sektör İçgörüleri":
        return "bg-purple-500/10 text-purple-700";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleNewsletterSubscribe = async () => {
    if (!email.trim()) {
      toast({
        title: "E-posta gerekli",
        description: "Lütfen e-posta adresinizi girin.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Geçersiz e-posta",
        description: "Lütfen geçerli bir e-posta adresi girin.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast({
          title: "Başarıyla abone oldunuz!",
          description: "Bültene başarıyla abone oldunuz. Teşekkür ederiz.",
        });
        setEmail("");
      } else {
        const errorData = await response.json();
        if (errorData.error?.includes('already subscribed')) {
          toast({
            title: "Zaten kayıtlısınız",
            description: "Bu e-posta adresi zaten bültenimize kayıtlı.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Hata oluştu",
            description: "Abone olurken bir hata oluştu. Lütfen tekrar deneyin.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: "Hata oluştu",
        description: "Abone olurken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-background via-primary/5 to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <PenTool className="w-12 h-12 lg:w-14 lg:h-14 text-primary -ml-2" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Görüşler ve Güncellemeler
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              İş otomasyonu, yapay zeka trendleri ve Nonplo haberleri hakkında okuyun.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Category Filter */}
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                {categories.map((category) => (
                  <TabsTrigger key={category.value} value={category.value}>
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Blog Posts Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {filteredPosts.map((post) => (
                <Link key={post.id} to={`/resources/blog/${post.id}`}>
                  <Card className="group hover:shadow-lg transition-shadow cursor-pointer h-[480px] flex flex-col">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <PenTool className="w-12 h-12 text-primary/60" />
                    </div>
                  </div>
                  <CardHeader className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className={getCategoryColor(post.category)}>
                        {post.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{post.readTime}</span>
                    </div>
                    <CardTitle className="group-hover:text-primary transition-colors line-clamp-2 min-h-[3.5rem] leading-tight">
                      {post.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-3 flex-1">
                      {post.excerpt}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {post.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(post.publishDate).toLocaleDateString()}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Newsletter CTA */}
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
              <CardContent className="text-center py-12">
                <h2 className="text-2xl font-bold mb-4">Güncel Kalın</h2>
                <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                  Yapay zeka otomasyonu, ürün güncellemeleri ve sektör trendleri hakkında en son içgörüleri e-postanıza teslim edin.
                </p>
                <div className="flex items-center gap-3 max-w-md mx-auto">
                  <Input
                    type="email"
                    placeholder="E-posta adresiniz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    variant="hero" 
                    size="lg" 
                    onClick={handleNewsletterSubscribe}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Abone Oluyor...
                      </>
                    ) : (
                      "Bültene Abone Ol"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Blog;