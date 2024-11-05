// src/config.js
require('dotenv').config();

module.exports = {
  splitwiseApiKey: process.env.SPLITWISE_API_KEY,
  splitwiseApiSecret: process.env.SPLITWISE_API_SECRET,
  actualBudgetUrl: process.env.ACTUALBUDGET_SERVER_URL,
  actualBudgetPassword: process.env.ACTUALBUDGET_PASSWORD,
  splitWiseUserId: process.env.SPLITWISE_USER_ID,
  actualBudgetSplitwiseAccountId: process.env.ACTUALBUDGET_SPLITWISE_ACCOUNT_ID,
  actualBudgetToBeBudgettedCategoryId: process.env.ACTUALBUDGET_TO_BE_BUDGETTED_CATEGORY_ID,
  actualBudgetSyncId: process.env.ACTUALBUDGET_SYNC_ID
};
