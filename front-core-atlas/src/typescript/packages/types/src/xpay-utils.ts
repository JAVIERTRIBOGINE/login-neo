/**
 * Represents a token for a digital wallet.
 */
export interface WalletToken {
  /**
   * Unique identifier for the wallet token.
   */
  tokenId: string;

  /**
   * Current state of the wallet token.
   * - `ENROLLED`: The token is active and ready for use.
   * - `PENDING_VERIFIED`: The token is pending verification.
   */
  state: 'ENROLLED' | 'PENDING_VERIFIED';
}

/**
 * Defines the structure of Google and Samsung wallets.
 */
export interface GoogleWallets {
  /**
   * Information about the Google Wallet.
   */
  google_wallet?: {
    /**
     * Indicates whether the Google Wallet is active.
     */
    active: boolean;

    /**
     * List of tokens associated with the Google Wallet.
     */
    tokens: WalletToken[];
  };
}

export interface SamsungWallets {
  /**
   * Information about the Samsung Wallet.
   */
  samsung_wallet?: {
    /**
     * Indicates whether the Samsung Wallet is active.
     */
    active: boolean;
  };

  /**
   * Information about the Samsung Watch Wallet.
   */
  samsung_watch_wallet?: {
    /**
     * Indicates whether the Samsung Watch Wallet is active.
     */
    active: boolean;
  };
}

/**
 * Defines the structure of Apple wallets.
 */
export interface AppleWallets {
  /**
   * Information about the Apple Wallet.
   */
  apple_wallet?: {
    /**
     * Indicates whether the Apple Wallet is active.
     */
    active: boolean;

    /**
     * List of tokens associated with the Apple Wallet.
     */
    tokens: WalletToken[];
  };

  /**
   * Information about the Apple Watch Wallet.
   */
  apple_watch_wallet?: {
    /**
     * Indicates whether the Apple Watch Wallet is active.
     */
    active: boolean;
  };
}

/**
 * Response structure combining Google, Samsung, and Apple wallets.
 */
export interface WalletsStatusResponse {
  /**
   * Wallets from Google, Samsung, and Apple combined into one structure.
   */
  wallets: GoogleWallets & SamsungWallets & AppleWallets;
}

/**
 * Represents the payload required to verify if a card exists in a wallet.
 *
 * @param tokenId - Associated token identifier to the card
 * @param eligibility - Eligibility of the card
 * @param password - Password to sign the operation, input by the user
 */
export interface VerifyCardInWalletPayload {
  tokenId: string;
  eligibility: string;
  password: string;
}

/**
 * Represents the payload required to add a card to a wallet.
 *
 * @param walletName - Name of the wallet to add the card
 * @param cardType - Type of the card
 * @param eligibility - Eligibility of the card
 * @param hashPan - Hashed pan of the card
 * @param password - Password to sign the operation, input by the user
 */
export interface AddCardToWalletPayload {
  walletName: string;
  cardType: 'VISA' | 'MASTERCARD';
  eligibility: string;
  hashPan: string;
  password: string;
}

/**
 * Represents a generic response returned by operations.
 *
 * @param status - Status indicating the success (`true`) or failure (`false`) of the operation.
 * @param errorDescription - Optional description of an error, if the operation fails.
 */
export interface WalletResponse {
  status: boolean;
  errorDescription?: string;
}

/**
 * Represents the payload required to open a wallet.
 *
 * @param name - The name for a digital wallet.
 */
export interface OpenWalletPayload {
  walletName: string;
}

/**
 * Represents the payload required to get card token.
 *
 * @param cardData - The card data to get card token.
 */
export interface GetCardTokenPayload {
  cardData: string;
}

/**
 * Represents the response of get card token.
 */
export interface GetCardTokenResponse {
  tokenId: string;
}

/**
 * Represents the payload required to get the info to add card.
 *
 * @param cardType - The card type (optional).
 */
export interface GetInfoToAddCardPayload {
  cardType?: string | null;
}

/**
 * Represents the response of get info to add card.
 */
export interface GetInfoToAddCardResponse {
  info: Record<string, string>;
}
