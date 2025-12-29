// src/lib/translations.ts

export const translations = {
  en: {
    app: {
      title: "CRYPTOCARDS",
      subtitle: "On-chain crypto gift cards — no wallet required.",
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
      subtitle:
        "Send tokens to the deposit wallet below. Once funding is confirmed, lock your CRYPTOCARD and share it with the recipient.",
      fundedAmountLabel: "Funded",
      claimedAmountLabel: "Claimed total",
      depositWallet: "Deposit wallet",
      protocolTax: "1.5% Protocol Tax on Funded & Locked CRYPTOCARDS",
      protocolTaxDescription:
        "A 1.5% protocol tax is applied to the SOL balance on each funded and locked CRYPTOCARD. Tax proceeds are swapped to $CRYPTOCARDS and directed to the public burn wallet.",
      taxEstimate: "Estimated tax on this CRYPTOCARD:",
    },

    creator: {
      title: "Creator Dashboard",
      subtitle: "Overview of all CRYPTOCARDS you've created on Solana mainnet.",
      deleteWarning:
        "Are you sure you want to permanently remove this entry from your dashboard? On-chain history will remain, but this local record cannot be restored.",
      delete: "Delete",
      copy: "Copy",
      created: "Created",
      funded: "Funded",
      locked: "Locked",
      claimed: "Claimed",
      noCards: "No CRYPTOCARDS have been created under this account yet.",
      waitingDeposit: "Awaiting initial deposit to the funding address…",
    },

    audit: {
      title: "On-Chain Audit Trail",
      subtitle: "Search any CRYPTOCARD ID to review its full on-chain lifecycle.",
      searchLabel: "Card ID",
      searchPlaceholder: "Enter 8-digit ID (XXXX-XXXX)",
      searchButton: "Fetch",
      finalClaimedAmount: "Final claimed amount",
      lifecycle: "Lifecycle Timeline",
      balanceLabel: "On-chain balance",
      fundedRow: "Deposit received",
      lockedRow: "Card locked",
      claimedRow: "Claimed & sent to recipient",
      noData: "No CRYPTOCARD matching that ID was found.",
    },

    public: {
      title: "NETWORK ACTIVITY & BURNS",
      subtitle:
        "Live mainnet view of funded, locked, and claimed CRYPTOCARDS — plus protocol burn activity and lifetime volume.",
      lastUpdated: "Last updated",
      totalCards: "Total cards funded",
      totalFunded: "Total volume funded",
      totalClaimed: "Total value claimed",
      burns: "Protocol burns",
      recent: "Recent activity",
      bootstrapping:
        "Activity is still bootstrapping. Create, fund, lock, and claim CRYPTOCARDS to populate this feed.",
      fiat: "Fiat",
      token: "Token",
      sol: "SOL",
      copyWallet: "Copy burn wallet",
    },

    notifications: {
      copied: "Copied to clipboard.",
      copiedFail: "Failed to copy to clipboard.",
    },

    card: {
      preview: "CRYPTOCARD Preview",
      balance: "Balance",
      expires: "Expires:",
    },

    claim: {
      title: "Claim a CRYPTOCARD",
      subtitle: "Redeem a funded and locked CRYPTOCARD directly to your Solana wallet.",

      cardIdLabel: "Card ID",
      cardIdPlaceholder: "Enter 8-digit ID (XXXX-XXXX)",
      fetchButton: "Fetch card",

      invalidId: "That card ID is not in a valid format. Please try again.",
      notFound: "No CRYPTOCARD was found for that ID.",
      // Used by UI as both `cardFound` and sometimes `cardfound`
      cardFound: "CRYPTOCARD located. Review the details below.",
      cardfound: "CRYPTOCARD located. Review the details below.",
      // Some parts of the UI still reference `cardidrequired`
      cardidrequired: "Please enter a card ID before continuing.",
      cardIdRequired: "Please enter a card ID before continuing.",
      alreadyClaimed: "This CRYPTOCARD has already been claimed.",
      notLocked: "This CRYPTOCARD must be locked before it can be claimed.",
      errorGeneric: "We couldn't fetch that card. Please try again in a moment.",

      statusLocked: "Locked",
      statusClaimed: "Claimed",

      // Scratch / CVV copy – keep multiple keys to satisfy all call sites
      scratch: "Scratch to reveal CVV",
      scratchHelp: "Click or drag over the panel to reveal the CVV.",
      scratchLabel: "Scratch to reveal CVV",
      scratchInstruction: "Reveal the CVV by scratching the panel.",

      balanceLabel: "Balance",
      destinationWallet: "Destination wallet",
      walletPlaceholder: "Enter Solana wallet address",

      claimButton: "Claim funds",
      claiming: "Processing claim…",

      successTitle: "Claim complete",
      successMessage: "The CRYPTOCARD has been successfully claimed.",
      successAmountPrefix: "Amount claimed:",
      successWalletPrefix: "Sent to:",
      successFooter:
        "This claim has been settled on-chain. Always verify the transaction in your preferred Solana explorer.",
    },

    design: {
      title: "Design your CRYPTOCARD",
      selectImage: "Select background",
      selectGif: "GIF mode",
      searchPlaceholder: "Search images or GIFs…",
      save: "Save design & continue",
      howItWorksTitle: "How do CRYPTOCARDS work?",
      howItWorks_1:
        "On-chain & verifiable — each CRYPTOCARD is funded on-chain, publicly auditable, and can only be redeemed once.",
      howItWorks_2:
        "Protocol tax → automated $CRYPTOCARDS buybacks and permanent burns that support long-term ecosystem health.",
      howItWorks_3:
        "Recycled fees — all protocol fees are cycled back into the ecosystem to grow and reinforce the protocol.",
    },
  },
};
