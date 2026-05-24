# Shollu Modern — Code Signing Guide

This guide describes the complete setup for code signing and notarizing the **Shollu Modern** application cross-platform (Windows & macOS) installers inside the Tauri 2 build pipeline.

Signing your installers ensures that users will not see scary operating system warnings (like Windows SmartScreen or macOS Gatekeeper blocks) upon downloading and installing Shollu Modern.

---

## 1. Tauri Update Signer Keys (All Platforms)

Tauri features an automatic updater that requires signatures for update bundles (`.msi.zip`, `.app.tar.gz`, etc.). You must generate a signature keypair and register the keys.

### Step 1: Generate Keypair
Open a terminal in the project directory and run:
```bash
pnpm tauri signer generate
```
This will output:
1. **Public Key**: A short base64 string.
2. **Private Key**: A long multi-line base64 string.
3. **Password**: The password you entered to encrypt the private key.

### Step 2: Register Public Key
Add the public key to your `src-tauri/tauri.conf.json` configuration file:
```json
"plugins": {
  "updater": {
    "pubkey": "YOUR_TAURI_PUBLIC_KEY_BASE64_HERE"
  }
}
```

### Step 3: Configure GitHub Secrets
Save your signing details into your GitHub repository settings under **Settings ➔ Secrets and variables ➔ Actions ➔ New repository secret**:
* `TAURI_SIGNING_PRIVATE_KEY` ➔ Paste the full multi-line private key base64 string.
* `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` ➔ Paste your private key password.

---

## 2. Windows Authenticode Signing

To prevent **Windows SmartScreen** alerts, you need an OV (Organization Validated) or EV (Extended Validation) Code Signing Certificate from a trusted Certificate Authority (e.g. Sectigo, DigiCert).

### Option A: Using SignPath (Recommended for Open Source)
[SignPath](https://signpath.org/) provides free code signing certificates and services for active open-source projects.
1. Sign up on SignPath and create a project matching `adenaufal/shollu-modern`.
2. Configure SignPath App Connector inside your GitHub workflow.
3. Replace the Tauri build step or use SignPath's Action to sign the compiled `.exe` or `.msi` installers.

### Option B: Local / CI signing with a PFX certificate
If you have a `.pfx` certificate file:
1. Export the PFX file as a base64 string:
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("path_to_cert.pfx")) | Out-File cert_base64.txt
   ```
2. Save the base64 string to GitHub Secrets as `WIN_SIGNING_CERT_BASE64`.
3. Save the certificate password as `WIN_SIGNING_CERT_PASSWORD`.
4. In your GitHub workflow, decode the PFX file back to disk:
   ```yaml
   - name: Decode PFX Certificate
     run: |
       echo "${{ secrets.WIN_SIGNING_CERT_BASE64 }}" > cert.pfx.base64
       certutil -decode cert.pfx.base64 cert.pfx
   ```
5. Pass the PFX configuration to Tauri's bundler by setting env variables in your workflow:
   ```yaml
   env:
     TAURI_SIGNING_IDENTITY: "path/to/cert.pfx"
     TAURI_SIGNING_PASSWORD: "${{ secrets.WIN_SIGNING_CERT_PASSWORD }}"
   ```

---

## 3. macOS Signing & Notarization

To pass **Apple Gatekeeper** checks on macOS, you must:
1. Sign your app bundle using an **Apple Developer ID Application Certificate**.
2. Notarize the signed bundle with Apple's **Notary Service**.

### Prerequisites
* An active **Apple Developer Account** ($99/year).
* A macOS computer with **Xcode** installed (for generating certificates).

### Step 1: Create Signing Certificate
1. Open Xcode on macOS, go to **Settings ➔ Accounts** and sign in with your Apple ID.
2. Click **Manage Certificates...** and click **+ ➔ Developer ID Application**.
3. Export the certificate from your **Keychain Access** app as a `.p12` file (including the private key).
4. Convert the `.p12` file to a base64 string:
   ```bash
   base64 -i cert.p12 -o cert_base64.txt
   ```
5. Save the base64 string to GitHub Secrets as `APPLE_CERTIFICATE_BASE64`.
6. Save the certificate password to GitHub Secrets as `APPLE_CERTIFICATE_PASSWORD`.

### Step 2: Create Notarization Credentials
1. Go to [appleid.apple.com](https://appleid.apple.com/) and create an **App-Specific Password** (e.g. `abcd-efgh-ijkl-mnop`).
2. Save this password to GitHub Secrets as `APPLE_PASSWORD`.
3. Save your Apple ID email (e.g. `developer@domain.com`) as `APPLE_ID`.
4. Find your Apple Team ID in your Developer Portal and save it as `APPLE_TEAM_ID`.

### Step 3: Wire Notarization to Tauri GitHub Actions
Update the matrix step inside `.github/workflows/release.yml` for macOS:
```yaml
      - name: Build and Publish Tauri App
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Update key
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
          # Apple Developer credentials for signing
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE_BASE64 }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          # Apple Notarization credentials
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        with:
          tagName: v0.1.0-alpha
          releaseName: 'Shollu Modern v0.1.0-alpha'
          releaseDraft: true
          prerelease: true
```

Tauri's bundler will automatically import the certificate, sign the `.app` bundle, package it as a `.dmg` or `.app.tar.gz`, upload it to Apple's servers for notarization, wait for the ticket to be stapled, and bundle the signed release asset!
