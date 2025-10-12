# SEP DEX - Testnet Perpetual Futures Trading Platform

A decentralized perpetual futures trading platform built on the Stacks testnet with Next.js, Turnkey, and Clarity smart contracts.

## 🚀 Testnet Deployment

This platform is currently deployed on the **Stacks testnet** for testing and development purposes. All trading activities use test STX tokens with no real monetary value.

## 📈 Product Overview

SEP DEX is a perpetual futures trading platform that allows users to trade cryptocurrencies with leverage in a decentralized manner. Users can go long or short on major cryptocurrencies with up to 100x leverage.

### Key Features

- **Perpetual Futures Trading**: Trade BTC, ETH, STX, and SOL with leverage
- **Up to 100x Leverage**: Maximize your trading positions with high leverage
- **Real-time Pricing**: Live price feeds from CoinGecko
- **Risk Management**: Automatic liquidation protection
- **Secure Wallet Integration**: Passkey-based authentication with Turnkey
- **Testnet Environment**: Risk-free trading with test tokens

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Authentication**: Turnkey passkey authentication
- **Blockchain**: Stacks testnet with Clarity smart contracts
- **Price Feeds**: CoinGecko API
- **Storage**: Local storage for session management

## 🎯 Getting Started (Testnet)

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Create a `.env.local` file based on `.env.example`
4. Set up your environment variables
5. Run the development server: `pnpm dev`
6. Connect with a testnet wallet and start trading with test tokens

## ⚙️ Environment Variables

Create a `.env.local` file based on the `.env.example` template:

```
TURNKEY_API_PRIVATE_KEY=your_turnkey_api_private_key
TURNKEY_API_PUBLIC_KEY=your_turnkey_api_public_key
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=your_turnkey_organization_id
NEXT_PUBLIC_CONTRACT_ADDRESS=your_testnet_stacks_contract_address
ADMIN_PRIVATE_KEY=your_testnet_admin_private_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🏗️ Architecture

### Frontend
- Next.js 15 with App Router
- Responsive UI with mobile support
- Real-time price updates
- Trading interface with position management

### Backend Services
- Turnkey for secure passkey authentication
- CoinGecko for price feeds
- Local storage for session management

### Blockchain Layer
- **Network**: Stacks testnet
- **Smart Contracts**: Clarity-based perpetual futures contracts
- **Wallet Integration**: Turnkey-powered passkey authentication
- **Transactions**: On-chain deposit, withdrawal, and trading operations

## 🔒 Security

- **Passkey Authentication**: No passwords, biometric authentication only
- **Hierarchical Wallet Structure**: Secure organization and user wallet management
- **Transaction Signing**: Secure transaction signing with Turnkey
- **No Private Key Storage**: Application never stores private keys

## 🧪 Testnet Features

- **Test STX Tokens**: Use worthless test tokens for risk-free trading
- **Real Market Data**: Experience real trading with actual price movements
- **Full Platform Features**: All trading features available in test environment
- **Easy Onboarding**: Quick wallet setup with passkey authentication

## 📖 Usage Guide

1. **Connect Wallet**: Use the passkey authentication to create or access your wallet
2. **Fund Account**: Deposit test STX tokens to start trading
3. **Open Positions**: Choose an asset, direction (long/short), leverage, and collateral
4. **Monitor Positions**: Track your open positions and PnL in real-time
5. **Close Positions**: Manually close positions or let the system auto-liquidate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## ⚠️ Disclaimer

This platform is currently in testnet mode and uses test tokens with no monetary value. It is intended for testing and development purposes only. Use at your own risk.