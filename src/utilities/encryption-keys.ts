import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = Buffer.from('7740cde26226d30e6fdbb621442e039b4f3a2dd37bc850e8e1754f7acd1c23f1', 'hex'); // Correct conversion
const iv = crypto.randomBytes(16); // Generate a random IV

// Encrypt the private key
export function encryptPrivateKey(privateKey: string): string {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted; // Store IV + encrypted data
}

// Decrypt the private key
export function decryptPrivateKey(encryptedData: string): string {
    const [ivHex, encryptedText] = encryptedData.split(':');
    const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(ivHex, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
