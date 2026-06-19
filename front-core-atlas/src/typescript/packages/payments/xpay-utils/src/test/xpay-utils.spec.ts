import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { EventManager } from '@proteo/event-bus';
import type {
  AddCardToWalletPayload,
  VerifyCardInWalletPayload,
  OpenWalletPayload,
  GetCardTokenPayload,
  GetInfoToAddCardPayload
} from '@proteo/types';
import { addCardToWallet, getWalletsStatus, verifyCardInWallet, openWallet, getCardToken, getInfoToAddCard } from '../xpay-utils.js';

describe('xpay-utils', () => {
  beforeEach(() => {
    EventManager.getInstance().publishWithResponse = jest.fn() as jest.MockedFunction<typeof EventManager.getInstance.prototype.publishWithResponse>;
    EventManager.getInstance().publish = jest.fn() as jest.MockedFunction<typeof EventManager.getInstance.prototype.publish>;
    EventManager.getInstance().publish = jest.fn() as jest.MockedFunction<typeof EventManager.getInstance.prototype.publish>;
  });

  it('When the getWalletsStatus function is called, the event manager should emit an event', () => {
    getWalletsStatus();
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('GET_WALLETS_STATUS', {
      method: 'getWalletsStatus'
    });
  });

  it('When the verifyCardInWallet function is called, the event manager should emit an event', () => {
    const mockPayload: VerifyCardInWalletPayload = {
      tokenId: 'token',
      eligibility: 'SAMSUNG',
      password: 'pass'
    };

    verifyCardInWallet(mockPayload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('VERIFY_CARD_IN_WALLET', {
      method: 'verifyCardInWallet',
      data: mockPayload
    });
  });

  it('When the addCardToWallet function is called, the event manager should emit an event', () => {
    const mockPayload: AddCardToWalletPayload = {
      walletName: 'name',
      cardType: 'MASTERCARD',
      eligibility: 'example',
      hashPan: 'hash',
      password: 'pass'
    };

    addCardToWallet(mockPayload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('ADD_CARD_TO_WALLET', {
      method: 'addCardToWallet',
      data: mockPayload
    });
  });

  it('When the openWallet function is called, the event manager should emit an event', () => {
    const mockPayload: OpenWalletPayload = {
      walletName: 'name'
    };

    openWallet(mockPayload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('OPEN_WALLET', {
      method: 'openWallet',
      data: mockPayload
    });
  });

  it('When the getCardToken function is called, the event manager should emit an event', () => {
    const mockPayload: GetCardTokenPayload = {
      cardData: 'cardData'
    };

    getCardToken(mockPayload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('GET_CARD_TOKEN', {
      method: 'getCardToken',
      data: mockPayload
    });
  });

  it('When the getInfoToAddCard function is called, the event manager should emit an event', () => {
    const mockPayload: GetInfoToAddCardPayload = {
      cardType: 'cardType'
    };

    getInfoToAddCard(mockPayload);
    expect(EventManager.getInstance().publishWithResponse).toHaveBeenCalledWith('GET_INFO_TO_ADD_CARD', {
      method: 'getInfoToAddCard',
      data: mockPayload
    });
  });
});
