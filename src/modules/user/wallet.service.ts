import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/schemas/user.schema';
import { errors } from '../../errors/errors.config';
import { decryptPrivateKey, encryptPrivateKey } from 'src/utilities/encryption-keys';
import { WalletInfoDTO } from './dtos/wallet.dto';

const { web3, proxymContract, usdtContract } = require('../../config/contracts-config');

@Injectable()
export class WalletService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async createWallet(password: string): Promise<{ address: string; encryptedPrivateKey: string; prxBalance: number; usdtBalance: number }> {
    if (!web3) {
      throw new InternalServerErrorException(errors.blockchainServerError);
    }

    const newAccount = web3.eth.accounts.create();
    const encryptedPrivateKey = encryptPrivateKey(newAccount.privateKey);

    await this.importAndUnlockWallet(newAccount.privateKey, password);
    await this.fundAccount(newAccount.address, '3');
    const walletInfo = await this.getWalletInfo(newAccount.address);

    return {
      address: newAccount.address,
      encryptedPrivateKey,
      prxBalance: walletInfo.prxBalance,
      usdtBalance: walletInfo.usdtBalance,
    };
  }

  async importAccount(privateKey: string, password: string): Promise<string> {
    const address = await web3.eth.personal.importRawKey(privateKey, password);
    if (!address) {
      throw new InternalServerErrorException(errors.walletCreationFailed);
    }
    return address;
  }

  async fundAccount(address: string, amount: string): Promise<void> {
    const accounts = await web3.eth.getAccounts();
    if (!accounts || accounts.length === 0) {
      throw new InternalServerErrorException({
        ...errors.walletCreationFailed,
        message: 'No funding accounts available',
      });
    }

    const funder = accounts[3];
    const gasPrice = await web3.eth.getGasPrice();

    const tx = await web3.eth.sendTransaction({
      from: funder,
      to: address,
      value: web3.utils.toWei(amount, 'ether'),
      gas: 21000,
      gasPrice,
    });

    if (!tx.transactionHash) {
      throw new InternalServerErrorException(errors.walletCreationFailed);
    }
  }

  async getBalance(address: string, contract: any): Promise<number> {
    const balanceWei = await contract.methods.balanceOf(address).call();
    const balance = web3.utils.fromWei(balanceWei, 'ether');
    return Number(balance);
  }

  async unlockUserWallet(userId: string, password: string): Promise<{ address: string; message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(errors.userNotFound);
    }

    if (!user.encryptedPrivateKey) {
      throw new BadRequestException(errors.noPrivateKey);
    }

    const privateKey = decryptPrivateKey(user.encryptedPrivateKey);
    const address = await this.importAndUnlockWallet(privateKey, password);

    return { address, message: 'Wallet unlocked successfully' };
  }

  async importAndUnlockWallet(privateKey: string, password: string): Promise<string> {
    const address = await web3.eth.personal.importRawKey(privateKey, password);
    if (!address) {
      throw new InternalServerErrorException(errors.walletUnlockFailed);
    }

    const unlocked = await web3.eth.personal.unlockAccount(address, password, 0);
    if (!unlocked) {
      throw new InternalServerErrorException(errors.walletUnlockFailed);
    }

    return address;
  }

  async getWalletInfo(address: string): Promise<WalletInfoDTO> {
    const prxBalance = await this.getBalance(address, proxymContract);
    if (prxBalance === null) {
      throw new InternalServerErrorException(errors.fetchingPrxBalance);
    }

    const usdtBalance = await this.getBalance(address, usdtContract);
    if (usdtBalance === null) {
      throw new InternalServerErrorException(errors.fetchingUsdtBalance);
    }

    return {
      address: address,
      prxBalance,
      usdtBalance,
    };
  }

  async updateWalletPassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<{ encryptedPrivateKey: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(errors.userNotFound);
    }

    if (!user.encryptedPrivateKey) {
      throw new BadRequestException(errors.noPrivateKey);
    }

    try {
      // Decrypt private key with old password
      const privateKey = decryptPrivateKey(user.encryptedPrivateKey);
      
      // Verify wallet can be unlocked with old password
      await this.importAndUnlockWallet(privateKey, oldPassword);

      // Re-encrypt private key with new password
      const newEncryptedPrivateKey = encryptPrivateKey(privateKey);

      // Test new encryption by attempting to unlock with new password
      await this.importAndUnlockWallet(privateKey, newPassword);

      return { encryptedPrivateKey: newEncryptedPrivateKey };
    } catch (error) {
      throw new InternalServerErrorException({
        ...errors.walletUpdateFailed,
        message: `Failed to update wallet password: ${error.message}`,
      });
    }
  }
}