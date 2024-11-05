// src/config.js
require('dotenv').config();

module.exports = {
  splitwiseApiKey: process.env.SPLITWISE_API_KEY,
  splitwiseApiSecret: process.env.SPLITWISE_API_SECRET,
  actualBudgetUrl: process.env.ACTUALBUDGET_SERVER_URL,
  actualBudgetPassword: process.env.ACTUALBUDGET_PASSWORD,
  splitWiseUserId: process.env.SPLITWISE_USER_ID,
  actualBudgetDefaultAccountId: process.env.ACTUALBUDGET_DEFAULT_ACCOUNT_ID,
  actualBudgetSyncId: process.env.ACTUALBUDGET_SYNC_ID
};
