# SIKTR.IO — Doğrulama notları

## Otomatik kontroller

- `npm run build`, uygulamayı ve Three.js'i tek HTML dosyasına toplar. JavaScript sözdizimini çıktı yazılmadan denetler; Three.js MIT lisansını korur.
- `npm test`: 22 test. Deterministik kayıt/yeniden oynatma, çarpışma momentumu, bağırma konisi ve geri tepme, kafa atma, tutma/fırlatma, düşerek elenme, altı arena, botlar, kaygan zemin, yaylı gövde toparlanması, güçlendirmeler, kaos zamanlaması, arena engelleri, kamera sınırları, kontrolcü bağlantısı, ses kapatma ve tek dosya paketi denetlenir.
- 90 bot maçının tamamı 50–222 simülasyon saniyesinde sonuçlandı; ortanca süre 145 saniye. Arena bazında ortanca süreler 136–153 saniyeydi. Botlar saldırı beklerken rakiplerinin çevresinde konum alır.
- Yerel sunucu hatalı URL kodlamasında 400 döndürür ve çalışmaya devam eder.

## Tarayıcı kontrolleri

15 Eylül 2026 tarihinde yerel sunucu üzerinden altı arena, oyun başlatma, klavye hareketi ve bağırma, karakter seçimi, iki kişilik klavye, ses düğmesi, duraklatma, ana menü ve otomatik raund geçişleri kontrol edildi. Konsolda hata veya uyarı görülmedi.

1920×1080 çözünürlükte ısınmış çatı sahnesinde 159–180 FPS, park sahnesinde 180 FPS örnekleri ölçüldü. Eşzamanlı test yükü sırasında 30–46 FPS örnekleri de görüldü. Bunlar her cihaz için sabit bir alt sınır garantisi değildir; ilk yükleme ve arena kurulumunda kısa gecikmeler olabilir.

Doğrudan dosya açma senaryosu tarayıcı test ortamının URL kısıtı nedeniyle doğrulanamadı. Paket tüm çalışma zamanı kodunu içerir; harici görsel, ses veya betik bağlantısı gerektirmez. Oynanış yerel sunucuda, tek dosya yapısı otomatik testte doğrulandı.

## Mevcut kapsam

Çok oyunculu mod yereldir. Çevrimiçi P2P uygulanmadı. Fiziksel oyun kolu donanımıyla tarayıcı testi yapılmadı; kontrolcü sahipliği ve bağlantı kesilmesi otomatik testlerde denetlendi. Sesler sentezlenir. Fizik kapsül çarpışmaları ve altı yaylı gövde bölümü kullanır; küçük dekorlar çarpışmaz. Görseller tamamen prosedüreldir.
