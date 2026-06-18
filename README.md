# Detroit Pride Innovation Summit 2026

The website for the [Detroit Pride Innovation Summit 2026](https://pridemi26.vercel.app/). Built with Vite, React, and Tailwind CSS.

Organized by **Compass Detroit** in partnership with **GDG Detroit** and **Other Organizations**.

Hero animation is a custom WebGL animation created with Three.js and lil-gui. It is used to create the pride trail effect on the hero section. Author of initial effect attribution: [Sabo Sugi](https://x.com/sabosugi/). Effect enhanced and customized by **[Greg Miller](https://github.com/shrinkray)** for Compass Detroit.

## Quick Start

### Prerequisites

- Node.js 22+
- npm

### Recommended VS Code Extensions

This project includes VS Code extension recommendations. When you open the project in VS Code, you'll be prompted to install:

- **ESLint** (`dbaeumer.vscode-eslint`) — Code linting and Tailwind CSS class ordering
- **Prettier** (`esbenp.prettier-vscode`) — Code formatting
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) — Autocomplete and IntelliSense
- **axe Accessibility Linter** (`deque-systems.vscode-axe-linter`) — Real-time accessibility linting

### Installation

```bash
git clone <repo-url>
cd pridemi26
npm install
npm run dev
```

Navigate to `http://localhost:5173`. Customize the port in `vite.config.js` if needed.

## Theme Switcher

The site supports two color themes — **Purple** (default) and **Blue**. A floating palette button in the bottom-right lets visitors toggle between them.

Themes work via CSS custom properties defined in `src/index.css`. The `iwd.gold` and `iwd.black` Tailwind tokens reference these variables, so the entire site re-themes instantly with zero component changes.

- Theme preference persists in `localStorage`
- Context: `src/components/ui/ThemeContext.jsx`
- Toggle UI: `src/components/ui/ThemeSwitcher.jsx`

## Docker

This application can be containerized using Docker for easy deployment and consistent environments.

### Prerequisites

- Docker installed on your system
- Basic understanding of Docker commands

### Building the Docker Image

1. Build the Docker image:

```bash
docker build -t pridemi26 .
```

2. Run the container:

```bash
docker run -p 3000:3000 pridemi26
```

3. Open your browser and navigate to `http://localhost:3000`

### Docker Commands

| Command                                                   | Description                                     |
| --------------------------------------------------------- | ----------------------------------------------- |
| `docker build -t pridemi26 .`                             | Build the Docker image                          |
| `docker run -p 3000:3000 pridemi26`                       | Run the container on port 3000                  |
| `docker run -d -p 3000:3000 --name pridemi-app pridemi26` | Run container in detached mode with custom name |
| `docker stop pridemi-app`                                 | Stop the running container                      |
| `docker rm pridemi-app`                                   | Remove the container                            |
| `docker images`                                           | List all Docker images                          |
| `docker rmi pridemi26`                                    | Remove the Docker image                         |

### Environment Variables

The **front-end application** requires no environment variables at runtime.

The **import pipeline** (`scripts/sanity-import/`) requires a `.env` file (gitignored) with Sanity and Google credentials. See `scripts/sanity-import/.env.example` and `n8n/RUNBOOK.md` for setup instructions.

### Docker Features

- **Alpine Linux base**: Lightweight and secure
- **Non-root user**: Enhanced security by running as non-root user
- **Multi-stage optimization**: Efficient image size
- **Production-ready**: Uses Vite preview for serving the built application

## Development Scripts

| Command                   | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `npm run dev`             | Start the development server via Vite                         |
| `npm run dev:cms`         | Fetch latest Sanity content, then start dev server            |
| `npm run fetch:event-data`| Pull speakers/sessions from Sanity into `speakers.generated.json` |
| `npm run studio:dev`      | Start local Sanity Studio at `http://localhost:3333`            |
| `npm run build`           | Fetch from Sanity, then build for production                  |
| `npm run preview`         | Create a preview of the production build locally              |
| `npm run lint`            | Check code for linting errors (includes Tailwind class order) |
| `npm run lint:fix`        | Automatically fix linting errors                              |
| `npm run format`          | Format code with Prettier                                     |
| `npm run format:check`    | Check code formatting with Prettier                           |
| `npm run commitlint`      | Validate commit message format                                |
| `npm run import:speakers` | Run the Google Sheets → Sanity speaker import script          |

## Project Structure

```text
public/                 # Static files at site root (robots.txt, sitemap.xml, social-card.jpg)
studio/                 # Sanity Studio (separate app — see studio/README.md)
scripts/sanity-import/  # Speaker import scripts for n8n / manual runs
n8n/                    # n8n workflow docs and sheet templates
src/
├── assets/             # Images, fonts, and static assets
├── components/         # UI components
├── constants/          # Application constants
├── data/               # Static data and content (e.g. devs, facilitators, organizers, speakers, and sponsors - Contains multiple years)
├── layouts/            # Section layout components
└── pages/              # Page components
```

## Content pipeline

Speaker and session data lives in **Sanity Studio** (`production` dataset). The site pulls it at build time — no n8n required for day-to-day edits.

### Edit in Studio (current workflow)

```
Sanity Studio (local :3333 or pridemi26.sanity.studio)
        ↓
npm run fetch:event-data  →  speakers.generated.json
        ↓
npm run dev  (or Vercel deploy for production)
```

| Studio | URL | Command |
| ------ | --- | ------- |
| Local | `http://localhost:3333` | `npm run studio:dev` |
| Cloud | [pridemi26.sanity.studio](https://pridemi26.sanity.studio/) | `cd studio && npm run deploy` |

Both studios edit the **same** cloud dataset. After publishing changes, run `npm run dev:cms` to see them on the local site.

### Bulk import (when n8n is available)

```
Google Sheet (speaker data)
        +
Google Drive folder (headshots)
        ↓
  n8n workflow (self-hosted)
        ↓
  import-speakers.mjs
        ↓
  Sanity Studio (cloud)
        ↓
  Vercel deploy hook → site rebuild
```

### Import script

```bash
npm run import:speakers
```

Requires `scripts/sanity-import/.env` (gitignored). Copy from `.env.example` and fill in credentials. See `.env.schema` for full documentation of each variable.

### Pipeline files

| Path                                          | Purpose                                 |
| --------------------------------------------- | --------------------------------------- |
| `scripts/sanity-import/import-speakers.mjs`   | Import engine                           |
| `scripts/sanity-import/lib/google.mjs`        | Google Sheets + Drive API client        |
| `scripts/sanity-import/lib/sanity-client.mjs` | Sanity mutations + asset upload         |
| `scripts/sanity-import/.env.example`          | Environment variable template           |
| `.env.schema`                                 | varlock schema — documents all env vars |
| `n8n/RUNBOOK.md`                              | Full setup and repeat runbook           |
| `n8n/sheet-template-speakers.md`              | Google Sheet column spec                |
| `n8n/workflows/speakers-import.example.json`  | Importable n8n workflow starter         |

## SEO & social sharing

Search engines and social platforms read static files and `index.html` directly — they do not run the React app.

| File                                      | Purpose                                                 |
| ----------------------------------------- | ------------------------------------------------------- |
| `public/robots.txt`                       | Crawler rules and sitemap location                      |
| `public/sitemap.xml`                      | List of public routes for search engines                |
| `public/social-card.jpg`                  | Preview image when links are shared                     |
| `index.html`                              | Canonical URL, Open Graph, and Twitter/X card meta tags |
| `src/components/ui/SEOStructuredData.jsx` | JSON-LD event schema on the homepage                    |

**Public routes in the sitemap** (from `src/App.jsx`):

- `/`
- `/careers-hub`
- `/connections`
- `/media`
- `/past-events`

Excluded from the sitemap: `/playground/*` (internal design previews), `/previous-events` (redirect), and 404 routes.

**When you add a public page**, add a `<url>` entry to `public/sitemap.xml` and bump `<lastmod>`.

**When the production domain changes**, update URLs in:

- `public/robots.txt`
- `public/sitemap.xml`
- `index.html` (canonical, `og:*`, `twitter:*`)
- `src/components/ui/SEOStructuredData.jsx`

**Verify after deploy:**

```bash
npm run build
# confirm dist/robots.txt and dist/sitemap.xml exist

curl https://pridemi26.vercel.app/robots.txt
curl https://pridemi26.vercel.app/sitemap.xml
```

Test link previews with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/).

**Note:** Subpages share the homepage Open Graph tags until per-route meta tags are added (e.g. `react-helmet-async`). For this event site, that is usually fine.

## Related projects in this repo

| Path                                   | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| [`studio/README.md`](studio/README.md) | Sanity Studio — content model, datasets, deploy |
| [`n8n/README.md`](n8n/README.md)       | Google Sheet → Sanity import workflow           |

## Development

### Code Style

This project uses ESLint and Prettier for code quality and formatting:

- Run `npm run lint` to check for linting issues
- Run `npm run format:check` to check code formatting
- Use `npm run lint:fix` and `npm run format` to automatically fix issues

Run format and lint commands from the **repository root** — CI uses the root `package.json`. The `studio/` folder is a separate app with its own Prettier config; use `npx prettier --write .` inside `studio/` for Studio-only files.

### Git Hooks

This project uses Husky and lint-staged to automatically enforce code quality:

- **Pre-commit hook** - Automatically runs ESLint and Prettier on staged files before each commit
- **Automatic formatting** - Code is automatically formatted and linted before commits
- **No manual intervention** - The hooks will fix issues automatically when possible

**How it works:**

1. When you run `git commit`, the pre-commit hook triggers
2. lint-staged runs ESLint and Prettier on only the files you're committing
3. If there are fixable issues, they're automatically resolved
4. If there are unfixable issues, the commit is blocked until you fix them manually
5. Once all issues are resolved, the commit proceeds

### Conventional Commits

This project enforces the [Conventional Commits](https://www.conventionalcommits.org/) specification for clear, consistent commit messages:

- **Commit-msg hook** - Automatically validates commit message format before each commit
- **Consistent history** - All commits follow a standardized format
- **Automation ready** - Enables automated changelog generation and semantic versioning

**Commit Message Format:**

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Supported Types:**

- `feat` - A new feature
- `fix` - A bug fix
- `docs` - Documentation changes
- `style` - Formatting, missing semicolons, etc.
- `refactor` - Code change that neither fixes a bug nor adds a feature
- `test` - Adding or correcting tests
- `chore` - Maintenance
- `perf` - Performance improvements
- `ci` - CI/CD changes
- `build` - Build system changes
- `revert` - Revert a previous commit

**Examples:**

```bash
feat: add user authentication
fix: resolve memory leak in data processing
docs: update API documentation
style: fix code formatting issues
refactor: simplify user validation logic
test: add unit tests for payment module
chore: update dependencies
```

**How it works:**

1. When you run `git commit`, the commit-msg hook triggers
2. commitlint validates your commit message against the conventional format
3. If the message is invalid, the commit is blocked with helpful error messages
4. If the message is valid, the commit proceeds normally

### Accessibility

This project prioritizes accessibility and uses several tools to ensure inclusive design:

- **VS Code axe Accessibility Linter** - Real-time accessibility linting in the editor (when extension is installed)
- **ESLint Tailwind plugin** - Detects class ordering issues for better maintainability
- **ResponsiveImage component** - Provides proper alt text fallbacks and modern image formats
- **Semantic HTML** - Uses proper heading hierarchy and landmark elements
- **Manual accessibility testing** - Regular testing with browser accessibility tools

**Accessibility Guidelines**: This project follows WCAG 2.1 guidelines and includes proper ARIA labels, keyboard navigation support, and semantic HTML structure.

**Note**: If the axe Accessibility Linter extension is not available, you can use browser-based accessibility tools like:

- [axe DevTools browser extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [WAVE Web Accessibility Evaluator](https://wave.webaim.org/)
- Built-in browser accessibility inspectors

### Tailwind CSS Class Ordering

This project uses a **manual class ordering** approach for optimal control and reliability:

1. **ESLint Tailwind plugin** detects when classes are out of order and shows warnings
2. **Developers manually fix** the class order when warnings appear
3. **Follows official Tailwind CSS class order** for consistency

**Benefits of manual ordering:**

- ✅ **Full control** over class organization
- ✅ **No conflicts** between different tools
- ✅ **Reliable** across all file types (JSX, HTML, etc.)
- ✅ **Team consistency** through ESLint warnings

**Class order reference:** Layout → Sizing → Spacing → Typography → Backgrounds → Effects → Transitions → Hover states

**Why not use Prettier Tailwind plugin:**

- ❌ **Layout breaking** - Plugin reorders classes that break specific layouts
- ❌ **Inconsistent behavior** - Plugin sometimes fails to sort classes properly
- ❌ **Version conflicts** - Plugin compatibility issues with different Prettier versions
- ❌ **Debugging complexity** - Hard to troubleshoot when sorting doesn't work as expected
- ❌ **Tool conflicts** - Can interfere with other formatting rules
- ✅ **Manual control** - Developers maintain full control over class organization

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

### Deployment

The site is deployed on [Vercel](https://vercel.com) and uses Vercel Analytics and Speed Insights. Deployment is triggered automatically when changes are merged to `main` via the GitHub integration.

**Vercel configuration**:

- `vercel.json` – SPA rewrites so client-side routes (e.g. `/past-events`) resolve correctly
- `base: './'` in Vite config – Output works with Vercel’s static hosting
- `public/robots.txt` and `public/sitemap.xml` – Copied to `dist/` at build time and served as static files (before SPA rewrites)

**To deploy manually** (e.g. from a fork):

1. Connect the repository to Vercel
2. Use the default Vite preset (build command: `npm run build`, output directory: `dist/`)
3. Deploy

**Alternative**: Use [Docker](#docker) for self-hosted deployments.

## Attribution

### Hero background (Three.js)

The landing hero uses a **WebGL pride trail animation** powered by [Three.js](https://threejs.org/) and a custom scene in this repository.

| Credit                         | Details                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Three.js**                   | Copyright © 2010–2026 [three.js authors](https://github.com/mrdoob/three.js). [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE). Used for WebGL rendering, shader materials, and post-processing (`EffectComposer`, `UnrealBloomPass`, `SMAAPass`, and related addons under `three/addons`).                                                        |
| **Initial pride trail effect** | [Sabo Sugi](https://www.reddit.com/user/CollectionBulky1564/) — original WebGL concept and shaders adapted for this site.                                                                                                                                                                                                                                             |
| **Site integration**           | [Greg Miller](https://github.com/shrinkray) (Compass Detroit) — React integration, Gilbert Baker rainbow palette, performance and accessibility behavior (static fallback, mobile pause), and scene wiring in `src/layouts/prideTrailScene.js` and `src/layouts/LandingSectionPride.jsx`. Dev-only tuning UI uses [lil-gui](https://github.com/georgealways/lil-gui). |
| **Static hero fallback**       | When animation is off (mobile viewport, `prefers-reduced-motion`, user pause, or mobile nav over the hero), the site shows poster frames in `src/assets/images/hero/` (`hero-trails.webp`, `hero-trails-800x.webp`, `hero-trails.png`) instead of running the WebGL loop.                                                                                             |

Dependency versions: `three`, `lil-gui` (see `package.json`).

### Issues

This project uses GitHub Issues & GitHub Projects in the [Compass-Detroit/pridemi26](https://github.com/Compass-Detroit/pridemi26) repository for tracking development. Please create an issue if you encounter any problems or have suggestions for improvements.

### Pull Requests

Please submit a pull request for any changes you'd like to make.
