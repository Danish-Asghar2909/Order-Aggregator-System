const { Sequelize } = require('sequelize');
require('dotenv').config();


const configInfo = {
    dialect: process.env.DB_DIALECT,
    timezone: process.env.DB_TIMEZONE,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432 
}

const sequelize = new Sequelize(configInfo);

const testConnection = async ( ) =>{
    try{   
        await sequelize.authenticate();
        console.log("DataBase " + configInfo.database + " connection made successfully!")
    }catch(err){
        console.error("DB connection Failed : ", err)
    }
}

testConnection()
module.exports = sequelize;