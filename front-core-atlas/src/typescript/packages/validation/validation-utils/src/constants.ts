/* eslint-disable no-control-regex */
export const EMAIL_PATTERN =
  /^(?:[a-z0-9!#$%&'*+/=?^_‘{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_‘{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/;
export const SPANISH_PHONE_PATTERN = /^[6-9]\d{8}$/;
export const SPANISH_POSTAL_CODE = /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/;
export const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[,|¿?¡!:;{}=()/&%·#"@$%*&._-])[A-Za-z\d,|¿?¡!:;{}=()/&%·#"@$%*&._-]{8}$/;
export const NUMERIC_PATTERN = /^\d*([.,]\d{1,5})?[ ]?[.]?[.,]?\d?/;
export const FOREIGN_PHONE_PATTERN = /^\d+$/;
