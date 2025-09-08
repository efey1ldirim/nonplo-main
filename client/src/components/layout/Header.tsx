import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, ChevronDown, User, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check current user
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigationItems = [
    { name: "Ana Sayfa", href: "/" },
    { name: "Oluşturucu", href: "/builder" },
    { name: "Fiyatlandırma", href: "/pricing" },
  ];

  const resourcesItems = [
    { name: "Dokümantasyon", href: "/resources/documentation" },
    { name: "Blog", href: "/resources/blog" },
    { name: "Video Eğitimler", href: "/resources/videos" },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      toast({
        title: "Başarıyla hesaptan çıkış yapıldı!",
        description: "Ana sayfaya yönlendiriliyorsunuz.",
      });
      
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Çıkış hatası!",
        description: "Çıkış yapılırken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-[40] w-full pt-4 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-background/80 backdrop-blur-xl border border-border/20 rounded-2xl shadow-lg shadow-black/5">
          <div className="flex h-16 items-center justify-between px-6">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity">
              Nonplo
            </a>
          </div>

          {/* Desktop Navigation - Hidden on tablet/mobile */}
          <div className="hidden lg:flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors px-3 py-2 rounded-md hover:bg-muted/50 whitespace-nowrap"
                >
                  {item.name}
                </a>
              ))}

              <div className="relative group">
                <Button variant="ghost" className="text-sm font-medium whitespace-nowrap p-3 h-auto group-hover:bg-muted/50">
                  Kaynaklar
                  <ChevronDown className="ml-1 h-3 w-3 transition-transform group-hover:rotate-180" />
                </Button>
                <div className="absolute top-full left-0 mt-1 w-[200px] bg-background/95 backdrop-blur-sm border border-border/20 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="p-2">
                    {resourcesItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className="block px-3 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-3 ml-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className="whitespace-nowrap bg-muted hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all duration-200"
                >
                  Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/account')}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <User className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 ml-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/auth')}
                  className="whitespace-nowrap"
                >
                  Giriş Yap
                </Button>
                <Button 
                  variant="hero" 
                  size="sm" 
                  onClick={() => navigate('/auth?mode=signup')}
                  className="whitespace-nowrap"
                >
                  Kayıt Ol
                </Button>
              </div>
            )}
          </div>

          {/* Tablet/Mobile Auth Buttons - Only visible on tablet when navigation is hidden */}
          <div className="hidden md:flex lg:hidden items-center space-x-2">
            {user ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/dashboard')}
                  className="text-xs px-2 bg-muted hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all duration-200"
                >
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/account')}
                  className="flex items-center gap-1 text-xs px-2"
                >
                  <User className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/auth')}
                  className="text-xs px-2"
                >
                  Giriş
                </Button>
                <Button 
                  variant="hero" 
                  size="sm" 
                  onClick={() => navigate('/auth?mode=signup')}
                  className="text-xs px-2"
                >
                  Kayıt
                </Button>
              </>
            )}
          </div>

          {/* Mobile/Tablet Menu */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 z-[60]">
                <div className="flex flex-col space-y-4 mt-8">
                  {navigationItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}

                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Kaynaklar</p>
                    {resourcesItems.map((item) => (
                      <a
                        key={item.name}
                        href={item.href}
                        className="block text-foreground hover:text-primary transition-colors py-2 pl-4"
                        onClick={() => setIsOpen(false)}
                      >
                        {item.name}
                      </a>
                    ))}
                  </div>

                  {/* Auth Section */}
                  <div className="border-t pt-4">
                    {user ? (
                      <div className="space-y-3">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start bg-muted hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600 hover:text-white transition-all duration-200"
                          onClick={() => { navigate('/dashboard'); setIsOpen(false); }}
                        >
                          Dashboard
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start gap-2"
                          onClick={() => { navigate('/account'); setIsOpen(false); }}
                        >
                          <User className="w-4 h-4" />
                          Hesabım
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button 
                          variant="ghost" 
                          className="w-full"
                          onClick={() => { navigate('/auth'); setIsOpen(false); }}
                        >
                          Giriş Yap
                        </Button>
                        <Button 
                          variant="hero" 
                          className="w-full"
                          onClick={() => { navigate('/auth?mode=signup'); setIsOpen(false); }}
                        >
                          Kayıt Ol
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
