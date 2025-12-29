// src/lib/translations.ts

export const translations = {
  en: {
    app: {
      title: "CRYPTOCARDS",
      subtitle: "On-chain crypto gift cards — no wallet needed",
    },

    navbar: {
      home: "Home",
      creator: "Creator Dashboard",
      audit: "On-Chain Audit",
      claim: "Claim Card",
      language: "Language",
    },

    funding: {
      title: "FUND YOUR CRYPTOCARD",
      subtitle: "Send tokens to the deposit wallet below. Once funded, lock and share it.",
      fundedAmountLabel: "Funded",
      claimedAmountLabel: "Claimed total",
      depositWallet: "Deposit wallet",
      protocolTax: "1.5% Protocol Tax on Funded & Locked CRYPTOCARDS",
      protocolTaxDescription:
        "A 1.5% protocol tax is applied to the SOL balance on each funded and locked CRYPTOCARD. Tax proceeds swap to $CRYPTOCARDS and are sent to the burn wallet.",
      taxEstimate: "Estimated tax on this CRYPTOCARD:",
    },

    creator: {
      title: "Creator Dashboard",
      subtitle: "Overview of all CRYPTOCARDS you've created on-chain",
      deleteWarning: "Are you sure? This will permanently remove all stored info.",
      delete: "Delete",
      copy: "Copy",
      created: "Created",
      funded: "Funded",
      locked: "Locked",
      claimed: "Claimed",
      noCards: "No CRYPTOCARDS created yet.",
      waitingDeposit: "Waiting for deposit to funding address…",
    },

    audit: {
      title: "On-chain audit trail",
      subtitle: "Search any CRYPTOCARD ID to view on-chain lifecycle",
      searchLabel: "Card ID",
      searchPlaceholder: "Enter 8-digit ID (XXXX-XXXX)",
      searchButton: "Fetch",
      finalClaimedAmount: "Final claimed amount",
      lifecycle: "Lifecycle Timeline",
      balanceLabel: "On-chain balance",
      fundedRow: "Deposit received",
      lockedRow: "Locked",
      claimedRow: "Claimed & sent",
      noData: "No matching CRYPTOCARD found.",
    },

    public: {
      title: "NETWORK ACTIVITY & BURNS",
      subtitle:
        "Live mainnet view of funded, locked, and claimed CRYPTOCARDS — plus protocol burn activity.",
      lastUpdated: "Last updated",
      totalCards: "Total cards funded",
      totalFunded: "Total volume funded",
      totalClaimed: "Total value claimed",
      burns: "Protocol burns",
      recent: "Recent activity",
      bootstrapping:
        "Activity bootstrapping… create, fund, and claim CRYPTOCARDS to populate this feed.",
      fiat: "Fiat",
      token: "Token",
      sol: "SOL",
      copyWallet: "Copy burn wallet",
    },

    notifications: {
      copied: "Copied to clipboard",
      copiedFail: "Failed to copy",
    },

    card: {
      preview: "CRYPTOCARD Preview",
      balance: "Balance",
      expires: "Expires:",
    },

    claim: {
      title: "Claim a CRYPTOCARD",
      subtitle: "Redeem a funded & locked CRYPTOCARD to your wallet.",

      cardIdLabel: "Card ID",
      cardIdPlaceholder: "Enter 8-digit ID (XXXX-XXXX)",
      fetchButton: "Fetch card",

      invalidId: "Invalid card ID. Please try again.",
      notFound: "No CRYPTOCARD found.",
      cardFound: "CRYPTOCARD found",
      cardidrequired: "Please enter a card ID first.",
      cardIdRequired: "Please enter a card ID first.",
      alreadyClaimed: "This CRYPTOCARD has already been claimed.",
      notLocked: "Card must be locked before claiming.",
      errorGeneric: "Unable to fetch card. Try again.",
      statusLocked: "Locked",
      statusClaimed: "Claimed",

      scratch: "Scratch to reveal CVV",
      scratchHelp: "Click or drag to reveal CVV",

      balanceLabel: "Balance",
      destinationWallet: "Destination wallet",
      walletPlaceholder: "Enter Solana wallet address",

      claimButton: "Claim",
      claiming: "Claiming…",

      successTitle: "Claim complete",
      successMessage: "Funds successfully redeemed.",
      successAmountPrefix: "Amount claimed:",
      successWalletPrefix: "Sent to:",
    },

    design: {
      title: "Design your CRYPTOCARD",
      selectImage: "Select background",
      selectGif: "GIF mode",
      searchPlaceholder: "Search images…",
      save: "Save design & continue",
      howItWorksTitle: "How do CRYPTOCARDS work?",
      howItWorks_1: "On-chain & verifiable — publicly visible and can only be used once.",
      howItWorks_2: "Protocol tax → automated $CRYPTOCARDS buybacks and burns.",
      howItWorks_3: "Recycled fees — all fees reinvested back into the ecosystem.",
    },
  },
};
