/** 
import { generateCodeChallenge, generateRandomString, getNumbers } from "./utils";
import { base64UrlEncode, sha256 } from '@proteo/string-utils';

xdescribe("utils", () => {

  


  describe('generateRandomString', () => {
    it('should generate a string of the correct length', () => {
      const length = 56;
      const result = generateRandomString(length);
      expect(result.length).toBe(length);
    });

    it('should generate a hexadecimal string', () => {
      const result = generateRandomString(56);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different strings each time', () => {
      const result1 = generateRandomString();
      const result2 = generateRandomString();
      expect(result1).not.toBe(result2);
    });
  });


  describe('getNumbers', () => {
    it('should convert a number to hex with correct padding', () => {
      const formatter = getNumbers(2);
      expect(formatter(15)).toBe('0f'); // 15 in hex is 'f', padded to '0f'
      expect(formatter(255)).toBe('ff'); // 255 in hex is 'ff'
    });

    it('should slice correctly if hex is longer than digits', () => {
      const formatter = getNumbers(2);
      expect(formatter(4095)).toBe('ff'); // 4095 in hex is 'fff', sliced to last 2 digits
    });
  });

  
describe('generateCodeChallenge', () => {

  it('should return a base64-encoded hash of the code verifier', async () => {
  const mockString = "mockValueString";
  const mockSsha256Val = await sha256(mockString);
  const mockUrlBase =  base64UrlEncode(mockSsha256Val);
  const expectedResult = await generateCodeChallenge(mockString);
  expect(expectedResult).toEqual(mockUrlBase)
  });
});
  

});


*/



