// src/errors/errors.config.ts
export const errors = {
    emailInUse: {
        statusCode: 400,
        message: 'Email already in use !!!',
        error: 'Bad Request',
        code: 'BAD_REQUEST'
    },
    
    wrongCredentials: {
        statusCode: 400,
        message: 'Wrong credentials',
        error: 'Bad Request',
        code: 'BAD_REQUEST'
    },

    // this error will be handled when the user is logged out
    sessionExpired: {
        statusCode: 400,
        message: 'Session Expired please login again !!',
        error: 'Bad Request',
        code: 'BAD_REQUEST'
    },
    invalidToken: {
        statusCode: 400,
        message: 'Invalid Token',
        error: 'Bad Request',
        code: 'BAD_REQUEST'
    },
    errorCreatingWallet: {
        statusCode: 500,
        message: 'Error while creating a new Wallet please contact the admin',
        error: 'Internal error',
        code: 'INTERNAL_ERROR'
    },
    // New transaction-specific errors
    insufficientFunds: {
        statusCode: 400,
        message: 'Insufficient ETH to cover gas costs',
        error: 'Bad Request',
        code: 'INSUFFICIENT_FUNDS'
    },
    currencyNotFound: {
        statusCode: 500,
        message: 'Currency PRX not found',
        error: 'Internal Server Error',
        code: 'CURRENCY_NOT_FOUND'
    },
    userNotFound: {
        statusCode: 404,
        message: 'Sender or receiver not found',
        error: 'Not Found',
        code: 'USER_NOT_FOUND'
    },
    transactionCreationFailed: {
        statusCode: 500,
        message: 'Failed to create transaction',
        error: 'Internal Server Error',
        code: 'TRANSACTION_CREATION_FAILED'
    },
    walletUpdateFailed: {
        statusCode: 500,
        message: 'Failed to update wallet info',
        error: 'Internal Server Error',
        code: 'WALLET_UPDATE_FAILED'
    },

    blockchainServerError: {
        statusCode: 500,
        message: 'Error accessing the blockchain server',
        error: 'Internal Server Error',
        code: 'BLOCKCHAIN_SERVER_ERROR',
    },
    walletCreationFailed: {
        statusCode: 500,
        message: 'Failed to create wallet',
        error: 'Internal Server Error',
        code: 'WALLET_CREATION_FAILED',
    },

    noPrivateKey: {
        statusCode: 400,
        message: 'No private key found for this user',
        error: 'Bad Request',
        code: 'NO_PRIVATE_KEY',
    },
    walletUnlockFailed: {
        statusCode: 500,
        message: 'Failed to unlock wallet',
        error: 'Internal Server Error',
        code: 'WALLET_UNLOCK_FAILED',
    },

    fetchingPrxBalance: {
        statusCode: 500,
        message: 'Failed to fetch Proxym balance !',
        error: 'Internal Server Error',
        code: 'PRX_BALANCE_ERROR',
    },

    fetchingUSDTBalance: {
        statusCode: 500,
        message: 'Failed to fetch usdt balance !',
        error: 'Internal Server Error',
        code: 'USDT_BALANCE_ERROR',
    },

    walletLockFailed: {
        message: 'Failed to lock wallet',
        code: 'WALLET_LOCK_FAILED',
    },

    passwordUpdateFailed: {
        message: 'Failed to update password',
        code: 'PASSWORD_UPDATE_FAILED',
      },

      fetchingUsdtBalance: {
        message: 'Error fetching USDT balance',
        code: 'FETCH_USDT_BALANCE_ERROR',
      },
      transactionFetchFailed:{
        message: 'Error fetching USDT transactions',
        code: 'FETCH_TRANSACTIONS_ERROR',
      }



};