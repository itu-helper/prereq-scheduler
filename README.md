<div align="center">

![GitHub repo size](https://img.shields.io/github/repo-size/itu-helper/prereq-scheduler?label=Repository%20Size&logo=github&style=flat-square)
![GitHub](https://img.shields.io/github/license/itu-helper/prereq-scheduler?label=License&style=flat-square)
![GitHub issues](https://img.shields.io/github/issues-raw/itu-helper/prereq-scheduler?label=Issues&style=flat-square)

# **ITU Helper**

</div>
    
<div align="left">
    <img src="https://raw.githubusercontent.com/itu-helper/home/main/images/logo.png" align="right"
     alt="ITU Helper Logo" width="180" height="180">
</div>
<div align="center">

_İTÜ'lüler için İTÜ'lülerden_

_ITU Helper_ İstanbul Teknik Üniversitesi öğrencilerine yardım etmek amacıyla ön şart görselleştirme, ders planı oluşturma ve resmi İTÜ sitelerini
birleştirme gibi hizmetler sağlayan bir açık kaynaklı websitesidir.

_ITU Helper_'a [_bu adresten_](https://itu-helper.github.io/home/) ulaşabilirsiniz.

</div>

# **itu-helper/prereq-scheduler**

## **Ne İşe Yarar?**

[itu-helper/sdk](https://github.com/itu-helper/sdk) _repo_'su aracılığıyla ön şart görselleştirme ve ders planı oluşturmayı sağlar.

### **Ön Şart Diyagramı (prerequsitory_chains)**

> 🌐 [Bu](https://itu-helper.github.io/prereq-scheduler/prerequsitory_chains) adresten ulaşabilirsiniz.

Seçtiğiniz programın ön şartlarını görselleştirir. Tıklanan dersin bağladığı ve ön şartı olan tüm dersleri (ön şart zincirini) görselleştirir.

### **Ders Planı Oluşturucu (schedule_creator)**

> 🌐 [Bu](https://itu-helper.github.io/prereq-scheduler/schedule_creator) adresten ulaşabilirsiniz.

Manuel olarak CRN girmeden ders planı oluşturmanızı sağlar. Girilen derslerin tüm olası CRN kombinasyonlarını listeler.

Filtreler ile bu kombinasyonları daraltmaya olanak sağlar.

**Desteklenen Filtreler:**
- Öğretim Görevlisi Filtresi
- Zaman Slotu Filtresi (Günün belirli saatlerinin dolu olarak işaretlenmesi).
- Bölüm Filtresi.

Akıllı uyarılar ile istemsiz hataların önüne geçer.

**Desteklenen Akıllı Uyarılar**
- Kampüs uyarısı (iki farklı kampüste yakın zamanda dersler seçildiyse uyarı verir.)
- Yemek saati uyarısı (İTÜ yemekhane saatlerinden bir öğünün tamamını ders saatleri kapatıyor ise uyarı verir.)

