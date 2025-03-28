import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../auth/schemas/user.schema';
import { Model } from 'mongoose';
const { web3, proxymContract } = require("../../config/contracts-config");
const fs = require('fs');

@Injectable()
export class WalletService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) { }


    // create a wallet for user this we will use it when creating the user
    async createWallet(password: string) {
        try {
            if (!web3) throw new Error('Error accessing the blockchain server');

            const newAccount = web3.eth.accounts.create();
            console.log('Account created:', newAccount.address);
            // import the new account to the network
            await this.importAccount(newAccount.privateKey, password);
            await this.fundAccount(newAccount.address, '1');
            //save wallet to the file ((i have to save this in the databse))
            this.saveWalletToFile(newAccount.address, newAccount.privateKey, password);

            //unlock the account
            await this.importAndUnlockWallet(newAccount.privateKey, password)

            return this.getWalletInfo(newAccount.address, proxymContract);
        } catch (error) {
            console.error('Error creating wallet:', error);
            return null;
        }
    }



    //
    async importAccount(privateKey: string, password: string) {
        await web3.eth.personal.importRawKey(privateKey, password);
        console.log('Account imported into Ganache');
    }

    async fundAccount(address: string, amount: string) {
        const accounts = await web3.eth.getAccounts();
        const funder = accounts[0];
        const gasPrice = await web3.eth.getGasPrice();

        await web3.eth.sendTransaction({
            from: funder,
            to: address,
            value: web3.utils.toWei(amount, 'ether'),
            gas: 21000,
            gasPrice: gasPrice,
        });

        console.log(`Sent ${amount} ETH to ${address}`);
    }
    // this save  the wallet details of the account created to reimport them when the ganache server restart because ganche use in memory storage for the new accounts 
    saveWalletToFile(address: string, privateKey: string, password: string) {
        const walletData = { address, privateKey, password };
        fs.appendFileSync('wallets.json', JSON.stringify(walletData, null, 2) + ',\n');
        console.log('Account saved to wallets.json');
    }

    //the code below will return the awllate data
    async getWalletInfo(address: string, contract: any) {

        const balanceWei = await contract.methods.balanceOf(address).call();
        const balance = web3.utils.fromWei(balanceWei, "ether");

        return {
            address,
            balance: balance,
            balanceWei: balanceWei.toString(),
            network: (await web3.eth.net.getId()).toString(),
        };
    }


    //restore the new accounts
    async restoreWallets() {
        try {
            const wallets = this.loadWalletsFromFile();
            for (const wallet of wallets) {
                await this.importAndUnlockWallet(wallet.privateKey, wallet.password);
            }
        } catch (error) {
            console.error('Error restoring wallets:', error);
        }
    }

    loadWalletsFromFile() {
        try {
            const data = fs.readFileSync('wallets.json', 'utf8').trim();
            return data ? JSON.parse(`[${data.slice(0, -1)}]`) : [];
        } catch (error) {
            console.error('Error reading wallets file:', error);
            return [];
        }
    }

    //unlock the account when the user login 
    async importAndUnlockWallet(privateKey: string, password: string) {
        try {
            const address = await web3.eth.personal.importRawKey(privateKey, password);
            await web3.eth.personal.unlockAccount(address, password, 0); // the third param '0' will unlock the account until the  ganache server will shut down
            console.log('Restored and unlocked account:', address);
        } catch (error) {
            console.error('Error restoring account:', error);
        }
    }



}
