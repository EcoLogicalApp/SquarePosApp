// AES implementation using the crypto library
// Symmetric encryption -> using a single key to encrypt and decrypt
// able to encrypt any kind of data (binary, file, etc.)

const crypto = require("crypto"); // utilizing crypto library for node.js
const algorithm = "aes-256-cbc"; // key with 256 bits (32 bytes)
const key = "ecologicaloauthtokenencryption12"; // string with length 32
const iv = crypto.randomBytes(16); // initialization vector - should be unpredictable and unique -> crypto.randomBytes()
console.log(
  "OAuth token: EAAAEDlsPbRhwMaCVijlbo3Er534WQpTBpcSM5xkcrBrKzD4FZvYl3V-56o4A9_m"
);

function encrypt(text) {
  let cipher_object = crypto.createCipheriv(algorithm, Buffer.from(key), iv); // createCipheriv-> creates and returns a Cipher object with the given algo, key, and iv
  let partially_encrypted = cipher_object.update(text); // update(data, [inputEncoding][, outputEncoding]) -> our data(cipher_object) is already buffered
  let fully_encrypted = Buffer.concat([
    partially_encrypted,
    cipher_object.final(),
  ]); // cipher_object.final() to encrypt the remaining buffers, then concat them
  return {
    // everything in buffer form -> toString('hex')
    iv: iv.toString("hex"),
    encryptedData: fully_encrypted.toString("hex"),
  };
}

function decrypt(text) {
  let iv = Buffer.from(text.iv, "hex");
  let encryptedText = Buffer.from(text.encryptedData, "hex");
  let decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted;
}

// const access_token =
//   "EAAAEDlsPbRhwMaCVijlbo3Er534WQpTBpcSM5xkcrBrKzD4FZvYl3V-56o4A9_m"; // Hyuntaek's sandbox OAuth access token
// const buffer_form_token = Buffer.from(access_token); // transform the text above into a one-byte integer array using Buffer
// var encrypted_token = encrypt(buffer_form_token); // encrypt(Buffer one-byte array)
// console.log("encrypt result", encrypted_token);

// let decrypted_token_buffer_form = decrypt(encrypted_token); // decrypted text in a buffer form
// decrypted_token_string = decrypted_token_buffer_form.toString(); // toString() -> to readable string
// console.log("decrypt result", decrypted_token_string);

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
};
