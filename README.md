# UBTC — Bitcoin-Native Stablecoin Protocol

UBTC is a quantum-resistant, Bitcoin-backed stablecoin protocol built on World Local Bank infrastructure.

## Tokens
- **UBTC** — Bitcoin-backed stablecoin, minted at 150% collateral ratio
- **UUSDT** — 1:1 USDT, quantum-secured on Bitcoin protocol  
- **UUSDC** — 1:1 USDC, quantum-secured on Bitcoin protocol

## Security
- Post-quantum Dilithium3 signatures on all transfers
- QRNG entropy from ANU for key generation
- OTP + Protocol Second Key for withdrawals
- 48-hour timelock recovery system

## Stack
- Frontend: Next.js (localhost:3000)
- Backend: Rust/Axum (localhost:8080)
- Bitcoin: Regtest/Testnet4/Mainnet
- Database: Supabase PostgreSQL