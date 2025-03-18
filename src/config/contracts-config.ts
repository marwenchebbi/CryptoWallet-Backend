//this file extract the abi of the contracts and load them using the file system module (the paths of the contracts are local)
const Web3 = require("web3").default;
const fs = require("fs");
const path = require("path");

const web3 = new Web3("http://127.0.0.1:7545");

// Contract addresses
const PROXYM_CONTRACT_ADDRESS = "0x3b7494967E48e46fC7c4747B14c3cC607b44aEd3";
const TRADE_CONTRACT_ADDRESS = "0xA577977ebcD5A63323777d50A1a467CD19d28312";
const USDT_CONTRACT_ADDRESS = "0x3Cf665A1dc7e6C73690808F17BcDaefAF140877B";

// Function to load contract details
function loadContract(contractName, contractAddress) {
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
