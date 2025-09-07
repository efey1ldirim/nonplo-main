import { Twitter, Linkedin, Instagram, Facebook, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // Handle newsletter subscription logic here
      setIsSubscribed(true);
      setEmail("");
      setTimeout(() => setIsSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
      <div className="container mx-auto px-6 lg:px-8 py-16">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-16">
          
          {/* Logo & Tagline Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nonplo</h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 max-w-sm">
                Yapay zeka destekli dijital çalışanlarla işletmenizi geleceğe taşıyın
              </p>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-10 h-10 p-0 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md" 
                asChild
              >
                <a href="https://www.linkedin.com/company/nonplo" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-10 h-10 p-0 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md" 
                asChild
              >
                <a href="https://x.com/nonploai" target="_blank" rel="noopener noreferrer">
                  <Twitter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-10 h-10 p-0 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md" 
                asChild
              >
                <a href="https://www.instagram.com/nonplo.ai" target="_blank" rel="noopener noreferrer">
                  <Instagram className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-10 h-10 p-0 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 shadow-sm hover:shadow-md" 
                asChild
              >
                <a href="https://www.facebook.com/profile.php?id=61578490186349" target="_blank" rel="noopener noreferrer">
                  <Facebook className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </a>
              </Button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Keşfedin</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="/" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Ana Sayfa
                </a>
              </li>
              <li>
                <a 
                  href="/builder" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Oluşturucu
                </a>
              </li>
              <li>
                <a 
                  href="/resources/blog" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Blog
                </a>
              </li>
              <li>
                <a 
                  href="/dashboard" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/pricing" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Fiyatlandırma
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Yasal</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="/privacy-policy" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Gizlilik Politikası
                </a>
              </li>
              <li>
                <a 
                  href="/terms-of-service" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Kullanım Şartları
                </a>
              </li>
              <li>
                <a 
                  href="/cookie-policy" 
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:underline underline-offset-4"
                >
                  Çerez Politikası
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div className="space-y-5">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Bülten</h4>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-500 max-w-[200px]">
                Ürün güncellemeleri, yeni özellikler ve özel içeriklerden ilk siz haberdar olun
              </p>
            </div>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="E-posta adresiniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-2xl border-gray-200 dark:border-gray-700 focus:border-gray-400 dark:focus:border-gray-500 shadow-sm"
                data-testid="input-newsletter-email"
              />
              <Button 
                type="submit"
                className="w-full rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow-md"
                disabled={isSubscribed}
                data-testid="button-newsletter-subscribe"
              >
                {isSubscribed ? (
                  "Abone Oldunuz!"
                ) : (
                  <>
                    Abone Ol
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Copyright Section */}
        <div className="border-t border-gray-100 dark:border-gray-800 mt-16 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              © 2025 Nonplo. Tüm hakları saklıdır.
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              contact@nonplo.com
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
export default Footer;
