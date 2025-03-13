//this file contains all the custom errors like "incorrect credentials" ,"user is not logged in" ....


export const  errors ={
    emailInUse: {
        statusCode : 400,
        message : 'Email already in use !!!',
        error : 'Bad Request',
        code : 'BAD_REQQUEST'
    },

    wrongCredentials: {
        statusCode : 400,
        message : 'Wrong  credentials',
        error : 'Bad Request',
        code : 'BAD_REQQUEST'
    },
    sessionExpired : {
        statusCode : 400,
        message : 'You have to login again !!',
        error : 'Bad Request',
        code : 'BAD_REQQUEST'
    },

    invalidToken : {
        statusCode : 400,
        message : 'Invalid Token',
        error : 'Bad Request',
        code : 'BAD_REQQUEST'
    }
}