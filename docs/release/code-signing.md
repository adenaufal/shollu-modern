# Code signing and public distribution

**Status: September 30, 2026.** The user has confirmed v1 works and is testing it personally on Windows. The local installer is unsigned Authenticode; public distribution and signing automation are deferred until requested. No v1 GitHub Release has been published. Preparing this guide does not mean signing/notarization is configured or verified.

The future workflow is described in [the Windows local signing note](windows-local-signing.md): choose a certificate/provider, then automate build, application signing, installer signing/timestamp, verification, and checksums as one command or CI job. Updater signing remains a separate step.

## Three separate signature requirements

| Mechanism | Purpose | Current project configuration |
| --- | --- | --- |
| Tauri updater signature | Authenticate downloaded application updates against the configured public key | Public key and endpoint are in `src-tauri/tauri.conf.json`; release workflow references private-key secrets |
| Windows Authenticode | Identify the publisher and verify Windows executable/installer integrity | Optional local configuration example exists; latest local installer is unsigned |
| macOS signing and notarization | Sign application bundles and obtain Apple's notarization for Developer ID distribution | Future configuration and native verification work |

The tag-triggered [release workflow](../../.github/workflows/release.yml) builds platform packages and creates a **draft** release. A version number, successful build, or updater signature alone does not establish Authenticode signing, notarization, or public availability. Do not push a version tag to publish merely as part of personal testing.

## Tauri updater keys

The repository already contains an updater public key. Use its matching private key for future updates. Do not regenerate or replace the public key casually: an installed app trusts the key it was built with.

For a new deployment that intentionally needs a new key pair, the CLI command is:

```sh
pnpm tauri signer generate
```

Protect the private key outside Git. The release workflow uses `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` from repository secrets. Verify an updater build and its feed before claiming updates work in a public release. Existing references to secret names do not prove a signed artifact has been produced.

For personal Windows builds without updater artifacts:

```powershell
pnpm tauri build --bundles nsis --config '{"bundle":{"createUpdaterArtifacts":false}}'
```

## Windows Authenticode

Follow [windows-local-signing.md](windows-local-signing.md) for certificate-store signing, self-signed private testing, and the optional configuration example. Sign the application executable before it is bundled, then sign the installer, verify both, and compute hashes after signing.

For hardware-token/cloud certificates, use the provider's supported tooling and Tauri's `bundle.windows.signCommand` where needed. `TAURI_SIGNING_IDENTITY` and `TAURI_SIGNING_PASSWORD` are not Windows Authenticode settings. New certificates can still produce SmartScreen warnings while reputation develops. [Tauri Windows signing reference](https://v2.tauri.app/distribute/sign/windows/).

Do not assume free SignPath Foundation signing is available to this project. Its program requires an OSI-approved license; Shollu Modern retains noncommercial licensing and the original notices. Check eligibility directly if considering a provider, and preserve the project's licensing commitments. [SignPath Foundation conditions](https://signpath.org/terms).

## macOS signing and notarization

For public Developer ID distribution, arrange a valid Developer ID Application identity and notarization credentials. Configure the identity with `APPLE_SIGNING_IDENTITY` or `bundle.macOS.signingIdentity`. CI can use an exported certificate through `APPLE_CERTIFICATE` and `APPLE_CERTIFICATE_PASSWORD` where appropriate.

Notarization can use App Store Connect API credentials (`APPLE_API_ISSUER`, `APPLE_API_KEY`, `APPLE_API_KEY_PATH`) or an Apple ID with an app-specific password and team ID (`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`). Verify signing, notarization/stapling, and installation on a macOS test device before distribution. [Tauri macOS signing reference](https://v2.tauri.app/distribute/sign/macos/).

These credentials are not wired into the current release workflow. Adding secret names to documentation is not an implementation of this pipeline.

## Future release verification

When public distribution is requested:

1. Confirm the version, release notes, intended platforms, and passing code/native checks.
2. Select the signing provider and configure secure credentials outside the repository.
3. Automate the platform build and required application/installer signatures, timestamping, notarization, and updater artifacts.
4. Verify signatures, checksums, installation, offline resources, and updater behavior against the exact artifacts to distribute.
5. Review the draft release, then publish when requested. Keep Ebta Setiawan attribution and the original/noncommercial notices in the packages.
