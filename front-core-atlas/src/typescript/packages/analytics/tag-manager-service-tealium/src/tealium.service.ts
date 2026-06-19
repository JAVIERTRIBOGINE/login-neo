import type { TealiumData, TealiumOptions } from '@proteo/types';
import { sha256 } from 'js-sha256';

/**
 * Tealium service
 */
export class TealiumService {
  /**
   * This function checks if the param is valid value to process
   *
   * @param data : value to validate if exists
   */
  public static isValidValue(data: string | undefined): data is string {
    return typeof data === 'string';
  }

  /**
   * This functions obfuscates the sensitive content before it will be sended
   *
   * @param tealiumData : The tealium data object
   * @param options
   */
  public static obfuscateData<T>(tealiumData: T, options?: TealiumOptions): TealiumData {
    const tealiumDataTyped = tealiumData as unknown as TealiumData;

    tealiumDataTyped.idCliente = this.sha256(tealiumDataTyped.idCliente);

    tealiumDataTyped.cuentaOrigen = this.modifyAccount(tealiumDataTyped.cuentaOrigen);

    tealiumDataTyped.cuentaDestino = this.modifyAccount(tealiumDataTyped.cuentaDestino);

    tealiumDataTyped.ibanOrigen = this.modifyAccount(tealiumDataTyped.ibanOrigen);

    tealiumDataTyped.ibanDestino = this.modifyAccount(tealiumDataTyped.ibanDestino);

    tealiumDataTyped.numTarjeta = this.modifyCard(tealiumDataTyped.numTarjeta);

    tealiumDataTyped.idUsuarioAutorizado = this.sha256(tealiumDataTyped.idUsuarioAutorizado);

    tealiumDataTyped.razonSocial = this.sha256(tealiumDataTyped.razonSocial);

    tealiumDataTyped.sessionId = this.sha256(tealiumDataTyped.sessionId);

    if (tealiumDataTyped.ibanOrigen && options) {
      tealiumDataTyped.ibanOrigen = this.formatIban(options.bicFrom, tealiumDataTyped.ibanOrigen);
    }

    if (tealiumDataTyped.ibanDestino && options) {
      tealiumDataTyped.ibanDestino = this.formatIban(options.bicTo, tealiumDataTyped.ibanDestino);
    }

    return tealiumDataTyped;
  }

  /**
   * The account param is obfuscated. The 8 first digits are on plain text and the last 4 digits on hash format.
   * If the account param has more than 12 digits, there are truncated.
   *
   * @param account: string account data
   */
  public static modifyAccount(account?: string): string {
    const VALID_LENGTH = 20;
    const SUB_LENGTH = 8;
    const HASH_LENGTH = 4;
    if (account && this.isValidValue(account) && account.length >= VALID_LENGTH) {
      const sub = account.substring(0, SUB_LENGTH);
      const hash = this.sha256(account.substring(account.length - HASH_LENGTH));

      return `${sub}_${hash}`;
    }
    return '';
  }

  /**
   * The card number param is obfuscated. The 4 first digits are on plain text and the last 4 digits on hash format.
   *
   * @param cardNumber: string card number
   */
  public static modifyCard(cardNumber?: string): string {
    const SUB_LENGTH = 4;
    if (cardNumber && this.isValidValue(cardNumber)) {
      const sub = cardNumber.substring(0, cardNumber.length - SUB_LENGTH);
      const hash = this.sha256(cardNumber.substring(cardNumber.length - SUB_LENGTH));
      return `${sub}${hash}`;
    }
    return '';
  }

  /**
   * The function returns a concatenation from the iban in tealium data and the iban received how an extra paramenter
   *
   * @param iban : string
   * @param defaultValue : string
   */
  public static formatIban(iban: string | undefined, defaultValue: string): string {
    if (this.isValidValue(iban) && defaultValue) {
      return `${iban}\\${defaultValue}`;
    }
    return defaultValue;
  }

  /**
   * Utility function to obfuscate the data content.
   *
   * The function calls the sha256js library
   *
   * @param data : data to obfuscate
   */
  public static sha256(data: string | undefined): string | undefined {
    if (this.isValidValue(data)) {
      return sha256(data);
    }
    return data;
  }
}
