export default () => ({
    jwt : {
        secret : process.env.JWT_SECRET
    },
    database :{
        connectionString : process.env.MONGO_URL
    },
    priviteKey:{
        secret : process.env.SECRET_KEY_ENCRYPTION
    }

})