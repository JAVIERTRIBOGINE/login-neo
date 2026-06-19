import { TealiumService } from '../tealium.service.js';

describe('tealium-service', () => {
  it('should return true or false depending on data validation', () => {
    expect.assertions(2);
    expect(TealiumService.isValidValue('ES7502766977729557202723')).toBeTruthy();
    expect(TealiumService.isValidValue(undefined)).toBeFalsy();
  });

  it('should modify an account', () => {
    expect.assertions(1);
    expect(TealiumService.modifyAccount('ES7502766977729557202723')).toBe(
      'ES750276_f7ad345930f818723c294c405bf47acbc2208503caf874626958d8ac327c66da'
    );
  });

  it('should return an empty string when account < 20', () => {
    expect.assertions(1);
    expect(TealiumService.modifyAccount('ES7502766')).toBe('');
  });

  it('should modify a card', () => {
    expect.assertions(1);
    expect(TealiumService.modifyCard('ES7502766977729557202723')).toBe(
      'ES750276697772955720f7ad345930f818723c294c405bf47acbc2208503caf874626958d8ac327c66da'
    );
  });

  it('should return an empty string when the card is undefined', () => {
    expect.assertions(1);
    expect(TealiumService.modifyCard(undefined)).toBe('');
  });

  it('should format the IBAN', () => {
    expect.assertions(1);
    expect(TealiumService.formatIban('ES7502766977729557202723', 'ES7502766977729557202724')).toBe(
      'ES7502766977729557202723\\ES7502766977729557202724'
    );
  });

  it('should format the IBAN with undefined IBAN', () => {
    expect.assertions(1);
    expect(TealiumService.formatIban(undefined, 'ES7502766977729557202723')).toBe('ES7502766977729557202723');
  });

  it('should return undefined if data is not valid', () => {
    expect.assertions(1);
    expect(TealiumService.sha256(undefined)).toBe(undefined);
  });

  it('should return altered tealiumData type', () => {
    const testData = {
      nombreOperativa: '',
      pasoOperativa: '',
      esProceso: `true`,
      idCliente: '1',
      cuentaOrigen: 'ES7502766977729557202723',
      cuentaDestino: 'ES7502766977729557202724',
      ibanOrigen: 'ES7502766977729557202723',
      ibanDestino: 'ES7502766977729557202724',
      numTarjeta: '4510 6459 8301 6543',
      idUsuarioAutorizado: '',
      razonSocial: '',
      sessionId: ''
    };
    const options = {
      bicFrom: 'ES7502766977729557202723',
      bicTo: 'ES7502766977729557202724'
    };
    expect.assertions(2);
    const ofuscatedData = TealiumService.obfuscateData(testData, options);
    expect(ofuscatedData.idCliente).toBe('6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b');
    expect(TealiumService.obfuscateData(ofuscatedData)).toBe(testData);
  });
});
