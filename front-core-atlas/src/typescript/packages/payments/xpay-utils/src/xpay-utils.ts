import { EventManager } from '@proteo/event-bus';
import type {
  BridgeRequest,
  VerifyCardInWalletPayload,
  WalletsStatusResponse,
  AddCardToWalletPayload,
  WalletResponse,
  OpenWalletPayload,
  GetCardTokenPayload,
  GetCardTokenResponse,
  GetInfoToAddCardPayload,
  GetInfoToAddCardResponse
} from '@proteo/types';

/**
 * Emits event to get wallets status
 */
export const getWalletsStatus = (): Promise<WalletsStatusResponse> => {
  const payload: BridgeRequest = {
    method: 'getWalletsStatus'
  };
  return EventManager.getInstance().publishWithResponse<WalletsStatusResponse>('GET_WALLETS_STATUS', payload);
};

function createPayload<T>(data: T, method: string, eventName: string) {
  const payload: BridgeRequest = {
    method,
    data
  };
  return EventManager.getInstance().publishWithResponse<WalletResponse>(eventName, payload);
}

/**
 * Verifies a card on PENDING_VERIFIED status
 */

export const verifyCardInWallet = (data: VerifyCardInWalletPayload): Promise<WalletResponse> => {
  return createPayload(data, 'verifyCardInWallet', 'VERIFY_CARD_IN_WALLET');
};

/**
 * Adds a card to a specific wallet
 */
export const addCardToWallet = (data: AddCardToWalletPayload): Promise<WalletResponse> => {
  return createPayload(data, 'addCardToWallet', 'ADD_CARD_TO_WALLET');
};

/**
 * Open a wallet
 */
export const openWallet = (data: OpenWalletPayload): Promise<WalletResponse> => {
  return createPayload(data, 'openWallet', 'OPEN_WALLET');
};

/**
 * Get a encoded token
 */
export const getCardToken = (data: GetCardTokenPayload): Promise<GetCardTokenResponse> => {
  const payload: BridgeRequest = {
    method: 'getCardToken',
    data
  };
  return EventManager.getInstance().publishWithResponse<GetCardTokenResponse>('GET_CARD_TOKEN', payload);
};

/**
 * Get the info to add card
 */
export const getInfoToAddCard = (data?: GetInfoToAddCardPayload): Promise<GetInfoToAddCardResponse> => {
  const payload: BridgeRequest = {
    method: 'getInfoToAddCard',
    ...(data && { data })
  };
  return EventManager.getInstance().publishWithResponse<GetInfoToAddCardResponse>('GET_INFO_TO_ADD_CARD', payload);
};
