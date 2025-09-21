import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Wrench } from "lucide-react";

const DashboardIntegrations: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Kanallar</h1>
          <p className="text-muted-foreground">
            Çeşitli iletişim kanalları ve entegrasyonları yönetin
          </p>
        </div>
      </div>

      <Card className="text-center py-16">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Settings className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Geliştirme Aşamasında</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground max-w-md mx-auto">
            Kanallar özelliği şu anda geliştirme aşamasındadır. 
            Yakında WhatsApp, Instagram, Google Takvim ve diğer entegrasyonları burada yönetebileceksiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardIntegrations;