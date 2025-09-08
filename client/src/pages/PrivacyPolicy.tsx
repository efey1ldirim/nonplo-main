import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Gizlilik Politikası</h1>
          
          <div className="space-y-8">
            <section>
              <p className="text-lg text-muted-foreground mb-6">
                <strong>Gizliliğiniz bizim için önemli.</strong>
              </p>
              <p className="text-muted-foreground">
                <strong>Nonplo</strong> olarak, hizmetlerimizi kullanırken paylaştığınız kişisel verileri korumayı taahhüt ediyoruz.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Topladığımız Veriler</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Ad, e-posta, telefon gibi iletişim bilgileri</li>
                <li>Ödeme işlemleri için gerekli fatura bilgileri</li>
                <li>Hizmet kullanımına ilişkin teknik veriler (IP, tarayıcı bilgisi, kullanım istatistikleri)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Verileri Nasıl Kullanıyoruz?</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Hizmetlerimizi sağlamak ve geliştirmek</li>
                <li>Müşteri desteği sunmak</li>
                <li>Yasal yükümlülükleri yerine getirmek</li>
                <li>Pazarlama ve bilgilendirme amaçlı e-posta göndermek (onayınız dahilinde)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Verilerin Paylaşımı</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>Yalnızca yasal zorunluluk halinde resmi kurumlarla</li>
                <li>Ödeme ve barındırma hizmeti sağlayıcıları gibi iş ortaklarımızla</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-foreground">Haklarınız</h2>
              <p className="text-muted-foreground mb-4">KVKK ve GDPR kapsamında:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>Bilgilerinize erişme, düzeltme veya silme hakkınız vardır</li>
                <li>Dilediğiniz zaman pazarlama iletilerinden çıkabilirsiniz</li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;