// src/lib/translations.ts

export type LanguageCode = 'en';

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const LANGUAGE_OPTIONS: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
];

export const translations: Record<LanguageCode, Record<string, string>> = {
  en: {
    // ---------- GLOBAL / GENERIC ----------
    'app.name': 'CRYPTOCARDS',
    'app.tagline': 'On-chain, non-custodial crypto gift cards.',
    'app.loading': 'Loading...',
    'app.error': 'Something went wrong. Please try again.',
    'app.retry': 'Retry',
    'app.copy': 'Copy',
    'app.copied': 'Copied!',
    'app.close': 'Close',
    'app.cancel': 'Cancel',
    'app.confirm': 'Confirm',

    // ---------- HEADER ----------
    'header.title': 'CRYPTOCARDS',
    'header.subtitle':
      'Create, fund, lock, and claim on-chain gift cards on Solana mainnet.',
    'header.claimButton': 'Claim CRYPTOCARD',
    'header.createButton': 'Create a CRYPTOCARD',

    // ---------- FOOTER ----------
    'footer.poweredBy': 'Powered by the Solana network.',
    'footer.copyright': '© 2025 CRYPTOCARDS. All rights reserved.',
    'footer.creator': 'Built by degen engineers for the Solana ecosystem.',

    // ---------- PROGRESS BAR ----------
    'progress.step1': 'Design',
    'progress.step2': 'Fund',
    'progress.step3': 'Lock & Share',

    // ---------- DESIGNER (CardDesigner) ----------
    'designer.tokenAddress': 'Token or SOL Contract',
    'designer.tokenPlaceholder':
      'Paste SPL token mint address, or leave blank to use native SOL.',
    'designer.message': 'Message on the CRYPTOCARD',
    'designer.messagePlaceholder': 'Write a personal note for the recipient...',
    'designer.font': 'Message font',
    'designer.expiry': 'Set optional expiry date',
    'designer.creating': 'Creating CRYPTOCARD...',
    'designer.createButton': 'Create CRYPTOCARD',
    'designer.saveDesign': 'Save design & continue',
    'designer.saved': 'Design saved',
    'designer.expiryWarning':
      "If this CRYPTOCARD expires before it's claimed, remaining funds are returned to the creator wallet.",
    'designer.imageTabStatic': 'Backgrounds',
    'designer.imageTabGif': 'GIFs',
    'designer.imageSearchPlaceholder': 'Search images & GIFs (e.g. “sol degen”, “memes”)',

    // ---------- INSTRUCTIONS BLOCK UNDER PREVIEW ----------
    'instructions.title': 'How CRYPTOCARDS Work',
    'instructions.design': 'Design',
    'instructions.designDesc':
      'Choose your token or SOL, artwork, message, and optional expiry rules.',
    'instructions.fund': 'Fund',
    'instructions.fundDesc':
      'Send tokens or SOL to the deposit address. On-chain balance is publicly verifiable.',
    'instructions.lock': 'Lock',
    'instructions.lockDesc':
      'Lock the CRYPTOCARD once funded. This step is irreversible and prevents further deposits.',
    'instructions.share': 'Gift',
    'instructions.shareDesc':
      'Share the claim link or card ID + CVV with your recipient so they can claim on-chain.',

    // Secondary instructions card in CardDesigner
    'instructionstwo.title': 'How do CRYPTOCARDS work?',
    'instructionstwo.subtitle':
      'On-chain, non-custodial gift cards for Solana. Perfect for streams, community rewards, and IRL gifting.',
    'instructionstwo.point1Title': 'On-chain & verifiable',
    'instructionstwo.point1Body':
      'Every CRYPTOCARD is funded on-chain, publicly auditable, and can only be claimed once.',
    'instructionstwo.point2Title': 'Protocol tax → buybacks',
    'instructionstwo.point2Body':
      'A transparent protocol tax powers $CRYPTOCARDS buybacks and permanent burns.',
    'instructionstwo.point3Title': 'Recycled fees',
    'instructionstwo.point3Body':
      'All protocol fees are recycled back into the ecosystem to grow CRYPTOCARDS over time.',

    // ---------- BUTTONS ----------
    'button.lockAndShare': 'Lock & generate share link',
    'button.cardLocked': 'CRYPTOCARD locked',
    'button.reset': 'Reset & create new',
    'button.lockWarning':
      '⚠️ Locking a CRYPTOCARD is irreversible. Once locked, deposits are disabled and funds can only be claimed once.',
    'button.refresh': 'Refresh',
    'button.search': 'Search',
    'button.delete': 'Delete',
    'button.viewOnSolscan': 'View on Solscan',
    'button.updateEmail': 'Update e-mail',

    // ---------- FUNDING PANEL ----------
    'funding.title': 'Fund your CRYPTOCARD',
    'funding.subtitle':
      'Send tokens or SOL to the deposit wallet below. Once funded, lock and share your CRYPTOCARD.',
    'funding.depositLabel': 'Deposit wallet',
    'funding.copyAddress': 'Copy deposit wallet',
    'funding.copiedAddress': 'Deposit wallet copied',
    'funding.cvvLabel': 'Card CVV (keep secret)',
    'funding.showCvv': 'Show',
    'funding.hideCvv': 'Hide',
    'funding.cardIdLabel': 'Card ID',
    'funding.copyCardId': 'Copy Card ID',
    'funding.copiedCardId': 'Card ID copied',

    'funding.status.waiting': 'Waiting for deposit to funding address.',
    'funding.status.funded': 'Deposit detected on-chain.',
    'funding.status.locked': 'CRYPTOCARD locked.',
    'funding.status.claimed': 'CRYPTOCARD claimed.',
    'funding.status.refunded': 'CRYPTOCARD refunded back to creator.',

    'funding.fundedAmountLabel': 'Funded',
    // Text style is controlled in UI, but the content is this label only
    'funding.fundedAmountHelp':
      'Live on-chain balance converted to token, SOL, and fiat using current market price.',

    'funding.claimedAmountLabel': 'Claimed total',
    'funding.claimedAmountHelp':
      'Total amount successfully claimed to recipient wallets from this CRYPTOCARD.',

    'funding.taxTitle': '1.5% Protocol Tax on funded & locked CRYPTOCARDS',
    'funding.taxDescription':
      'A 1.5% protocol tax is applied to the SOL-equivalent balance on each funded and locked CRYPTOCARD. Tax proceeds automatically swap to $CRYPTOCARDS and are sent to our public burn wallet, which triggers a burn whenever its balance reaches 0.02 SOL or more.',
    'funding.taxEstimateLabel': 'Estimated protocol tax on this CRYPTOCARD',
    'funding.taxEstimate':
      'Estimated tax on this CRYPTOCARD: {token} • {sol} SOL • ~${fiat} USD',

    // ---------- CLAIM MODAL ----------
    'claim.title': 'Claim a CRYPTOCARD',
    'claim.cardId': 'Card ID',
    'claim.cardIdPlaceholder': 'XXXX-XXXX',
    'claim.cvv': 'CVV',
    'claim.cvvPlaceholder': 'Enter 5-digit CVV',
    'claim.destination': 'Recipient wallet (Solana address)',
    'claim.destinationPlaceholder': 'Paste recipient Solana wallet address',
    'claim.pull': 'Pull CRYPTOCARD',
    'claim.claim': 'Claim funds',
    'claim.scratchLabel': 'Scratch to reveal CVV',
    'claim.scratchHelper': 'Locked cards can be scratched to reveal CVV on-stream.',
    'claim.cardfound': 'CRYPTOCARD found',
    'claim.cardidrequired': 'Please enter a valid card ID before pulling.',
    'claim.invalidCvv': 'Invalid CVV for this CRYPTOCARD.',
    'claim.invalidDestination': 'Please enter a valid Solana wallet address.',
    'claim.notFound': 'CRYPTOCARD not found.',
    'claim.notLocked': 'This CRYPTOCARD must be locked before it can be claimed.',
    'claim.alreadyClaimed': 'This CRYPTOCARD has already been claimed.',
    'claim.alreadyRefunded': 'This CRYPTOCARD has already been refunded.',
    'claim.noBalance': 'This CRYPTOCARD does not currently hold a claimable balance.',
    'claim.balance': 'On-chain amount',
    'claim.scratch': 'SCRATCH',
    'claim.statusLabel': 'Status',
    'claim.status.locked': 'Locked',
    'claim.status.unlocked': 'Not locked',
    'claim.status.claimed': 'Claimed',
    'claim.status.claiming': 'Claiming...',
    'claim.status.error': 'Claim failed. Please try again.',
    'claim.claimed': 'Claim completed',
    'claim.sent': 'has been sent to:',
    'claim.claimCompleteTitle': 'Claim complete',
    'claim.claimCompleteSubtitle':
      'Your CRYPTOCARD has been successfully claimed on-chain.',
    'claim.viewOnSolscan': 'View transaction on Solscan',
    'claim.summaryTitle': 'Claim summary',
    'claim.summaryLine':
      'Claimed: {token} • {sol} SOL • ~${fiat} USD to {wallet}',
    'claim.cardInfoTitle': 'CRYPTOCARD details',
    'claim.cardInfoBalance':
      'Current balance: {token} • {sol} SOL • ~${fiat} USD',

    // ---------- LOGIN / AUTH ----------
    'auth.loginTitle': 'Creator login',
    'auth.registerTitle': 'Create creator account',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.email': 'E-mail (optional)',
    'auth.loginButton': 'Log in',
    'auth.registerButton': 'Register',
    'auth.logoutButton': 'Log out',
    'auth.forgotPassword': 'Forgot password?',
    'auth.error': 'Authentication failed. Please check your credentials.',
    'auth.emailConfirmRequired': 'Please confirm your e-mail before logging in.',
    'auth.emailUpdateTitle': 'Notification e-mail',
    'auth.emailUpdateDescription':
      'Set a contact e-mail for notifications and security updates.',
    'auth.emailUpdateSuccess': 'Notification e-mail updated.',
    'auth.emailUpdateError': 'Failed to update e-mail. Please try again.',

    // ---------- CREATOR DASHBOARD (UserDashboard) ----------
    'dashboard.title': 'Creator dashboard',
    'dashboard.subtitle':
      "Overview of all CRYPTOCARDS you've created on Solana mainnet.",
    'dashboard.authError': 'You must be logged in to view your creator dashboard.',
    'dashboard.email': 'Notification e-mail',
    'dashboard.updateEmail': 'Update e-mail',
    'dashboard.statsCreated': 'Total created',
    'dashboard.statsFunded': 'Cards funded',
    'dashboard.statsClaimed': 'Cards claimed',
    'dashboard.statsVolumeFunded': 'Volume funded (USD)',
    'dashboard.statsVolumeClaimed': 'Volume claimed (USD)',
    'dashboard.cardTableTitle': 'Your CRYPTOCARDS',
    'dashboard.cardId': 'Card ID',
    'dashboard.createdAt': 'Created at',
    'dashboard.status': 'Status',
    'dashboard.value': 'Value',
    'dashboard.actions': 'Actions',
    'dashboard.notFundedShort': 'Not funded yet',
    'dashboard.fundedShort': 'Funded',
    'dashboard.unlockedShort': 'Unlocked',
    'dashboard.lockedShort': 'Locked',
    'dashboard.unclaimedShort': 'Unclaimed',
    'dashboard.claimedShort': 'Claimed',
    'dashboard.refundedShort': 'Refunded',
    'dashboard.refresh': 'Refresh',
    'dashboard.deleteConfirmTitle': 'Delete CRYPTOCARD from dashboard?',
    'dashboard.deleteConfirmBody':
      'This will remove this CRYPTOCARD from your creator dashboard. On-chain funds and claimability are NOT affected, but dashboard analytics and history for this card will be lost permanently.',
    'dashboard.deleteConfirmButton': 'Delete from dashboard',
    'dashboard.deleteCancelled': 'Deletion cancelled.',
    'dashboard.deleteSuccess': 'CRYPTOCARD removed from dashboard.',
    'dashboard.deleteError': 'Failed to remove CRYPTOCARD from dashboard.',
    'dashboard.copyCardId': 'Copy Card ID',
    'dashboard.copiedCardId': 'Card ID copied',

    // ---------- ON-CHAIN AUDIT TRAIL ----------
    'audit.title': 'On-chain audit trail',
    'audit.subtitle':
      'Enter a public Card ID to inspect its full lifecycle directly from the blockchain.',
    'audit.cardIdLabel': 'Card ID',
    'audit.cardIdPlaceholder': 'Enter CRYPTOCARD ID (e.g. 1234-5678)',
    'audit.search': 'Search',
    'audit.summaryTitle': 'Lifecycle summary',
    'audit.summaryFunding':
      'Total funded: {token} • {sol} SOL • ~${fiat} USD',
    'audit.summaryClaimed':
      'Total claimed: {token} • {sol} SOL • ~${fiat} USD',
    'audit.summaryRefunded':
      'Total refunded: {token} • {sol} SOL • ~${fiat} USD',
    'audit.timelineTitle': 'Lifecycle timeline',
    'audit.timeline.created': 'CRYPTOCARD created',
    'audit.timeline.funded': 'Funding detected on-chain',
    'audit.timeline.locked': 'CRYPTOCARD locked',
    'audit.timeline.claimed': 'CRYPTOCARD claimed',
    'audit.timeline.refunded': 'CRYPTOCARD refunded',
    'audit.timeline.amountLine':
      'Amount: {token} • {sol} SOL • ~${fiat} USD',
    'audit.timeline.noEvents': 'No lifecycle events recorded yet.',
    'audit.onchainBalanceTitle': 'On-chain balance',
    'audit.onchainRpcLabel': 'RPC',
    'audit.onchainBalanceLine':
      '{sol} SOL ({lamports} lamports) • ~${fiat} USD',
    'audit.errorNotFound': 'No CRYPTOCARD found for this ID.',
    'audit.errorGeneric': 'Failed to load audit data. Please try again.',

    // ---------- PUBLIC NETWORK ACTIVITY (PublicDashboard) ----------
    'public.title': 'Network activity & burns',
    'public.subtitle':
      'Live mainnet view of funded, locked, and claimed CRYPTOCARDS — plus protocol burn activity.',
    'public.totalCardsFunded': 'Total cards funded',
    'public.totalVolumeFunded': 'Total volume funded',
    'public.totalVolumeClaimed': 'Total volume claimed',
    'public.totalBurns': 'Protocol burns',
    'public.totalFundedHint': 'Cumulative count of CRYPTOCARDS that have received on-chain funding.',
    'public.totalBurnedHint':
      'Approximate volume of protocol tax that has been swapped and sent to the burn wallet.',
    'public.activityBootstrapping':
      'Activity bootstrapping… create, fund, and claim CRYPTOCARDS to populate this feed.',
    'public.activityHint':
      'Recent mainnet events are shown in chronological order. Older entries can be explored via the on-chain audit trail.',
    'public.recentActivity': 'Recent mainnet activity',
    'public.lastUpdated': 'Last updated',
    'public.dataSource': 'Data source: live Solana RPC + CRYPTOCARDS indexer.',
    'public.activity.funded': 'CRYPTOCARD funded',
    'public.activity.locked': 'CRYPTOCARD locked',
    'public.activity.claimed': 'CRYPTOCARD claimed',
    'public.activity.refunded': 'CRYPTOCARD refunded',
    'public.activity.amountLine':
      '{token} • {sol} SOL • ~${fiat} USD',
    'public.burnsTitle': 'Protocol burns & tax',
    'public.burnsEstimatedSol': 'Estimated protocol tax (SOL)',
    'public.burnsEstimatedUsd': 'Estimated protocol tax (USD)',
    'public.burnMechanicsTitle': 'Burn mechanics',
    'public.burnMechanicsBody':
      'A 1.5% protocol tax is applied to funded & locked CRYPTOCARDS. Tax is swapped to $CRYPTOCARDS and periodically sent to a public burn wallet, which executes burns when thresholds are met.',

    // ---------- DEV PANEL ----------
    'dev.title': 'Developer tools',
    'dev.simulateCardCreated': 'Simulate card created',
    'dev.simulateFunded': 'Simulate funded',
    'dev.simulateLocked': 'Simulate locked',
    'dev.resetAll': 'Reset all builder state',

    // ---------- PRICE BANNER ----------
    'price.solPriceLabel': 'Live SOL price',
    'price.solPriceFallback':
      'Using cached or fallback SOL price. Some fiat values may be approximate.',
  },
};
