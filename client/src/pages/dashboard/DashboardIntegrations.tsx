import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Instagram, Chrome, Wrench } from "lucide-react";

const DashboardIntegrations: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Wrench className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Entegrasyonlar</h1>
          <p className="text-muted-foreground">
            Acenteniz için çeşitli entegrasyonları yönetin
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Under Development Message */}
        <Card className="border-2 border-dashed border-gray-300 dark:border-gray-700">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bu sayfa geliştirilme aşamasındadır
            </h3>
            <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
              WhatsApp, Instagram DM, Google Profili ve diğer iletişim kanalları yakında eklenecek
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Integrations Preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-lg">WhatsApp</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yakında gelecek
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center">
                  <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <CardTitle className="text-lg">Instagram DM</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yakında gelecek
              </p>
            </CardContent>
          </Card>

          <Card className="opacity-50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg">Google Profili</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yakında gelecek
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardIntegrations;