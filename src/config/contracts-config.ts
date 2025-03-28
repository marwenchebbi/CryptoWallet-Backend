//this file extract the abi of the contracts and load them using the file system module (the paths of the contracts are local)
const Web3 = require("web3").default;
const fs = require("fs");
const path = require("path");

const web3 = new Web3("http://127.0.0.1:7545");

// Contract addresses
const PROXYM_CONTRACT_ADDRESS = "0x8CdaF0CD259887258Bc13a92C0a6dA92698644C0";
const TRADE_CONTRACT_ADDRESS = "0x345cA3e014Aaf5dcA488057592ee47305D9B3e10";
const USDT_CONTRACT_ADDRESS = "0xF12b5dd4EAD5F743C6BaA640B0216200e89B60Da";

// Function to load contract details
function loadContract(contractName, contractAddress) {
    // this path is the path of the blockchain network contracts and their configurations 
    const contractPath = path.join(__dirname, ` ../../../../../../BlockChain/build/contracts/${contractName}.json`);
    const contractJSON = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    return new web3.eth.Contract(contractJSON.abi, contractAddress);
}

// Define contract instances
const proxymContract = loadContract("Proxym", PROXYM_CONTRACT_ADDRESS);
const tradeContract = loadContract("TradeToken", TRADE_CONTRACT_ADDRESS);
const usdtContract = loadContract("MockUSDT", USDT_CONTRACT_ADDRESS);

// Export contract instances and addresses for reuse
module.exports = {
    web3,
    proxymContract,
    tradeContract,
    usdtContract,
    PROXYM_CONTRACT_ADDRESS,
    TRADE_CONTRACT_ADDRESS,
    USDT_CONTRACT_ADDRESS
};
