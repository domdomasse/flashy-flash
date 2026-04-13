# Flashmob

Plateforme de revision pour lyceens. SPA vanilla JS, mobile-first.

## Lancer le site en local

Le site a besoin d'un serveur HTTP local pour fonctionner (les modules JS et le chargement des donnees ne marchent pas en ouvrant directement le fichier HTML).

| Systeme | Fichier | Action |
|---------|---------|--------|
| **Linux** | `start.sh` | Double-clic ou `./start.sh` dans le terminal |
| **macOS** | `start.command` | Double-clic (ouvre Terminal automatiquement) |
| **Windows** | `start.bat` | Double-clic |

Si le script ne fonctionne pas, ouvrir un terminal dans le dossier du projet et lancer :

```bash
python3 -m http.server 8000
```
Le script lance un serveur sur `http://localhost:8080` et ouvre le navigateur. Pour arreter : `Ctrl+C` dans le terminal.

## Panneau admin

L'outil admin permet de generer de nouveaux chapitres a partir de photos ou PDF de cours. Il necessite une cle API Claude.

| Systeme | Fichier | Action |
|---------|---------|--------|
| **Linux** | `admin/start.sh` | Double-clic ou `./admin/start.sh` dans le terminal |
| **macOS** | `admin/start.command` | Double-clic (ouvre Terminal automatiquement) |
| **Windows** | `admin/start.bat` | Double-clic |

Si le script ne fonctionne pas, ouvrir un terminal dans le dossier du projet et lancer :

```bash
python3 -m http.server 8000
```
Le panneau admin se lance sur `http://localhost:8000`.

> **Note :** Python 3 est requis. Il est pre-installe sur macOS et la plupart des distributions Linux. Sur Windows, installer depuis [python.org](https://www.python.org/downloads/).
