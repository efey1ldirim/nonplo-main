import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Kullanım Şartları</h1>
          
          <div className="space-y-8">
            <section>
              <p className="text-muted-foreground">
                <strong>Son güncelleme:</strong> 18.08.2025
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Hizmetin Kapsamı</h2>
              <p className="text-muted-foreground">
                <strong>Nonplo</strong>, KOBİ'lerin kendi iş süreçlerine uygun Yapay Zeka Destekli Dijital Çalışan oluşturmasına imkan tanıyan bir SaaS platformudur.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Kullanıcı Yükümlülükleri</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Hesap bilgilerinizi doğru ve güncel tutmalısınız</li>
                <li>Hizmeti yalnızca yasal amaçlarla kullanabilirsiniz</li>
                <li>Başkalarının haklarını ihlal edecek içerikler oluşturamazsınız</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Ödeme ve Abonelik</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Tüm ücretlendirmeler web sitemizde belirtilen koşullara tabidir</li>
                <li>Abonelikler otomatik olarak yenilenebilir; dilediğiniz zaman iptal edebilirsiniz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Sorumluluk Reddi</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>Nonplo</strong>, hizmetlerin kesintisiz veya hatasız olacağını garanti etmez</li>
                <li>Hizmetin kullanımı sırasında doğabilecek dolaylı zararlardan sorumlu tutulamaz</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Fesih</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Kullanım şartlarının ihlali halinde hesabınızı sonlandırma hakkımız saklıdır</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfService;