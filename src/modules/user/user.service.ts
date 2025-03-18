import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../auth/schemas/user.schema';
import { Model } from 'mongoose';
const { web3, proxymContract, tradeContract, usdtContract, PROXYM_CONTRACT_ADDRESS, TRADE_CONTRACT_ADDRESS, USDT_CONTRACT_ADDRESS } = require("../../config/contracts-config");


@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<User>) {
    }


//register the user in the blockchain network
    async createWallet(password: string) {
        try {
            if (!web3) {
                console.log('Error accessing the blockchain server');
                return null;
            }

            // Create a new account
            const address = await web3.eth.personal.newAccount(password);
            console.log('Account created successfully:', address);

            return this.getWalletInfo(address)

        } catch (error) {
            console.error('Error creating account:', error);
            return null;
        }
    }

    // Fetch account details
    async getWalletInfo(address) {
        const balanceWei = await web3.eth.getBalance(address);
        const balanceEth = web3.utils.fromWei(balanceWei, 'ether'); // Convert to ETH
        const networkId = await web3.eth.net.getId();

        // Return account info object with BigInt values converted to strings
        return {
            address,
            balance: balanceEth,
            balanceWei: balanceWei.toString(),
            network: networkId.toString(),
        };
    }


    async hello() {
        return 'hello'
    }




}
