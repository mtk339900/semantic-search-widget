# Installation

This guide covers everything you need to know about installing Nova.js, including system requirements, package managers, version management, and troubleshooting common installation problems.

## System Requirements

Before installing Nova.js, ensure your development environment meets these minimum requirements.

### Operating Systems

Nova.js runs on all major operating systems:

| OS | Minimum Version | Tested Versions |
|---|---|---|
| macOS | 12 (Monterey) | 12, 13, 14 (Sonoma) |
| Windows | 10 (build 19041+) | Windows 10, Windows 11 |
| Linux | Ubuntu 20.04 / Fedora 36 | Ubuntu 20.04/22.04, Fedora 36/38, Debian 11+ |

### Runtime Requirements

- **Node.js**: 18.0.0 or later (20.x LTS recommended)
- **npm**: 9.0.0 or later
- **yarn**: 1.22.0 or later (optional)
- **pnpm**: 8.0.0 or later (optional)
- **Git**: 2.30.0 or later (for project initialization)

### Hardware Recommendations

While Nova.js will run on any modern machine, these specifications ensure a smooth development experience:

- **RAM**: 8 GB minimum, 16 GB recommended
- **CPU**: Dual-core or better; quad-core recommended for large projects
- **Disk Space**: 500 MB for the framework + typical project dependencies

## Installing with npm

The standard installation method uses npm, which ships with Node.js.

### Global Installation

Install the Nova CLI globally to access the `nova` command from anywhere:

```bash
npm install -g @nova-js/cli
```

Verify the installation:

```bash
nova --version
# 3.2.0
```

### Project-Level Installation

For per-project control over the CLI version, install it as a dev dependency:

```bash
npm install -D @nova-js/cli
```

Then use it via npm scripts or `npx`:

```bash
npx nova dev
# or add to package.json scripts:
# { "scripts": { "dev": "nova dev" } }
```

## Installing with yarn

Yarn users can install the CLI globally or locally:

```bash
# Global
yarn global add @nova-js/cli

# Local (recommended)
yarn add -D @nova-js/cli
```

When using Yarn with Nova.js, be aware of the following:

1. **Yarn 1.x** uses a flat `node_modules` structure, which may cause module resolution issues with certain Nova plugins. If you encounter `MODULE_NOT_FOUND` errors, try Yarn 2+ with PnP disabled.

2. **Yarn 2+ (Berry)** with Plug'n'Play is partially supported. You may need to add the following to `.yarnrc.yml`:

```yaml
nodeLinker: node-modules
```

## Installing with pnpm

pnpm is fully supported and is the preferred package manager for monorepo setups.

```bash
# Global
pnpm add -g @nova-js/cli

# Local
pnpm add -D @nova-js/cli
```

### Monorepo Support

Nova.js integrates seamlessly with pnpm workspaces. For monorepo projects, create a `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Then use the Nova CLI from the workspace root. The CLI automatically detects the workspace configuration and resolves dependencies from the shared store.

## Version Management

### Checking Available Versions

```bash
npm view @nova-js/cli versions --json
```

### Installing a Specific Version

```bash
npm install -g @nova-js/cli@3.1.0
```

### Staying on the Latest

For production projects, pin to a specific minor version and update deliberately:

```bash
# Install latest 3.x
npm install -g @nova-js/cli@^3.2.0

# Check what changed
npm view @nova-js/cli changelog
```

## Creating a New Project

### Using `create-nova`

The recommended way to scaffold a new project:

```bash
npx create-nova@latest my-app
```

### Using the CLI Directly

```bash
nova create my-app
```

### Cloning the Starter Template

For maximum control, clone the official starter template:

```bash
git clone https://github.com/nova-js/starter my-app
cd my-app
npm install
```

## Upgrading Nova.js

### Checking Your Current Version

```bash
nova --version
```

### Upgrade Guide

To upgrade between minor versions (e.g., 3.1 → 3.2):

1. Update the CLI:
   ```bash
   npm update -g @nova-js/cli
   ```

2. Update project dependencies:
   ```bash
   npm update @nova-js/core @nova-js/router @nova-js/reactivity
   ```

3. Run the migration helper:
   ```bash
   npx @nova-js/cli migrate
   ```

The migration helper detects breaking changes and applies automated fixes where possible. For manual changes, it prints clear instructions.

### Upgrading Between Major Versions

Major version upgrades (e.g., 2.x → 3.x) may include breaking changes. Follow the dedicated migration guide for each major version:

- [Migrate from v2 to v3](https://nova.js.org/migration/v3)
- [Migrate from v1 to v2](https://nova.js.org/migration/v2)

## Troubleshooting Installation Issues

### `EACCES` Permission Denied

If you see permission errors during global installation:

```
Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules/@nova-js'
```

**Solutions:**

1. **Use `npx`** instead of a global install to avoid system directory permissions entirely.

2. **Change npm's directory** to a user-owned location:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

3. **Use a Node version manager** like `nvm` or `fnm`, which manages permissions automatically.

### `NODE_MODULE_VERSION` Mismatch

This error occurs when your Node.js version doesn't match the native modules compiled for Nova.js:

```
Error: The module was compiled against a different Node.js version
NODE_MODULE_VERSION 108 vs. 93
```

**Solution:** Update Node.js to the version Nova.js expects:

```bash
nvm install 20
nvm use 20
npm rebuild
```

### Slow Installation on Windows

Windows users may experience slow `npm install` due to Node.js spawning too many processes. Solutions:

1. Install with `--maxsockets=1`:
   ```bash
   npm install --maxsockets=1
   ```

2. Switch to pnpm, which is significantly faster on Windows.

3. Exclude `node_modules` from Windows Defender scanning:
   - Open Windows Security → Virus & threat protection → Manage settings
   - Add an exclusion for your project's `node_modules` directory

### OpenSSL Errors on Older Systems

If you see SSL certificate errors during `npm install`:

```bash
# Update your CA certificates (Debian/Ubuntu)
sudo apt-get update && sudo apt-get install --reinstall ca-certificates

# Or tell npm to use its bundled certificates
npm config set cafile /etc/ssl/certs/ca-certificates.crt
```

### `create-nova` Hangs or Times Out

If the scaffolding tool hangs during dependency installation:

1. Check your network connection and proxy settings:
   ```bash
   npm config get proxy
   npm config get https-proxy
   ```

2. Try with the `--skip-install` flag and install manually:
   ```bash
   npx create-nova@latest my-app --skip-install
   cd my-app
   npm install
   ```

3. Use an alternative registry mirror:
   ```bash
   npx create-nova@latest my-app --registry https://registry.npmmirror.com
   ```

### Native Module Compilation Failures

Some Nova.js plugins depend on native Node.js modules. If compilation fails:

```bash
# Ensure you have build tools installed
# macOS
xcode-select --install

# Ubuntu/Debian
sudo apt-get install build-essential python3

# Windows
npm install -g windows-build-tools
```

## Verifying Your Installation

Run the diagnostic command to verify everything is set up correctly:

```bash
nova doctor
```

This checks:

- Node.js version compatibility
- Package manager configuration
- Dependency integrity
- Native module compilation
- File system permissions
- Network connectivity to the Nova.js registry

A successful output looks like this:

```
✓ Node.js v20.5.0 (compatible)
✓ npm v9.8.0
✓ @nova-js/cli v3.2.0
✓ Dependencies: 0 warnings, 0 errors
✓ Build tools: available
✓ Network: connected
✓ File system: writable

All systems operational. Happy coding!
```

## Uninstalling Nova.js

### Global CLI Removal

```bash
npm uninstall -g @nova-js/cli
```

### Project Removal

To completely remove Nova.js from a project:

```bash
npm uninstall @nova-js/core @nova-js/cli @nova-js/router @nova-js/reactivity
rm -rf .nova node_modules/package-lock.json
```

## Installation in CI Environments

For automated build pipelines, use this pattern:

```yaml
# GitHub Actions example
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'

- name: Install dependencies
  run: npm ci

- name: Build
  run: npm run build

- name: Run tests
  run: npm test
```

Using `npm ci` instead of `npm install` ensures deterministic, reproducible installs in CI environments.