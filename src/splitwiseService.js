// src/splitwiseService.js
const Splitwise = require('splitwise');
const config = require('./config');

const splitwise = Splitwise(
  {
    consumerKey: config.splitwiseApiKey,
    consumerSecret: config.splitwiseApiSecret
  }
);

const splitwiseService = {

  async fetchExpensesBetweenDates(startDate, endDate) {
    let offset = 0;
    let expenses = [];
    let newExpenses = await this.fetchExpensesBetweenDatesHelper(startDate, endDate, offset);
    while (newExpenses.length > 0) {
      expenses = expenses.concat(newExpenses);
      offset += newExpenses.length;
      newExpenses = await this.fetchExpensesBetweenDatesHelper(startDate, endDate, offset);
    }
    return expenses;
  },

  async fetchGroup(groupId) {
    try {
      const group = await splitwise.getGroup(groupId);
      return group;
    } catch (error) {
      console.error('Error fetching group from Splitwise:', error);
      return null;
    }
  },

  async fetchGroups() {
    try {
      const groups = await splitwise.getGroups();
      return groups;
    } catch (error) {
      console.error('Error fetching groups from Splitwise:', error);
      return [];
    }
  },

  async fetchExpensesBetweenDatesHelper(startDate, endDate, offset) {
    try {
      const expenses = await splitwise.getExpenses({
        limit: 0,
        updated_after: startDate,
        updated_before: endDate,
        offset: offset,
      });
      return expenses;
    } catch (error) {
      console.error('Error fetching expenses from Splitwise:', error);
      return [];
    }
  },

async fetchExpense(expenseId) {
  try {
    const expense = await splitwise.getExpense(expenseId);
    return expense;
  } catch (error) {
    console.error('Error fetching expense from Splitwise:', error);
    return null;
  }
}
};

module.exports = splitwiseService;
