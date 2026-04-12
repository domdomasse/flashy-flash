# Flashmob

Plateforme de revision pour lyceens. SPA vanilla JS, mobile-first.

## Lancer le site en local

Le site a besoin d'un serveur HTTP local pour fonctionner (les modules JS et le chargement des donnees ne marchent pas en ouvrant directement le fichier HTML).

### Lancement rapide (script)

| Systeme | Fichier | Action |
|---------|---------|--------|
| **Linux** | `start.sh` | Double-clic ou `./start.sh` dans le terminal |
| **macOS** | `start.command` | Double-clic (ouvre Terminal automatiquement) |
| **Windows** | `start.bat` | Double-clic |

Le script lance un serveur sur `http://localhost:8080` et ouvre le navigateur. Pour arreter : `Ctrl+C` dans le terminal.

### Lancement manuel

Si les scripts ne fonctionnent pas, ouvrir un terminal dans le dossier du projet et lancer :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080` dans le navigateur.

> **Note :** Python 3 est requis. Il est pre-installe sur macOS et la plupart des distributions Linux. Sur Windows, installer depuis [python.org](https://www.python.org/downloads/).

### macOS — instructions detaillees

1. Ouvrir **Terminal** (Applications > Utilitaires > Terminal)
2. Naviguer vers le dossier du projet :
   ```bash
   cd /chemin/vers/flashmob
   ```
3. Lancer le serveur :
   ```bash
   python3 -m http.server 8080
   ```
4. Ouvrir Safari ou Chrome a l'adresse `http://localhost:8080`
5. Pour arreter le serveur : `Ctrl+C` dans le terminal

## Panneau admin

L'outil admin permet de generer de nouveaux chapitres a partir de photos ou PDF de cours. Il necessite une cle API Claude.

| Systeme | Fichier |
|---------|---------|
| **Linux** | `admin/start.sh` |
| **Windows** | `admin/start.bat` |

Le panneau admin se lance sur `http://localhost:8000`.
