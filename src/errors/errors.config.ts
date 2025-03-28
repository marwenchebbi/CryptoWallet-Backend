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
    sessionExpired: {
        statusCode: 400,
        message: 'You have to login again !!',
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
};