import Header from "@/components/Header";
import Footer from "@/components/Footer";

const CookiePolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Çerez Politikası</h1>
          
          <div className="space-y-8">
            <section>
              <p className="text-muted-foreground">
                <strong>Nonplo</strong>, kullanıcı deneyimini geliştirmek için çerezlerden faydalanır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Çerez Nedir?</h2>
              <p className="text-muted-foreground">
                Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük dosyalardır.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Hangi Çerezleri Kullanıyoruz?</h2>
              <ul className="space-y-4">
                <li>
                  <div>
                    <strong className="text-foreground">Zorunlu Çerezler:</strong>
                    <span className="text-muted-foreground"> Site güvenliği ve oturum açma için gerekli.</span>
                  </div>
                </li>
                <li>
                  <div>
                    <strong className="text-foreground">Performans Çerezleri:</strong>
                    <span className="text-muted-foreground"> Site kullanım istatistiklerini ölçmek için.</span>
                  </div>
                </li>
                <li>
                  <div>
                    <strong className="text-foreground">Pazarlama Çerezleri:</strong>
                    <span className="text-muted-foreground"> Reklam ve hedefleme için (izin verilirse).</span>
                  </div>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Çerezleri Nasıl Yönetebilirsiniz?</h2>
              <p className="text-muted-foreground mb-4">
                Tarayıcınızın ayarlarından çerezleri reddedebilir veya silebilirsiniz. Ancak bu durumda bazı site işlevleri kısıtlanabilir.
              </p>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default CookiePolicy;