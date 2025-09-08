import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrainingRequestDialog } from "@/components/dialogs/TrainingRequestDialog";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Play, Clock, Video, Star } from "lucide-react";

const VideoTutorials = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const videos = [
    {
      id: 1,
      title: "Nonplo'ya Başlangıç",
      description: "İlk Yapay Zeka Destekli Dijital Çalışanınızı 10 dakikadan az sürede oluşturmayı öğrenin.",
      duration: "9:32",
      category: "Başlangıç",
      difficulty: "Başlangıç",
      views: "12.5k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 2,
      title: "Gelişmiş Dijital Çalışan Yapılandırması",
      description: "İleri düzey kullanıcılar için gelişmiş ayarlar ve özelleştirme seçeneklerine derinlemesine bakış.",
      duration: "15:47",
      category: "İleri Düzey",
      difficulty: "İleri Düzey", 
      views: "8.2k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 3,
      title: "Müşteri Hizmetleri Botu Oluşturma",
      description: "Akıllı müşteri hizmetleri ajanı oluşturmak için adım adım rehber.",
      duration: "22:18",
      category: "Kullanım Örneği",
      difficulty: "Orta Düzey",
      views: "15.3k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 4,
      title: "Popüler Araçlarla Entegrasyon",
      description: "Nonplo Dijital Çalışanlarınızı Slack, Teams ve diğer iş araçlarıyla bağlayın.",
      duration: "18:42",
      category: "İleri Düzey",
      difficulty: "Orta Düzey",
      views: "9.7k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 5,
      title: "Dijital Çalışan Analitiğini Anlama",
      description: "Dijital Çalışanınızın performans metrikleri ve analitiğini nasıl okuyup yorumlayacağınızı öğrenin.",
      duration: "12:25",
      category: "Başlangıç",
      difficulty: "Başlangıç",
      views: "6.8k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 6,
      title: "Satış Otomasyonu Kullanım Örneği",
      description: "Potansiyel müşterileri değerlendiren ve otomatik toplantı planlayan bir Yapay Zeka Destekli Dijital Çalışan oluşturun.",
      duration: "28:15",
      category: "Kullanım Örneği",
      difficulty: "İleri Düzey",
      views: "11.2k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 7,
      title: "Yaygın Sorunları Giderme",
      description: "Yapay Zeka Destekli Dijital Çalışanlar oluştururken karşılaşılan en yaygın sorunları tespit edin ve çözün.",
      duration: "14:33",
      category: "Başlangıç",
      difficulty: "Başlangıç",
      views: "7.4k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 8,
      title: "Özel Eğitim Verisi Kurulumu",
      description: "Uzmanlaşmış ajanlar için özel eğitim verilerini nasıl hazırlayıp yükleyeceğinizi öğrenin.",
      duration: "19:56",
      category: "İleri Düzey",
      difficulty: "İleri Düzey",
      views: "5.1k",
      thumbnail: "/api/placeholder/400/225"
    },
    {
      id: 9,
      title: "İK Otomasyon İş Akışı",
      description: "Akıllı otomasyon ve eleme ile İK süreçlerinizi hızlandırın.",
      duration: "25:07",
      category: "Kullanım Örneği",
      difficulty: "Orta Düzey",
      views: "8.9k",
      thumbnail: "/api/placeholder/400/225"
    }
  ];

  const categories = [
    { value: "all", label: "Tüm Videolar" },
    { value: "Başlangıç", label: "Başlangıç" },
    { value: "İleri Düzey", label: "İleri Düzey" },
    { value: "Kullanım Örneği", label: "Kullanım Örnekleri" }
  ];

  const filteredVideos = selectedCategory === "all" 
    ? videos 
    : videos.filter(video => video.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Başlangıç":
        return "bg-green-500/10 text-green-700";
      case "Orta Düzey":
        return "bg-yellow-500/10 text-yellow-700";
      case "İleri Düzey":
        return "bg-red-500/10 text-red-700";
      default:
        return "bg-muted text-muted-foreground";
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
              <Video className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Video Eğitimleri
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Adım adım rehberler izleyerek Nonplo'yu profesyonel seviyede kullanmayı öğrenin.
            </p>
          </div>
        </div>
      </section>

      {/* Video Content */}
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

            {/* Featured Video */}
            {selectedCategory === "all" && (
              <Card className="mb-8 overflow-hidden">
                <div className="md:flex">
                  <div className="md:w-1/2">
                    <div className="aspect-video bg-muted relative group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                          <Play className="w-8 h-8 text-primary ml-1" />
                        </div>
                      </div>
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-primary text-primary-foreground">
                          <Star className="w-3 h-3 mr-1" />
                          Öne Çıkan
                        </Badge>
                      </div>
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        22:18
                      </div>
                    </div>
                  </div>
                  <div className="md:w-1/2 p-6">
                    <Badge className={getDifficultyColor("Orta Düzey")} variant="secondary">
                      Orta Düzey
                    </Badge>
                    <h3 className="text-2xl font-bold mt-2 mb-3">
                      Müşteri Hizmetleri Botu Oluşturma
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Yaygın soruları yanıtlayabilen, karmaşık konuları üst seviyeye yönlendiren ve müşterilerinize 7/24 destek sağlayan akıllı müşteri hizmetleri ajanı oluşturmak için adım adım rehber.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        22:18
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        15.3k görüntüleme
                      </div>
                    </div>
                    <Link to={`/resources/videos/3`}>
                      <Button variant="hero" className="w-full md:w-auto">
                        Şimdi İzle
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}

            {/* Video Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Link key={video.id} to={`/resources/videos/${video.id}`}>
                  <Card className="group hover:shadow-lg transition-shadow cursor-pointer overflow-hidden h-full">
                    <div className="aspect-video bg-muted relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                          <Play className="w-5 h-5 text-primary ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3">
                        <Badge className={getDifficultyColor(video.difficulty)} variant="secondary">
                          {video.difficulty}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded text-sm">
                        {video.duration}
                      </div>
                    </div>
                    <CardHeader>
                      <CardTitle className="group-hover:text-primary transition-colors line-clamp-2">
                        {video.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {video.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {video.duration}
                        </div>
                        <div className="flex items-center gap-1">
                          <Play className="w-4 h-4" />
                          {video.views} görüntüleme
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-xl font-semibold mb-2">Belirli bir eğitim görmek ister misiniz?</h3>
            <p className="text-muted-foreground mb-4">
              Ne öğrenmek istediğinizi bize bildirin, sizin için oluşturalım
            </p>
            <TrainingRequestDialog>
              <Button variant="hero">
                Eğitim Talebi
              </Button>
            </TrainingRequestDialog>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default VideoTutorials;