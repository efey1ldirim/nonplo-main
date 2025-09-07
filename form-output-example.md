# Agent Creation Wizard Form Çıktı Örneği

Bu örnek, wizard formundaki tüm bilgilerin prompt oluşturma ajana nasıl gönderildiğini gösterir:

## Örnek Form Verileri

Kullanıcı wizard formunda şu bilgileri girdiğini varsayalım:

### 1. İşletme Bilgileri (Adım 1-2)
- **Sektör**: "Restoran & Yiyecek"
- **İşletme Adı**: "Lezzet Durağı"
- **Hizmet Türü**: "Yemek Servisi ve Rezervasyon"
- **Konum**: "Kadıköy, İstanbul"
- **Adres**: "Moda Caddesi No:45, Kadıköy/İstanbul"
- **Website**: "https://lezzetduragi.com"

### 2. Sosyal Medya (Adım 2)
- **Instagram**: "@lezzetduragi"
- **Twitter**: "@lezzetduragi_tr"
- **TikTok**: "lezzetduragiofficial"

### 3. Çalışma Saatleri (Adım 3)
- **Pazartesi**: 09:00-22:00
- **Salı**: 09:00-22:00
- **Çarşamba**: 09:00-22:00
- **Perşembe**: 09:00-22:00
- **Cuma**: 09:00-23:00
- **Cumartesi**: 10:00-23:00
- **Pazar**: Kapalı
- **Tatil Günleri**: "Dini bayramlarda kapalı"

### 4. Ürün/Hizmet Bilgileri (Adım 4)
- **FAQ**: "Rezervasyon nasıl yapılır? Telefon ile 0216-123-4567 veya website üzerinden. Menümüzde vegan seçenekler var mı? Evet, özel vegan menümüz bulunuyor."
- **Ürünler/Hizmetler**: "Türk mutfağı, pizza, pasta, vegan menü, çocuk menüsü. Doğum günü organizasyonu, grup yemekleri, catering hizmetleri."

### 5. Kişilik ve Davranış (Adım 5-6)
- **Konuşma Tonu**: "friendly"
- **Yanıt Uzunluğu**: "Orta (2-3 cümle)"
- **Kullanıcı Doğrulama**: "Telefon numarası ile"
- **Görev Tanımı**: "Müşteri rezervasyonlarını almak, menü hakkında bilgi vermek, özel istekleri karşılamak ve genel müşteri hizmetleri sağlamak."

### 6. Araçlar ve Entegrasyonlar (Adım 7-8)
- **Araçlar**: 
  - Website Entegrasyonu: ✓
  - Takvim Rezervasyonu: ✓
  - WhatsApp Entegrasyonu: ✓
  - E-mail Bildirimleri: ✓
- **Entegrasyonlar**:
  - WhatsApp: ✓
  - Instagram: ✓

---

## Prompt Oluşturma Ajana Gönderilen Tam Çıktı

```
İşletme Bilgileri:
- İşletme Adı: Lezzet Durağı
- Sektör: Restoran & Yiyecek
- Hizmet Türü: Yemek Servisi ve Rezervasyon

İletişim Bilgileri:
- Adres: Moda Caddesi No:45, Kadıköy/İstanbul
- Konum: Kadıköy, İstanbul
- Website: https://lezzetduragi.com
- Instagram: @lezzetduragi
- Twitter: @lezzetduragi_tr
- TikTok: lezzetduragiofficial

Çalışma Bilgileri:
- Çalışma Saatleri:
Pazartesi: 09:00-22:00
Salı: 09:00-22:00
Çarşamba: 09:00-22:00
Perşembe: 09:00-22:00
Cuma: 09:00-23:00
Cumartesi: 10:00-23:00
Pazar: Kapalı
- Tatil Günleri: Dini bayramlarda kapalı

Ürün/Hizmet Bilgileri:
- Ürünler/Hizmetler: Türk mutfağı, pizza, pasta, vegan menü, çocuk menüsü. Doğum günü organizasyonu, grup yemekleri, catering hizmetleri.
- Sık Sorulan Sorular: Rezervasyon nasıl yapılır? Telefon ile 0216-123-4567 veya website üzerinden. Menümüzde vegan seçenekler var mı? Evet, özel vegan menümüz bulunuyor.

Görev ve Kişilik:
- Görev Tanımı: Müşteri rezervasyonlarını almak, menü hakkında bilgi vermek, özel istekleri karşılamak ve genel müşteri hizmetleri sağlamak.
- Dil: friendly
- Yanıt Uzunluğu: Orta (2-3 cümle)
- Kullanıcı Doğrulama: Telefon numarası ile

Araçlar ve Entegrasyonlar:
- Aktif Araçlar: Website Entegrasyonu, Takvim Rezervasyonu, WhatsApp Entegrasyonu, E-mail Bildirimleri
- Aktif Entegrasyonlar: WhatsApp, Instagram
```

---

## Önceki Durumla Karşılaştırma

### ❌ Önceden (Eksik Bilgiler):
```
Generate playbook instruction for:

Name: Lezzet Durağı
Description: [Sadece açıklama]
Tone: friendly
Greeting Style: warm
Language: friendly
```

### ✅ Şimdi (Tam Bilgiler):
- ✅ Tüm işletme bilgileri
- ✅ Sosyal medya hesapları  
- ✅ Detaylı çalışma saatleri
- ✅ FAQ ve ürün bilgileri
- ✅ Görev tanımı ve kişilik
- ✅ Seçilen araçlar ve entegrasyonlar
- ✅ İletişim bilgileri
- ✅ Tatil günleri ve özel durumlar

Bu sayede prompt oluşturan AI agent artık çok daha detaylı ve kişiselleştirilmiş promptlar üretebilecek.