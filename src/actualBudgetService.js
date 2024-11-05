// src/actualBudgetService.js
const actualApi = require('@actual-app/api');
const config = require('./config');

const actualBudgetService = {
  async initialize() {
    // Initialize Actual API connection
    await actualApi.init({
      serverURL: config.actualBudgetUrl,
      password: config.actualBudgetPassword,
    });

    // This is the ID from Settings → Show advanced settings → Sync ID
    await actualApi.downloadBudget(config.actualBudgetSyncId);
  },

  async shutdown() {
    await actualApi.shutdown();
  },

  async importTransactions(transactions) {
    for (const transaction of transactions) {
      await this.importTransaction(transaction);
    }
  },

  async importTransaction(transaction) {
    try {
      await actualApi.createTransaction(transaction);
      return true;
    } catch (error) {
      console.error('Error importing transaction to ActualBudget:', error);
      return false;
    }
  },


async updateTransactions(transactionIds, transactions) {
  for (let i = 0; i < transactionIds.length; i++) {
    await this.updateTransaction(transactionIds[i], transactions[i]);
  }
},

async updateTransaction(transactionId, transaction) {
  try {
    await actualApi.updateTransaction(transactionId, transaction);
    return true;
  } catch (error) {
    console.error('Error updating transaction in ActualBudget:', error);
    return false;
  }
},

async fetchTransactionsBetweenDates(startDate, endDate) {
  try {
    const transactions = await actualApi.getTransactions(config.actualBudgetDefaultAccountId, startDate, endDate);
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions from ActualBudget:', error);
    return [];
  }
},

async fetchAccounts() {
  try {
    const accounts = await actualApi.getAccounts();
    return accounts;
  } catch (error) {
    console.error('Error fetching accounts from ActualBudget:', error);
    return [];
  }
},

async integerToAmount(integer) {
  return integerToAmount(integer);
}
};

module.exports = actualBudgetService;
