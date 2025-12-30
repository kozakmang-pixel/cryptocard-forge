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
        "A 1.5% protocol tax is applied on the total funded amount once the card is locked and claimed. This helps sustain ongoing development and infrastructure for the CRYPTOCARDS protocol.",
      solValueLabel: "Estimated value in SOL",
      fiatValueLabel: "Estimated value in USD",
      lockedBadge: "Locked",
      unlockedBadge: "Unlocked",
      claimWarning:
        "Once the card is locked and claimed, funds are moved to the recipient’s wallet. Always double-check the recipient before sharing the card.",
      lockButton: "LOCK & GENERATE CLAIM LINK",
      cardLocked: "Card locked & ready to gift",
      lockWarning:
        "⚠️ Once locked, you will NOT be able to deposit additional tokens to this CRYPTOCARD.",
      resetButton: "RESET CARD BUILDER",
      fundingStatusUnfunded: "Awaiting funds...",
      fundingStatusFunded: "Funds detected on-chain.",
    },

    card: {
      previewTitle: "Preview",
      messageLabel: "Message",
      expiryLabel: "Expiry",
      noExpiry: "No expiry set",
      amountLabel: "Amount",
      tokenUnknown: "Unknown token",
      tokenAmountLabel: "Token amount",
      solAmountLabel: "SOL amount",
      fiatValueLabel: "USD value",
      cardIdLabel: "Card ID",
      cvvLabel: "Security code",
      lockedBadge: "LOCKED",
      unlockedBadge: "UNLOCKED",
      fundedBadge: "FUNDED",
      notFundedBadge: "NOT FUNDED",
      claimableBadge: "CLAIMABLE",
      claimedBadge: "CLAIMED",
    },

    audit: {
      title: "On-Chain Card Audit",
      description:
        "Search any CRYPTOCARD by its public ID to inspect on-chain status, balances, and event history. This tool is read-only and does not require a wallet connection.",
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
      
      onChainStatusTitle: "On-Chain Status",
      onChainStatusDescription:
        "These values are read from the Solana blockchain or your indexing layer. They may differ slightly from cached dashboard values.",
      solBalanceLabel: "SOL balance",
      tokenBalanceLabel: "Token balance",
      tokenMintLabel: "Token mint",
      lastUpdatedLabel: "Last updated",
      noActivity: "No on-chain events have been indexed for this card yet.",
      activityTitle: "Activity",
      createdEvent: "Card Created",
      fundedEvent: "Funds Deposited",
      lockedEvent: "Card Locked",
      claimedEvent: "Card Claimed",
      refundedEvent: "Funds Refunded",
      errorLoadingActivity: "Failed to load activity. Please try again.",
    },

    // You can add more sections as the UI grows:
    // - claim page
    // - dev panel
    // - notifications
    // - multi-language strings, etc.
  },
};
