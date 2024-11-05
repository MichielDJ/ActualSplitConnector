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

  async commit()  {
    try {
      await actualApi.commit();
      return true;
    } catch (error) {
      console.error('Error committing ActualBudget:', error);
      return false;
    }
  },

  async shutdown() {
    try {
      await actualApi.shutdown();
      return true;
    } catch (error) {
      console.error('Error shutting down ActualBudget:', error);
      return false;
    }
  },

  async importTransactions(transactions) {
    try {
      await actualApi.importTransactions(config.actualBudgetSplitwiseAccountId, transactions);
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

async deleteTransactions(transactionIds) {
  for (const transactionId of transactionIds) {
    await this.deleteTransaction(transactionId);
  }

},

async deleteTransaction(transactionId) {
  try {
    await actualApi.deleteTransaction(transactionId);
    return true;
  } catch (error) {
    console.error('Error deleting transaction from ActualBudget:', error);
    return false;
  }
},

async fetchTransactionsBetweenDates(startDate, endDate) {
  try {
    const transactions = await actualApi.getTransactions(config.actualBudgetSplitwiseAccountId, startDate, endDate);
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

async fetchCategories() {
  try {
    const categories = await actualApi.getCategories();
    return categories;
  } catch (error) {
    console.error('Error fetching categories from ActualBudget:', error);
    return [];
  }
},

integerToAmount(n) {
  return Math.round(parseFloat(n) * 100);
}
};

module.exports = actualBudgetService;
