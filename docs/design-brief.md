# Taproom TV — brief de design UI/UX

Versiune: 16 septembrie 2026. Autor: Nichita (Taproom by Litra & Friends).

## 1. Ce este produsul

Taproom by Litra & Friends este un pub de bere artizanală și BBQ din Chișinău,
cu două locații (Centru și Buiucani). În fiecare locație sunt 5–10 televizoare
care arată **aceeași imagine**: un poster mare care se rotește, o coloană cu
următoarele meciuri de fotbal și o bandă jos cu brandul, următorul meci și ora.

Produsul are două fețe:

| Suprafață | Cine o vede | Unde rulează | Dimensiune de referință |
| --- | --- | --- | --- |
| **Player TV** | clienții din bar, de la 3–8 metri | Chrome pe un mini PC Windows + boxe Android TV Xiaomi (1–2 GB RAM) | 1920×1080, scalat automat la orice ecran |
| **Admin** | Nichita și managerii, de pe telefon, cu o mână, din spatele barului | Safari / Chrome pe telefon | 390×844 (iPhone), desktop secundar |

Versiunea funcțională există deja și rulează:

- Player: https://taproom-tv.netlify.app/tv (cu `?debug=1` apare un overlay tehnic, ignoră-l)
- Admin: https://taproom-tv.netlify.app/admin (parola o primești separat)
- Cod: https://github.com/Nikita1129/tap_ecrane

Ce vedem acum este un design „de programator”: funcționează, dar nu are
identitate. **Sarcina ta este să dai identitate vizuală și claritate acestor
două suprafețe, fără să schimbi ce fac.** După ce designul este gata, Claude
Code implementează după Figma. De aceea structura de ecrane, stări și câmpuri
de mai jos este fixă: tot ce desenezi trebuie să se potrivească pe ea.

## 2. Cum lucrăm

1. Citești acest brief și deschizi player-ul și adminul pe telefon și pe laptop.
2. Faci designul în Figma, pe frame-urile din secțiunea 7.
3. Trimiți link Figma (view + Dev Mode). Nichita dă link-ul lui Claude Code
   împreună cu textul din secțiunea 9, iar implementarea se face după design.
4. O rundă de corecturi după implementare.

Reguli:

- **Nu adăugăm ecrane sau funcții.** Nu există conturi, roluri, notificări,
  statistici, teme, multi-locație. Dacă simți că lipsește ceva, notează-l
  separat, nu-l desena în flux.
- **Textele din interfață sunt în română.** Le poți reformula ca să fie mai
  clare, dar sensul rămâne.
- **Playerul este HTML static, fără framework.** Designul lui trebuie să se
  poată face din CSS simplu (vezi secțiunea 4, constrângeri).

## 3. Brand și ton

- Nume: **Taproom by Litra & Friends**. Bere artizanală proprie (Litra Brewing), BBQ, fotbal pe ecrane.
- Ton: cald, direct, „de pub”, nu corporate și nu hipster-minimalist. Publicul stă la bar, cu berea în mână, la 5 metri de ecran.
- Paleta curentă (poate fi înlocuită, este un punct de plecare): fundal `#0b0a09`, panouri `#151311`, text `#f3ede4`, accent chihlimbar `#f2a93b`, accent „hot” roșu-jar `#e2492e`.
- Tema este **întunecată** pe ambele suprafețe: barul are lumină scăzută, un ecran alb orbește. Posterele în sine pot fi luminoase.
- Fonturi: alege maximum două familii (una display, una text). Trebuie să fie disponibile pe Google Fonts sau livrate ca fișiere; nu putem depinde de fonturi instalate pe TV.

## 4. Player TV

### 4.1 Zone fixe

Canvasul de design este 1920×1080. Playerul îl scalează singur pe orice
rezoluție, deci desenezi o singură dată.

| Zonă | Poziție și mărime | Conținut |
| --- | --- | --- |
| **Stage poster** | stânga, 1400×960 | posterul curent (imagine sau text) |
| **Coloană meciuri** | dreapta, 520×960 | titlu + până la 5 meciuri |
| **Bandă jos** | 1920×120 | brand · următorul meci · ceas |

Proporțiile pot fi ajustate dacă ai un argument bun, cu o singură excepție:
**stage-ul rămâne 1400×960**, pentru că imaginile încărcate sunt decupate
exact la această mărime și există deja postere produse așa.

### 4.2 Poster imagine

Un JPG 1400×960 livrat de admin, deja decupat. Se afișează 1:1, fără nimic
peste el: fără gradient, fără logo, fără ramă. Tot ce e „design” aici se
întâmplă în fișierul imaginii, nu în player.

### 4.3 Poster text

Playerul îl compune din câmpuri. Trebuie să desenezi cum arată cu toate
câmpurile și cu câmpuri lipsă.

| Câmp | Ce este | Exemplu |
| --- | --- | --- |
| `kicker` | rând mic deasupra titlului, opțional | „Happy hour” |
| `title` | mesajul principal, 1–3 rânduri, obligatoriu de fapt | „-20% la toate berile de la robinet” |
| `sub` | o propoziție de detaliu, opțional | „În fiecare zi, 12:00–17:00” |
| `pills` | 0–5 etichete scurte | „12:00–17:00”, „L–V”, „Centru” |
| `hot` | comutator: accentul devine roșu în loc de chihlimbar | folosit pentru urgență, meci mare, ultimele zile |

Stări de desenat: (a) toate câmpurile, accent chihlimbar; (b) toate
câmpurile, `hot`; (c) doar titlu, lung, 3 rânduri; (d) titlu + 5 pills.

Lizibilitate: titlul minimum ~100 px la 1920, corpul minimum ~30 px.
Testul real: se citește de la 6 metri.

### 4.4 Coloana meciuri

- Titlu de secțiune (acum „Următoarele meciuri”).
- Până la 5 rânduri, sortate după ora de start. Fiecare: **când** („Azi 21:00”, „Mâine 19:30”, „Vin 20.09 21:00”), **gazde – oaspeți**, **competiție** (opțional).
- Un meci rămâne în listă ~2 ore după start, marcat **LIVE**.
- Stare goală: „Niciun meci programat”.

### 4.5 Banda de jos

- Stânga: marca (acum text „TAPROOM / by Litra & Friends”; poate fi logo SVG).
- Mijloc: „Următorul meci: Real Madrid – Barcelona · Azi 21:00”.
- Dreapta: ceas HH:MM, cifre tabulare.
- **Stare alertă**: cu 15 minute înainte de start toată banda își schimbă culoarea și textul devine „ÎNCEPE ÎN 12 MIN · Real Madrid – Barcelona”. Trebuie să se observe din cealaltă parte a barului.

### 4.6 Constrângeri tehnice (nenegociabile)

Boxele Android au 1–2 GB RAM și rulează săptămâni fără restart.

- Fără `blur`, `backdrop-filter`, filtre CSS, umbre mari și moi, video, GIF, particule.
- Fără animații continue. O tranziție simplă de opacitate la schimbarea posterului este maximul.
- Fără gradient-uri complexe pe suprafețe mari (un gradient liniar simplu este ok).
- Fără imagini de fundal decorative mari; un pattern subtil sub 100 KB este acceptabil.
- Maximum două familii de fonturi, cu greutăți limitate (2–3).

## 5. Admin (telefon)

Prima regulă: **se folosește cu o mână, în picioare, în spatele barului,
în 30 de secunde între doi clienți.** Ținte de atingere minimum 44 px.
Lățime de design 390 px. Desktopul primește aceeași structură, mai lată.

Tot adminul are **o singură pagină** cu două tab-uri (Postere, Meciuri) și un
editor care se deschide peste listă. Plus ecranul de parolă.

### 5.1 Parolă

Un câmp, un buton „Intră”. Stări: gol, eroare „Parolă greșită”, blocat un
minut după 5 încercări, eroare de rețea.

### 5.2 Lista de postere

- Antet: brand, „Vezi TV” (deschide playerul), „Ieși”.
- Tab-uri: „Postere (3)”, „Meciuri (2)”.
- Butoane: „+ Poster imagine”, „+ Poster text”.
- Rânduri în **ordinea de rotație** (ordinea din listă = ordinea de pe ecran). Fiecare rând:
  - mâner de tras pentru reordonare (drag & drop cu degetul);
  - thumbnail (imaginea) sau o miniatură a posterului text;
  - număr + titlu;
  - meta: perioada („19 sept – 4 oct · 12:00–17:00 · L Ma Mi J V”, sau „Permanent”), secunde pe ecran, prioritate;
  - **stare**, cu trei valori care trebuie să se distingă instant: **Pe ecran** (activ și în perioadă), **În afara perioadei** (activ, dar azi/acum nu se arată; rămâne vizibil, nu ascuns), **Oprit** (dezactivat manual);
  - comutator activ/oprit;
  - acțiuni: Editează, Duplică, sus, jos, Șterge. Ștergerea cere confirmare **inline** (Da, șterge / Nu), nu dialog de sistem.
- Stare goală: „Niciun poster.”
- **Bara de salvare** fixă jos, mereu vizibilă: text de stare („Totul e salvat”, „Modificări nesalvate”, „Se salvează…”, „Salvat. TV-urile preiau în max. 5 min.”, eroare) + buton „Salvează”. Salvarea trimite tot, o singură dată.

### 5.3 Editor poster

Se deschide pe tot ecranul peste listă.

- Antet: „← Înapoi”, titlul („Poster imagine” / „Poster text”), „Gata”.
- **Previzualizare** în capul paginii, mereu vizibilă: un dreptunghi 1400:960 care arată **exact** playerul. Este un iframe cu playerul real, deci nu se desenează conținutul lui, doar containerul și eticheta de sub el.
- Tip: Imagine / Text (segmented).
- Dacă Imagine:
  - buton „Alege o poză” / „Schimbă poza”, cu hint (JPG, PNG, HEIC, max 15 MB);
  - **Cropper**, apare după alegerea pozei: cadru 1400:960 cu grilă 3×3, poza se trage cu un deget, se mărește cu două degete sau cu un slider; butoane „Decupează și încarcă”, „Întreagă” (fără decupare, cu benzi întunecate), „Anulează”;
  - stări de încărcare: „Se pregătește poza…”, „Se încarcă…”, „Imagine încărcată.”, eroare (peste 15 MB, format necitit, rețea).
- Dacă Text: Kicker, Titlu (2 rânduri), Subtitlu, Etichete (câmp + buton „+”, chips cu ×), comutator „Hot” cu explicație.
- Programare (toate opționale): Perioadă (de la / până la, inclusiv), Interval orar (de la / până la), Zile (7 butoane L Ma Mi J V S D, gol = toate).
- Prioritate 1–5 (segmented) cu hint „5 = apare de 5 ori mai des decât 1”.
- Secunde pe ecran (număr).
- Activ (comutator).

### 5.4 Meciuri

- Butoane: „+ Meci”, „Șterge meciurile vechi (n)” (apare doar când există meciuri mai vechi de 24 h).
- Carduri sortate după ora de start: Gazde vs Oaspeți, Competiție, data și ora (selector nativ), „Șterge”.
- Meciurile trecute apar estompate.
- Stare goală: „Niciun meci. Coloana din dreapta a TV-ului va fi goală.”

### 5.5 Stări globale

Se încarcă · eroare de rețea la încărcare · modificări nesalvate (și avertisment la părăsirea paginii) · salvat · sesiune expirată (revine la parolă).

## 6. Ce rămâne fix

- Structura de ecrane și câmpuri de mai sus.
- Stage-ul de 1400×960 și fișierele JPG deja decupate la această mărime.
- Fluxul de salvare: un buton, tot conținutul odată.
- Playerul rămâne HTML + CSS simplu.

Poți schimba liber: paletă, tipografie, spațiere, iconografie, forma
componentelor, ordinea elementelor într-un ecran, formularea textelor.

## 7. Livrabile în Figma

Frame-uri, cu numele exact de mai jos, ca să poată fi găsite ușor:

**TV (1920×1080)**
1. `TV / Poster imagine` — cu un poster real 1400×960 (folosește unul din `docs/screenshots` sau cere unul)
2. `TV / Poster text / complet`
3. `TV / Poster text / hot`
4. `TV / Poster text / doar titlu lung`
5. `TV / Poster text / 5 pills`
6. `TV / Meciuri goale`
7. `TV / Meci LIVE`
8. `TV / Alertă 15 min` (banda de jos în stare de alertă)

**Admin (390×844)**
9. `Admin / Parolă` + starea de eroare
10. `Admin / Postere / listă` — cu cele trei stări de rând vizibile în același frame
11. `Admin / Postere / confirmare ștergere`
12. `Admin / Postere / listă goală`
13. `Admin / Editor / imagine` — înainte de încărcare
14. `Admin / Editor / cropper`
15. `Admin / Editor / imagine încărcată`
16. `Admin / Editor / text`
17. `Admin / Editor / programare` (partea de jos a editorului: perioadă, ore, zile, prioritate, secunde, activ)
18. `Admin / Meciuri`
19. `Admin / Meciuri / gol`
20. `Admin / Bară de salvare` — cele 5 stări de text

**Admin (desktop, 1280 lățime)**
21. `Admin / Desktop / listă` — o singură adaptare, restul se deduce

**Sistem**
22. `Tokens` — culori (cu valori hex), tipografie (familie, mărime, greutate, line-height pentru fiecare rol), spațiere, raze, iconografie
23. `Componente` — buton (primar, secundar, periculos, ghost, mic), câmp, segmented, comutator, chip, badge de stare, card de poster, card de meci, bară de salvare

Plus: fonturile (link Google Fonts sau fișiere), logo/marca în SVG dacă propui una.

## 8. Criterii de acceptare

- Titlul unui poster text se citește de la 6 metri pe un TV de 43".
- Contrast text/fundal minimum 4.5:1 pe admin, 7:1 pe TV.
- Fiecare stare din secțiunile 4 și 5 are un frame.
- Adminul funcționează la 390 px fără derulare orizontală; toate țintele ≥ 44 px.
- Nimic din player nu depinde de efectele interzise la 4.6.
- Cele trei stări de poster (Pe ecran / În afara perioadei / Oprit) se disting și fără să citești textul.

## 9. Text pentru Claude Code (după ce Figma e gata)

> Implementează designul din acest fișier Figma: <link>. Proiectul este
> https://github.com/Nikita1129/tap_ecrane, brief-ul este în
> `docs/design-brief.md`. Respectă structura de ecrane, câmpuri și stări din
> brief; schimbă doar aspectul: culori, tipografie, spațiere, componente.
> Playerul (`public/tv.html`) rămâne HTML și CSS simplu, fără efectele
> interzise la secțiunea 4.6 din brief; păstrează blocul `DATA LOADING`
> neatins. Pentru admin folosește tokens din frame-ul `Tokens`. Verifică
> fiecare frame din secțiunea 7 la mărimea lui și arată-mi capturi de ecran
> înainte de push.

## 10. Capturi ale versiunii curente

În `docs/screenshots/`: `tv-player.png`, `admin-lista-postere.png`,
`admin-editor-text.png`, `admin-cropper.png`, `admin-meciuri.png`.
