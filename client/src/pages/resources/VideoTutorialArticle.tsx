import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ArrowLeft, Play, Clock, Eye, User, Calendar } from "lucide-react";

const VideoTutorialArticle = () => {
  const { videoId } = useParams<{ videoId: string }>();
  
  // Mock video data - bu veriler gerçek uygulamada API'dan gelecek
  const videos = [
    {
      id: "1",
      title: "Nonplo'ya Başlangıç",
      description: "İlk yapay zeka ajanınızı 10 dakikadan az sürede oluşturmayı öğrenin.",
      fullDescription: "Bu eğitim videosunda, Nonplo platformuna nasıl başlayacağınızı, hesap oluşturmaktan ilk ajanınızı yapılandırıp yayınlamaya kadar tüm süreçleri adım adım öğreneceksiniz. Video boyunca pratik örneklerle, platform arayüzünü tanıyacak ve temel özelliklerini kullanmayı öğreneceksiniz.",
      duration: "9:32",
      category: "Başlangıç",
      difficulty: "Başlangıç",
      views: "12.5k",
      publishDate: "2024-01-15",
      instructor: "Ahmet Yılmaz",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      learningObjectives: [
        "Nonplo hesabı oluşturma ve platform arayüzünü tanıma",
        "İlk yapay zeka ajanını oluşturma",
        "Temel dijital çalışan ayarlarını yapılandırma",
        "Ajanı test etme ve yayınlama"
      ],
      prerequisites: [
        "Temel bilgisayar kullanım bilgisi",
        "İnternet bağlantısı"
      ],
      relatedVideos: ["2", "5", "7"]
    },
    {
      id: "2",
      title: "Gelişmiş Dijital Çalışan Yapılandırması",
      description: "İleri düzey kullanıcılar için gelişmiş ayarlar ve özelleştirme seçeneklerine derinlemesine bakış.",
      fullDescription: "Temel ajan oluşturmayı öğrendikten sonra, dijital çalışanınızı daha da güçlü hale getirmek için gelişmiş yapılandırma seçeneklerini keşfedin. Bu video, özel komutlar, gelişmiş doğal dil işleme ayarları ve performans optimizasyonu konularını kapsar.",
      duration: "15:47",
      category: "İleri Düzey",
      difficulty: "İleri Düzey",
      views: "8.2k",
      publishDate: "2024-01-22",
      instructor: "Ayşe Demir",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      learningObjectives: [
        "Gelişmiş dijital çalışan yapılandırma seçenekleri",
        "Özel komutlar ve tetikleyiciler oluşturma",
        "Performans optimizasyonu teknikleri",
        "Dijital Çalışan davranışlarını özelleştirme"
      ],
      prerequisites: [
        "Temel Nonplo bilgisi",
        "En az bir dijital çalışan oluşturmuş olmak"
      ],
      relatedVideos: ["1", "4", "8"]
    },
    {
      id: "3",
      title: "Müşteri Hizmetleri Botu Oluşturma",
      description: "Akıllı müşteri hizmetleri ajanı oluşturmak için adım adım rehber.",
      fullDescription: "Yaygın soruları yanıtlayabilen, karmaşık konuları üst seviyeye yönlendiren ve müşterilerinize 7/24 destek sağlayan akıllı müşteri hizmetleri ajanı oluşturmak için kapsamlı rehber.",
      duration: "22:18",
      category: "Kullanım Örneği",
      difficulty: "Orta Düzey",
      views: "15.3k",
      publishDate: "2024-01-10",
      instructor: "Mehmet Özkan",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      learningObjectives: [
        "Müşteri hizmetleri botu tasarlama",
        "Sık sorulan soruları yapılandırma",
        "Eskalasyon süreçleri oluşturma",
        "Bot performansını ölçme"
      ],
      prerequisites: [
        "Temel Nonplo bilgisi",
        "Müşteri hizmetleri süreçleri hakkında bilgi"
      ],
      relatedVideos: ["6", "9", "4"]
    }
  ];

  const video = videos.find(v => v.id === videoId);

  if (!video) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Video Bulunamadı</h1>
            <p className="text-muted-foreground mb-8">Aradığınız video mevcut değil.</p>
            <Link to="/resources/videos">
              <Button variant="hero">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Video Eğitimlerine Dön
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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

  const relatedVideos = videos.filter(v => video.relatedVideos?.includes(v.id));

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="mb-6">
              <Link to="/resources/videos" className="text-muted-foreground hover:text-primary transition-colors">
                Video Eğitimleri
              </Link>
              <span className="text-muted-foreground mx-2">/</span>
              <span className="text-foreground">{video.title}</span>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2">
                {/* Video Player */}
                <Card className="mb-8 overflow-hidden">
                  <div className="aspect-video bg-muted">
                    <iframe
                      src={video.videoUrl}
                      title={video.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </Card>

                {/* Video Info */}
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Badge className={getDifficultyColor(video.difficulty)} variant="secondary">
                      {video.difficulty}
                    </Badge>
                    <Badge variant="outline">{video.category}</Badge>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-foreground mb-4">
                    {video.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {video.instructor}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(video.publishDate).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {video.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {video.views} görüntüleme
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground leading-relaxed">
                    {video.fullDescription}
                  </p>
                </div>

                {/* Learning Objectives */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Bu Videoda Öğrenecekleriniz</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {video.learningObjectives.map((objective, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Prerequisites */}
                <Card className="mb-8">
                  <CardHeader>
                    <CardTitle>Ön Gereksinimler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {video.prerequisites.map((prerequisite, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-muted-foreground">{prerequisite}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Related Videos */}
                {relatedVideos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>İlgili Videolar</CardTitle>
                      <CardDescription>Bu konuyla ilgili diğer eğitimler</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {relatedVideos.map((relatedVideo) => (
                        <Link 
                          key={relatedVideo.id} 
                          to={`/resources/videos/${relatedVideo.id}`}
                          className="block group"
                        >
                          <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                            <div className="flex gap-3">
                              <div className="w-16 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                                <Play className="w-4 h-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-2">
                                  {relatedVideo.title}
                                </h4>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {relatedVideo.duration}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Back Button */}
            <div className="mt-12">
              <Link to="/resources/videos">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Tüm Video Eğitimlerine Dön
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VideoTutorialArticle;