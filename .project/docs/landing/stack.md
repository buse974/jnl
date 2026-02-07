# JNL Service - Landing Page

## Stack
- HTML5 avec CSS inline dans `<style>` (index.html)
- JavaScript vanilla en bas de page
- Pas de framework, pas de build step

## Structure
- `index.html` - Page principale (tout le CSS + JS inline)
- `images/` - Assets images (logo, galerie)
- `Dockerfile` + `nginx.conf` - Déploiement
- `.github/workflows/deploy.yml` - CI/CD

## Conventions
- Styles inline dans le `<style>` du `<head>`
- Media queries : 1024px, 768px, 480px
- Variables CSS dans `:root`
- Sections : hero, services, jardin, bennes, about, zone, gallery, testimonials, cta, contact, footer
